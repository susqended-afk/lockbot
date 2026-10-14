// ============================================================
// DEGEN WIKI — how memecoins actually work (in-game encyclopedia)
// ============================================================
const WIKI = [
  { id: 'memecoin', title: 'What is a memecoin?', body: `
<p>A memecoin is a token with no product behind it. Its value is attention: a funny name, a mascot, a community, and the belief that someone later will pay more than you did.</p>
<p>On fast chains like Solana, anyone can create one in seconds for a few cents. Hundreds of thousands launch every month. Studies of launchpads keep finding the same thing: well over 95% never reach a real DEX listing, and most of the rest go to zero within days.</p>
<p>Money in a memecoin only moves from one wallet to another. When someone sells at a profit, someone else is holding the bag. Fees go to the launchpad, the DEX and the bots.</p>` },
  { id: 'curve', title: 'Bonding curves (PumpBin)', body: `
<p>Launchpads like PumpBin don't need anyone to provide liquidity at launch. Instead the coin trades against a <b>bonding curve</b>: a formula that sets the price from how many tokens are already sold.</p>
<p>PumpBin uses a constant-product curve over <i>virtual</i> reserves, the same model real launchpads use:</p>
<pre>virtual SOL   = 30 SOL
virtual tokens = 1,073,000,000
price = virtualSOL / virtualTokens
tokens out = vTok − (vSol × vTok) / (vSol + SOL in)</pre>
<p>Total supply is 1B. 793.1M tokens are sold on the curve. Starting price ≈ 0.000000028 SOL (market cap ≈ 28 SOL). Every buy pushes the price up, every sell pushes it down. There's a 1% fee each way.</p>
<p>When all 793.1M curve tokens are sold (about <b>85 SOL</b> raised) the coin <b>graduates</b>: the raised SOL and the last 206.9M tokens seed a DEX pool and the LP tokens are burned. Market cap at graduation is about 410 SOL (~$61K at $150/SOL). Halfway there you hit "King of the Hill" and get front-page visibility.</p>
<p><b>Why the dev bag matters:</b> the creator buys first, at the lowest price on the curve. 1 SOL at launch buys ~34M tokens (3.4% of supply). If the coin reaches graduation those tokens are worth ~14 SOL on paper. Selling them is a different story (see Liquidity).</p>` },
  { id: 'amm', title: 'Liquidity pools & price impact', body: `
<p>After graduation (or on a custom launch) the coin trades in an automated market maker (AMM) pool holding SOL on one side and tokens on the other. The pool keeps <b>x · y = k</b> constant.</p>
<pre>Pool: 80 SOL × 200M tokens  (price 0.0000004 SOL)
You sell 20M tokens:
  new tokens = 220M
  new SOL    = 80 × 200 / 220 = 72.73
  you get    = 7.27 SOL (minus 0.25% fee)
At the old spot price it "should" be 8 SOL. That 9% gap is price impact.</pre>
<p>Bigger sells relative to the pool get worse prices. That's why the Terminal shows <b>"if sold now"</b>, a real quote, next to your bag's paper value. Dumping a big bag into a thin pool crashes the chart and gets you much less than the market cap suggests.</p>` },
  { id: 'mcap', title: 'Market cap is not money', body: `
<p>Market cap = price × total supply. It's the number everyone brags about, but nobody can sell at it. A coin can show a $500K market cap with $40K of liquidity in the pool. If holders all tried to sell, they'd split roughly that $40K.</p>
<p>Real exit value is always limited by liquidity, and every sell drains it for the next seller. First out gets paid. Last out holds the bag.</p>` },
  { id: 'snipers', title: 'Snipers & the dev bag', body: `
<p><b>Snipers</b> are bots that buy new tokens in the first second or two, hoping to dump on the first real buyers. Most flip within seconds. As a dev you'll often see your chart jump at launch, then dip as they exit. The RGB gaming PC's fast launch relay keeps most of them out.</p>
<p>Your <b>dev bag</b> is visible to everyone on RugRadar. A big bag gives you more upside, but buyers know you could dump it on them, so careful wallets buy less.</p>` },
  { id: 'chirp', title: 'Chirp, followers & KOLs', body: `
<p>Memecoins run on attention. Every post you make on Chirp reaches some share of your followers. A few of them buy, and you can watch those buys arrive in the trade feed tagged <b>via Chirp</b>.</p>
<p>Reach grows faster than linearly with followers, and bigger accounts bring bigger buyers. A 40-follower account moves nothing. 10K followers move a launch. 1M can graduate almost anything. Credibility multiplies everything: when coins you shill get rugged, people unfollow and your credibility drops.</p>
<p><b>KOLs</b> (key opinion leaders) are influencers who sell promotion. In practice many buy your coin before posting and sell into their own followers. That's exactly what happens in RUGGED, and some just take the money and block you.</p>` },
  { id: 'rugs', title: 'Rug pulls', body: `
<p>A <b>rug pull</b> is when the people behind a coin take the money and leave holders with worthless tokens. The common kinds:</p>
<p><b>Dev dump.</b> The creator sells their whole bag into the buyers. It shows on chain as "DEV SOLD" and the chart collapses.</p>
<p><b>Liquidity pull.</b> Only possible when the dev controls the pool's LP tokens. Removing liquidity takes the SOL out of the pool and nobody can sell anymore. Locking LP delays this. Burning LP makes it impossible.</p>
<p>RugRadar also warns about contract tricks you'll see on real tokens, like unrevoked mint authority (more tokens can be printed) and honeypots (buys work, sells don't).</p>
<p>In RUGGED a rug pays more than running a coin honestly, but bagholders call you out. You lose followers and credibility, and your rug count shows up on every coin you launch after that.</p>` },
  { id: 'radar', title: 'How to spot a rug (RugRadar)', body: `
<ul>
<li><b>Mint authority</b> should be revoked.</li>
<li><b>LP</b> should be burned, or at least locked for a long time.</li>
<li><b>Dev holdings</b> and the <b>top 10 holders</b> shouldn't control a huge share.</li>
<li><b>Dev history:</b> a creator linked to previous rugs is the biggest red flag of all.</li>
<li><b>Dev selling:</b> a creator wallet that's dumping is a warning sign.</li>
</ul>
<p>Smart money in RUGGED reads RugRadar and stays away from risky coins. Degens mostly don't. Your risk score directly changes who buys.</p>` },
  { id: 'fees', title: 'Creator fees & running a real coin', body: `
<p>Launchpads pay creators a small cut of trading volume. In RUGGED that's <b>0.3% of every trade</b> on your coin, on the curve and on the DEX. Claim it any time in the Terminal.</p>
<p>A coin that keeps trading for a long time earns fees the whole way. If you don't rug, holders who made money follow you, and a coin that graduates gives your credibility a big boost. Bigger following means more reach on your next launch.</p>
<p>Taking some profit is normal. Selling more than half your bag on your holders counts as a rug.</p>` },
  { id: 'rep', title: 'Followers & credibility', body: `
<p>Your reach on Chirp depends on followers × credibility. Credibility goes up when you call coins that run and when your coins graduate. It drops when you rug, especially coins you shilled with a "100x" call. It recovers a little each day.</p>
<p>Every rug is also public history. RugRadar shows "Dev linked to N rugs" on all your future launches, and careful buyers stay away.</p>` },
  { id: 'glossary', title: 'Glossary', body: `
<p><b>Ape</b>: buy without thinking. <b>Jeet</b>: someone who sells fast. <b>CA</b>: contract address. <b>LP</b>: liquidity pool / its ownership tokens. <b>Mcap</b>: market cap. <b>ATH</b>: all-time high. <b>Bags</b>: your holdings. <b>Exit liquidity</b>: the people you sell to. <b>CTO</b>: community takeover after the dev leaves. <b>KOL</b>: paid influencer. <b>DYOR</b>: do your own research. <b>WAGMI / NGMI</b>: we're all gonna make it / not gonna make it. <b>Rekt</b>: wrecked.</p>` },
  { id: 'real', title: 'Real talk', body: `
<p>RUGGED is satire. In the real world rug pulls are fraud, and the people holding the bag lost real money. Use what you learn here to recognize rugs, not to run them.</p>` },
];
