# Data source and provenance

This document records exactly where the content in this site came from, and —
just as importantly — what could **not** be obtained.

## Summary

MKUYU Africa is a real Tanzanian property company. Its public website could
**not** be located, and **no project or property catalogue is publicly
available**. Everything in `assets/js/data.js` that describes a specific
property or project is therefore **invented sample data** and is marked
`sample: true`.

## What was verified from public sources

These facts are drawn from Tanzanian press reporting and are used on the About
and Home pages:

| Fact | Source |
|---|---|
| MKUYU Africa is a Tanzanian property development, sales and rental company | The Citizen, 5 Aug 2026 |
| Founded and led by **Juneid Othman** | The Citizen, 5 Aug 2026; Daily News, Sep 2026 |
| Stated vision: **one million** modern, affordable homes across Tanzania | The Citizen, 5 Aug 2026 |
| Introduced **flexible / instalment payment plans** | The Citizen, 5 Aug 2026; Daily News, Sep 2026 |
| **Miliki Ardhi Diaspora** programme, launched at BUILDEXPO 2026 for Tanzanians abroad | The Citizen, 25 Sep 2026; Daily News, Sep 2026 |
| Founder serves on the **Tanzania Brokers Association** board, seeking to professionalise brokerage | The Citizen, 5 Aug 2026 |
| Headquartered in **Dar es Salaam** | Both articles |

## What could NOT be obtained

- **No website domain.** Candidate domains tried (`mkuyu.co.tz`,
  `www.mkuyu.co.tz`, `mkuyuafrica.com`, `mkuyuafrica.co.tz`) did not resolve.
  None of the articles link to an official site. MKUYU Africa's own site could
  not be inspected, so its real design, structure and content are unknown.
- **No project names.** Not one named MKUYU development appears in any source
  found.
- **No property listings, prices, images or specifications.**
- **No published contact details** — no phone, email or office address.

## What was done instead of inventing it

1. **No project or property was copied or invented as if real.** The three
   projects and three properties in `data.js` are clearly generic
   (`sample-riverside-estate`, `sample-villa-12`, …) and every one carries
   `sample: true`.
2. **Contact details are blank, not made up.** `COMPANY.phone` and
   `COMPANY.email` are empty strings rather than plausible-looking fakes.
3. **Every page carries a visible notice** stating the listings are sample
   records, so a visitor can never mistake them for genuine inventory.
4. **No photography was fabricated.** Cards fall back to a branded gradient
   with a glyph instead of a broken or invented image.

## Customer accounts

Sign up, log in and the Customer Portal are built, but they only work against
the internal MKUYU system (see `docs/PUBLIC-API.md`). No fake sign-in exists:
in preview mode every account action says plainly that nothing was sent, and
the portal can only be viewed through clearly labelled sample customers
(`portal.html?demo=...`).

## To go live

Do **not** edit the sample data into real listings. The real catalogue lives in
the internal MKUYU system, managed by the Sales Officer. Connect the site by
setting `API_BASE` in `assets/js/config.js`, populate `COMPANY` from an official
source, and remove the preview notices. See the README.
