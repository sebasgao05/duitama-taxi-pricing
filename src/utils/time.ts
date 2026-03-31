import { randomUUID } from "crypto";
import tarifasData from "../data/tarifas.json";

const TZ = "America/Bogota";

export function getNowColombia(): { hora: string; fecha: string } {
  const now = new Date();
  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const hora = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  return { hora, fecha };
}

export function generateRequestId(): string {
  return randomUUID();
}

export function isNocturno(hora: string): boolean {
  const { inicio, fin } = tarifasData.horario_nocturno;
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const minutos = toMin(hora);
  return minutos >= toMin(inicio) || minutos <= toMin(fin);
}

/**
 * Determina si una fecha aplica recargo especial.
 * Aplica en: Jueves y Viernes Santo, y del 16 al 31 de diciembre.
 */
export function tieneRecargoEspecial(fecha: string): boolean {
  const date = new Date(fecha + "T12:00:00"); // evitar desfase UTC
  const mes = date.getMonth() + 1;
  const dia = date.getDate();

  // Rango diciembre 16-31
  if (mes === 12 && dia >= 16) return true;

  // Jueves y Viernes Santo (calculado dinámicamente)
  const { juevesSanto, viernesSanto } = calcularSemanaSanta(date.getFullYear());
  const fechaStr = fecha.slice(5); // MM-DD
  if (fechaStr === juevesSanto || fechaStr === viernesSanto) return true;

  return false;
}

function calcularSemanaSanta(year: number): { juevesSanto: string; viernesSanto: string } {
  // Algoritmo de Butcher para calcular Pascua
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const pascua = new Date(year, month - 1, day);
  const jueves = new Date(pascua); jueves.setDate(pascua.getDate() - 3);
  const viernes = new Date(pascua); viernes.setDate(pascua.getDate() - 2);

  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return { juevesSanto: fmt(jueves), viernesSanto: fmt(viernes) };
}

export const RECARGO_ESPECIAL = tarifasData.recargo_especial;
