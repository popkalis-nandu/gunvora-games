/* =====================================================================
   Gaming World of Jarvis — SITE CONFIGURATION  (the ONLY file you normally edit)
   ---------------------------------------------------------------------
   1. Replace every value marked  >>> REPLACE <<<  with your real details.
   2. Paste your Razorpay / Stripe / Instamojo / Cashfree "Payment Link"
      URLs into PAYMENT_LINKS. Any link that still contains "REPLACE_ME"
      is treated as "not configured" and the button shows a notice
      instead of opening a broken page.
   3. See README.md for how premium unlock works (and its limitations).
   ===================================================================== */
window.GV_CONFIG = {
  /* ---------- Brand & site ---------- */
  siteName: "Gaming World of Jarvis",
  tagline: "Play free. Play loud. Play Jarvis.",
  siteUrl: "https://popkalis-nandu.github.io/gunvora-games",              // >>> REPLACE <<< your live domain, no trailing slash

  /* ---------- Business / legal identity (shown on legal pages) ---------- */
  businessName: "[Your Business Name]",            // >>> REPLACE <<< e.g. "Gaming World of Jarvis" or your registered firm name
  legalEntity: "[Sole Proprietorship / LLP / Pvt Ltd]", // >>> REPLACE <<<
  ownerName: "[Owner / Proprietor Name]",          // >>> REPLACE <<<
  address: "[Street Address], [City], [State] – [PIN], India", // >>> REPLACE <<<
  jurisdictionCity: "[Your City]",                 // >>> REPLACE <<< courts of this city have jurisdiction
  gstin: "",                                       // optional — leave "" if not GST-registered
  contactEmail: "support@example.com",             // >>> REPLACE <<<
  contactPhone: "+91-00000-00000",                 // >>> REPLACE <<<
  supportHours: "Mon–Sat, 10:00–18:00 IST",

  /* ---------- Grievance Officer (IT Rules 2021 / DPDP Act 2023 / E-Commerce Rules 2020) ---------- */
  grievanceOfficer: {
    name: "[Grievance Officer Name]",              // >>> REPLACE <<<
    designation: "Grievance Officer",
    email: "grievance@example.com",                // >>> REPLACE <<<
    phone: "+91-00000-00000",                      // >>> REPLACE <<<
    address: "[Same as business address or other]" // >>> REPLACE <<<
  },

  legalLastUpdated: "26 October 2026",
  minimumAge: 18,      // age below which parental consent is required (DPDP Act 2023 defines a child as < 18)

  /* ---------- Prices (display only — the real amount is set inside your payment link) ---------- */
  currency: "₹",
  plans: {
    monthly: { label: "Premium Monthly", price: 99,  period: "month", days: 30 },
    yearly:  { label: "Premium Yearly",  price: 799, period: "year",  days: 365 }
  },

  /* ---------- PAYMENT LINKS  >>> PASTE YOUR LINKS HERE <<< ----------
     Create these in your gateway dashboard:
       Razorpay  → Payment Links / Payment Pages  (https://rzp.io/l/xxxx  or  https://razorpay.me/...)
       Stripe    → Payment Links                  (https://buy.stripe.com/xxxx)
     Tip: set the link's "redirect after payment" URL to  <siteUrl>/redeem.html?paid=1           */
  paymentLinks: {
    premiumMonthly: "https://rzp.io/l/REPLACE_ME_MONTHLY",
    premiumYearly:  "https://rzp.io/l/REPLACE_ME_YEARLY",
    // In-game store items (keys must match ids in js/data.js → STORE_ITEMS)
    items: {
      "skin-scope-gold":    "https://rzp.io/l/REPLACE_ME_SCOPE_GOLD",
      "skin-scope-plasma":  "https://rzp.io/l/REPLACE_ME_SCOPE_PLASMA",
      "skin-rifle-dragon":  "https://rzp.io/l/REPLACE_ME_RIFLE_DRAGON",
      "paint-car-inferno":  "https://rzp.io/l/REPLACE_ME_CAR_INFERNO",
      "paint-car-chrome":   "https://rzp.io/l/REPLACE_ME_CAR_CHROME",
      "hull-sub-stealth":   "https://rzp.io/l/REPLACE_ME_SUB_STEALTH",
      "skin-snake-rainbow": "https://rzp.io/l/REPLACE_ME_SNAKE_RAINBOW",
      "outfit-commando":    "https://rzp.io/l/REPLACE_ME_OUTFIT_COMMANDO",
      "outfit-ghost":       "https://rzp.io/l/REPLACE_ME_OUTFIT_GHOST",
      "bundle-starter":     "https://rzp.io/l/REPLACE_ME_BUNDLE_STARTER"
    }
  },

  /* ---------- Unlock / redeem codes (CLIENT-SIDE ONLY — NOT SECURE) ----------
     After a customer pays, email them the matching code. They enter it on
     redeem.html and the item is unlocked in their browser (localStorage).
     Anyone who reads this file can see these codes — see README "Limitations".
     CHANGE THESE before going live, and rotate them regularly.
     Value = list of entitlements granted:
       "premium:30" (30 days) / "premium:365" (365 days) / an item id / "bundle-starter"  */
  unlockCodes: {
    "GV-MONTH-CHANGE-ME": ["premium:30"],
    "GV-YEAR-CHANGE-ME":  ["premium:365"],
    "GV-SKINS-CHANGE-ME": ["skin-scope-gold", "paint-car-inferno"],
    "GV-DEMO-2026":       ["premium:1"]     // 1-day demo code for testing — delete before launch
  },

  /* ---------- Android (Google Play) links — leave "" to show "Coming soon" ---------- */
  androidLinks: {
    "shadow-front": "",
    "turbo-racing": "",
    "dino-adventure": "",
    "sniper-range": "",
    "neon-snake": ""
  },

  /* ---------- Ads ----------
     Ad slots are placeholders. They are hidden for Premium members and on
     all Kids games. Real Google AdSense code is only loaded after the visitor
     clicks "Accept all" cookies. To use AdSense, put your publisher id
     (ca-pub-XXXXXXXXXXXXXXXX) below after approval.  enabled:false hides all. */
  ads: {
    enabled: true,
    adsenseClient: ""   // e.g. "ca-pub-1234567890123456"
  },

  /* ---------- Contact form ----------
     No backend: leave "" to open the visitor's email app (mailto).
     Or paste a free form endpoint (Formspree / Getform / Web3Forms).          */
  contactFormEndpoint: "",

  /* ---------- Social (optional, "" hides) ---------- */
  social: { youtube: "", instagram: "", x: "", discord: "" }
};
