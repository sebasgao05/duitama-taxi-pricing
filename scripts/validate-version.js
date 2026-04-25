const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const packageJson = JSON.parse(read("package.json"));
const versionSource = read("src/version.ts");
const swagger = read("src/swagger.yaml");

const appVersion = versionSource.match(/API_VERSION\s*=\s*"([^"]+)"/)?.[1];
const swaggerVersion = swagger.match(/^\s*version:\s*"([^"]+)"/m)?.[1];

const expected = packageJson.version;
const mismatches = [
  ["src/version.ts", appVersion],
  ["src/swagger.yaml", swaggerVersion],
].filter(([, value]) => value !== expected);

if (mismatches.length > 0) {
  console.error(`Version mismatch. package.json is ${expected}.`);
  for (const [file, value] of mismatches) {
    console.error(`- ${file}: ${value || "not found"}`);
  }
  process.exit(1);
}

console.log(`Version metadata is consistent: ${expected}`);
