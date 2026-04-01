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
    const protocol = req.headers["x-forwarded-proto"] ?? req.protocol;
    const host = req.headers["x-forwarded-host"] ?? req.headers.host;
    const stage = process.env.NODE_ENV !== "local" ? `/${process.env.NODE_ENV}` : "";
    const serverUrl = `${protocol}://${host}${stage}/api/v2026`;
    const spec = { ...swaggerDoc, servers: [{ url: serverUrl, description: process.env.NODE_ENV ?? "local" }] };
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html><head>
  <title>Duitama Taxi API - Docs</title>
  <meta charset="utf-8"/>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
SwaggerUIBundle({ spec: ${JSON.stringify(spec)}, dom_id: "#swagger-ui", presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset] });
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
