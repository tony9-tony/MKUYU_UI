# MKUYU Africa — public website

The public face of MKUYU Africa, the Tanzanian property company. Visitors can
**Rent**, **Buy**, or **Sell** property, and follow everything they do with
MKUYU from **one customer account** and **one Customer Portal**.

## Run it

On Windows, double-click **`Open MKUYU site.cmd`**. It starts the site and
opens <http://localhost:5500> in your browser; close its window to stop.

Or from a terminal:

```bash
node serve.mjs
```

Then open <http://localhost:5500>. Needs Node.js; no install, no
dependencies, no build step.

**Do not open `index.html` by double-clicking it.** The address would start
with `file:///`, and browsers block the site's JavaScript modules there
(Edge reports a CORS error for `assets/js/app.js`). Every page detects this
and shows a note explaining how to open it properly.

## One source of truth

```
Sales Officer → Internal MKUYU System → Public API → this website
```

The website has **no property database of its own** and no place to edit
listings. The Sales Officer manages properties, prices, Rent/Buy availability
and Sell submissions in the internal MKUYU system; this site only displays
what that system reports.

All data goes through one file, `assets/js/api.js`. `assets/js/config.js`
points it at the internal system (`API_BASE`, locally
`http://localhost:3003/api/v1`, the staff server):

| What | Status |
|---|---|
| Properties, projects and their photos | **Live** from the internal system's `/api/v1/public` API |
| Customer accounts, Rent/Buy requests, Sell submissions, portal | Not built yet: `CUSTOMER_ACCOUNTS = false`; pages say "not open yet", the portal can be previewed with `portal.html?demo=...` |
| Contact enquiries | Not built yet: `ONLINE_ENQUIRIES = false` |

Set `API_BASE = ""` to run on the clearly labelled sample catalogue in
`assets/js/data.js` instead. For testing against another local server, a
developer can set `localStorage["mkuyu-api-base"]` on a localhost page.

### How the Sales Officer publishes

In the staff system: **Properties → New property** (or edit one), then the
**Public website** section:

1. Tick **Buy (for sale)**, **Rent**, or both.
2. Enter the **sale price** and/or the **rent price** and whether it is per
   month or year.
3. Add a one-line **summary** and the **features** (one per line), and upload
   photos.
4. Tick **Show on the public website** and save. It appears at once; there is
   no approval step. The system refuses to publish without a service or
   without the price for it.

Projects work the same way (**Projects → New project**: Rent/Buy, location,
summary, photos, Show on the public website). A property marked Sold or
Leased leaves the website listings by itself; unticking "Show on the public
website" takes anything off the site.

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
mkuyu logo.jfif           Official logo as supplied (225px original, kept untouched;
                          the site uses the prepared copies in assets/images/brand/)
assets/images/brand/      Logo prepared for the web: mkuyu-logo.png (900px,
                          transparent, sharpened), mkuyu-logo-192.png, favicon-64.png
assets/images/hero/       Home showcase photos go here (see "Home showcase")
assets/css/styles.css     Design system: obsidian, champagne bronze, bone
assets/js/showcase.js     Home showcase slides: image, title, description, action
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

## Home showcase

The rotating hero on the Home page is driven by `assets/js/showcase.js`. Each
slide has its own image, eyebrow, title, description and action. To add
MKUYU's real pictures:

1. Put each photo in `assets/images/hero/` (landscape, at least 2000px wide,
   JPG or WebP; keep the subject centre/right, because the text sits left).
2. In `showcase.js`, set the slide's `image` and `alt`, write the real
   `title` and `description`, and remove `sample: true`.

Until then every slide is a clearly labelled placeholder ("Sample slide",
"… photo to be supplied"); no stock photo stands in for MKUYU. The showcase
crossfades every 7 seconds (`SLIDE_INTERVAL_MS`), has previous/next, slide
labels with progress bars, pause/play, arrow keys and swipe, pauses while
hovered, focused or in a hidden tab, and does not auto-rotate for visitors
who prefer reduced motion.

## Design

- **Own identity, separate from the staff system** (which is green), built
  around the black-and-grey MKUYU logo: obsidian primary (`#16130f`),
  champagne bronze accent (`#a67c52`, text-safe `#8a6340`), warm bone/linen
  backgrounds. No blue, no green. Tokens are at the top of `styles.css`.
- **Type:** Cormorant Garamond for display headlines, Manrope for everything
  else, including prices and card titles.
- **Official logo** in the header, footer, login/sign-up and the portal, never
  stretched (square, `object-fit: contain`). The original 225px JPEG was
  upscaled 4x and its edges re-sharpened into a transparent PNG without
  changing the design; a crop artefact (a thin black strip down its left and
  right edges) was removed.
- **Watermark:** the same logo, very large and faint (about 5% opacity), fixed
  behind every page; it never takes clicks and sits below all content.
- **Modern details:** transparent header over the Home showcase that turns
  solid on scroll, Rent/Buy/Sell hero search, property-type chips with live
  counts, filters kept in the URL, skeleton loading cards, a full-screen photo
  lightbox (keyboard and swipe), page transitions in browsers that support
  them, and a dismissible preview note.
- **Property cards:** the whole card is one link. On hover (mouse devices) the
  card rises 6px over 0.35s with an ease-out curve, its shadow deepens, the
  image zooms 4% and "View details" fills; it glides back when the cursor
  leaves. Keyboard focus gets the same lift and a bronze focus ring.
- **Motion** is purposeful only, and switched off under
  `prefers-reduced-motion`.
- **No fabricated photos.** Property and project photos come from the internal
  system; until one exists the frame says "Photo coming soon".

## Images still needed from MKUYU

| Where | What | Goes in |
|---|---|---|
| Home showcase | Project photo + name + short description | `assets/images/hero/`, `showcase.js` slide 1 |
| Home showcase | Managing Director portrait + name + short introduction | slide 2 |
| Home showcase | Featured property/building photo + name + description | slide 3 |
| Home showcase | Team or office photo | slide 4 |
| Home, Sell section | One company photograph | `index.html` "MKUYU photo to be supplied" |
| Properties | Photos per property | Uploaded by the Sales Officer in the internal system |
| Projects | Photo per project | Provided by the internal system (`photo` on each project) |

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
