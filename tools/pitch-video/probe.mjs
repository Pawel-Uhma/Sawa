import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "pl-PL" });
const p = await ctx.newPage();
p.on("request", r => { if (r.url().includes("railway")) console.log(">", r.method(), r.url().replace(/^https:\/\/[^/]+/, "")); });
await p.goto("http://localhost:3100/demo");
for (const t of [3, 10, 20]) { await p.waitForTimeout(t === 3 ? 3000 : 7000); await p.screenshot({ path: `probe/t${t}.png` }); }
console.log((await p.locator("button").allInnerTexts()).join(" | "));
await b.close();
