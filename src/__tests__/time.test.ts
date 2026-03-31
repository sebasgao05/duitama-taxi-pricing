import { isNocturno, tieneRecargoEspecial } from "../utils/time";

describe("isNocturno", () => {
  it.each([
    ["19:00", true],
    ["23:00", true],
    ["00:00", true],
    ["05:59", true],
    ["06:00", false],
    ["12:00", false],
    ["18:59", false],
  ])("hora %s → nocturno=%s", (hora, esperado) => {
    expect(isNocturno(hora)).toBe(esperado);
  });
});

describe("tieneRecargoEspecial", () => {
  it("aplica del 16 al 31 de diciembre", () => {
    expect(tieneRecargoEspecial("2026-12-16")).toBe(true);
    expect(tieneRecargoEspecial("2026-12-31")).toBe(true);
  });

  it("no aplica el 15 de diciembre", () => {
    expect(tieneRecargoEspecial("2026-12-15")).toBe(false);
  });

  it("aplica en Jueves Santo 2026 (2 de abril)", () => {
    expect(tieneRecargoEspecial("2026-04-02")).toBe(true);
  });

  it("aplica en Viernes Santo 2026 (3 de abril)", () => {
    expect(tieneRecargoEspecial("2026-04-03")).toBe(true);
  });

  it("no aplica en un día normal", () => {
    expect(tieneRecargoEspecial("2026-03-10")).toBe(false);
  });
});
