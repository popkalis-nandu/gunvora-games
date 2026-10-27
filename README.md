# Gaming World of Jarvis — static games website

A complete, original games portal built with **plain HTML, CSS and JavaScript**.
It has no build step, no framework and no server code, so it runs on any free static host
(GitHub Pages, Netlify, Cloudflare Pages) or straight from a local web server.

* 8 playable HTML5 canvas games that work with keyboard, mouse and touch. **6 are free (75%) and 2 are Premium.**
* 4 flagship "coming soon" titles. Each one links to a playable lite version.
* Premium plans (Free / ₹99 per month / ₹799 per year) and an in-game store (₹10–₹150), driven by **payment links**.
* Indian statutory pages: Privacy (DPDP Act 2023), Terms, Refund & Cancellation, Shipping/Delivery,
  Cookie Policy with a consent banner, Disclaimer, Grievance Officer (IT Rules 2021), About, Contact.
* SEO and Open Graph tags, sitemap.xml, robots.txt, favicon, web manifest, 404 page, accessible markup.

> ⚠️ **The legal pages are templates.** They were written in good faith for an Indian digital-goods business,
> but they are **not legal advice**. Have a lawyer or CA review them, and your GST position, before you take payments.

---

## 1. Quick start (local)

```bash
cd gunvora-games
python3 -m http.server 8080     # or: npx serve .
# open http://localhost:8080
```

Use a local server rather than double-clicking the HTML files, so that every browser feature works.

---

## 2. Site structure

```
gunvora-games/
├── index.html          Home: featured banner, Trending, New, Play Online, Android, Categories, search/filter
├── games.html          All games (search + filter chips; supports ?cat=kids, ?q=sniper, ?filter=free)
├── game.html           Game detail template (?id=<game-id>): cover, screenshots, story, controls, etc.
├── play.html           Game player (?id=<game-id>)
├── pricing.html        Free / Monthly / Yearly plans
├── store.html          In-game items (skins, paints, outfits, bundle)
├── redeem.html         Enter unlock code, see "My items", erase local data
├── about.html  contact.html
├── privacy.html terms.html refund.html shipping.html cookies.html disclaimer.html grievance.html
├── 404.html  robots.txt  sitemap.xml  site.webmanifest
├── games/<slug>/       Full web builds of our standalone games, embedded via play.html (iframe mode)
├── assets/shots/       Real screenshots used as cover art (<slug>-1..3.jpg)
├── css/style.css       The entire theme (bright corporate: light surfaces, indigo + orange, Inter / Plus Jakarta Sans, responsive)
├── js/
│   ├── config.js       ★ THE file you edit: business details, prices, PAYMENT LINKS, codes
│   ├── data.js         Game catalogue, categories, store items
│   ├── covers.js       Procedural SVG cover art (original, no external images)
│   ├── app.js          Header/footer, search, entitlements, payments, cookie banner, ads
│   ├── catalog.js      Home & browse page rendering
│   ├── game-page.js    Detail page rendering
│   ├── play.js         Shared game engine (canvas, touch buttons, pause, fullscreen, sound, scores)
│   ├── store.js        Store cards (buy / equip)
│   └── pages.js        Pricing, redeem, contact form logic
├── games/*.js          One file per game
├── assets/             favicon, icons, og-image.png, shots/ (game screenshots)
└── screenshots/        Preview screenshots of the site (safe to delete before deploying)
```

The header, footer and legal links are injected by `js/app.js`, so a change made there applies to every page.
Any element with `data-cfg="contactEmail"` (or `data-cfg-mail`, `data-cfg-price`) is filled from `config.js`.

---

## 3. What you must fill in (`js/config.js`)

| Field | What to put |
|---|---|
| `siteUrl` | Your live domain, e.g. `https://www.yourdomain.in` (no trailing slash) |
| `businessName`, `legalEntity`, `ownerName` | Your registered name and entity type |
| `address`, `jurisdictionCity` | Full postal address; city for court jurisdiction |
| `gstin` | GSTIN, or `""` if not registered |
| `contactEmail`, `contactPhone`, `supportHours` | Support contact |
| `grievanceOfficer.{name, email, phone, address}` | Required by IT Rules 2021 / DPDP Act |
| `legalLastUpdated`, `minimumAge` | Policy date; age needing parental consent (18 under DPDP) |
| `plans.monthly.price`, `plans.yearly.price` | Displayed prices (the real charge is set in the payment link) |
| `paymentLinks.premiumMonthly`, `paymentLinks.premiumYearly` | Your payment-link URLs |
| `paymentLinks.items.*` | One link per store item (10 items) |
| `unlockCodes` | **Change every code** and delete `GV-DEMO-2026` before launch |
| `androidLinks.*` | Google Play URLs when apps are live (`""` = "Coming soon") |
| `ads.enabled`, `ads.adsenseClient` | AdSense publisher id after approval |
| `contactFormEndpoint` | Optional Formspree/Web3Forms URL (otherwise uses `mailto:`) |
| `social.*` | Optional social profile URLs |

Also replace **`https://www.example.com`** in these places:
`sitemap.xml`, `robots.txt`, and the `<link rel="canonical">` / `og:url` / `og:image` tags in every `.html` file.
Search and replace across the folder works fine, for example:

```bash
grep -rl "https://www.example.com" . | xargs sed -i 's#https://www.example.com#https://yourdomain.in#g'
```

---

## 4. Payments: pasting your payment links

1. Create a **Payment Link** (or Payment Page) for each product in your gateway:
   * **Razorpay** → Dashboard → Payment Links / Payment Pages (supports UPI, cards, netbanking; INR)
   * **Stripe** → Payment Links · **Instamojo**, **Cashfree** and **PayU** have the same feature
2. Set the amount (₹99, ₹799, ₹10…), and in the link settings ask the customer for their **email**.
3. Set **redirect / success URL** to `https://yourdomain/redeem.html?paid=1`. That page thanks the
   buyer and asks for their unlock code.
4. Paste each URL into `paymentLinks` in `js/config.js`. Any link still containing `REPLACE_ME`
   shows a polite "Payments opening soon" message instead of a broken page.

### How unlocking works now (no backend)

1. A player clicks **Subscribe** or **Buy**, and the payment link opens in a new tab.
2. You see the payment in your gateway dashboard and email the buyer the matching **unlock code**
   from `unlockCodes`.
3. They enter it on `redeem.html`. Premium (N days) or the item is saved in their browser's `localStorage`.
4. Premium hides all ads and unlocks Premium games. Store items appear in "My items" and can be
   equipped in-game (gold scope, inferno car, stealth sub, rainbow snake and so on).

### ⚠️ Honest limitations of this approach

* **It is not secure.** `config.js` is public, so anyone who reads it can see the codes.
  This is fine for launching and testing demand, but not for serious revenue.
* Entitlements live in **one browser on one device**. Clearing site data or changing device loses them
  (the player can re-enter the code).
* Payment links are **one-time payments**, not auto-renewing subscriptions. The site says so honestly
  ("One-time payment for 30 days. No auto-renewal.").
* Fulfilment is manual (you email the code).

### Upgrading to real, automatic entitlements (recommended once you have sales)

* Add user accounts (**Firebase Auth** or **Supabase Auth**, both with free tiers).
* Use **Razorpay Subscriptions / Orders** with a **webhook** (`payment.captured`, `subscription.charged`)
  that is handled by a small serverless function (Firebase Cloud Functions, Supabase Edge Functions,
  Cloudflare Workers or Netlify Functions). The function verifies the webhook signature and writes the
  entitlement to the database.
* The site then reads the logged-in user's entitlements from the database instead of `localStorage`.
  `GV.ent()` / `GV.isPremium()` in `js/app.js` are the only functions you would need to swap.

---

## 5. Adding a new game

1. **Write the game** at `games/mygame.js` using the shared engine:

   ```js
   (function () {
     var W = 480, H = 640, S;
     function init(api) { S = { x: W / 2, score: 0 }; }
     function update(dt, api) {                 // dt in seconds
       if (api.keys.ArrowLeft) S.x -= 300 * dt;
       if (api.pointer.down) S.x = api.pointer.x;   // touch / mouse
       api.setScore(S.score);
       // when the player loses:  api.over({ title: "Game over" });
     }
     function draw(c, api) { c.fillStyle = "#05070d"; c.fillRect(0, 0, W, H); /* ... */ }
     GVPlay.register({ width: W, height: H, init: init, update: update, draw: draw,
       hint: "Arrows / drag to move",
       touch: { left: ["ArrowLeft", "ArrowRight"], right: [" "] } }); // on-screen buttons
   })();
   ```

   The engine also gives you `api.hit(key)` (pressed this frame), `api.pointer.tapped/swipe`,
   `api.sfx("hit")`, `api.skin("car")` (equipped cosmetic) and `api.best()`.
   Pause (P/Esc), fullscreen, mute, scaling and high scores are handled for you.

2. **Register it** in `js/data.js` → `GV_GAMES`. Copy an existing playable entry and set:
   `id`, `title`, `tagline`, `status: "playable"`, `premium` (true/false), `kids` (true/false),
   `trending` (sort order on the home page), `added` (date), `isNew`, `script: "mygame.js"`
   (the file name inside `games/`), `categories` (ids from `GV_CATEGORIES`), `difficulty`, `age`,
   `platforms`, `storyline`, `controls` (pairs of `[key, action]`), `instructions` and `store`
   (related item ids). For a coming-soon title, use `status: "coming-soon"` and
   `liteVersion: "<playable-id>"`.
   Cover art: add your id to the `MAP` in `js/covers.js` and choose an art style
   (`soldier, range, sub, racer, dino, memory, snake, space, blocks`). You can also write a new style.
3. Optional: add screenshots `assets/shots/<id>-1.png` and `<id>-2.png`, an `androidLinks` entry
   in `config.js`, and `game.html?id=<id>` / `play.html?id=<id>` URLs in `sitemap.xml`.
4. Kids games (`kids: true`) automatically show **no ads**.

**Free vs premium ratio:** to keep about 75% free, add roughly 3 free games for each premium game.
**Trending** on the home page is a curated order (the `trending` number on each game in `js/data.js`).
It is not based on real analytics.

---

## 6. Free deployment

Deploy only after you have filled in `config.js` and replaced `example.com`.
Before uploading, you can delete the `screenshots/` folder, which is only for preview.

### GitHub Pages
1. Create a repository and upload the **contents** of `gunvora-games/` (so `index.html` sits at the repo root).
2. Go to Settings → Pages → Source "Deploy from a branch" → `main` / root → Save.
3. The site goes live at `https://<user>.github.io/<repo>/`. You can add a custom domain under Settings → Pages.

All links are relative, so the site also works from a sub-path.

### Netlify
Go to app.netlify.com → **Add new site → Deploy manually** and drag the `gunvora-games` folder in.
Netlify also accepts a connected Git repo, with no build command and publish directory `.`.
Netlify Forms can power the contact form.

### Cloudflare Pages
Go to dash.cloudflare.com → Workers & Pages → Create → Pages → **Upload assets**, then upload the folder
(or connect Git with no build command and output directory `/`).

Any of the three gives you free HTTPS. Point your domain's DNS at the host and update `siteUrl`.

---

## 7. Ads

* `.ad-slot` placeholders appear on the home, browse, detail and player pages.
* They are **hidden for Premium members** and **never shown on Kids games** (`data-kids`).
* After AdSense approval, set `ads.adsenseClient`. The AdSense script loads **only** when the visitor
  clicks "Accept all" in the cookie banner. Visitors can change their choice via "Cookie settings" in the footer.
* AdSense also needs an `ads.txt` file at your domain root. Create it with the line Google gives you.

---

## 8. Compliance checklist (India) — verify with a professional

- [ ] Real business name, address, phone and email in `config.js` (payment gateways require these pages).
- [ ] A Grievance Officer named, with acknowledgement within 24 hours and resolution within 15 days, as stated.
- [ ] DPDP Act 2023: privacy notice, consent, verifiable parental consent for under-18s before collecting data.
- [ ] GST registration and invoices if applicable (OIDAR / digital services).
- [ ] Refund policy matches what your gateway (Razorpay/Stripe) requires for approval.
- [ ] Remove or rotate demo unlock codes.
- [ ] Confirm all game names, logos and art are yours. Everything in this repo was created originally for it.

---

## 9. Known limitations

* Premium and store unlocks are client-side (see §4). There are no accounts, cloud saves or online leaderboards.
* High scores are stored per browser.
* Detail and play pages use query strings (`game.html?id=…`). They are rendered by JavaScript, which is less
  SEO-friendly than one static page per game.
* The Android / Google Play buttons are placeholders until you publish the apps.
* The "coming soon" flagship titles are represented by playable lite versions.
* Without an endpoint, the contact form opens the visitor's email app.
* Sound effects are simple synthesized blips (WebAudio). There are no music files.


## Embedded web games (added 2026-10-27)
Standalone games live in `games/<slug>/`. In `js/data.js` set `embed: "games/<slug>/"`, `orientation: "landscape"|"portrait"` and `shots: N` (number of `assets/shots/<slug>-N.jpg` screenshots). `play.html?id=<slug>` then loads the game full-size in an iframe with a fullscreen button, and the cover art uses the real screenshots.

## New mini games (added 2026-10-27, all free)
Six original canvas games in `games/` using the shared `js/play.js` engine, registered in `js/data.js` (pack `mini6`, category Arcade) with procedural covers in `js/covers.js` and a "New mini games" row on the home page:
`colorblast.js` (Color Blast 3 · 50 levels + 60-second mode), `lanerush.js` (Turbo Lane Rush · 8 runners, 30 missions, daily challenge),
`bubblekingdom.js` (Bubble Kingdom · 100 levels), `soldierstrike.js` (Mini Soldier Strike · 40 missions, 10 weapons, 5 bosses),
`parking.js` (Parking Escape · 100 BFS-verified levels), `skytower.js` (Sky Tower Stack · endless + 30 challenges, 6 themes).
Progress, coins and high scores are saved in localStorage (`gv_colorblast`, `gv_lanerush`, `gv_bubblekingdom`, `gv_soldierstrike`, `gv_parking`, `gv_skytower`).
