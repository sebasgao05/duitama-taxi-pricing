import fs from "fs";
import os from "os";
import path from "path";

const { validateVersion } = require("../../scripts/validate-version");

function writeFixture(root: string, packageLockVersion = "1.1.2", rootPackageVersion = "1.1.2"): void {
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ version: "1.1.2" })
  );
  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    JSON.stringify({
      version: packageLockVersion,
      packages: {
        "": {
          version: rootPackageVersion,
        },
      },
    })
  );
  fs.writeFileSync(path.join(root, "src", "version.ts"), 'export const API_VERSION = "1.1.2";');
  fs.writeFileSync(path.join(root, "src", "swagger.yaml"), 'info:\n  version: "1.1.2"\n');
}

describe("validate-version.js", () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "duitama-version-"));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("valida package-lock.json contra package.json", () => {
    writeFixture(tempRoot);

    expect(validateVersion(tempRoot)).toEqual({
      expected: "1.1.2",
      mismatches: [],
    });
  });

  it("falla si package-lock.json.version no coincide", () => {
    writeFixture(tempRoot, "1.1.1");

    expect(validateVersion(tempRoot).mismatches).toContainEqual([
      "package-lock.json",
      "1.1.1",
    ]);
  });

  it('falla si package-lock.json packages[""].version no coincide', () => {
    writeFixture(tempRoot, "1.1.2", "1.1.1");

    expect(validateVersion(tempRoot).mismatches).toContainEqual([
      'package-lock.json packages[""]',
      "1.1.1",
    ]);
  });
});
