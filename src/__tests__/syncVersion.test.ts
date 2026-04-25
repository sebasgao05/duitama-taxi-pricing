import fs from "fs";
import os from "os";
import path from "path";

const { syncVersion } = require("../../scripts/sync-version");

function writeFixture(root: string): void {
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({ version: "1.1.3" }, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    `${JSON.stringify({
      version: "1.1.2",
      packages: {
        "": {
          version: "1.1.2",
        },
      },
    }, null, 2)}\n`
  );
  fs.writeFileSync(path.join(root, "src", "version.ts"), 'export const API_VERSION = "1.1.2";\n');
  fs.writeFileSync(path.join(root, "src", "swagger.yaml"), 'info:\n  version: "1.1.2"\n');
}

describe("sync-version.js", () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "duitama-sync-version-"));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("sincroniza package-lock.json, src/version.ts y src/swagger.yaml desde package.json", () => {
    writeFixture(tempRoot);

    expect(syncVersion(tempRoot)).toBe("1.1.3");

    const packageLock = JSON.parse(fs.readFileSync(path.join(tempRoot, "package-lock.json"), "utf8"));
    expect(packageLock.version).toBe("1.1.3");
    expect(packageLock.packages[""].version).toBe("1.1.3");
    expect(fs.readFileSync(path.join(tempRoot, "src", "version.ts"), "utf8")).toContain(
      'API_VERSION = "1.1.3"'
    );
    expect(fs.readFileSync(path.join(tempRoot, "src", "swagger.yaml"), "utf8")).toContain(
      'version: "1.1.3"'
    );
  });

  it("falla claro si src/version.ts no tiene API_VERSION", () => {
    writeFixture(tempRoot);
    fs.writeFileSync(path.join(tempRoot, "src", "version.ts"), "export {};\n");

    expect(() => syncVersion(tempRoot)).toThrow("No se encontro version para actualizar en src/version.ts.");
  });

  it("falla claro si package-lock.json no tiene packages raiz", () => {
    writeFixture(tempRoot);
    fs.writeFileSync(
      path.join(tempRoot, "package-lock.json"),
      `${JSON.stringify({ version: "1.1.2", packages: {} }, null, 2)}\n`
    );

    expect(() => syncVersion(tempRoot)).toThrow('package-lock.json no tiene packages[""] para actualizar.');
  });
});
