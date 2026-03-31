export type SectorKey =
  | "primer_sector"
  | "segundo_sector"
  | "tarifa_especial"
  | "tercer_sector"
  | "cuarto_sector";

export type Sector = SectorKey | null;

export interface FareRequest {
  origen: string;
  destino: string;
}

export interface FareResult {
  tarifa: number;
  tipo: "diurna" | "nocturna";
  sector_aplicado: string;
  detalle: string;
  recargos: string[];
}

export interface FareResponse {
  success: true;
  timestamp: string;       // ISO 8601 UTC
  request_id: string;      // UUID v4
  data: FareResult & {
    origen: string;
    destino: string;
    hora_consulta: string; // HH:MM hora local Colombia
    fecha_consulta: string;// YYYY-MM-DD fecha local Colombia
  };
}

export interface ErrorResponse {
  success: false;
  timestamp: string;
  request_id: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface RutaEspecial {
  id: string;
  nombre: string;
  descripcion: string;
  zonas: string[];
  tarifa: { dia: number; nocturno: number };
}

export interface TarifasSector {
  dia: number;
  nocturno: number;
}

export interface ZoneInfo {
  sector: string;
  color: string;
  tarifa_dia: number;
  tarifa_nocturna: number;
  barrios: string[];
}

export interface RutaInfo {
  id: string;
  nombre: string;
  descripcion: string;
  zonas: string[];
  tarifa_dia: number;
  tarifa_nocturna: number;
}
