import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const files = ["index.html", "css/style.css", "js/app.js", "data/manual.json", "manifest.json", "service-worker.js", "assets/icons/icon.svg", "assets/icons/icon-192.png", "assets/icons/icon-512.png"];
await Promise.all(files.map((file) => stat(path.join(root, file))));
const [html, app, dataText, manifestText, sw] = await Promise.all([read("index.html"), read("js/app.js"), read("data/manual.json"), read("manifest.json"), read("service-worker.js")]);
const manual = JSON.parse(dataText);
const manifest = JSON.parse(manifestText);

assert.equal(manual.machine.machineId, "122");
assert.equal(manual.machine.machineName, "122激光焊机");
assert.equal(manual.machine.manualVersion, "1.0.0");
assert.equal(manual.faults.length, 3);
assert.deepEqual(manual.faults.map(f => f.steps.length), [4, 6, 2]);
assert.equal(manual.faults[2].presentation, "alternatives");
const sources = JSON.parse(await read("tests/source-text.json"));
const normalize = s => s.replace(/\s/g, "");
for (let i = 0; i < sources.length; i++) {
  const f = manual.faults[i];
  const content = normalize([f.title, f.summary, ...f.steps.map(s => s.text), ...(f.notes || []).flatMap(n => [n.title, n.text])].join(""));
  for (const paragraph of sources[i].paragraphs) {
    assert.ok(content.includes(normalize(paragraph)), `附件原文遗漏或改变：${paragraph}`);
  }
}
const imageSources = JSON.parse(await read("data/source-images.json"));
assert.equal(imageSources.length, 11);
for (const entry of imageSources) {
  const bytes = await readFile(path.join(root, entry.asset));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha256, `原图发生变化：${entry.asset}`);
  const optimized = entry.asset.replace(/\.(png|jpe?g)$/i, '.webp');
  assert.ok((await readFile(path.join(root, optimized))).length > 0, optimized);
  assert.ok(sw.includes(`./${optimized}`), `离线缓存缺图：${optimized}`);
}
for (const f of manual.faults) for (const step of f.steps) {
  assert.ok(imageSources.some(s => `./${s.asset.replace(/\.(png|jpe?g)$/i, '.webp')}` === step.image));
  const [w,h] = step.imageSize, [x,y,cw,ch] = step.crop;
  assert.ok(x >= 0 && y >= 0 && cw > 0 && ch > 0 && x + cw <= w && y + ch <= h);
  for (const m of step.markers || []) {
    const [mx,my,mw,mh] = m.rect;
    assert.ok(mx >= x && my >= y && mx + mw <= x + cw && my + mh <= y + ch, `标注越界：${step.title}`);
  }
}
assert.deepEqual(manual.maintenance, []);
assert.deepEqual(manual.safety, []);
assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
assert.match(sw, /const CACHE_NAME = "welding-guide-122-v13"/);
assert.match(html, /id="currentTime"/);
assert.match(html, /system-time\.js\?v=1/);
assert.match(sw, /system-time\.js\?v=1/);
assert.match(sw, /const CACHE_PREFIX = "welding-guide-122-"/);
assert.match(sw, /\.\/data\/manual\.json/);
assert.match(app, /fetch\("\.\/data\/manual\.json"/);
assert.match(html, /data-section="faults"/);
assert.match(html, /id="image-modal"/);

const combined = `${html}\n${app}\n${dataText}\n${manifestText}\n${sw}`;
assert.doesNotMatch(combined, /boxsteerr-pixel\.github\.io\/welding-guide\//, "不得引用101线上资源");
assert.doesNotMatch(combined, /(?:src|href)=["']\/welding-guide\//, "不得硬编码101路径");
console.log("welding-guide-122 validation: PASS");
