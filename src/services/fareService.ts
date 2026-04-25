import barriosData from "../data/barrios.json";
import barriosTerminalData from "../data/barrios_terminal.json";
import tarifasData from "../data/tarifas.json";
import rutasData from "../data/rutas_especiales.json";
import { Sector, FareRequest, FareResult, RutaEspecial, ZoneInfo, RutaInfo, TarifasSector } from "../domain/types";
import { isNocturno, tieneRecargoEspecial, RECARGO_ESPECIAL, getNowColombia } from "../utils/time";

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

const KEYWORDS_TERMINAL = [
  "terminal", "terminal de transporte", "carrera 42", "cra 42", "cra. 42"
];

type BarriosJson = Record<string, string[]>;

// Índices SEPARADOS: uno para tabla general, otro para tabla terminal
// Esto evita sobrescrituras y permite trazabilidad completa
const barrioGeneralIndex = new Map<string, Sector>();
const barrioTerminalIndex = new Map<string, Sector>();

const sectores = barriosData as unknown as BarriosJson;
const sectoresTerminal = barriosTerminalData as unknown as BarriosJson;

// Construir índice general
for (const [sector, barrios] of Object.entries(sectores)) {
  if (sector.startsWith("_")) continue;
  for (const barrio of barrios) {
    const key = normalizar(barrio);
    // Si ya existe dentro del MISMO sector, es duplicado real
    if (barrioGeneralIndex.has(key)) {
      console.warn(`[WARN] Barrio duplicado en tabla general: "${barrio}" (sector: ${sector})`);
    }
    barrioGeneralIndex.set(key, sector as Sector);
  }
}

// Construir índice terminal (independiente del general)
for (const [sector, barrios] of Object.entries(sectoresTerminal)) {
  if (sector.startsWith("_")) continue;
  for (const barrio of barrios) {
    const key = normalizar(barrio);
    barrioTerminalIndex.set(key, sector as Sector);
  }
}

const ORDEN_SECTORES = tarifasData.orden_sectores as string[];
const TARIFAS = tarifasData.sectores as Record<string, TarifasSector>;
const RUTAS: RutaEspecial[] = rutasData as RutaEspecial[];

// ============================================================================
// FUNCIONES UTILITARIAS
// ============================================================================

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

export function formatSectorLabel(sector: string): string {
  return sector.replace(/_/g, " ");
}

// ============================================================================
// BÚSQUEDA DE BARRIOS - SIN APROXIMACIONES
// ============================================================================

/**
 * Busca un barrio en la tabla GENERAL con matching EXACTO (tras normalizar).
 * Retorna null si no existe - NO hay aproximaciones ni "valores cercanos".
 */
export function getSectorGeneral(barrio: string): Sector {
  const norm = normalizar(barrio);
  return barrioGeneralIndex.get(norm) ?? null;
}

/**
 * Busca un barrio en la tabla TERMINAL con matching EXACTO (tras normalizar).
 * Retorna null si no existe - NO hay aproximaciones ni "valores cercanos".
 */
export function getSectorTerminal(barrio: string): Sector {
  const norm = normalizar(barrio);
  return barrioTerminalIndex.get(norm) ?? null;
}

/**
 * Busca un barrio en AMBAS tablas y retorna la primera coincidencia.
 * Prioridad: terminal → general (si se llama desde contexto terminal)
 * Retorna null si no existe en ninguna tabla.
 */
export function getSector(barrio: string, preferirTerminal = false): { sector: Sector; fuente: "general" | "terminal" } | null {
  const norm = normalizar(barrio);
  if (preferirTerminal) {
    const terminalResult = barrioTerminalIndex.get(norm);
    if (terminalResult) return { sector: terminalResult, fuente: "terminal" };
    const generalResult = barrioGeneralIndex.get(norm);
    if (generalResult) return { sector: generalResult, fuente: "general" };
    return null;
  } else {
    const generalResult = barrioGeneralIndex.get(norm);
    if (generalResult) return { sector: generalResult, fuente: "general" };
    const terminalResult = barrioTerminalIndex.get(norm);
    if (terminalResult) return { sector: terminalResult, fuente: "terminal" };
    return null;
  }
}

/**
 * Determina el sector más alto entre dos según el orden del decreto.
 * Prioridad: cuarto_sector > tercer_sector > tarifa_especial > segundo_sector > primer_sector
 */
function getSectorMasAlto(s1: Sector, s2: Sector): Sector {
  /* istanbul ignore next -- calcularTarifa validates that at least one sector exists before calling this helper */
  if (!s1 && !s2) return null;
  if (!s1) return s2;
  if (!s2) return s1;
  const i1 = ORDEN_SECTORES.indexOf(s1);
  const i2 = ORDEN_SECTORES.indexOf(s2);
  /* istanbul ignore next -- defensive guard for corrupted tariff data */
  if (i1 === -1 || i2 === -1) {
    throw new Error(`Sector inválido: ${s1} (${i1}) o ${s2} (${i2})`);
  }
  return ORDEN_SECTORES[Math.max(i1, i2)] as Sector;
}

/**
 * Matching EXACTO para zonas de ruta especial.
 * Un barrio coincide SOLO si:
 *   - Es idéntico tras normalizar (ej: "cogollo" === "cogollo")
 *
 * NO se permite matching por substring para evitar falsos positivos:
 *   - "Cogollo Alto" NO debe matchear con zona "Cogollo" (son barrios distintos)
 *   - "San Fernando" NO debe matchear con zona "San" (demasiado genérico)
 *
 * Si se requiere que "Cogollo Alto" esté en la ruta, debe estar EXPLÍCITAMENTE en zonas[].
 */
function matchZonaExacta(lugar: string, zonasNorm: string[]): boolean {
  const norm = normalizar(lugar);
  return zonasNorm.some(z => norm === z);
}

/**
 * Busca si origen O destino pertenece a una ruta especial.
 * Retorna la PRIMERA ruta que coincida (orden de definición en JSON).
 */
function buscarRutaEspecial(origen: string, destino: string): { ruta: RutaEspecial; zonaCoincidente: string } | null {
  for (const ruta of RUTAS) {
    const zonasNorm = ruta.zonas.map(normalizar);
    if (matchZonaExacta(origen, zonasNorm)) {
      return { ruta, zonaCoincidente: origen };
    }
    if (matchZonaExacta(destino, zonasNorm)) {
      return { ruta, zonaCoincidente: destino };
    }
  }
  return null;
}

// ============================================================================
// CÁLCULO DE TARIFAS - ARQUITECTURA POR PRIORIDAD
// ============================================================================

/**
 * Regla de prioridad (ORDEN DE EVALUACIÓN):
 *
 * 1. RUTA ESPECIAL ÚNICA → Si origen O destino está en zonas de ruta especial
 *    - Tarifa FIJA del JSON de rutas
 *    - NO se compara con sectores
 *    - NO se combina con nada
 *
 * 2. TABLA TERMINAL → Si origen O destino ES terminal/Carrera 42
 *    - Se usa la tabla terminal para el OTRO barrio
 *    - El barrio no-terminal debe estar EXPLÍCITAMENTE en la tabla terminal
 *
 * 3. TABLA GENERAL → Default para todos los demás casos
 *    - Se toma el sector MÁS ALTO entre origen y destino
 *
 * En NINGÚN caso se hacen aproximaciones o redondeos.
 */
export function calcularTarifa(
  req: FareRequest
): FareResult & { hora_consulta: string; fecha_consulta: string; fuente: string } {
  const { hora, fecha } = getNowColombia();
  const nocturno = isNocturno(hora);
  const tipo = nocturno ? "nocturna" : "diurna";
  const recargos: string[] = [];

  // ==========================================================================
  // PRIORIDAD 1: RUTA ESPECIAL ÚNICA (override total)
  // ==========================================================================
  const rutaEncontrada = buscarRutaEspecial(req.origen, req.destino);

  if (rutaEncontrada) {
    const { ruta, zonaCoincidente } = rutaEncontrada;
    let tarifa = nocturno ? ruta.tarifa.nocturno : ruta.tarifa.dia;

    // Aplicar recargo especial si corresponde (no acumulable)
    if (tieneRecargoEspecial(fecha)) {
      tarifa += RECARGO_ESPECIAL;
      recargos.push(`Recargo especial: +$${RECARGO_ESPECIAL}`);
    }

    return {
      tarifa,
      tipo,
      sector_aplicado: "ruta especial única",
      detalle: `${ruta.nombre} (zona: ${zonaCoincidente})`,
      recargos,
      hora_consulta: hora,
      fecha_consulta: fecha,
      fuente: `rutas_especiales.json → ${ruta.id}`,
    };
  }

  // ==========================================================================
  // PRIORIDAD 2: TABLA TERMINAL (condicional)
  // ==========================================================================
  const origenEsTerminal = esTerminal(req.origen);
  const destinoEsTerminal = esTerminal(req.destino);
  const involucraTerminal = origenEsTerminal || destinoEsTerminal;

  if (involucraTerminal) {
    const barrioNoTerminal = origenEsTerminal ? req.destino : req.origen;
    const sectorEnTablaTerminal = getSectorTerminal(barrioNoTerminal);

    // Verificar que el barrio esté EXPLÍCITAMENTE en la tabla terminal
    if (sectorEnTablaTerminal) {
      const tarifaBase = nocturno ? TARIFAS[sectorEnTablaTerminal].nocturno : TARIFAS[sectorEnTablaTerminal].dia;
      let tarifa = tarifaBase;

      if (tieneRecargoEspecial(fecha)) {
        tarifa += RECARGO_ESPECIAL;
        recargos.push(`Recargo especial: +$${RECARGO_ESPECIAL}`);
      }

      return {
        tarifa,
        tipo,
        sector_aplicado: formatSectorLabel(sectorEnTablaTerminal),
        detalle: `Tarifa base ${formatSectorLabel(sectorEnTablaTerminal)} ${tipo} (desde/hacia Terminal)`,
        recargos,
        hora_consulta: hora,
        fecha_consulta: fecha,
        fuente: `barrios_terminal.json → ${sectorEnTablaTerminal}`,
      };
    }

    // Si el barrio no está en tabla terminal, caer a general con advertencia
    console.warn(
      `[WARN] "${barrioNoTerminal}" involucra Terminal pero NO está en barrios_terminal.json. ` +
      `Usando tabla general (posible tarifa incorrecta).`
    );
  }

  // ==========================================================================
  // PRIORIDAD 3: TABLA GENERAL (default)
  // ==========================================================================
  const sectorOrigen = getSectorGeneral(req.origen);
  const sectorDestino = getSectorGeneral(req.destino);

  // Validar que al menos uno exista
  if (!sectorOrigen && !sectorDestino) {
    throw new Error(
      `No se encontró sector para "${req.origen}" ni para "${req.destino}". ` +
      `Verifique los nombres en barrios.json.`
    );
  }

  // Tomar el sector más alto entre origen y destino
  const sectorAplicado = getSectorMasAlto(sectorOrigen, sectorDestino);

  /* istanbul ignore next -- getSectorMasAlto only returns null when both sectors are null, validated above */
  if (!sectorAplicado) {
    throw new Error(
      `Uno de los barrios no tiene sector asignado: "${req.origen}" o "${req.destino}"`
    );
  }

  const tarifaBase = nocturno ? TARIFAS[sectorAplicado].nocturno : TARIFAS[sectorAplicado].dia;
  let tarifa = tarifaBase;

  if (tieneRecargoEspecial(fecha)) {
    tarifa += RECARGO_ESPECIAL;
    recargos.push(`Recargo especial: +$${RECARGO_ESPECIAL}`);
  }

  return {
    tarifa,
    tipo,
    sector_aplicado: formatSectorLabel(sectorAplicado),
    detalle: `Tarifa base ${formatSectorLabel(sectorAplicado)} ${tipo}`,
    recargos,
    hora_consulta: hora,
    fecha_consulta: fecha,
    fuente: `barrios.json → ${sectorAplicado}`,
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
      color: colores[sector] ?? /* istanbul ignore next */ "#607D8B",
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
