import barriosData from "../data/barrios.json";
import barriosTerminalData from "../data/barrios_terminal.json";
import tarifasData from "../data/tarifas.json";
import rutasData from "../data/rutas_especiales.json";
import { Sector, FareRequest, FareResult, RutaEspecial, ZoneInfo, RutaInfo } from "../domain/types";
import { isNocturno, tieneRecargoEspecial, RECARGO_ESPECIAL, getNowColombia } from "../utils/time";

// Palabras clave que identifican el Terminal de Transporte o Carrera 42
const KEYWORDS_TERMINAL = [
  "terminal", "terminal de transporte", "carrera 42", "cra 42", "cra. 42"
];

// Índice general (tabla izquierda del decreto)
const barrioIndex = new Map<string, Sector>();
// Índice terminal (tabla derecha del decreto — desde/hacia Terminal o Carrera 42)
const barrioTerminalIndex = new Map<string, Sector>();

type BarriosJson = Record<string, string[]>;

const sectores = barriosData as unknown as BarriosJson;
const sectoresTerminal = barriosTerminalData as unknown as BarriosJson;

for (const [sector, barrios] of Object.entries(sectores)) {
  if (sector.startsWith("_")) continue;
  for (const barrio of barrios) {
    barrioIndex.set(normalizar(barrio), sector as Sector);
  }
}

for (const [sector, barrios] of Object.entries(sectoresTerminal)) {
  if (sector.startsWith("_")) continue;
  for (const barrio of barrios) {
    barrioTerminalIndex.set(normalizar(barrio), sector as Sector);
  }
}

const ORDEN_SECTORES = tarifasData.orden_sectores as string[];
const TARIFAS = tarifasData.sectores as Record<string, { dia: number; nocturno: number }>;
const RUTAS: RutaEspecial[] = rutasData as RutaEspecial[];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function esTerminal(lugar: string): boolean {
  const norm = normalizar(lugar);
  return KEYWORDS_TERMINAL.some(k => norm.includes(k));
}

export function getSector(barrio: string, desdeTerminal = false): Sector {
  const norm = normalizar(barrio);
  if (desdeTerminal) return barrioTerminalIndex.get(norm) ?? null;
  return barrioIndex.get(norm) ?? null;
}

function getSectorMasAlto(s1: Sector, s2: Sector): Sector {
  if (!s1 && !s2) return null;
  if (!s1) return s2;
  if (!s2) return s1;
  const i1 = ORDEN_SECTORES.indexOf(s1);
  const i2 = ORDEN_SECTORES.indexOf(s2);
  return ORDEN_SECTORES[Math.max(i1, i2)] as Sector;
}

function buscarRutaEspecial(origen: string, destino: string): RutaEspecial | null {
  const origenNorm = normalizar(origen);
  const destinoNorm = normalizar(destino);
  for (const ruta of RUTAS) {
    const zonasNorm = ruta.zonas.map(normalizar);
    if (
      zonasNorm.some(z => origenNorm.includes(z) || z.includes(origenNorm)) &&
      zonasNorm.some(z => destinoNorm.includes(z) || z.includes(destinoNorm))
    ) {
      return ruta;
    }
  }
  return null;
}

export function formatSectorLabel(sector: string): string {
  return sector.replace(/_/g, " ");
}

export function calcularTarifa(
  req: FareRequest
): FareResult & { hora_consulta: string; fecha_consulta: string } {
  const { hora, fecha } = getNowColombia();
  const nocturno = isNocturno(hora);
  const tipo = nocturno ? "nocturna" : "diurna";
  const recargos: string[] = [];

  // 1. Verificar ruta especial única
  const rutaEspecial = buscarRutaEspecial(req.origen, req.destino);
  if (rutaEspecial) {
    let tarifa = nocturno ? rutaEspecial.tarifa.nocturno : rutaEspecial.tarifa.dia;
    if (tieneRecargoEspecial(fecha)) {
      tarifa += RECARGO_ESPECIAL;
      recargos.push(`Recargo especial: +$${RECARGO_ESPECIAL}`);
    }
    return {
      tarifa, tipo,
      sector_aplicado: "tarifa especial única",
      detalle: rutaEspecial.nombre,
      recargos, hora_consulta: hora, fecha_consulta: fecha,
    };
  }

  // 2. Detectar si el viaje involucra el Terminal o Carrera 42
  const origenEsTerminal = esTerminal(req.origen);
  const destinoEsTerminal = esTerminal(req.destino);
  const involucraTerminal = origenEsTerminal || destinoEsTerminal;

  // El barrio "no-terminal" es el que determina el sector en la tabla correspondiente
  const barrioConsulta = origenEsTerminal ? req.destino : req.origen;
  const indice = involucraTerminal ? barrioTerminalIndex : barrioIndex;
  const sectorBarrio = indice.get(normalizar(barrioConsulta)) ?? null;

  // Si no involucra terminal, también buscamos el otro extremo para tomar el más alto
  let sectorAplicado: Sector;
  if (involucraTerminal) {
    sectorAplicado = sectorBarrio;
  } else {
    const sectorOrigen = barrioIndex.get(normalizar(req.origen)) ?? null;
    const sectorDestino = barrioIndex.get(normalizar(req.destino)) ?? null;
    sectorAplicado = getSectorMasAlto(sectorOrigen, sectorDestino);
  }

  if (!sectorAplicado) {
    throw new Error(
      `No se encontró sector para "${req.origen}" ni para "${req.destino}". Verifique los nombres.`
    );
  }

  const tarifaBase = TARIFAS[sectorAplicado];
  let tarifa = nocturno ? tarifaBase.nocturno : tarifaBase.dia;

  // 3. Recargo especial (no acumulable)
  if (tieneRecargoEspecial(fecha)) {
    tarifa += RECARGO_ESPECIAL;
    recargos.push(`Recargo especial: +$${RECARGO_ESPECIAL}`);
  }

  const contexto = involucraTerminal ? " (desde/hacia Terminal)" : "";

  return {
    tarifa, tipo,
    sector_aplicado: formatSectorLabel(sectorAplicado),
    detalle: `Tarifa base ${formatSectorLabel(sectorAplicado)} ${tipo}${contexto}`,
    recargos, hora_consulta: hora, fecha_consulta: fecha,
  };
}

export function getRutas(): RutaInfo[] {
  return RUTAS.map(({ id, nombre, descripcion, zonas, tarifa }) => ({
    id, nombre, descripcion, zonas,
    tarifa_dia: tarifa.dia,
    tarifa_nocturna: tarifa.nocturno,
  }));
}

export function getZones(): ZoneInfo[] {
  const colores: Record<string, string> = {
    primer_sector: "#4CAF50",
    segundo_sector: "#2196F3",
    tarifa_especial: "#FF9800",
    tercer_sector: "#9C27B0",
    cuarto_sector: "#F44336",
  };
  return Object.entries(sectores)
    .filter(([k]) => !k.startsWith("_"))
    .map(([sector, barrios]) => ({
      sector: formatSectorLabel(sector),
      color: colores[sector] ?? "#607D8B",
      tarifa_dia: TARIFAS[sector]?.dia,
      tarifa_nocturna: TARIFAS[sector]?.nocturno,
      barrios,
    }));
}

export function getBarrios(): object {
  return {
    general: Object.fromEntries(
      Object.entries(sectores)
        .filter(([k]) => !k.startsWith("_"))
        .map(([sector, barrios]) => [formatSectorLabel(sector), [...barrios].sort()])
    ),
    terminal: Object.fromEntries(
      Object.entries(sectoresTerminal)
        .filter(([k]) => !k.startsWith("_"))
        .map(([sector, barrios]) => [formatSectorLabel(sector), [...barrios].sort()])
    ),
  };
}
