# MKUYU Africa — public website

The public face of MKUYU Africa, the Tanzanian property company. Visitors can
**Rent**, **Buy**, or **Sell** property. None of them needs an account: a
visitor leaves their details and the MKUYU team takes it from there. An
**Ask MKUYU** assistant on every page answers questions from public
information only.

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
| Properties, photos, projects (categories derived from homes) | **Live** from the internal system's `/api/v1/public` API |
| Rent / Buy requests (no account: name, phone, email, budget, contact means) | **Live**: each arrives under **Requests** in the staff system, where Sales hands it to Customer Service |
| Contact enquiries | **Live**: become Leads (`ONLINE_ENQUIRIES = true`) |
| Sell submissions (no account: property type, location, size, asking price, contact) | **Live**: `POST /public/sell`; each arrives under **Requests** as a Sell request |
| Seller portal | Not needed: a seller's agreement is a **Sell contract** made by Sales in the internal system. `portal.html?demo=...` is only a preview |
| **Diaspora customer portal** | **Live**: only diaspora clients that Sales invited (internal system → client → *Diaspora client* → *Invite to the portal*). They sign in on `login.html` ("Diaspora login" in the menu) with a 6-digit code e-mailed to them, and see their contracts, payments, receipts, signed agreement and construction photos |

Renting, buying and selling need no account. The only login is **Diaspora login**, for diaspora customers MKUYU has invited; there is no self sign-up (`signup.html` sends people to `login.html`).

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

A **project is only a category** (name and status): each property chooses its
project, and a project appears on the website while it has published homes.
A property marked Sold or Leased leaves the website listings by itself;
unticking "Show on the public website" takes it off the site.

### What happens to a visitor's request

1. The visitor opens a property, clicks **Request to buy/rent**, and leaves
   name, phone, email, budget and how to be contacted (no account).
2. It arrives in the staff system under **Requests** (its own menu item), with
   the property, service, budget and contact means. Stage: **New**.
3. The Sales & Marketing Officer clicks **Hand to Customer Service**: a task
   pre-filled with the customer's details is assigned to a Customer Service
   officer, with Sales as reviewer. Stage: **With Customer Service**, showing
   who has it.
4. Customer Service contacts the customer by the chosen means and submits a
   report in **Assignments**. Stage: **Report waiting for you**.
5. Sales reviews and approves the report. Stage: **Customer contacted**.
6. Sales clicks **Convert to client**. Stage: **Became a client**; the work
   continues under Clients (contract, payments).

Contact-page enquiries stay under **Leads**; Requests holds only Buy/Rent.

### What happens to a Sell submission

1. The owner fills in the **Sell** form: property type, location, size,
   bedrooms, asking price, title-deed status and how to be contacted. No
   account.
2. It arrives under **Requests** as **Sell**, with the property details.
3. Sales hands it to **Customer Service**, who contacts the owner, explains
   how selling with MKUYU works and reports the outcome (e.g. a site visit).
4. When Sales accepts it, the owner becomes a **Seller Client**, and
   **Create Sell contract** opens the contract wizard already set to Sell for
   that seller. There is no seller portal: the contract is the agreement.

### Ask MKUYU (assistant)

`assets/js/chatbot.js`, loaded on every page by `app.js`. It answers in
English or Swahili from **public information only**: the company facts and
FAQs in `data.js`, how Rent / Buy / Sell work, and published listings and
projects read through the public API. It has no access to the internal
system (staff, passwords, contracts, payments, reports, customers); such
questions are answered with where to go instead. It sends nothing a visitor
types to any server.

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
- **Portal is a preview only.** `portal.html` shows how a future customer
  area could look (Rent, Buy, Sell, or any mix); customers need no account today.
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
| Sell | `sell.html` | Submit your own property for Sales review (no account; photos are collected by the team later) |
| Property details | `property.html?p=<slug>` | Gallery, facts, features, live availability, Rent/Buy switch when both apply |
| Request | `request.html?p=<slug>&service=rent\|buy` | No account: name, phone, email, budget and how to be contacted |
| Diaspora login | `login.html` | E-mail, then the 6-digit code sent there. `signup.html` redirects here. Staff use the internal system |
| Customer Portal | `portal.html` | The signed-in diaspora customer's own contracts. Samples still open with `?demo=rent-sell`, `?demo=buy`, `?demo=new` |
| Projects, About, Contact | `projects.html`, `about.html`, `contact.html` | |
| (old link) | `properties.html` | Redirects to Buy |

## Files

```
serve.mjs                 Local preview server (Node, no dependencies)
mkuyu logo.jfif           Official logo as supplied (225px original, kept untouched;
                          the site uses the prepared copies in assets/images/brand/)
assets/images/brand/      Logo prepared for the web: mkuyu-logo.png (900px,
                          transparent, sharpened), mkuyu-logo-192.png, favicon-64.png
assets/images/hero/       Home showcase photos, 2400px and 1280px (see "Home showcase")
design-source/            Design originals (large PNGs are git-ignored)
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
slide has its own photo, eyebrow, title, description and action:

| # | Photo (`assets/images/hero/`) | Slide | Button |
|---|---|---|---|
| 1 | `mkuyu-project-01.jpg` | Our projects | projects.html |
| 2 | `mkuyu-md.jpg` | Leadership: the Managing Director | about.html |
| 3 | `featured-home-01.jpg` | Homes for sale | buy.html |
| 4 | `mkuyu-project-02.jpg` | Homes to rent | rent.html |
| 5 | `mkuyu-team.jpg` | Sell with MKUYU | sell.html |

The photos were cut from MKUYU's design board
(`design-source/MKUYUHeroAssets4Photos.png`, 30 MB, not committed), trimmed
to 16:9 with the board's frames removed, given one gentle contrast/colour
lift, and saved at 2400px plus a 1280px copy that phones load instead. Each
slide has a `focus` point so phones keep the right part of the photo in
view.

To change a slide: put a landscape photo (at least 2000px wide) in
`assets/images/hero/`, and set `image`, `imageSmall`, `alt`, `title` and
`description` in `showcase.js`. The showcase crossfades every 7 seconds
(`SLIDE_INTERVAL_MS`), has previous/next, slide labels with progress bars,
pause/play, arrow keys and swipe, pauses while hovered, focused or in a
hidden tab, and does not auto-rotate for visitors who prefer reduced motion.

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
| Home showcase | Real project names for slides 1 and 3 (titles are generic for now) | `showcase.js` |
| Home showcase | The MD's full name and a short introduction; a larger MD photo (the supplied one is 298x167, so it is shown as a framed card, not full-screen) | `showcase.js` slide 2 |
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
