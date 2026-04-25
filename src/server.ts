import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import morgan from "morgan";
import YAML from "yamljs";
import fs from "fs";
import path from "path";
import fareRoutes from "./routes/fareRoutes";
import { API_VERSION } from "./version";

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
  <title>Duitama Taxi API — Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    /* ── Tokens ─────────────────────────────────────────── */
    :root {
      --c-bg:        #f7f8fa;
      --c-surface:   #ffffff;
      --c-border:    #e0e4ea;
      --c-text:      #1a1f2e;
      --c-muted:     #5a6478;
      --c-accent:    #2d6a4f;
      --c-accent2:   #1e4d8c;
      --c-post-bg:   #edf7f2;
      --c-post-bd:   #2d6a4f;
      --c-get-bg:    #edf2fb;
      --c-get-bd:    #1e4d8c;
      --c-code-bg:   #f0f4f0;
      --c-code-txt:  #1a3a2a;
      --c-tag-bg:    #f0f4f0;
      --c-topbar:    #111827;
      --c-btn:       #2d6a4f;
      --c-btn-txt:   #ffffff;
      --radius:      8px;
      --font:        'Inter', 'Segoe UI', system-ui, sans-serif;
    }
    body.dark {
      --c-bg:        #111827;
      --c-surface:   #1a2332;
      --c-border:    #2a3a4a;
      --c-text:      #e2e8f0;
      --c-muted:     #b8c5d6;
      --c-accent:    #4ade80;
      --c-accent2:   #60a5fa;
      --c-post-bg:   #0f2a1e;
      --c-post-bd:   #2d6a4f;
      --c-get-bg:    #0f1e2e;
      --c-get-bd:    #1e4d8c;
      --c-code-bg:   #0a1a14;
      --c-code-txt:  #86efac;
      --c-tag-bg:    #1a2332;
      --c-topbar:    #0a0f1a;
      --c-btn:       #2d6a4f;
      --c-btn-txt:   #e2e8f0;
    }

    /* ── Reset / Base ────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--c-bg);
      color: var(--c-text);
      font-family: var(--font);
      transition: background .25s, color .25s;
    }

    /* ── Topbar ──────────────────────────────────────────── */
    .swagger-ui .topbar { background: var(--c-topbar) !important; padding: 10px 20px !important; }
    .swagger-ui .topbar .topbar-wrapper { gap: 12px; }
    .swagger-ui .topbar .topbar-wrapper .link { display: none; }

    /* ── Theme toggle button ─────────────────────────────── */
    #theme-btn {
      position: fixed; top: 10px; right: 16px; z-index: 9999;
      display: flex; align-items: center; gap: 6px;
      background: var(--c-btn); color: var(--c-btn-txt);
      border: none; border-radius: 20px;
      padding: 6px 14px; cursor: pointer;
      font-size: 12px; font-weight: 600; font-family: var(--font);
      box-shadow: 0 2px 10px rgba(0,0,0,.25);
      transition: background .2s, color .2s;
    }
    #theme-btn:hover { filter: brightness(1.15); }

    /* ── Info block ──────────────────────────────────────── */
    .swagger-ui .info { margin: 24px 0 16px !important; }
    .swagger-ui .info .title {
      color: var(--c-text) !important;
      font-size: 28px !important; font-weight: 700 !important;
    }
    .swagger-ui .info p,
    .swagger-ui .info li,
    .swagger-ui .info table { color: var(--c-muted) !important; font-size: 14px !important; }
    .swagger-ui .info a { color: var(--c-accent) !important; }

    /* ── Scheme container (servers dropdown) ─────────────── */
    .swagger-ui .scheme-container {
      background: var(--c-surface) !important;
      border-bottom: 1px solid var(--c-border) !important;
      box-shadow: none !important;
      padding: 12px 20px !important;
    }
    .swagger-ui .servers > label { color: var(--c-muted) !important; font-size: 12px !important; }
    .swagger-ui .servers > label select {
      background: var(--c-bg) !important;
      color: var(--c-text) !important;
      border: 1px solid var(--c-border) !important;
      border-radius: var(--radius) !important;
      padding: 4px 8px !important;
    }

    /* ── Wrapper / main area ─────────────────────────────── */
    .swagger-ui .wrapper { background: transparent !important; }

    /* ── Operation tag headers ───────────────────────────── */
    .swagger-ui .opblock-tag {
      color: var(--c-text) !important;
      border-bottom: 1px solid var(--c-border) !important;
      font-size: 18px !important; font-weight: 600 !important;
    }
    .swagger-ui .opblock-tag:hover { background: transparent !important; }
    .swagger-ui .opblock-tag small { color: var(--c-muted) !important; font-size: 13px !important; }

    /* ── Operation blocks ────────────────────────────────── */
    .swagger-ui .opblock {
      border-radius: var(--radius) !important;
      border: 1px solid var(--c-border) !important;
      box-shadow: none !important;
      margin-bottom: 10px !important;
      overflow: hidden;
    }
    .swagger-ui .opblock.opblock-post {
      background: var(--c-post-bg) !important;
      border-color: var(--c-post-bd) !important;
    }
    .swagger-ui .opblock.opblock-get {
      background: var(--c-get-bg) !important;
      border-color: var(--c-get-bd) !important;
    }
    .swagger-ui .opblock-summary {
      background: transparent !important;
      padding: 10px 16px !important;
    }
    .swagger-ui .opblock-summary-method {
      border-radius: 4px !important;
      font-size: 12px !important; font-weight: 700 !important;
      min-width: 70px !important; text-align: center !important;
      padding: 4px 8px !important;
    }
    .swagger-ui .opblock-summary-path,
    .swagger-ui .opblock-summary-path__deprecated {
      color: var(--c-text) !important;
      font-size: 14px !important; font-weight: 600 !important;
    }
    .swagger-ui .opblock-summary-description {
      color: var(--c-muted) !important;
      font-size: 13px !important;
    }

    /* ── Operation body ──────────────────────────────────── */
    .swagger-ui .opblock-body {
      background: var(--c-surface) !important;
      border-top: 1px solid var(--c-border) !important;
    }
    .swagger-ui .opblock-section-header {
      background: transparent !important;
      border-bottom: 1px solid var(--c-border) !important;
      padding: 10px 16px !important;
    }
    .swagger-ui .opblock-section-header h4,
    .swagger-ui .opblock-section-header label {
      color: var(--c-text) !important;
      font-size: 13px !important; font-weight: 600 !important;
    }

    /* ── Parameters / tables ─────────────────────────────── */
    .swagger-ui table { background: transparent !important; }
    .swagger-ui table thead tr th,
    .swagger-ui table thead tr td {
      color: var(--c-muted) !important;
      border-bottom: 1px solid var(--c-border) !important;
      font-size: 12px !important; font-weight: 600 !important;
      padding: 8px 12px !important;
    }
    .swagger-ui table tbody tr td {
      color: var(--c-text) !important;
      border-bottom: 1px solid var(--c-border) !important;
      padding: 8px 12px !important;
    }
    .swagger-ui .parameter__name { color: var(--c-text) !important; font-size: 13px !important; }
    .swagger-ui .parameter__type { color: var(--c-muted) !important; font-size: 12px !important; }
    .swagger-ui .parameter__in   { color: var(--c-accent) !important; font-size: 11px !important; }
    .swagger-ui .required-label,
    .swagger-ui .parameter__name.required span { color: #e53e3e !important; }

    /* ── Inputs ──────────────────────────────────────────── */
    .swagger-ui input[type=text],
    .swagger-ui input[type=email],
    .swagger-ui input[type=password],
    .swagger-ui textarea,
    .swagger-ui select {
      background: var(--c-bg) !important;
      color: var(--c-text) !important;
      border: 1px solid var(--c-border) !important;
      border-radius: 6px !important;
      font-size: 13px !important;
      padding: 6px 10px !important;
    }
    .swagger-ui input:focus, .swagger-ui textarea:focus {
      outline: none !important;
      border-color: var(--c-accent) !important;
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--c-accent) 20%, transparent) !important;
    }

    /* ── Buttons ─────────────────────────────────────────── */
    .swagger-ui .btn {
      border-radius: 6px !important;
      font-size: 13px !important; font-weight: 600 !important;
      padding: 6px 14px !important;
      transition: filter .15s !important;
    }
    .swagger-ui .btn:hover { filter: brightness(1.1) !important; }
    .swagger-ui .btn.execute {
      background: var(--c-btn) !important;
      color: var(--c-btn-txt) !important;
      border-color: var(--c-btn) !important;
    }
    .swagger-ui .btn.try-out__btn {
      background: transparent !important;
      color: var(--c-accent) !important;
      border: 1px solid var(--c-accent) !important;
    }
    .swagger-ui .btn.cancel {
      background: transparent !important;
      color: #e53e3e !important;
      border: 1px solid #e53e3e !important;
    }

    /* ── Code / response blocks ──────────────────────────── */
    .swagger-ui .highlight-code > pre,
    .swagger-ui .microlight {
      background: var(--c-code-bg) !important;
      color: var(--c-code-txt) !important;
      border-radius: 6px !important;
      font-size: 13px !important;
      padding: 12px !important;
    }
    .swagger-ui .response-col_status { color: var(--c-text) !important; font-weight: 600 !important; }
    .swagger-ui .response-col_description__inner p { color: var(--c-muted) !important; font-size: 13px !important; }
    .swagger-ui .responses-inner h4,
    .swagger-ui .responses-inner h5 { color: var(--c-text) !important; font-size: 13px !important; }

    /* ── Content-type select ─────────────────────────────── */
    .swagger-ui .content-type {
      background: var(--c-bg) !important;
      color: var(--c-text) !important;
      border: 1px solid var(--c-border) !important;
      border-radius: 6px !important;
    }

    /* ── Models section ──────────────────────────────────── */
    .swagger-ui section.models {
      background: var(--c-surface) !important;
      border: 1px solid var(--c-border) !important;
      border-radius: var(--radius) !important;
    }
    .swagger-ui section.models h4 { color: var(--c-text) !important; font-size: 16px !important; }
    .swagger-ui .model-box { background: var(--c-tag-bg) !important; border-radius: 6px !important; }
    .swagger-ui .model .property.primitive { color: var(--c-muted) !important; }
    .swagger-ui .model-title { color: var(--c-text) !important; }

    /* ── Tabs ────────────────────────────────────────────── */
    .swagger-ui .tab li { color: var(--c-muted) !important; font-size: 13px !important; }
    .swagger-ui .tab li.active { color: var(--c-text) !important; font-weight: 600 !important; }
    .swagger-ui .tab li button.tablinks:focus { outline: none !important; }

    /* ── Labels / misc text ──────────────────────────────── */
    .swagger-ui label { color: var(--c-muted) !important; font-size: 12px !important; }
    .swagger-ui .loading-container .loading::after { color: var(--c-muted) !important; }
    .swagger-ui .markdown p, .swagger-ui .markdown li { color: var(--c-muted) !important; font-size: 13px !important; }
  </style>
</head>
<body class="dark">
<button id="theme-btn" onclick="toggleTheme()">&#9728; Modo claro</button>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
function toggleTheme() {
  const dark = document.body.classList.toggle("dark");
  document.getElementById("theme-btn").innerHTML = dark ? "&#9728; Modo claro" : "&#127769; Modo oscuro";
  localStorage.setItem("docs-theme", dark ? "dark" : "light");
}
if (localStorage.getItem("docs-theme") === "light") toggleTheme();
SwaggerUIBundle({
  spec: ${JSON.stringify(spec)},
  dom_id: "#swagger-ui",
  presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
  layout: "BaseLayout",
  deepLinking: true,
  defaultModelsExpandDepth: 1,
  defaultModelExpandDepth: 1,
});
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
    version: API_VERSION,
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
