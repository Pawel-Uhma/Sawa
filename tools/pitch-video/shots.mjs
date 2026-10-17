// Zrzuty ekranów aplikacji do decku (telefon 393×852 @3x).
import { chromium } from "playwright";
const OUT = "/Users/pawel/Desktop/Sawa/docs/pitch/deck/ekrany";
const b = await chromium.launch({ channel: "chrome", headless: false });
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "pl-PL" });
await ctx.route(/railway\.app/, async (r) => { try { const res = await r.fetch(); await r.fulfill({ response: res, headers: { ...res.headers(), "access-control-allow-origin": "*" } }); } catch {} });
const p = await ctx.newPage();
const hide = () => p.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
const btns = async () => (await p.$$eval("button", (els) => els.filter((e) => e.offsetParent).map((e) => (e.getAttribute("aria-label") || e.innerText).trim().slice(0, 40)))).join(" | ");
const shot = async (name) => { await hide(); await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/${name}.png` }); console.log(name, "→", await btns()); };
await p.goto("http://localhost:3101/");
await p.waitForTimeout(3000);
await shot("01-powitanie");
const steps = process.argv.slice(2);
let i = 2;
for (const label of steps) {
  const [text, name] = label.split("=");
  await p.getByRole("button", { name: text, exact: false }).first().click({ timeout: 5000 }).catch((e) => console.log("brak", text));
  if (name) await shot(`${String(i++).padStart(2, "0")}-${name}`);
}
await ctx.unrouteAll({ behavior: "ignoreErrors" });
await b.close();
