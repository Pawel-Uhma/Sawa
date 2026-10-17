import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "pl-PL" });
const t0 = Date.now();
await ctx.route(/railway\.app/, async (route) => {
  const res = await route.fetch();
  const ct = res.headers()["content-type"] || "";
  console.log(((Date.now()-t0)/1000).toFixed(1), route.request().method(), route.request().url().replace(/^https:\/\/[^/]+/, "").slice(0,60), res.status(), ct);
  await route.fulfill({ response: res, headers: { ...res.headers(), "access-control-allow-origin": "*" } });
});
const p = await ctx.newPage();
await p.addStyleTag;
await p.goto("http://localhost:3100/demo");
await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
for (const t of [8, 16, 30]) { await p.waitForTimeout(t===8?8000:t===16?8000:14000); await p.screenshot({ path: `probe/t${t}.png` }); }
console.log((await p.locator("button").allInnerTexts()).join(" | "));
await b.close();
