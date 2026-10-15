/* Screenshots/frames use the current MV3 build and the fictional fixture in the browser checks. */
import assert from "node:assert/strict";
import { mkdtemp, readFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const project = fileURLToPath(new URL("../../", import.meta.url));
const extension = path.join(project, "src/extension-simplify");
const media = path.join(project, "store");
const testSource = await readFile(path.join(extension, "tests/browser.mjs"), "utf8");
const fixtureStart = testSource.indexOf("const fixture = `");
const fixtureEnd = testSource.indexOf("`;\n\nconst context =", fixtureStart);
const fixtureData = testSource.match(/const fixtures = (\[[\s\S]*?\]);\nconst rows = fixtures/);
assert.ok(fixtureStart >= 0 && fixtureEnd > fixtureStart && fixtureData, "Expected shared Gmail demonstration fixture");
const messages = Function(`"use strict"; return (${fixtureData[1]});`)();
const rows = messages.map(([sender, subject, snippet, date, state]) => `<tr class="zA ${state}" role="row" tabindex="0"><td class="oZ-x3"><button class="T-Jo" role="checkbox" aria-checked="false" aria-label="Sélectionner">□</button></td><td class="apU"><button class="T-KT aXw" aria-label="Suivre">☆</button></td><td class="yX"><div class="yW">${sender}</div></td><td class="a4W"><span class="bog">${subject}</span><span class="y2">&nbsp;– ${snippet}</span></td><td class="xW">${date}</td></tr>`).join("");
const fixture = testSource.slice(fixtureStart + "const fixture = `".length, fixtureEnd).replace("${rows}", rows);
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const profile = await mkdtemp(path.join(tmpdir(), "pk-gmail-media-profile-"));
const frames = path.join(project, "store/media-kit/.frames");
await mkdir(frames, { recursive: true });
await mkdir(path.join(media, "screenshots"), { recursive: true });

let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
    headless: true,
    viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const page = await context.newPage();
  await context.route("https://mail.google.com/**", route => route.fulfill({ contentType: "text/html", body: fixture }));
  const session = await context.newCDPSession(page);
  await session.send("Runtime.enable");
  const worldPromise = new Promise(resolve => session.on("Runtime.executionContextCreated", ({ context }) => {
    if (context.origin.startsWith("chrome-extension://")) resolve(context);
  }));
  await page.goto("https://mail.google.com/mail/u/0/#inbox");
  await page.waitForSelector('html[data-pks="on"] #pks-compose');
  const world = await worldPromise;
  const extensionId = new URL(world.origin).host;
  await session.send("Runtime.evaluate", { expression: 'chrome.storage.local.set({pkGmailStyle:{enabled:false,density:"comfortable",width:"balanced",quietHeader:true,hideAddons:true,floatingCompose:true}}).then(()=>true)', contextId: world.id, awaitPromise: true });
  await page.waitForFunction(() => document.documentElement.dataset.pks !== "on");
  await page.evaluate(() => {
    const badge = document.createElement("div");
    badge.id = "pks-demo-badge";
    badge.textContent = "ILLUSTRATION · COURRIELS FICTIFS";
    Object.assign(badge.style, { position: "fixed", zIndex: "108", left: "14px", top: "74px", padding: "5px 8px", border: "1px solid #e6e8eb", borderRadius: "3px", background: "#fff", color: "#6b7075", font: "10px/1.2 Arial,sans-serif", letterSpacing: ".04em", pointerEvents: "none" });
    document.body.append(badge);
    document.querySelectorAll(".zA .T-Jo").forEach(button => button.addEventListener("click", event => {
      event.stopPropagation();
      const checked = button.getAttribute("aria-checked") !== "true";
      button.setAttribute("aria-checked", String(checked));
      button.closest(".zA")?.classList.toggle("x7", checked);
    }));
    document.querySelectorAll(".zA .T-KT").forEach(button => button.addEventListener("click", event => {
      event.stopPropagation();
      const starred = button.textContent.trim() !== "★";
      button.textContent = starred ? "★" : "☆";
      button.setAttribute("aria-label", starred ? "Suivi" : "Non suivi");
      button.classList.toggle("aXw", !starred);
    }));
    window.__pksDemo = { menu: document.querySelector("[data-ogmb]"), box: document.querySelector(".zA .T-Jo"), star: document.querySelector(".zA .T-KT"), compose: document.querySelector("#pks-compose") };
  });
  await page.screenshot({ path: path.join(media, "screenshots/03-avant.png") });
  await session.send("Runtime.evaluate", { expression: 'chrome.storage.local.set({pkGmailStyle:{enabled:true,density:"comfortable",width:"balanced",quietHeader:true,hideAddons:true,floatingCompose:true}}).then(()=>true)', contextId: world.id, awaitPromise: true });
  await page.waitForSelector('html[data-pks="on"] #pks-compose');
  await page.screenshot({ path: path.join(media, "screenshots/01-inbox.png") });

  await session.send("Runtime.evaluate", { expression: 'chrome.storage.local.set({pkGmailStyle:{enabled:true,density:"comfortable",width:"balanced",quietHeader:true,hideAddons:true,floatingCompose:true}}).then(()=>true)', contextId: world.id, awaitPromise: true });
  const settings = await context.newPage();
  await settings.setViewportSize({ width: 352, height: 640 });
  await settings.goto(`chrome-extension://${extensionId}/popup.html`);
  await settings.waitForFunction(() => !document.querySelector("#enabled")?.disabled);
  console.log("popupSettings", JSON.stringify(await settings.evaluate(() => ({ enabled: document.querySelector("#enabled").checked, quietHeader: document.querySelector("#quietHeader").checked, hideAddons: document.querySelector("#hideAddons").checked, floatingCompose: document.querySelector("#floatingCompose").checked }))));
  await settings.screenshot({ path: path.join(media, "screenshots/02-reglages.png"), fullPage: true });

  await page.locator("#pks-compose").click();
  await page.waitForSelector('.Hd[role="dialog"]');
  await page.screenshot({ path: path.join(media, "screenshots/04-compose.png") });
  await page.getByRole("button", { name: "Fermer", exact: true }).click();

  const views = await page.evaluate(() => Object.fromEntries(["[data-ogmb]", "input[name='q']", ".zA .T-Jo", ".zA .T-KT", "#pks-compose"].map((selector, i) => {
    const el = document.querySelector(selector); const r = el.getBoundingClientRect();
    return [["menu", "search", "checkbox", "star", "compose"][i], { x: r.x + r.width / 2, y: r.y + r.height / 2 }];
  })));
  const pointer = await page.evaluate(() => {
    const cursor = document.createElement("i"); cursor.id = "pks-demo-cursor"; cursor.setAttribute("aria-hidden", "true");
    Object.assign(cursor.style, { position: "fixed", zIndex: "2147483000", left: "0", top: "0", width: "20px", height: "20px", border: "2px solid #de5648", borderRadius: "50%", background: "#fff9", boxShadow: "0 1px 5px #0003", pointerEvents: "none", transition: "transform .1s linear, opacity .15s ease" });
    document.body.append(cursor); return cursor;
  });
  void pointer;
  const waitFrames = Number(process.env.PK_GIF_FRAMES || 96);
  for (let index = 0; index < waitFrames; index++) {
    const t = index / 12;
    let target = null;
    if (t < 1.1) target = views.search;
    else if (t < 2.15) target = views.checkbox;
    else if (t < 3.1) target = views.menu;
    else if (t < 4) target = views.menu;
    else if (t < 5.2) target = views.star;
    else if (t < 6.1) target = views.compose;
    else target = views.menu;
    if (index === 14) await page.mouse.click(views.checkbox.x, views.checkbox.y);
    if (index === 27) await page.mouse.click(views.menu.x, views.menu.y);
    if (index === 38) await page.mouse.click(views.menu.x, views.menu.y);
    if (index === 52) await page.mouse.click(views.star.x, views.star.y);
    if (index === 64) await page.mouse.click(views.compose.x, views.compose.y);
    if (index === 83 && await page.locator('.Hd[role="dialog"]').count()) await page.locator('.Hd[role="dialog"] [aria-label="Fermer"]').click();
    await page.evaluate(({ target, opacity }) => { const cursor = document.getElementById("pks-demo-cursor"); cursor.style.opacity = String(opacity); cursor.style.transform = `translate(${target.x - 10}px,${target.y - 10}px)`; }, { target, opacity: index < 5 ? 0 : 1 });
    await page.screenshot({ path: path.join(frames, `${String(index).padStart(4, "0")}.png`) });
  }
  console.log(JSON.stringify({ screenshots: path.join(media, "screenshots"), frames, extensionVersion: (await readFile(path.join(extension, "manifest.json"), "utf8")).match(/"version":\s*"([^"]+)"/)?.[1], fictionalMessages: messages.length }));
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
