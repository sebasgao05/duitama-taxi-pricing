import supertest from "supertest";
import app from "../server";

const api = supertest(app);
const post = (url: string) => api.post(url).set("Content-Type", "application/json");

jest.mock("../utils/time", () => {
  const original = jest.requireActual("../utils/time");
  return {
    ...original,
    getNowColombia: jest.fn(() => ({ hora: "10:00", fecha: "2026-03-10" })),
  };
});

describe("POST /api/v2026/calculate-fare", () => {
  describe("Tarifas base diurnas", () => {
    it.each([
      ["Santander", "San Fernando", 7000, "primer sector"],
      ["Parte Alta Milagrosa", "Comunal", 7900, "segundo sector"],
      ["San Fernando", "Barrio León XIII", 8600, "tarifa especial"],
      ["Sauna La Frontera", "San Fernando", 10200, "tercer sector"],
      ["Cogollo Alto", "San Fernando", 12600, "cuarto sector"],
    ])("%s → %s = $%i (%s)", async (origen, destino, tarifa, sector) => {
      const res = await post("/api/v2026/calculate-fare")
        .send({ origen, destino });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tarifa).toBe(tarifa);
      expect(res.body.data.tipo).toBe("diurna");
      expect(res.body.data.sector_aplicado).toBe(sector);
      expect(res.body.data.recargos).toEqual([]);
    });
  });

  describe("Sector más alto entre origen y destino", () => {
    it("primer + cuarto → cuarto sector ($12.600)", async () => {
      const res = await post("/api/v2026/calculate-fare")
        .send({ origen: "Santander", destino: "Cogollo Alto" });

      expect(res.body.data.tarifa).toBe(12600);
      expect(res.body.data.sector_aplicado).toBe("cuarto sector");
    });

    it("tercer + segundo → tercer sector ($10.200)", async () => {
      const res = await post("/api/v2026/calculate-fare")
        .send({ origen: "Sauna La Frontera", destino: "Parte Alta Milagrosa" });

      expect(res.body.data.tarifa).toBe(10200);
      expect(res.body.data.sector_aplicado).toBe("tercer sector");
    });
  });

  describe("Tarifa nocturna", () => {
    beforeEach(() => {
      const { getNowColombia } = require("../utils/time");
      getNowColombia.mockReturnValue({ hora: "21:00", fecha: "2026-03-10" });
    });

    it.each([
      ["Santander", "San Fernando", 7500],
      ["Parte Alta Milagrosa", "Comunal", 8600],
      ["Sauna La Frontera", "San Fernando", 10900],
      ["Cogollo Alto", "San Fernando", 13100],
    ])("%s → %s nocturno = $%i", async (origen, destino, tarifa) => {
      const res = await post("/api/v2026/calculate-fare")
        .send({ origen, destino });

      expect(res.body.data.tarifa).toBe(tarifa);
      expect(res.body.data.tipo).toBe("nocturna");
    });
  });

  describe("Recargo especial $600", () => {
    it("aplica en diciembre 16 (diurno)", async () => {
      const { getNowColombia } = require("../utils/time");
      getNowColombia.mockReturnValue({ hora: "10:00", fecha: "2026-12-16" });

      const res = await post("/api/v2026/calculate-fare")
        .send({ origen: "Santander", destino: "San Fernando" });

      expect(res.body.data.tarifa).toBe(7600);
      expect(res.body.data.recargos).toContain("Recargo especial: +$600");
    });

    it("aplica en Viernes Santo 2026 (nocturno)", async () => {
      const { getNowColombia } = require("../utils/time");
      getNowColombia.mockReturnValue({ hora: "22:00", fecha: "2026-04-03" });

      const res = await post("/api/v2026/calculate-fare")
        .send({ origen: "Santander", destino: "San Fernando" });

      expect(res.body.data.tarifa).toBe(8100);
      expect(res.body.data.recargos).toContain("Recargo especial: +$600");
    });

    it("no aplica en día normal", async () => {
      const { getNowColombia } = require("../utils/time");
      getNowColombia.mockReturnValue({ hora: "10:00", fecha: "2026-03-10" });

      const res = await post("/api/v2026/calculate-fare")
        .send({ origen: "Santander", destino: "San Fernando" });

      expect(res.body.data.tarifa).toBe(7000);
      expect(res.body.data.recargos).toEqual([]);
    });
  });

  describe("Rutas especiales únicas", () => {
    beforeEach(() => {
      const { getNowColombia } = require("../utils/time");
      getNowColombia.mockReturnValue({ hora: "10:00", fecha: "2026-03-10" });
    });

    it.each([
      ["Terminal de Transporte", "Cogollo", 15000, "Ruta del Mundial / Cogollo / Campohermoso"],
      ["Tribuna Mirador", "Altos de Surba y Bonza", 16200, "Ruta del Mundial / Tribuna Mirador / Seminario Mayor"],
      ["Ciudadela Industrial", "Lecheboy", 19100, "Ciudadela Industrial / Centro Abastos / Lecheboy"],
      ["La Trinidad", "La Helida", 22200, "Vereda La Trinidad / La Helida"],
    ])("%s → %s = $%i", async (origen, destino, tarifa, detalle) => {
      const res = await post("/api/v2026/calculate-fare")
        .send({ origen, destino });

      expect(res.body.data.tarifa).toBe(tarifa);
      expect(res.body.data.sector_aplicado).toBe("tarifa especial única");
      expect(res.body.data.detalle).toBe(detalle);
    });
  });

  describe("Tolerancia a tildes y mayúsculas", () => {
    it("acepta nombres en minúsculas sin tildes", async () => {
      const res = await post("/api/v2026/calculate-fare")
        .send({ origen: "san fernando", destino: "santander" });

      expect(res.status).toBe(200);
      expect(res.body.data.tarifa).toBe(7000);
    });

    it("acepta nombres en mayúsculas", async () => {
      const res = await post("/api/v2026/calculate-fare")
        .send({ origen: "COGOLLO ALTO", destino: "SAN FERNANDO" });

      expect(res.status).toBe(200);
      expect(res.body.data.tarifa).toBe(12600);
    });
  });

  describe("Metadata en respuesta", () => {
    it("incluye success, timestamp, request_id y campos de consulta", async () => {
      const res = await post("/api/v2026/calculate-fare")
        .send({ origen: "Santander", destino: "San Fernando" });

      expect(res.body.success).toBe(true);
      expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(res.body.request_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
      expect(res.body.data.hora_consulta).toMatch(/^\d{2}:\d{2}$/);
      expect(res.body.data.fecha_consulta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(res.body.data.origen).toBe("Santander");
      expect(res.body.data.destino).toBe("San Fernando");
    });
  });

  describe("Errores de validación", () => {
    it("400 si falta origen", async () => {
      const res = await post("/api/v2026/calculate-fare")
        .send({ destino: "San Fernando" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("400 si falta destino", async () => {
      const res = await post("/api/v2026/calculate-fare")
        .send({ origen: "Santander" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("400 si body vacío", async () => {
      const res = await post("/api/v2026/calculate-fare").send({});
      expect(res.status).toBe(400);
    });

    it("422 si ambos barrios no existen", async () => {
      const res = await post("/api/v2026/calculate-fare")
        .send({ origen: "BarrioFalso", destino: "OtroFalso" });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("SECTOR_NOT_FOUND");
    });
  });
});

describe("GET /api/v2026/sector", () => {
  it("retorna sector correcto para San Fernando", async () => {
    const res = await api.get("/api/v2026/sector?barrio=San Fernando");
    expect(res.status).toBe(200);
    expect(res.body.data.sector).toBe("primer sector");
  });

  it("404 si barrio no existe", async () => {
    const res = await api.get("/api/v2026/sector?barrio=BarrioFalso");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("BARRIO_NOT_FOUND");
  });

  it("400 si no se envía parámetro", async () => {
    const res = await api.get("/api/v2026/sector");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_PARAM");
  });
});

describe("GET /api/v2026/zones", () => {
  it("retorna 5 sectores con colores y tarifas", async () => {
    const res = await api.get("/api/v2026/zones");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data[0]).toHaveProperty("color");
    expect(res.body.data[0]).toHaveProperty("tarifa_dia");
    expect(res.body.data[0]).toHaveProperty("tarifa_nocturna");
  });
});

describe("GET /api/v2026/rutas-especiales", () => {
  it("retorna 5 rutas con tarifas día y noche", async () => {
    const res = await api.get("/api/v2026/rutas-especiales");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data[0].tarifa_dia).toBe(15000);
    expect(res.body.data[0].tarifa_nocturna).toBe(15800);
  });
});

describe("GET /api/v2026/barrios", () => {
  it("retorna barrios agrupados por sector (general y terminal)", async () => {
    const res = await api.get("/api/v2026/barrios");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.general).toHaveProperty("primer sector");
    expect(res.body.data.general).toHaveProperty("cuarto sector");
    expect(res.body.data.terminal).toHaveProperty("primer sector");
    expect(res.body.data.terminal).toHaveProperty("cuarto sector");
  });
});

describe("POST /api/v2026/calculate-fare — Tarifas desde/hacia Terminal", () => {
  beforeEach(() => {
    const { getNowColombia } = require("../utils/time");
    getNowColombia.mockReturnValue({ hora: "10:00", fecha: "2026-03-10" });
  });

  it.each([
    ["Terminal de Transporte", "San Fernando", 7000, "primer sector"],
    ["Terminal de Transporte", "Parte Alta Milagrosa", 7900, "segundo sector"],
    ["Terminal de Transporte", "Barrio León XIII", 8600, "tarifa especial"],
    ["Terminal de Transporte", "Capilla Tocogua", 10200, "tercer sector"],
    ["Terminal de Transporte", "Sauna La Frontera", 12600, "cuarto sector"],
    ["Terminal de Transporte", "Las Margaritas", 12600, "cuarto sector"],
    ["Carrera 42", "San Fernando", 7000, "primer sector"],
    ["San Fernando", "Terminal de Transporte", 7000, "primer sector"],
  ])("%s → %s = $%i (%s)", async (origen, destino, tarifa, sector) => {
    const res = await post("/api/v2026/calculate-fare")
      .send({ origen, destino });

    expect(res.status).toBe(200);
    expect(res.body.data.tarifa).toBe(tarifa);
    expect(res.body.data.sector_aplicado).toBe(sector);
    expect(res.body.data.detalle).toContain("(desde/hacia Terminal)");
  });

  it("Sauna La Frontera general (tercer sector) vs Terminal (cuarto sector)", async () => {
    const general = await post("/api/v2026/calculate-fare")
      .send({ origen: "Sauna La Frontera", destino: "San Fernando" });
    expect(general.body.data.tarifa).toBe(10200);
    expect(general.body.data.sector_aplicado).toBe("tercer sector");

    const terminal = await post("/api/v2026/calculate-fare")
      .send({ origen: "Terminal de Transporte", destino: "Sauna La Frontera" });
    expect(terminal.body.data.tarifa).toBe(12600);
    expect(terminal.body.data.sector_aplicado).toBe("cuarto sector");
  });
});

describe("GET /health", () => {
  it("retorna status ok", async () => {
    const res = await api.get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.version).toBe("1.0.0");
  });
});

describe("Rutas no existentes", () => {
  it("404 con código NOT_FOUND", async () => {
    const res = await api.get("/api/v2026/ruta-inexistente");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
