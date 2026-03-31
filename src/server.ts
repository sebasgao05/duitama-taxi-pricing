import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import fareRoutes from "./routes/fareRoutes";

const app = express();
const PORT = process.env.PORT ?? 3000;

// Seguridad — headers HTTP
app.use(helmet());

// Logging de requests
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Parseo JSON con límite de tamaño
app.use(express.json({ limit: "10kb" }));

// Rate limiting — 60 requests por IP por minuto
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Demasiadas solicitudes. Intente de nuevo en un minuto.",
      },
    },
  })
);

// Rutas API v2026
app.use("/api/v2026", fareRoutes);

// Swagger docs
try {
  const swaggerDoc = YAML.load(path.join(__dirname, "swagger.yaml"));
  app.use("/docs", swaggerUi.serve, (req: Request, res: Response, next: NextFunction) => {
    const protocol = req.headers["x-forwarded-proto"] ?? req.protocol;
    const host = req.headers["x-forwarded-host"] ?? req.headers.host;
    const dynamicDoc = {
      ...swaggerDoc,
      servers: [{ url: `${protocol}://${host}/api/v2026`, description: process.env.NODE_ENV ?? "local" }],
    };
    swaggerUi.setup(dynamicDoc)(req, res, next);
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
