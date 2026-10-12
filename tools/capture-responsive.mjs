import { mkdir, writeFile } from "node:fs/promises";

const endpoint = process.argv[2] || "http://127.0.0.1:9223";
const outputDir = process.argv[3] || "artifacts/widget-check/cdp";
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
  await send("Page.navigate", { url: "http://127.0.0.1:8765/" });
  await sleep(350);
  await send("Runtime.evaluate", { expression: `document.querySelector('[data-diagnosis-launcher]').classList.add('is-compact'); window.dispatchEvent(new Event('resize'))` });
  await sleep(50);
  const metrics = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const launcher = document.querySelector('[data-diagnosis-launcher]');
      const important = [...document.querySelectorAll('.hero .button, .site-header a, .site-header button')];
      const lr = launcher.getBoundingClientRect();
      const intersects = important.some((item) => { const r=item.getBoundingClientRect(); return lr.left<r.right&&lr.right>r.left&&lr.top<r.bottom&&lr.bottom>r.top; });
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, launcherClass: launcher.className, launcherHidden: getComputedStyle(launcher).opacity === '0', importantOverlap: intersects };
    })()`
  });
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(`${outputDir}/top-${width}.png`, Buffer.from(shot.data, "base64"));
  report.push(metrics.result.value);
}

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send("Page.navigate", { url: "http://127.0.0.1:8765/?view=contact#contact" });
await sleep(5000);
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
  expression: `(() => ({ dialogOpen: document.querySelector('[data-diagnosis-dialog]').open, launcherHidden: document.querySelector('[data-diagnosis-launcher]').hidden, launcherCompact: document.querySelector('[data-diagnosis-launcher]').classList.contains('is-compact') }))()`
});
report.push({ closed: closedState.result.value });

await writeFile(`${outputDir}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
socket.close();
