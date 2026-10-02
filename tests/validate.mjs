import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const files = ["index.html", "css/style.css", "js/app.js", "data/manual.json", "manifest.json", "service-worker.js", "assets/icons/icon.svg", "assets/icons/icon-192.png", "assets/icons/icon-512.png"];
await Promise.all(files.map((file) => stat(path.join(root, file))));
const [html, app, dataText, manifestText, sw] = await Promise.all([read("index.html"), read("js/app.js"), read("data/manual.json"), read("manifest.json"), read("service-worker.js")]);
const manual = JSON.parse(dataText);
const manifest = JSON.parse(manifestText);

assert.equal(manual.machine.machineId, "122");
assert.equal(manual.machine.machineName, "122激光焊机");
assert.equal(manual.machine.manualVersion, "0.1.0");
assert.deepEqual(manual.faults, []);
assert.deepEqual(manual.maintenance, []);
assert.deepEqual(manual.safety, []);
assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
assert.match(sw, /const CACHE_NAME = "welding-guide-122-v8"/);
assert.match(sw, /const CACHE_PREFIX = "welding-guide-122-"/);
assert.match(sw, /\.\/data\/manual\.json/);
assert.match(app, /fetch\("\.\/data\/manual\.json"/);
assert.match(html, /data-section="faults"/);
assert.match(html, /id="image-modal"/);

const combined = `${html}\n${app}\n${dataText}\n${manifestText}\n${sw}`;
assert.doesNotMatch(combined, /boxsteerr-pixel\.github\.io\/welding-guide\//, "不得引用101线上资源");
assert.doesNotMatch(combined, /(?:src|href)=["']\/welding-guide\//, "不得硬编码101路径");
console.log("welding-guide-122 validation: PASS");
