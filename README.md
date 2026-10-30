# LOCKBOT

Two single-file web apps. Open either one in a browser, or use Share → Add to Home Screen on a phone.

| File | What it is |
|---|---|
| `LOCKBOT.html` | PrizePicks prop edge finder |
| `EDGE.html` | **LOCKBOT Edge**: a positive-EV sportsbook scanner, odds screen, arbitrage finder, bet tracker and calculators |

## LOCKBOT Edge (`EDGE.html`)

**Live site (after GitHub Pages is on):** https://susqended-afk.github.io/lockbot/. To turn it on, go to the repo's Settings → Pages, set Source to *Deploy from a branch*, and choose `main` / `(root)`.

**Tests:** `node tests/edge.test.js` (needs Playwright with Chromium). The Odds API is mocked, so no key is needed.

It opens in **demo mode**, which uses a simulated market so every screen works without an API key. To use real odds, open Settings (gear icon), choose **Live — The Odds API**, and paste a key from [the-odds-api.com](https://the-odds-api.com).

### How it finds +EV
1. **Group** every price into exact markets (same event, market and line). This way a sharp −3.5 is only ever compared with −3.5.
2. **Devig** each sharp book (Pinnacle, Circa, Novig… with weights you set) to get the no-vig probability of every outcome. There are four methods: multiplicative, additive, power and Shin. **Worst case** runs all four and keeps the least favorable price.
3. **Blend** the sharp books by weight into one fair probability `p`.
4. **Score** each of your books: `EV = p × decimalOdds − 1`. The bet size is fractional Kelly: `(p·d − 1)/(d − 1) × fraction`, capped at your maximum stake %.

### Screens
- **Positive EV**: filterable table showing EV %, fair odds, win %, bet size, sharp line and line age. Expand a row to see the full market across books, all four devig results, the EV and Kelly math, and line movement.
- **Odds Screen**: league × market grid with every book. The best price is outlined and +EV prices are shaded.
- **Arbitrage & Low Hold**: the best price on each side, with stake splits for a chosen total stake.
- **Bet Tracker**: one-click tracking from the EV screen. Shows P/L, ROI, expected profit, CLV (the fair line keeps updating until kickoff), a chart of cumulative actual vs expected profit, and CSV export.
- **Calculators**: EV, no-vig, Kelly, arbitrage, odds converter and parlay EV.

### API credits
The app checks the free `/sports` endpoint first and skips leagues that are out of season. By default it requests only your books plus the weighted sharp books (`bookmakers=`). If the API rejects that, it falls back to whole regions. A refresh costs about `leagues × 3 markets × ceil(books / 10)` credits in books mode, or `× regions` in region mode. Player props add `events × prop markets × regions` per league. Settings shows the estimate. Include the `eu` region (Pinnacle) and `us_ex` region (exchanges) so there are sharp lines to devig against.

Settings, filters and tracked bets are stored in this browser's localStorage only.
