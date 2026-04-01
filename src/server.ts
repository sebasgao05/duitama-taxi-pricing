import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import morgan from "morgan";
import YAML from "yamljs";
import fs from "fs";
import path from "path";
import fareRoutes from "./routes/fareRoutes";

const app = express();
const PORT = process.env.PORT ?? 3000;

// Seguridad — headers HTTP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        imgSrc: ["'self'", "data:", "https://unpkg.com"],
        connectSrc: ["'self'"],
      },
    },
  })
);

// Logging de requests
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Parseo JSON con límite de tamaño
app.use(express.json({ limit: "10kb" }));

// Rutas API v2026
app.use("/api/v2026", fareRoutes);

// Swagger docs
try {
  const swaggerYaml = fs.readFileSync(path.join(__dirname, "swagger.yaml"), "utf8");
  const swaggerDoc = YAML.parse(swaggerYaml);
  app.get("/docs", (req: Request, res: Response) => {
    // Sanitize headers to prevent XSS — only allow safe URL characters
    const rawProto = String(req.headers["x-forwarded-proto"] ?? req.protocol);
    const rawHost = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "");
    const protocol = /^https?$/.test(rawProto) ? rawProto : "https";
    const host = rawHost.replace(/[^a-zA-Z0-9.:\-\[\]]/g, "");
    const stage = process.env.NODE_ENV && process.env.NODE_ENV !== "development" ? `/${process.env.NODE_ENV}` : "";
    const serverUrl = `${protocol}://${host}${stage}/api/v2026`;
    const spec = { ...swaggerDoc, servers: [{ url: serverUrl, description: process.env.NODE_ENV ?? "local" }] };
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <title>Duitama Taxi API - Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    :root { --bg: #f5f5f5; --topbar: #1b1b1b; }
    body { margin: 0; background: var(--bg); transition: background 0.2s; }
    .topbar { background: var(--topbar) !important; }
    #theme-btn {
      position: fixed; top: 12px; right: 16px; z-index: 9999;
      background: #2d6a4f; color: #fff; border: none; border-radius: 20px;
      padding: 6px 16px; cursor: pointer; font-size: 13px; font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    body.dark { --bg: #1a1a2e; }
    body.dark .swagger-ui,
    body.dark .swagger-ui .info .title,
    body.dark .swagger-ui .info p,
    body.dark .swagger-ui .opblock-tag,
    body.dark .swagger-ui table thead tr th,
    body.dark .swagger-ui .response-col_status,
    body.dark .swagger-ui .parameter__name,
    body.dark .swagger-ui label,
    body.dark .swagger-ui select,
    body.dark .swagger-ui .tab li { color: #d4e6d4 !important; }
    body.dark .swagger-ui .wrapper,
    body.dark .swagger-ui .opblock-body,
    body.dark .swagger-ui .opblock-summary,
    body.dark .swagger-ui .model-box,
    body.dark .swagger-ui section.models,
    body.dark .swagger-ui .scheme-container { background: #1e2d2e !important; }
    body.dark .swagger-ui .opblock.opblock-post { background: #1a3a2a !important; border-color: #2d6a4f !important; }
    body.dark .swagger-ui .opblock.opblock-get  { background: #1a2a3a !important; border-color: #2a5a8a !important; }
    body.dark .swagger-ui .opblock-summary-method { min-width: 80px; }
    body.dark .swagger-ui input[type=text],
    body.dark .swagger-ui textarea { background: #162020 !important; color: #d4e6d4 !important; border-color: #2d6a4f !important; }
    body.dark .swagger-ui .btn { background: #2d6a4f !important; color: #fff !important; border-color: #2d6a4f !important; }
    body.dark .swagger-ui .highlight-code > pre,
    body.dark .swagger-ui .microlight { background: #0d1f1f !important; color: #a8d5a2 !important; }
    body.dark .swagger-ui .response-col_description__inner p { color: #a8d5a2 !important; }
    body.dark .swagger-ui select { background: #162020 !important; }
    body.dark .swagger-ui .servers > label select { color: #d4e6d4 !important; }
  </style>
</head>
<body class="dark">
<button id="theme-btn" onclick="toggleTheme()">☀ Modo claro</button>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
SwaggerUIBundle({ spec: ${JSON.stringify(spec)}, dom_id: "#swagger-ui", presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset] });
function toggleTheme() {
  const dark = document.body.classList.toggle("dark");
  document.getElementById("theme-btn").textContent = dark ? "☀ Modo claro" : "🌙 Modo oscuro";
  localStorage.setItem("theme", dark ? "dark" : "light");
}
if (localStorage.getItem("theme") === "light") toggleTheme();
</script>
</body></html>`);
  });
} catch {
  app.get("/docs", (_req, res) => res.status(503).json({ error: "Docs no disponibles" }));
}

// Health check
app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    decreto: "033-2026",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  })
);

// 404 — ruta no encontrada
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    timestamp: new Date().toISOString(),
    error: { code: "NOT_FOUND", message: "Endpoint no encontrado" },
  });
});

// Handler global de errores inesperados
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const sanitized = (err.stack ?? err.message).replace(/[\r\n]/g, " ");
  console.error(sanitized);
  res.status(500).json({
    success: false,
    timestamp: new Date().toISOString(),
    error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚕 Duitama Taxi Pricing API → http://localhost:${PORT}/api/v2026`);
    console.log(`📄 Swagger docs          → http://localhost:${PORT}/docs`);
    console.log(`🌍 Entorno               → ${process.env.NODE_ENV}`);
  });
}

export default app;
