/**
 * bump-version.js
 * Incrementa la versión en package.json sin depender de npm/yarn.
 * Uso: node scripts/bump-version.js <patch|minor|major|prerelease> [preid]
 *
 * Ejemplos:
 *   node scripts/bump-version.js patch
 *   node scripts/bump-version.js minor
 *   node scripts/bump-version.js major
 *   node scripts/bump-version.js prerelease rc   → 1.1.4 → 1.1.5-rc.0
 */

const fs = require("fs");
const path = require("path");

const RELEASE_TYPES = ["patch", "minor", "major", "prerelease"];

function parseVersion(version) {
  // Soporta: 1.2.3 | 1.2.3-rc.0 | 1.2.3-rc.1
  const match = version.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z][a-zA-Z0-9]*)\.(\d+))?$/
  );
  if (!match) throw new Error(`Versión no reconocida: "${version}"`);
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    preid: match[4] || null,
    pre: match[5] !== undefined ? parseInt(match[5], 10) : null,
  };
}

function bumpVersion(current, releaseType, preid = "rc") {
  const v = parseVersion(current);

  switch (releaseType) {
    case "major":
      return `${v.major + 1}.0.0`;
    case "minor":
      return `${v.major}.${v.minor + 1}.0`;
    case "patch":
      // Si la versión actual es un prerelease (ej: 1.1.5-rc.0), patch la estabiliza
      if (v.preid !== null) return `${v.major}.${v.minor}.${v.patch}`;
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    case "prerelease": {
      // Si ya es prerelease con el mismo preid, incrementa el contador
      if (v.preid === preid && v.pre !== null) {
        return `${v.major}.${v.minor}.${v.patch}-${preid}.${v.pre + 1}`;
      }
      // Si es estable o tiene otro preid, sube patch y arranca en .0
      const nextPatch = v.preid !== null ? v.patch : v.patch + 1;
      return `${v.major}.${v.minor}.${nextPatch}-${preid}.0`;
    }
    default:
      throw new Error(`Tipo de release no válido: "${releaseType}". Usa: ${RELEASE_TYPES.join(", ")}`);
  }
}

function main() {
  const [, , releaseType, preid] = process.argv;

  if (!releaseType || !RELEASE_TYPES.includes(releaseType)) {
    console.error(`Uso: node scripts/bump-version.js <${RELEASE_TYPES.join("|")}> [preid]`);
    process.exit(1);
  }

  const root = path.resolve(__dirname, "..");
  const pkgPath = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  const oldVersion = pkg.version;
  const newVersion = bumpVersion(oldVersion, releaseType, preid || "rc");

  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  console.log(`Versión actualizada: ${oldVersion} → ${newVersion}`);

  // Ejecutar sync-version para propagar a version.ts y swagger.yaml
  const { syncVersion } = require("./sync-version");
  syncVersion(root);
  console.log(`Sincronizado: src/version.ts y src/swagger.yaml`);
}

main();
