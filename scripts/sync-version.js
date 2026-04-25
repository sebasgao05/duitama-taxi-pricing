const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function writeIfChanged(filePath, content) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  if (current !== content) {
    fs.writeFileSync(filePath, content);
  }
}

function replaceRequired(content, pattern, replacement, file) {
  if (!pattern.test(content)) {
    throw new Error(`No se encontro version para actualizar en ${file}.`);
  }
  return content.replace(pattern, replacement);
}

function syncVersion(projectRoot = root) {
  const resolve = (file) => path.join(projectRoot, file);
  const packageJson = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  const version = packageJson.version;

  if (typeof version !== "string" || version.length === 0) {
    throw new Error("package.json no tiene una version valida.");
  }

  const packageLockPath = resolve("package-lock.json");
  const packageLock = JSON.parse(fs.readFileSync(packageLockPath, "utf8"));
  if (!packageLock.packages || !packageLock.packages[""]) {
    throw new Error('package-lock.json no tiene packages[""] para actualizar.');
  }
  packageLock.version = version;
  packageLock.packages[""].version = version;
  writeIfChanged(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`);

  const versionTsPath = resolve("src/version.ts");
  const versionTs = fs.readFileSync(versionTsPath, "utf8");
  writeIfChanged(
    versionTsPath,
    replaceRequired(
      versionTs,
      /API_VERSION\s*=\s*"[^"]+"/,
      `API_VERSION = "${version}"`,
      "src/version.ts"
    )
  );

  const swaggerPath = resolve("src/swagger.yaml");
  const swagger = fs.readFileSync(swaggerPath, "utf8");
  writeIfChanged(
    swaggerPath,
    replaceRequired(
      swagger,
      /^(\s*version:\s*)"[^"]+"/m,
      `$1"${version}"`,
      "src/swagger.yaml"
    )
  );

  return version;
}

if (require.main === module) {
  const version = syncVersion();
  console.log(`Version synchronized: ${version}`);
}

module.exports = { syncVersion };
