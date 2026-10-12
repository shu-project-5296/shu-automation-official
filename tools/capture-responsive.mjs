import { mkdir, writeFile } from "node:fs/promises";

const endpoint = process.argv[2] || "http://127.0.0.1:9223";
const outputDir = process.argv[3] || "artifacts/widget-check/cdp";
const siteUrl = (process.argv[4] || "http://127.0.0.1:8765").replace(/\/$/, "");
await mkdir(outputDir, { recursive: true });

const pages = await fetch(`${endpoint}/json/list`).then((response) => response.json());
const target = pages.find((page) => page.type === "page");
if (!target) throw new Error("No debuggable page found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
await send("Page.enable");
await send("Runtime.enable");

const widths = [320, 375, 390, 430, 768, 1440];
const report = [];
for (const width of widths) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: width <= 768 });
  await send("Page.navigate", { url: `${siteUrl}/` });
  await sleep(width === 390 ? 5200 : 500);
  const metrics = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const launcher = document.querySelector('[data-diagnosis-launcher]');
      const character = launcher.querySelector('img');
      const label = launcher.querySelector('.launcher-label');
      const important = [...document.querySelectorAll('.hero .button, .site-header a, .site-header button')];
      const lr = launcher.getBoundingClientRect();
      const cr = character.getBoundingClientRect();
      const br = label.getBoundingClientRect();
      const intersects = important.some((item) => { const r=item.getBoundingClientRect(); return lr.left<r.right&&lr.right>r.left&&lr.top<r.bottom&&lr.bottom>r.top; });
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, launcherClass: launcher.className, launcherHidden: launcher.hidden || getComputedStyle(launcher).display === 'none', characterWidth: Math.round(cr.width), characterAboveButton: cr.top < br.top, horizontalCenterDelta: Math.round(Math.abs((cr.left+cr.right)/2-(br.left+br.right)/2)), importantOverlap: intersects };
    })()`
  });
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(`${outputDir}/top-${width}.png`, Buffer.from(shot.data, "base64"));
  report.push(metrics.result.value);
}

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send("Page.navigate", { url: `${siteUrl}/?view=contact#contact` });
await sleep(5000);
await send("Runtime.evaluate", { expression: `window.dispatchEvent(new Event('scroll'))` });
await sleep(250);
const contactState = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => { const launcher=document.querySelector('[data-diagnosis-launcher]').getBoundingClientRect(); const contact=document.querySelector('.contact-card a').getBoundingClientRect(); return {launcher:{top:launcher.top,bottom:launcher.bottom},contact:{top:contact.top,bottom:contact.bottom},overlap:launcher.left<contact.right&&launcher.right>contact.left&&launcher.top<contact.bottom&&launcher.bottom>contact.top,launcherBottom:getComputedStyle(document.querySelector('[data-diagnosis-launcher]')).bottom}; })()`
});
report.push({ contact: contactState.result.value });
const bottomShot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await writeFile(`${outputDir}/contact-390.png`, Buffer.from(bottomShot.data, "base64"));

await send("Runtime.evaluate", { expression: `document.querySelector('[data-open-diagnosis]').click()` });
await sleep(500);
const dialogState = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => ({ dialogOpen: document.querySelector('[data-diagnosis-dialog]').open, launcherHidden: document.querySelector('[data-diagnosis-launcher]').hidden }))()`
});
const dialogShot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await writeFile(`${outputDir}/dialog-390.png`, Buffer.from(dialogShot.data, "base64"));
report.push({ dialog: dialogState.result.value });
await send("Runtime.evaluate", { expression: `document.querySelector('[data-diagnosis-close]').click()` });
await sleep(100);
const closedState = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => { const launcher=document.querySelector('[data-diagnosis-launcher]'); const image=launcher.querySelector('img'); const label=launcher.querySelector('.launcher-label'); const ir=image.getBoundingClientRect(); const br=label.getBoundingClientRect(); return { dialogOpen: document.querySelector('[data-diagnosis-dialog]').open, launcherHidden: launcher.hidden, characterVisible: ir.width>0, characterAboveButton: ir.bottom<=br.top+6 }; })()`
});
report.push({ closed: closedState.result.value });

for (const width of [390, 1440]) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: width <= 768 });
  await send("Page.navigate", { url: `${siteUrl}/#philosophy` });
  await sleep(500);
  await send("Runtime.evaluate", { expression: `document.querySelector('#philosophy').scrollIntoView({block:'start'})` });
  await sleep(200);
  const philosophyShot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(`${outputDir}/philosophy-${width}.png`, Buffer.from(philosophyShot.data, "base64"));
}

await writeFile(`${outputDir}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
socket.close();
