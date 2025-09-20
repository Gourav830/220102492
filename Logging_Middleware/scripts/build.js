import { cpSync, rmSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname.replace(/\\scripts$/, "");
rmSync(`${root}/dist`, { force: true, recursive: true });
mkdirSync(`${root}/dist`, { recursive: true });
cpSync(`${root}/src`, `${root}/dist`, { recursive: true });
console.log("Built to dist/");
