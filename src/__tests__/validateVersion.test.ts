import fs from "fs";
import os from "os";
import path from "path";

const { validateVersion } = require("../../scripts/validate-version");

function writeFixture(root: string, versionTs = "1.1.2", swaggerVersion = "1.1.2"): void {
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ version: "1.1.2" })
  );
  fs.writeFileSync(path.join(root, "src", "version.ts"), `export const API_VERSION = "${versionTs}";`);
  fs.writeFileSync(path.join(root, "src", "swagger.yaml"), `info:\n  version: "${swaggerVersion}"\n`);
}

describe("validate-version.js", () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "duitama-version-"));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("pasa cuando todas las versiones coinciden", () => {
    writeFixture(tempRoot);

    expect(validateVersion(tempRoot)).toEqual({
      expected: "1.1.2",
      mismatches: [],
    });
  });

  it("falla si src/version.ts no coincide con package.json", () => {
    writeFixture(tempRoot, "1.1.1");

    expect(validateVersion(tempRoot).mismatches).toContainEqual([
      "src/version.ts",
      "1.1.1",
    ]);
  });

  it("falla si src/swagger.yaml no coincide con package.json", () => {
    writeFixture(tempRoot, "1.1.2", "1.1.1");

    expect(validateVersion(tempRoot).mismatches).toContainEqual([
      "src/swagger.yaml",
      "1.1.1",
    ]);
  });

  it("no valida package-lock.json (proyecto usa pnpm)", () => {
    writeFixture(tempRoot);
    // Aunque exista un package-lock.json con versión incorrecta, no debe fallar
    fs.writeFileSync(
      path.join(tempRoot, "package-lock.json"),
      JSON.stringify({ version: "0.0.0" })
    );

    expect(validateVersion(tempRoot).mismatches).toHaveLength(0);
  });
});
