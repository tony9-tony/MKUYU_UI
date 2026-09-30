# MKUYU Africa — public website

The public face of MKUYU Africa, the Tanzanian property company. Visitors can
**Rent**, **Buy**, or **Sell** property, and follow everything they do with
MKUYU from **one customer account** and **one Customer Portal**.

## Run it

```bash
node serve.mjs
```

Then open <http://localhost:5500>. No install, no dependencies, no build step.
(Opening `index.html` straight from disk does not work: browsers block
JavaScript modules on `file://` pages.)

## One source of truth

```
Sales Officer → Internal MKUYU System → Public API → this website
```

The website has **no property database of its own** and no place to edit
listings. The Sales Officer manages properties, prices, Rent/Buy availability
and Sell submissions in the internal MKUYU system; this site only displays
what that system reports.

All data goes through one file, `assets/js/api.js`:

| Mode | When | Data |
|---|---|---|
| **Preview** | `API_BASE` in `assets/js/config.js` is empty (today) | Clearly labelled sample records from `assets/js/data.js`. Forms validate, then say plainly that nothing was sent. |
| **Connected** | `API_BASE` is set | Live data from the internal system. No page code changes. |

The endpoints the internal system must provide are specified in
[`docs/PUBLIC-API.md`](docs/PUBLIC-API.md).

## Business rules built in

- **Three public services only:** Rent, Buy, Sell. No Book, short-stay or
  public Reserve service.
- **Sell is a service, not a status.** A customer submits their own property;
  the Sales Officer reviews it; nothing is published automatically.
- **Status is system-controlled.** `available`, `reserved`, `rented`, `sold`
  come from the internal system. The website never changes them.
  - Available → listed under the services it is offered for.
  - Rented → drops out of Rent. Sold → drops out of Buy.
  - Reserved ≠ Rented. Whether reserved properties are shown is undecided, so
    it is one switch: `RESERVED_ON_WEBSITE` in `config.js` (default: hidden).
  - A direct link to a rented/sold/reserved property explains that it is not
    available, and the request button is disabled.
- **A request is not a reservation.** Sending a Rent/Buy request never changes
  a property's status; the request form says so.
- **One account, adaptive portal.** The portal shows a section only for the
  services a customer uses (Rent, Buy, Sell, or any mix).
- **Nothing undecided is invented.** Sign-up verification, online payment,
  document downloads, handover details and the Sell workflow after review are
  shown as "being finalised by MKUYU" until they are decided. See the table at
  the end of `docs/PUBLIC-API.md`.

## Pages

| Page | File | Notes |
|---|---|---|
| Home | `index.html` | Rent / Buy / Sell entry tiles, featured listings with a Buy/Rent switch |
| Rent | `rent.html` | Search, type, bedrooms, price sort |
| Buy | `buy.html` | Same listing page, Buy service |
| Sell | `sell.html` | Submit your own property, with photos, for Sales review |
| Property details | `property.html?p=<slug>` | Gallery, facts, features, live availability, Rent/Buy switch when both apply |
| Request | `request.html?p=<slug>&service=rent\|buy` | Needs a customer login once connected |
| Log in / Sign up | `login.html`, `signup.html` | Customer accounts only; staff use the internal system |
| Customer Portal | `portal.html` | Samples to review: `?demo=rent-sell`, `?demo=buy`, `?demo=new` |
| Projects, About, Contact | `projects.html`, `about.html`, `contact.html` | |
| (old link) | `properties.html` | Redirects to Buy |

## Files

```
serve.mjs                 Local preview server (Node, no dependencies)
assets/css/styles.css     Design system: midnight navy, copper, ivory
assets/js/config.js       API_BASE and the switches for undecided rules
assets/js/api.js          The only data layer (catalogue, requests, auth, portal)
assets/js/data.js         Preview-only sample data, every record marked sample
assets/js/ui.js           Property card, formatting, icons, forms, navigation
assets/js/app.js          Entry point; loads assets/js/pages/<page>.js
assets/js/pages/*.js      One module per page (<body data-page="...">)
docs/PUBLIC-API.md        Contract the internal system implements
docs/DATA-SOURCE.md       Where the company facts came from
```

The HTML pages share an identical header and footer. When changing either,
change it on every page.

## Design

- **Own identity, separate from the staff system** (which is green): midnight
  navy primary (`#0f1b33`), copper accent (`#b4532a`), warm ivory/sand
  backgrounds. All key text pairs meet WCAG AA contrast. The tokens are at
  the top of `styles.css`.
- **Type:** Playfair Display for headings and prices, Manrope for text.
- **Signature details:** copper-ruled eyebrows, midnight hero surfaces with
  a faint architectural grid, navy "For sale" / copper "For rent" badges.
- **Property cards:** the whole card is one link. On hover (mouse devices) the
  card rises 6px over 0.35s with an ease-out curve, its shadow deepens and the
  image zooms 4%; it glides back when the cursor leaves. Keyboard focus gets
  the same lift plus a copper focus ring.
- **Motion** is limited to card/button lifts, a gentle page fade-in and
  scroll reveals, and is switched off under `prefers-reduced-motion`.
- **No fabricated photos.** Until the Sales Officer uploads real photos, a
  property shows a branded illustration of its type.

## Accessibility

Skip link, one `<h1>` per page, labelled form fields with inline error
messages, `aria-current` navigation, keyboard-operable menu (Escape closes it
and returns focus), visible focus rings, and live regions for results and
form outcomes. The mobile menu falls back to plain wrapped links without
JavaScript.

## Before going live

1. Implement the endpoints in `docs/PUBLIC-API.md` in the internal system.
2. Set `API_BASE` in `assets/js/config.js`.
3. Decide the open rules listed in `docs/PUBLIC-API.md` and flip the matching
   switches.
4. Fill in `COMPANY.phone` / `COMPANY.email` in `data.js` and the Contact page
   from an official source (left blank on purpose).
5. Remove the "Preview build" disclaimer from the page footers.
6. Host the site and API on a real server with a domain (not a PC through
   ngrok).
