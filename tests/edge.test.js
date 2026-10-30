/* LOCKBOT Edge test suite — run with: node tests/edge.test.js
   Needs Playwright + Chromium. The Odds API is mocked, so no key or network is required. */
const { chromium } = require("playwright");
const path = require("path");

const PAGE = "file://" + path.resolve(__dirname, "../EDGE.html");
let pass = 0, fail = 0;
const ok = (cond, name, extra = "") => { if (cond) { pass++; console.log("  ✓ " + name); } else { fail++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); } };
const near = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;
/* every page gets the same helper, and web fonts are skipped */
async function prep(page) {
  await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await page.addInitScript(() => { window.near = (a, b, t = 1e-3) => Math.abs(a - b) <= t; });
}

/* ---------- mock The Odds API ---------- */
const soon = (h) => new Date(Date.now() + h * 3600e3).toISOString();
const mkBook = (key, title, h2h, spr, tot, link) => ({
  key, title, last_update: new Date().toISOString(), link: link ? `https://${key}.example/event` : undefined,
  markets: [
    { key: "h2h", outcomes: [{ name: "Buffalo Bills", price: h2h[0], link: link ? `https://${key}.example/slip/bills` : undefined }, { name: "Kansas City Chiefs", price: h2h[1] }] },
    { key: "spreads", outcomes: [{ name: "Buffalo Bills", price: spr[0], point: 2.5 }, { name: "Kansas City Chiefs", price: spr[1], point: -2.5 }] },
    { key: "totals", outcomes: [{ name: "Over", price: tot[0], point: 47.5 }, { name: "Under", price: tot[1], point: 47.5 }] },
  ],
});
function nflEvent(dkMl = 135) {
  return {
    id: "nfl1", sport_key: "americanfootball_nfl", commence_time: soon(3), home_team: "Kansas City Chiefs", away_team: "Buffalo Bills",
    bookmakers: [
      mkBook("pinnacle", "Pinnacle", [120, -130], [-105, -105], [-108, -102]),
      mkBook("draftkings", "DraftKings", [dkMl, -160], [-110, -110], [-110, -110], true),
      mkBook("fanduel", "FanDuel", [118, -140], [100, -120], [-105, -115]),
      mkBook("mysterybook", "Mystery Book", [125, -150], [-110, -110], [-112, -108]),
    ],
  };
}
const soccer = {
  id: "epl1", sport_key: "soccer_epl", commence_time: soon(30), home_team: "Arsenal", away_team: "Chelsea",
  bookmakers: [
    { key: "pinnacle", title: "Pinnacle", markets: [{ key: "h2h", outcomes: [{ name: "Arsenal", price: -120 }, { name: "Chelsea", price: 330 }, { name: "Draw", price: 290 }] }] },
    { key: "fanduel", title: "FanDuel", markets: [{ key: "h2h", outcomes: [{ name: "Arsenal", price: -125 }, { name: "Chelsea", price: 380 }, { name: "Draw", price: 270 }] }] },
  ],
};
const props = {
  ...nflEvent(), bookmakers: [
    { key: "pinnacle", title: "Pinnacle", markets: [{ key: "player_pass_yds", outcomes: [{ name: "Over", description: "J. Allen", price: -110, point: 255.5 }, { name: "Under", description: "J. Allen", price: -110, point: 255.5 }] }] },
    { key: "draftkings", title: "DraftKings", markets: [{ key: "player_pass_yds", outcomes: [{ name: "Over", description: "J. Allen", price: 110, point: 255.5 }, { name: "Under", description: "J. Allen", price: -140, point: 255.5 }] }] },
  ],
};
const SPORTS = [
  { key: "americanfootball_nfl", active: true }, { key: "soccer_epl", active: true }, { key: "basketball_nba", active: false },
];

async function livePage(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], calls = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await prep(page);
  const state = { dkMl: 135, ...opts };
  await page.route(/the-odds-api\.com/, (r) => {
    const u = new URL(r.request().url());
    calls.push(u);
    const hdr = { "access-control-allow-origin": "*", "access-control-expose-headers": "x-requests-remaining, x-requests-used, x-requests-last", "x-requests-remaining": "470", "x-requests-used": "30", "x-requests-last": "3" };
    const json = (status, body) => r.fulfill({ status, contentType: "application/json", headers: hdr, body: JSON.stringify(body) });
    if (state.badKey) return json(401, { message: "API key is not valid" });
    if (u.pathname.endsWith("/sports") || u.pathname.endsWith("/sports/")) return json(200, SPORTS);
    if (state.rejectBooks && u.searchParams.get("bookmakers")) return json(422, { message: "Invalid bookmaker" });
    if (u.pathname.includes("/events/")) return json(200, props);
    if (u.pathname.includes("americanfootball_nfl")) return json(200, [nflEvent(state.dkMl)]);
    if (u.pathname.includes("soccer_epl")) return json(200, [soccer]);
    return json(200, []);
  });
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.clear();
      localStorage.setItem("lbe.settings", JSON.stringify(s));
      sessionStorage.setItem("seeded", "1");
    }
  }, { mode: "live", apiKey: "TESTKEY", leagues: ["americanfootball_nfl", "basketball_nba", "soccer_epl"], props: true, propEvents: 1, reqMode: opts.reqMode || "books" });
  await page.goto(PAGE);
  await page.waitForTimeout(700);
  return { page, ctx, errors, calls, state };
}

(async () => {
  const browser = await chromium.launch();

  /* ============ 1. math ============ */
  console.log("\n1. Odds math & devig");
  {
    const page = await browser.newPage();
    await prep(page);
    await page.goto(PAGE);
    const m = await page.evaluate(() => {
      const q = (a) => a.map(amToProb);
      return {
        dec110: amToDec(-110), decP150: amToDec(150), am2: decToAm(2), am191: decToAm(1.909), am25: decToAm(2.5),
        even: METHODS.map((k) => DEVIG[k](q([-110, -110]))),
        mult: DEVIG.multiplicative(q([-150, 130])), add: DEVIG.additive(q([-150, 130])),
        pow: DEVIG.power(q([-300, 240])), shin: DEVIG.shin(q([-300, 240])), multLong: DEVIG.multiplicative(q([-300, 240])),
        three: METHODS.map((k) => DEVIG[k](q([-120, 330, 290]))),
        w1: marketWidth([-110, -110]), w2: marketWidth([-150, 130]), w3: marketWidth([-105, -105]), w4: marketWidth([100, -120]),
        kelly: kellyFrac(0.55, 2), kellyNeg: kellyFrac(0.4, 2),
      };
    });
    ok(near(m.dec110, 1.90909), "-110 → 1.909 decimal");
    ok(near(m.decP150, 2.5), "+150 → 2.5 decimal");
    ok(m.am2 === 100 && m.am25 === 150 && m.am191 === -110, "decimal → American round trips", `${m.am2} ${m.am25} ${m.am191}`);
    ok(m.even.every((p) => near(p[0], 0.5) && near(p[1], 0.5)), "-110/-110 devigs to 50/50 with every method");
    ok(near(m.mult[0], 0.6 / (0.6 + 100 / 230)), "multiplicative -150/+130 = 57.98%", m.mult[0]);
    ok(near(m.add[0], 0.6 - (0.6 + 100 / 230 - 1) / 2), "additive -150/+130 = 58.26%", m.add[0]);
    ok(near(m.pow[0] + m.pow[1], 1, 1e-6) && near(m.shin[0] + m.shin[1], 1, 1e-6), "power & Shin sum to 100%");
    ok(m.pow[1] < m.shin[1] + 1e-9 && m.shin[1] < m.multLong[1], "longshot fair %: power ≤ Shin < multiplicative", `${m.pow[1]} ${m.shin[1]} ${m.multLong[1]}`);
    ok(m.three.every((p) => p.length === 3 && near(p[0] + p[1] + p[2], 1, 1e-6)), "3-way (soccer) devig sums to 100% for all methods");
    ok(m.w1 === 20 && m.w2 === 20 && m.w3 === 10 && m.w4 === 20, "market width cents", `${m.w1} ${m.w2} ${m.w3} ${m.w4}`);
    ok(near(m.kelly, 0.1) && m.kellyNeg === 0, "Kelly: 55% at even money = 10%, negative edge = 0");
    await page.close();
  }

  /* ============ 2. demo UI ============ */
  console.log("\n2. Demo mode UI");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await prep(page);
    await page.goto(PAGE);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(600);
    const rows = await page.locator(".ev-row").count();
    ok(rows > 3, "demo produces +EV rows", rows);
    const sorted = await page.evaluate(() => OPPS.every((o, i) => !i || OPPS[i - 1].evp >= o.evp));
    ok(sorted, "rows sorted by EV desc");
    const valid = await page.evaluate(() => OPPS.every((o) => o.evp * 100 >= F.minEV && o.price >= F.minOdds && o.price <= F.maxOdds && near(o.evp, o.p * amToDec(o.price) - 1)));
    ok(valid, "every row respects min EV / odds range and EV = p·d − 1");
    const stakesCapped = await page.evaluate(() => OPPS.every((o) => o.stake <= F.bankroll * F.maxStakePct / 100 + 1e-9));
    ok(stakesCapped, "bet sizes respect max stake %");
    const fairOk = await page.evaluate(() => OPPS.every((o) => o.fair.used.every((u) => F.sharp[u.book] > 0) && o.p === Math.min(...METHODS.map((m) => o.fair.methods[m][o.i]))));
    ok(fairOk, "worst case = min of the four methods, only weighted sharp books used");

    await page.locator(".ev-row").first().click();
    ok(await page.locator(".detail").count() === 1, "clicking a row expands the detail panel");
    ok((await page.locator(".detail").innerText()).includes("Worst case"), "detail shows the devig method table");
    await page.locator(".ev-row").first().click();
    ok(await page.locator(".detail").count() === 0, "clicking again collapses it");

    const before = await page.evaluate(() => OPPS.length);
    await page.fill("[data-f=minEV]", "3");
    const after = await page.evaluate(() => OPPS.length);
    ok(after <= before && (await page.evaluate(() => OPPS.every((o) => o.evp >= 0.03))), "min EV filter narrows results", `${before}→${after}`);
    await page.fill("[data-f=minEV]", "0");
    await page.click("[data-act=fset][data-val=multiplicative]");
    ok(await page.evaluate(() => F.devig === "multiplicative" && OPPS.every((o) => o.p === o.fair.methods.multiplicative[o.i])), "switching devig method recomputes fair odds");
    await page.click("[data-act=fset][data-val=today]");
    ok(await page.evaluate(() => OPPS.every((o) => new Date(o.ev.start).toDateString() === new Date().toDateString())), "Today filter shows only today's games");
    await page.click("[data-act=fset][data-val=any]");
    await page.fill("[data-f=maxWidth]", "12");
    ok(await page.evaluate(() => OPPS.every((o) => o.fair.width == null || o.fair.width <= 12)), "market width filter applies");
    await page.fill("[data-f=maxWidth]", "0");
    await page.click("[data-act=cat][data-k=props]");
    ok(await page.evaluate(() => OPPS.every((o) => o.g.cat !== "props")), "market toggle removes player props");
    await page.click("[data-act=cat][data-k=props]");
    await page.click("[data-act=books-none]");
    ok(await page.evaluate(() => OPPS.length === 0), "no sportsbooks selected → no rows");
    await page.click("[data-act=books-all]");
    const first = await page.evaluate(() => OPPS[0].ev.home.split(" ")[0]);
    await page.fill("#search", first);
    ok(await page.evaluate((q) => OPPS.length > 0 && OPPS.every((o) => (o.ev.home + o.ev.away + o.label).includes(q)), first), "search filters rows");
    await page.fill("#search", "");
    await page.selectOption("#sort", "start");
    ok(await page.evaluate(() => OPPS.every((o, i) => !i || OPPS[i - 1].ev.start <= o.ev.start)), "sort by start time");
    await page.selectOption("#sort", "ev");

    const key = await page.evaluate(() => OPPS[0].key);
    await page.locator(".ev-row [data-act=hide]").first().click();
    ok(await page.evaluate((k) => !OPPS.some((o) => o.key === k), key), "hide removes a row");
    await page.click("[data-act=unhide]");
    ok(await page.evaluate((k) => OPPS.some((o) => o.key === k), key), "show hidden restores it");

    await page.locator(".ev-row [data-act=track]").first().click();
    ok(await page.evaluate(() => S.bets.length === 1 && S.bets[0].closeFair != null), "track adds a bet with a fair line");
    await page.locator(".ev-row [data-act=track]").first().click();
    ok(await page.evaluate(() => S.bets.length === 1), "tracking the same bet twice is ignored");

    await page.reload(); await page.waitForTimeout(500);
    ok(await page.evaluate(() => F.devig === "multiplicative" && S.bets.length === 1), "filters and bets persist across reload");

    await page.click("[data-act=theme]");
    const th = await page.evaluate(() => document.documentElement.dataset.theme);
    ok(th === "light" || th === "dark", "theme toggle sets data-theme", th);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.click("[data-act=theme]");
    ok(bg !== (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)), "theme toggle changes colors");

    for (const v of ["odds", "arb", "tracker", "calc"]) {
      await page.click(`[data-v=${v}]`);
      await page.waitForTimeout(150);
      ok((await page.locator("#view").innerText()).length > 50, `${v} view renders`);
    }
    await page.click("[data-v=odds]");
    for (const c of ["spreads", "totals", "props", "h2h"]) {
      await page.click(`[data-act=os-cat][data-k=${c}]`);
      ok(await page.locator("#os-body table, #os-body .empty").count() > 0, `odds screen ${c} renders`);
    }
    ok(await page.locator("#os-body td.px.best").count() > 0, "odds screen highlights best prices");
    await page.click("[data-v=arb]");
    ok(await page.evaluate(() => ARBS.every((a) => a.inv < 1) && LOWHOLD.every((a) => a.inv >= 1 && a.inv - 1 <= F.lowHold / 100)), "arb/low-hold classification");
    ok(await page.evaluate(() => ARBS.every((a) => { const s = a.legs.map((l) => 100 / amToDec(l.price) / a.inv); return a.legs.every((l, i) => near(s[i] * amToDec(l.price), 100 / a.inv, 1e-6)); })), "arb stakes pay out equally on every leg");

    /* demo ticks update prices */
    const t0 = await page.evaluate(() => S.updated);
    await page.waitForTimeout(4500);
    ok(await page.evaluate((t) => S.updated > t, t0), "demo prices tick live");
    ok(errors.length === 0, "no page errors in demo", errors.join(" | "));
    await ctx.close();
  }

  /* ============ 3. calculators ============ */
  console.log("\n3. Calculators");
  {
    const page = await browser.newPage();
    await prep(page);
    await page.goto(PAGE);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem("lbe.view", '"calc"'); });
    await page.reload(); await page.waitForTimeout(300);
    await page.fill("#ev-odds", "+110"); await page.fill("#ev-s1", "-110"); await page.fill("#ev-s2", "-110");
    ok((await page.locator("#ev-out").innerText()).includes("+5.00%"), "EV calc: +110 vs fair -110/-110 = +5.00%");
    await page.fill("#dv-1", "-110"); await page.fill("#dv-2", "-110");
    ok((await page.locator("#dv-out").innerText()).includes("4.76%"), "no-vig calc shows 4.76% hold on -110/-110");
    await page.fill("#k-odds", "+100"); await page.fill("#k-p", "55"); await page.fill("#k-bank", "1000"); await page.fill("#k-frac", "1");
    ok((await page.locator("#k-out").innerText()).includes("$100.00"), "Kelly calc: 55% at +100 on $1000 = $100");
    await page.fill("#a-1", "+110"); await page.fill("#a-2", "+105"); await page.fill("#a-t", "100");
    ok((await page.locator("#a-out").innerText()).includes("ROI"), "arb calc renders");
    await page.fill("#c-dec", "2.5");
    ok((await page.inputValue("#c-am")) === "+150" && (await page.inputValue("#c-frac")) === "3/2", "odds converter decimal → American & fractional");
    await page.fill("#p-legs", "+100, +100\n+100, +100"); await page.fill("#p-st", "10");
    ok((await page.locator("#p-out").innerText()).includes("+300"), "parlay: two +100 legs = +300");
    await page.close();
  }

  /* ============ 4. tracker ============ */
  console.log("\n4. Bet tracker");
  {
    const page = await browser.newPage();
    await prep(page);
    await page.goto(PAGE);
    await page.evaluate(() => {
      localStorage.clear();
      const b = (id, odds, stake, status, ev) => ({ id, t: Date.now() - 1000 * +id.slice(1), league: "NFL", event: "A @ B", start: 0, market: "Moneyline", bet: "A", book: "draftkings", odds, fairAtBet: odds, evAtBet: ev, stake, status, closeFair: -110, settledAt: Date.now() });
      localStorage.setItem("lbe.bets", JSON.stringify([b("b1", 150, 10, "won", 0.05), b("b2", -110, 22, "lost", 0.02), b("b3", 120, 10, "push", 0.03)]));
      localStorage.setItem("lbe.view", '"tracker"');
    });
    await page.reload(); await page.waitForTimeout(300);
    const k = await page.locator(".kpis").innerText();
    ok(k.includes("-$7.00"), "profit = +15 − 22 + 0 = −$7.00", k.replace(/\n/g, " "));
    ok(k.includes("1-1-1"), "record W-L-P");
    ok(await page.locator("#chart path").count() === 2, "P/L chart draws actual + expected lines");
    await page.hover("#chart", { position: { x: 400, y: 80 } });
    ok(await page.locator("#tip").isVisible(), "chart hover tooltip");
    await page.locator("select[data-bf=status]").first().selectOption("lost");
    ok(await page.evaluate(() => S.bets.filter((b) => b.status === "lost").length === 2), "changing result updates bet");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("[data-act=export]")]);
    ok(dl.suggestedFilename().endsWith(".csv"), "CSV export downloads");
    await page.click("[data-act=add-bet]");
    await page.fill("#mb-event", "X @ Y"); await page.fill("#mb-bet", "X ML"); await page.fill("#mb-odds", "+120"); await page.fill("#mb-fair", "+100");
    await page.click("[data-act=save-bet]");
    ok(await page.evaluate(() => S.bets.length === 4 && near(S.bets[3].evAtBet, 0.1)), "manual bet: +120 vs fair +100 = +10% EV");
    await page.locator("[data-act=del-bet]").first().click();
    ok(await page.evaluate(() => S.bets.length === 3), "delete bet");
    await page.close();
  }

  /* ============ 5. live mode (mocked API) ============ */
  console.log("\n5. Live mode — The Odds API (mocked)");
  {
    const { page, ctx, errors, calls } = await livePage(browser);
    const odds = calls.filter((u) => /\/odds$/.test(u.pathname));
    ok(calls.some((u) => /\/sports\/?$/.test(u.pathname)), "checks in-season sports first (free endpoint)");
    ok(!odds.some((u) => u.pathname.includes("basketball_nba")), "skips out-of-season league (NBA)");
    ok((await page.locator(".banner").innerText()).includes("NBA"), "banner names skipped league");
    ok(odds.every((u) => u.searchParams.get("bookmakers") && !u.searchParams.get("regions")), "requests by bookmakers (cheaper)");
    ok(odds.every((u) => u.searchParams.get("includeLinks") === "true" && u.searchParams.get("oddsFormat") === "american"), "asks for deep links + American odds");
    ok(odds.some((u) => u.pathname.includes("/events/nfl1/odds") && u.searchParams.get("markets").includes("player_pass_yds")), "fetches NFL props per event");
    const opps = await page.evaluate(() => OPPS.map((o) => ({ label: o.label, book: o.book, price: o.price, ev: o.evp, link: o.link })));
    const bills = opps.find((o) => o.label === "Buffalo Bills");
    ok(bills && bills.book === "draftkings" && bills.price === 135, "finds DK Bills +135 vs Pinnacle +120/-130", JSON.stringify(opps));
    const exp = await page.evaluate(() => { const q = [amToProb(120), amToProb(-130)]; return Math.min(...METHODS.map((m) => DEVIG[m](q)[0])) * amToDec(135) - 1; });
    ok(bills && near(bills.ev, exp, 1e-9), "EV matches hand calculation", `${bills?.ev} vs ${exp}`);
    ok(bills && bills.link === "https://draftkings.example/slip/bills", "outcome deep link carried to row");
    ok(await page.locator(".ev-row a.go").count() >= 1, "row shows 'open at sportsbook' link");
    ok(opps.some((o) => o.label === "J. Allen Over 255.5"), "player prop +EV found");
    ok(opps.some((o) => o.label === "Chelsea"), "3-way soccer moneyline handled (Chelsea +380 vs fair)");
    ok(await page.evaluate(() => !!BOOKS.mysterybook && BOOKS.mysterybook.abbr === "MB"), "unknown bookmaker registered with generated badge");
    ok((await page.locator("#status").innerText()).includes("470 credits"), "shows remaining API credits");

    /* CLV: track the bet, then the price/fair moves on refresh */
    await page.evaluate(() => trackOpp(OPPS.find((o) => o.label === "Buffalo Bills")));
    const fair0 = await page.evaluate(() => S.bets[0].closeFair);
    await page.route(/the-odds-api\.com.*americanfootball_nfl\/odds/, (r) => {
      const e = nflEvent(); e.bookmakers[0].markets[0].outcomes[0].price = 105; e.bookmakers[0].markets[0].outcomes[1].price = -115;
      r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify([e]) });
    });
    await page.click("[data-act=refresh]"); await page.waitForTimeout(600);
    const fair1 = await page.evaluate(() => S.bets[0].closeFair);
    ok(fair1 !== fair0 && fair1 < fair0, "closing fair line updates on refresh (sharp moved toward Bills)", `${fair0} → ${fair1}`);
    ok(errors.length === 0, "no page errors in live mode", errors.join(" | "));
    await ctx.close();
  }
  {
    const { page, ctx, calls } = await livePage(browser, { rejectBooks: true });
    ok(calls.some((u) => u.searchParams.get("regions")), "falls back to regions if bookmakers param is rejected");
    ok(await page.evaluate(() => OPPS.length > 0), "still finds bets after fallback");
    await ctx.close();
  }
  {
    const { page, ctx } = await livePage(browser, { badKey: true });
    ok((await page.locator(".banner.err").innerText()).includes("API key rejected"), "bad key → clear error banner");
    await ctx.close();
  }
  {
    const { page, ctx, calls } = await livePage(browser, { reqMode: "regions" });
    ok(calls.filter((u) => /\/odds$/.test(u.pathname)).every((u) => u.searchParams.get("regions") && !u.searchParams.get("bookmakers")), "region mode sends regions");
    await page.click("[data-act=settings]");
    ok((await page.locator("#credit-note").innerText()).includes("Last call cost"), "settings shows credit cost");
    await page.click("[data-act=mode][data-val=demo]"); await page.click("[data-act=save-settings]"); await page.waitForTimeout(500);
    ok(await page.evaluate(() => S.settings.mode === "demo" && S.events.length > 10), "switching back to demo from settings");
    await ctx.close();
  }

  /* ============ 6. layout ============ */
  console.log("\n6. Layout — no horizontal page scroll");
  for (const w of [360, 390, 768, 1024, 1180, 1440, 1920]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    await prep(page);
    await page.goto(PAGE); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400);
    const res = [];
    for (const v of ["ev", "odds", "arb", "tracker", "calc"]) {
      await page.click(`[data-v=${v}]`); await page.waitForTimeout(100);
      res.push(await page.evaluate(() => document.documentElement.scrollWidth));
    }
    ok(res.every((x) => x <= w), `${w}px: all views fit`, res.join(","));
    await ctx.close();
  }

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
