/* Integration checks: real MV3 extension, temporary browser profile, synthetic Gmail DOM. */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const extension = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(await readFile(path.join(extension, "manifest.json"), "utf8"));
assert.deepEqual(manifest.permissions, ["storage"]);
const profile = await mkdtemp(path.join(tmpdir(), "pk-gmail-style-test-"));
const artifacts = process.env.PKS_CAPTURE_DIR;
if (artifacts) await mkdir(artifacts, { recursive: true });
const errors = [];
let checks = 0;

const fixtures = [
  ["Camille, Alex", "Les dernières maquettes", "La nouvelle version est prête pour notre échange.", "10:42", "zE"],
  ["Studio Papier", "Un peu de lecture pour le week-end", "Notre sélection du mois, à garder sous la main.", "09:18", "yO"],
  ["Thomas", "Déjeuner vendredi ?", "On se retrouve à notre adresse habituelle ?", "08:54", "yO"],
  ["Léa, moi", "Photos de la randonnée", "Merci encore pour cette belle journée !", "Hier", "yO"],
  ["Atelier", "Le projet prend forme", "Voici les éléments pour préparer la prochaine étape.", "Hier", "yO"],
  ["Nora", "Une idée pour la suite", "Je me disais qu’on pourrait en discuter cette semaine.", "12 oct.", "yO"],
  ["Bibliothèque", "Votre réservation est disponible", "Votre livre vous attend à l’accueil.", "11 oct.", "yO"],
];
const rows = fixtures.map(([sender, subject, snippet, date, state]) => `<tr class="zA ${state}" role="row" tabindex="0"><td class="oZ-x3"><button class="T-Jo" role="checkbox" aria-checked="false" aria-label="Sélectionner">□</button></td><td class="apU"><button class="T-KT aXw" aria-label="Suivre">☆</button></td><td class="yX"><div class="yW">${sender}</div></td><td class="a4W"><span class="bog">${subject}</span><span class="y2">&nbsp;– ${snippet}</span></td><td class="xW">${date}</td></tr>`).join("");
const fixture = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Gmail — données de test</title><style>
*{box-sizing:border-box}.wl{position:fixed;inset:0;background:#f6f8fc;z-index:-1;pointer-events:none}body{margin:0;background:#f6f8fc;font:14px Arial,sans-serif;color:#3c4043}button{font:inherit;cursor:pointer}#gb{height:64px;display:flex;align-items:center;padding:8px;gap:16px;background:#f6f8fc}#gb button{border:0;background:none;padding:12px;color:#5f6368}#gb .account{margin-left:auto;background:#e6eee9;border-radius:50%;width:36px;height:36px;padding:0}#aso_search_form_anchor{height:48px;display:flex;padding:0 12px;align-items:center}#aso_search_form_anchor input{border:0;background:transparent;outline:0;flex:1;min-width:0}.bkL{display:flex;height:calc(100vh - 64px)}.aeN{width:68px}.Xa{padding:24px 8px}.aqn{width:240px;flex-shrink:0}.aqn:has(~.bkK) .z0{padding:16px}.TO{padding:10px 20px}.n0{text-decoration:none}.bkK{flex:1;min-width:0}.G-atb{height:48px;display:flex;align-items:center;gap:20px;padding:0 16px}.G-atb button{background:none;border:0;color:#777}.G-atb .Dj{margin-left:auto}table{border-collapse:collapse;width:100%}.aKk tr{display:flex}.aKk td{flex:1}.aAy{display:flex;align-items:center;height:56px;padding:0 16px;border-bottom:3px solid #1a73e8}.zA{display:flex;height:40px;box-shadow:inset 0 -1px #ddd;align-items:center}.zA td{padding:0 8px;white-space:nowrap}.zA button{border:0;background:none;padding:0;font-size:22px;color:#777}.yX{width:160px;flex-shrink:0}.a4W{display:flex;flex:1;min-width:0;overflow:hidden}.bog{white-space:nowrap}.y2{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.xW{margin-left:auto;width:80px;text-align:right}.aUx{width:56px;background:#f6f8fc}.reading{padding:24px}.reading .ha{padding-left:60px}.reading .email-html{background:#e9f7ed;color:#182b1d;padding:28px;font:16px Georgia,serif}.Hd{position:fixed;right:96px;bottom:0;width:480px;height:480px;background:white;z-index:200}.Hy{display:flex;align-items:center;justify-content:space-between;padding:14px}.Hd input{width:100%;border:0;border-bottom:1px solid #eee;padding:14px}.Hd [contenteditable]{padding:20px;min-height:260px}.send{margin:16px;border:0;background:#1a73e8;color:white;border-radius:4px;padding:10px 20px}
</style><body><div class="wl"></div><header id="gb"><div class="gb_Dd"><button data-ogmb="1" aria-expanded="false" aria-label="Menu principal">☰</button><a aria-label="Gmail">Gmail</a></div><form id="aso_search_form_anchor"><button type="button" aria-label="Rechercher">⌕</button><input name="q" placeholder="Rechercher dans les messages" aria-label="Rechercher dans les messages"><button type="button" aria-label="Options de recherche">⌄</button></form><button class="account" aria-label="Compte">C</button><button class="FH" aria-label="Paramètres"></button><button class="demo-apps" aria-label="Applications Google"></button><button class="demo-help" aria-label="Assistance"></button><button class="demo-gemini" aria-label="Gemini"></button><button class="lJradf" aria-label="Disponibilité"></button></header><div class="bkL"><nav class="aeN"><div class="Xa">Mail</div></nav><nav class="aqn aIH"><div class="aBO"><div class="z0"><button class="T-I-KE" role="button">Nouveau message</button></div><div class="TO nZ"><a class="n0" href="#inbox">Boîte de réception</a></div><div class="TO"><a class="n0" href="#starred">Messages suivis</a></div><div class="TO"><a class="n0" href="#sent">Messages envoyés</a></div><div class="TO"><a class="n0" href="#drafts">Brouillons</a></div></div></nav><div class="bkK"><div class="AO"><div class="aeF"><div class="aia" hidden></div><main id="list" role="main"><div class="G-atb"><button aria-label="Tout sélectionner">□</button><button aria-label="Actualiser">↻</button><button aria-label="Plus">⋮</button><span class="Dj">1–7 sur 7</span><button aria-label="Précédent">‹</button><button aria-label="Suivant">›</button></div><table class="aKk"><tr role="tablist"><td><div class="aAy J-KU-KO" role="tab" aria-selected="true"><div class="aKx"><div class="aKz">Principale</div></div></div></td><td><div class="aAy" role="tab" aria-selected="false"><div class="aKx"><div class="aKz">Réseaux sociaux</div><span class="aDG">14 nouveaux</span></div></div></td><td><div class="aAy" role="tab" aria-selected="false"><div class="aKx"><div class="aKz">Promotions</div><span class="aDG">3 nouveaux</span></div></div></td></tr></table><table class="F cf zt" role="grid"><tbody>${rows}</tbody></table></main></div></div></div><aside class="aUx">Agenda</aside></div><script>
document.querySelector('[data-ogmb]').onclick=e=>{const el=e.currentTarget;el.setAttribute('aria-expanded',el.getAttribute('aria-expanded')==='true'?'false':'true')};
document.querySelector('.z0 button').onclick=()=>{const composer=document.createElement('div');composer.className='nH Hd';composer.setAttribute('role','dialog');composer.setAttribute('aria-label','Nouveau message');composer.innerHTML='<div class="Hy"><div class="aYF">Nouveau message</div><button aria-label="Fermer">×</button></div><input placeholder="Destinataires" aria-label="Destinataires"><input name="subjectbox" placeholder="Objet" aria-label="Objet"><div contenteditable="true" role="textbox" aria-label="Corps du message"></div><button class="send">Envoyer</button>';composer.querySelector('[aria-label="Fermer"]').onclick=()=>composer.remove();document.body.append(composer);window.nativeComposeClicks=(window.nativeComposeClicks||0)+1};
</script></body></html>`;

const context = await chromium.launchPersistentContext(profile, {
  channel: "chromium",
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  headless: true,
  viewport: { width: 1440, height: 960 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
try {
  await context.route("https://mail.google.com/**", route => route.fulfill({ contentType: "text/html", body: fixture }));
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  const worlds = [];
  cdp.on("Runtime.executionContextCreated", ({ context }) => worlds.push(context));
  await cdp.send("Runtime.enable");
  await page.goto("https://mail.google.com/mail/u/0/#inbox");
  await page.waitForSelector('html[data-pks="on"] #pks-compose');
  const world = worlds.find(world => world.origin.startsWith("chrome-extension://"));
  assert.ok(world, "Content script runs in an isolated extension world");
  const extensionId = new URL(world.origin).host;
  const popup = await context.newPage();
  popup.on("pageerror", error => errors.push(error.message));
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForFunction(() => !document.querySelector("#enabled").disabled);
  const rowHeight = () => page.locator(".zA").first().evaluate(el => el.getBoundingClientRect().height);
  const set = (key, value) => popup.evaluate(({ key, value }) => chrome.storage.local.set({ [key]: value }), { key: "pkGmailStyle", value: { [key]: value } });
  const check = (condition, label) => { assert.ok(condition, label); checks++; console.log(`✓ ${label}`); };

  check(await rowHeight() === 48, "Default density is applied to native rows");
  check(await page.locator(".aqn").evaluate(el => getComputedStyle(el).visibility === "hidden"), "Closed Gmail menu does not leave an empty rail");
  const originalRow = await page.locator(".zA").first().elementHandle();
  await page.locator("[data-ogmb]").click();
  await page.waitForFunction(() => document.documentElement.dataset.pksNav === "open");
  check(await page.locator(".aqn").evaluate(el => getComputedStyle(el).visibility === "visible"), "Native hamburger opens navigation");
  await page.locator("[data-ogmb]").click();

  await page.locator("#pks-compose").click();
  check(await page.locator('[name="subjectbox"]').isVisible(), "Floating button invokes the native compose control");
  check(await page.evaluate(() => window.nativeComposeClicks === 1), "A single click opens exactly one compose window");
  check(!await page.locator("#pks-compose").isVisible(), "Floating button does not overlap the compose window");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();

  await popup.locator("#density").selectOption("spacious");
  await page.waitForFunction(() => document.documentElement.dataset.pksDensity === "spacious");
  check(await rowHeight() === 58, "Popup updates density in open Gmail tabs");
  await popup.locator("#density").selectOption("compact");
  await popup.locator("#width").selectOption("full");
  await popup.locator("#quietHeader").uncheck();
  await popup.locator("#hideAddons").uncheck();
  await page.waitForFunction(() => document.documentElement.dataset.pksAddons === "false");
  check(await rowHeight() === 38, "Rapid setting changes retain the last density");
  check(await page.locator(".aUx").isVisible(), "Google side panel can be restored");
  check(await page.locator('[aria-label="Gmail"]').isVisible(), "Quiet-header toggle restores the Gmail logo");
  await popup.locator("#floatingCompose").uncheck();
  await page.waitForFunction(() => !document.querySelector("#pks-compose"));
  check(await page.locator(".z0").evaluate(el => getComputedStyle(el).display !== "none"), "Disabling floating compose restores the native button");

  await popup.locator("#enabled").uncheck();
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-pks"));
  check(await rowHeight() === 40, "Pause completely restores the original row styling");
  check(await originalRow.evaluate(el => el.isConnected && el === document.querySelector(".zA")), "Gmail DOM nodes and handlers are preserved");
  await page.reload();
  await page.waitForLoadState("load");
  check(await page.locator("html").getAttribute("data-pks") === null, "Disabled preference survives a page reload");
  await popup.locator("#reset").click();
  await page.waitForSelector('html[data-pks="on"] #pks-compose');
  check(await rowHeight() === 48, "Reset restores the reference appearance");

  await page.evaluate(() => {
    document.getElementById("list").hidden = true;
    const reading = document.createElement("main");
    reading.setAttribute("role", "main");
    reading.id = "reading";
    reading.className = "reading";
    reading.innerHTML = '<div class="ha"><h2 class="hP">Les dernières maquettes</h2></div><p class="gD">Camille</p><article class="email-html">Un message garde sa propre typographie et ses couleurs.</article>';
    document.querySelector(".aeF").append(reading);
  });
  await page.waitForFunction(() => document.documentElement.dataset.pksView === "reading");
  check(await page.locator("#reading").evaluate(el => el.getBoundingClientRect().width <= 880), "Reading view is detected even when Gmail keeps a hidden list");
  check(await page.locator(".email-html").evaluate(el => getComputedStyle(el).backgroundColor === "rgb(233, 247, 237)" && getComputedStyle(el).fontFamily.includes("Georgia")), "Sender-provided message colors and typography stay intact");
  await page.evaluate(() => { document.getElementById("list").hidden = false; window.dispatchEvent(new HashChangeEvent("hashchange")); });
  await page.waitForFunction(() => document.documentElement.dataset.pksView === "split");
  check(await page.locator("#reading").evaluate(el => getComputedStyle(el).maxWidth === "none"), "Shared reading layout does not force the narrow conversation width");

  await page.evaluate(() => { document.getElementById("reading").remove(); location.hash = "#settings/general"; });
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-pks"));
  check(!await page.locator("#pks-compose").count(), "Gmail settings keep their native presentation");
  await page.evaluate(() => { location.hash = "#inbox"; });
  await page.waitForSelector('html[data-pks="on"] #pks-compose');

  await set("density", "invalid");
  await page.waitForFunction(() => document.documentElement.dataset.pksDensity === "comfortable");
  check(await rowHeight() === 48, "Invalid stored settings fall back to safe defaults");
  const second = await context.newPage();
  await second.goto("https://mail.google.com/mail/u/1/#inbox");
  await second.waitForSelector('html[data-pks="on"] #pks-compose');
  await set("enabled", false);
  await second.waitForFunction(() => !document.documentElement.hasAttribute("data-pks"));
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-pks"));
  check(!await second.locator("#pks-compose").count(), "Preference changes reach multiple Gmail accounts and tabs");
  await set("enabled", true);
  await page.waitForSelector('html[data-pks="on"] #pks-compose');

  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 960 });
    check(await page.locator("#pks-compose").evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }), `Compose stays reachable at ${width}px`);
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  if (artifacts) {
    await page.screenshot({ path: path.join(artifacts, "inbox.png") });
    await popup.setViewportSize({ width: 352, height: 650 });
    await popup.screenshot({ path: path.join(artifacts, "settings.png") });
  }
  // New reference states: native controls, themes, empty views and Gmail's Trusted Types.
  await page.evaluate(() => {
    const native = document.createElement("button"); native.className = "FH"; native.setAttribute("aria-label", "Paramètres");
    native.setAttribute("aria-expanded", "false");
    native.onclick = () => {
      window.nativeSettingsClicks = (window.nativeSettingsClicks || 0) + 1;
      native.setAttribute("aria-expanded", "true");
      const quickSettings = document.createElement("div"); quickSettings.className = "IU"; quickSettings.setAttribute("role", "menu");
      quickSettings.innerHTML = '<button aria-label="Voir tous les paramètres">Voir tous les paramètres</button>';
      document.querySelector(".aUx").append(quickSettings);
    };
    const help = document.querySelector(".demo-help"); help.setAttribute("aria-controls", "demo-help-menu"); help.setAttribute("aria-expanded", "false");
    help.onclick = () => {
      help.setAttribute("aria-expanded", "true");
      const menu = document.createElement("div"); menu.id = "demo-help-menu"; menu.setAttribute("role", "menu"); menu.textContent = "Aide · Formation";
      document.querySelector("#gb").append(menu);
    };
    document.querySelector("#gb").append(native);
  });
  await page.locator("#pks-menu-button").click();
  await page.getByRole("menuitem", { name: "Paramètres Gmail", exact: true }).click();
  check(await page.evaluate(() => window.nativeSettingsClicks === 1), "Compact menu delegates once to Gmail settings");
  await page.waitForSelector(".aUx > .IU");
  check(await page.locator(".aUx > .IU").isVisible(), "Native Gmail quick settings remain visible when Google side-panel apps are hidden");
  await page.locator(".aUx > .IU button").click();
  await page.evaluate(() => { document.querySelector(".aUx > .IU")?.remove(); document.querySelector("#gb .FH")?.setAttribute("aria-expanded", "false"); });
  await page.locator("#pks-menu-button").click();
  await page.getByRole("menuitem", { name: "Aide", exact: true }).click();
  await page.waitForSelector("#gb [data-pks-native-popup=help]");
  check(await page.locator("#gb [data-pks-native-popup=help]").evaluate(el => el.getBoundingClientRect().left > 0), "Native Gmail help menu opens beside its compact-menu item");
  await page.evaluate(() => { document.querySelector("#gb #demo-help-menu")?.remove(); document.querySelector(".demo-help")?.setAttribute("aria-expanded", "false"); });
  await page.evaluate(() => {
    const pane = document.createElement("button"); pane.className = "apG";
    pane.addEventListener("mouseup", () => { window.nativePaneActivations = (window.nativePaneActivations || 0) + 1; });
    document.querySelector(".G-atb").append(pane);
  });
  await page.locator("#pks-menu-button").click();
  await page.getByRole("menuitem", { name: "Position du volet de lecture", exact: true }).click();
  check(await page.evaluate(() => window.nativePaneActivations === 1), "Reading-pane menu uses Gmail's native mouseup activation");
  await page.locator("#pks-menu-button").click();
  await page.keyboard.press("End");
  check(await page.evaluate(() => document.activeElement === document.querySelector("#pks-menu button:last-child")), "Compact menu supports keyboard navigation");
  await page.keyboard.press("Escape");
  check(await page.locator("#pks-menu-button").evaluate(el => el === document.activeElement), "Escape restores focus to the menu trigger");
  await page.locator("#pks-menu-button").click();
  await page.getByRole("menuitem", { name: "Apparence de Gmail", exact: true }).click();
  await page.locator('#pks-preferences select[name="background"]').selectOption("ocean");
  await page.waitForFunction(() => document.documentElement.dataset.pksBackground === "ocean");
  check(await page.evaluate(() => getComputedStyle(document.body).backgroundImage.includes("backgrounds/ocean.jpg")), "Ocean background is applied to Gmail's outer shell");
  check(await page.evaluate(async () => { const i = new Image(); i.src = getComputedStyle(document.body).backgroundImage.slice(5,-2); await i.decode(); return i.naturalWidth > 1000; }), "Packaged background is accessible from the Gmail page");
  check(await page.locator(".wl").evaluate(el => getComputedStyle(el).backgroundColor === "rgba(0, 0, 0, 0)"), "Gmail's fixed theme layer does not cover the chosen photo");
  await popup.locator("#density").selectOption("spacious");
  await page.waitForFunction(() => document.documentElement.dataset.pksDensity === "spacious");
  check(await page.locator("html").getAttribute("data-pks-background") === "ocean", "Popup preserves background changes made inside Gmail");
  await popup.locator("#density").selectOption("comfortable");
  await popup.locator("#background").selectOption("native");
  await page.evaluate(() => { document.querySelector(".wl").style.backgroundImage = "linear-gradient(#abc,#def)"; });
  await page.waitForFunction(() => document.documentElement.dataset.pksPhoto === "true" && document.documentElement.dataset.pksBackground === "native");
  check(await page.locator(".wl").evaluate(el => getComputedStyle(el).backgroundImage.includes("linear-gradient")), "Native Gmail theme remains visible after switching back");
  await page.evaluate(() => document.querySelector(".wl").style.removeProperty("background-image"));
  await popup.locator("#background").selectOption("ocean");
  await page.waitForFunction(() => document.documentElement.dataset.pksBackground === "ocean");
  if (artifacts) { await page.keyboard.press("Escape"); await page.screenshot({ path: path.join(artifacts, "theme.png") }); }
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.querySelector(".zA .T-Jo").setAttribute("aria-checked", "true"));
  await page.waitForFunction(() => document.documentElement.dataset.pksSelected === "true");
  check(await page.locator("#aso_search_form_anchor").isHidden() && await page.locator("#pks-search-button").isVisible(), "Selecting mail gives the header to the native actions");
  await page.locator("#pks-search-button").click();
  check(await page.locator('input[name="q"]').evaluate(el => el === document.activeElement), "Search remains accessible with messages selected");
  await page.keyboard.press("Escape");
  check(await page.locator("[data-pks-toolbar]").isVisible(), "Closing search restores the native toolbar without losing its annotation");
  await page.evaluate(() => document.querySelector(".zA .T-Jo").setAttribute("aria-checked", "false"));
  await page.waitForFunction(() => document.documentElement.dataset.pksSelected === "false");
  check(await page.locator("[data-pks-date]").count() >= 1, "Date separators are inserted without replacing mail rows");
  check(await page.locator("[data-pks-date]").first().evaluate(el => Math.abs(el.getBoundingClientRect().width - el.parentElement.getBoundingClientRect().width) < 2), "Date separators span the complete native message table");
  await page.evaluate(() => {
    window.savedRows = [...document.querySelectorAll(".zA")]; window.savedRows.forEach(row => row.remove());
    const empty = document.createElement("div"); empty.className = "TC"; empty.textContent = "Aucun message"; document.querySelector("#list").append(empty);
  });
  await page.waitForFunction(() => document.documentElement.dataset.pksEmpty === "true");
  check(await page.locator("#pks-status").innerText() === "Aucun nouveau message !", "Inbox zero requires a confirmed native empty state");
  if (artifacts) await page.screenshot({ path: path.join(artifacts, "empty.png") });
  await page.evaluate(() => { location.hash = "#search/empty"; });
  await page.waitForFunction(() => document.documentElement.dataset.pksEmpty === "false");
  check(!(await page.locator("#pks-status").innerText()).includes("Aucun nouveau"), "Empty search results never claim the inbox is empty");
  await page.evaluate(() => { document.querySelector(".TC").remove(); document.querySelector("table.F tbody").append(...window.savedRows); location.hash = "#inbox"; });
  await page.waitForFunction(() => document.documentElement.dataset.pksView === "list");
  await popup.locator("#backgroundFile").setInputFiles(path.join(extension, "backgrounds/ocean.jpg"));
  await page.waitForFunction(() => document.documentElement.dataset.pksBackground === "custom");
  check(await page.evaluate(() => getComputedStyle(document.body).backgroundImage.startsWith('url("data:image/jpeg;base64,')), "Personal background import is processed and stored locally");
  await popup.locator("#enabled").uncheck();
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-pks"));
  check(await page.locator('[data-pks-ui],[data-pks-date],[data-pks-toolbar]').count() === 0, "Pause removes injected UI and native-control annotations");
  await popup.locator("#reset").click();
  await context.route("**/mail/u/2/**", route => route.fulfill({ contentType: "text/html", headers: { "Content-Security-Policy": "require-trusted-types-for 'script'" }, body: fixture }));
  const strictPage = await context.newPage(); strictPage.on("pageerror", error => errors.push(error.message));
  await strictPage.goto("https://mail.google.com/mail/u/2/#inbox");
  await strictPage.waitForSelector("#pks-menu-button");
  check(await strictPage.locator("#pks-compose").isVisible(), "Extension starts under Gmail's Trusted Types policy");
  await strictPage.close();
  check(errors.length === 0, `No JavaScript errors: ${errors.join(", ")}`);
  console.log(`${checks} integration checks passed.`);
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
}
