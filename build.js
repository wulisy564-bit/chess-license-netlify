const fs = require("fs");
const path = require("path");

const root = __dirname;
const source = path.join(root, "public");
const target = path.join(root, "dist");

if (!fs.existsSync(source)) {
  throw new Error("Missing public folder. Please deploy the whole project folder, not only netlify.toml or package.json.");
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });

console.log("Built static files into dist");
