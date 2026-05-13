/**
 * sync-version.js
 * Propaga la versión de package.json a src/version.ts y src/swagger.yaml.
 * No toca ningún lockfile (pnpm-lock.yaml es gestionado por pnpm).
 */

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
    throw new Error(`No se encontró versión para actualizar en ${file}.`);
  }
  return content.replace(pattern, replacement);
}

function syncVersion(projectRoot = root) {
  const resolve = (file) => path.join(projectRoot, file);
  const packageJson = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
  const version = packageJson.version;

  if (typeof version !== "string" || version.length === 0) {
    throw new Error("package.json no tiene una versión válida.");
  }

  // Sincronizar src/version.ts
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

  // Sincronizar src/swagger.yaml
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
  console.log(`Versión sincronizada: ${version}`);
}

module.exports = { syncVersion };
