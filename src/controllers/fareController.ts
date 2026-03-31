import { Request, Response } from "express";
import { fareSchema } from "../utils/validation";
import { calcularTarifa, getZones, getSector, getRutas, getBarrios, formatSectorLabel } from "../services/fareService";
import { generateRequestId } from "../utils/time";

export function calculateFare(req: Request, res: Response): void {
  const request_id = generateRequestId();
  const timestamp = new Date().toISOString();

  const parsed = fareSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      timestamp,
      request_id,
      error: {
        code: "VALIDATION_ERROR",
        message: "Datos de entrada inválidos",
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const { hora_consulta, fecha_consulta, ...result } = calcularTarifa(parsed.data);
    res.json({
      success: true,
      timestamp,
      request_id,
      data: {
        origen: parsed.data.origen,
        destino: parsed.data.destino,
        hora_consulta,
        fecha_consulta,
        ...result,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    const isSectorError = err instanceof Error && err.message.includes("No se encontró sector");
    res.status(isSectorError ? 422 : 500).json({
      success: false,
      timestamp,
      request_id,
      error: { code: isSectorError ? "SECTOR_NOT_FOUND" : "INTERNAL_ERROR", message },
    });
  }
}

export function getZonesHandler(_req: Request, res: Response): void {
  res.json({ success: true, timestamp: new Date().toISOString(), data: getZones() });
}

export function getRutasHandler(_req: Request, res: Response): void {
  res.json({ success: true, timestamp: new Date().toISOString(), data: getRutas() });
}

export function getBarriosHandler(_req: Request, res: Response): void {
  res.json({ success: true, timestamp: new Date().toISOString(), data: getBarrios() });
}

export function getSectorHandler(req: Request, res: Response): void {
  const timestamp = new Date().toISOString();
  const { barrio } = req.query;

  if (typeof barrio !== "string") {
    res.status(400).json({
      success: false,
      timestamp,
      error: { code: "MISSING_PARAM", message: "Parámetro 'barrio' requerido" },
    });
    return;
  }

  const sector = getSector(barrio);
  if (!sector) {
    res.status(404).json({
      success: false,
      timestamp,
      error: { code: "BARRIO_NOT_FOUND", message: `Barrio "${barrio}" no encontrado` },
    });
    return;
  }

  res.json({
    success: true,
    timestamp,
    data: { barrio, sector: formatSectorLabel(sector) },
  });
}
