describe("getZones validation", () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock("../data/barrios.json");
    jest.dontMock("../data/tarifas.json");
  });

  it("lanza error claro si falta color para un sector", () => {
    jest.doMock("../data/barrios.json", () => ({
      sector_sin_color: ["Barrio Nuevo"],
    }));
    jest.doMock("../data/tarifas.json", () => ({
      sectores: {
        sector_sin_color: { dia: 7000, nocturno: 7500 },
      },
      orden_sectores: ["sector_sin_color"],
    }));

    jest.isolateModules(() => {
      const { getZones } = require("../services/fareService");

      expect(() => getZones()).toThrow("Sector sin color configurado: sector_sin_color");
    });
  });

  it("lanza error claro si falta tarifa para un sector", () => {
    jest.doMock("../data/barrios.json", () => ({
      primer_sector: ["Barrio Nuevo"],
    }));
    jest.doMock("../data/tarifas.json", () => ({
      sectores: {},
      orden_sectores: ["primer_sector"],
    }));

    jest.isolateModules(() => {
      const { getZones } = require("../services/fareService");

      expect(() => getZones()).toThrow("Sector sin tarifa configurada: primer_sector");
    });
  });
});
