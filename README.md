# MKUYU Africa — public website

A standalone, static marketing site for MKUYU Africa, the Tanzanian property
development, sales and rental company.

## Independence from the internal system

This project is **completely separate** from the internal MKUYU operations
system at `C:\Users\nic\Desktop\RealEstate-System.org`.

| Rule | How it is honoured |
|---|---|
| No files from `.org` are copied here | Nothing is imported; there is no build step, bundler or shared package. |
| No internal credentials | There are none in this repository. |
| No sessions or private records | None. |
| No internal API exposure | There is **no network call anywhere** in this project. `grep` for `fetch(` returns nothing outside the page's own module imports. |
| No staff/admin functionality | The internal Staff Portal and Admin Portal are not referenced, linked or reproduced. |
| No private customer information | No customer data of any kind exists here. |

Open `index.html` directly in a browser, or serve the folder with any static
file server. There is no build step and no dependencies to install.

## Files

```
index.html          Home — hero, featured properties, services, process, CTA
properties.html     Property browser with live filtering and sorting
property.html       Property detail (read from ?p=slug)
projects.html       Project listing
about.html          Company story, services, FAQ
contact.html        Enquiry form with inline validation
assets/css/styles.css   Design system (white / green / gold)
assets/js/data.js        Catalogue data + helpers
assets/js/app.js         Navigation, filtering, detail rendering, form validation
docs/DATA-SOURCE.md      Where the content came from, and what is not real
```

## Design

- **Palette** — white surfaces, MKUYU green (`#0b6b4d` → `#06412f`), gold accent
  (`#d4a437`).
- **Type** — Fraunces for display headings, DM Sans for body text. Both loaded
  from Google Fonts with system-font fallbacks, so the page is still legible
  if the font request fails.
- **Layout** — mobile-first. Single column below 900px, two-column feature grids
  below 820px, full footer stacking below 520px.
- **Motion** — minimal, and fully disabled under
  `@media (prefers-reduced-motion: reduce)`.

## Accessibility

- Skip-to-content link as the first focusable element.
- One `<h1>` per page, with a sensible heading order below it.
- `aria-current="page"` marks the active nav item.
- The mobile menu is a real `<button>` with `aria-expanded` and `aria-controls`,
  and closes on Escape.
- Form errors are announced via `aria-invalid` + `aria-describedby`, focus
  moves to the first invalid field, and the error text is announced to
  assistive technology.
- The property result count is a `role="status"` live region.
- Visible gold focus ring on every interactive element.
- Colour contrast meets WCAG AA for body text on both white and green.

## Progressive enhancement

Every page is usable with JavaScript disabled: navigation is real `<a>` links
and the enquiry form is a real `<form>`. Where JavaScript adds the property
grid, a `<noscript>` note tells the visitor how to get the same information.

All dynamic text is passed through `escapeHtml()` before being inserted into
`innerHTML`, so catalogue text cannot inject markup.

## Public customer journey

```
Visitor
  -> Home            understand what MKUYU does and where it operates
  -> Projects        see the developments
  -> Properties      filter by type, project, price
  -> Property detail full specification, price, payment options
  -> Enquire         contact form, pre-filled from the property viewed
  -> Contact         office details and diaspora programme enquiry
```

Sign-up and sign-in are deliberately **not** included: this is a public
marketing site, and a customer account area should be added as its own
authenticated surface rather than bolted onto a static site.

## Before going live

1. Replace the sample catalogue in `assets/js/data.js` with the real project
   and property records, and remove every `sample: true` flag.
2. Fill in `COMPANY.phone`, `COMPANY.email` and `COMPANY.offices` from an
   official source — they are blank on purpose.
3. Connect the enquiry form to a real endpoint or form service.
4. Add real photography and update the `.card-media` / `.detail-gallery`
   fallbacks accordingly.
5. Update the footer disclaimer to remove the "Preview build" wording.
