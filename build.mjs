import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
const source = await readFile("src/server.js", "utf8");
const files = await readdir("assets");
const assets = {};
for (const file of files) {
  const bytes = await readFile(path.join("assets", file));
  const type = file.endsWith(".png") ? "image/png" : file.endsWith(".webp") ? "image/webp" : "image/jpeg";
  assets[file] = { type, base64: bytes.toString("base64") };
}
const client=await readFile('src/client.js','utf8');
const styles=(await readFile('src/style.css','utf8')).replace(/^@import[^\n]+\n/,'');
await writeFile("dist/server/index.js", source.replace("const ASSETS = {};",()=>`const ASSETS = ${JSON.stringify(assets)};`).replace("const CLIENT = '';",()=>`const CLIENT = ${JSON.stringify(client)};`).replace("const STYLES = '';",()=>`const STYLES = ${JSON.stringify(styles)};`));
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
