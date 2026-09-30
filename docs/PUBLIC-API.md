# Public API contract

The public website shows data from **one source of truth**: the internal MKUYU
system, where the Sales Officer manages properties, prices and availability.

```
Sales Officer → Internal MKUYU System → Public API → Public website
```

The website has **no property database of its own**. Everything it displays
comes through `assets/js/api.js`, which calls the endpoints below once
`API_BASE` is set in `assets/js/config.js`. Until then the site runs in
preview mode on the clearly labelled sample data in `assets/js/data.js`.

None of these endpoints exist yet. This document is the target the internal
system will implement when the two are connected.

## Rules the internal system owns

- **Status is system-controlled.** `available`, `reserved`, `rented`, `sold`.
  The website never changes a status. It only reads it.
- **Reserved is not Rented.** Reserved = temporarily held while a transaction
  is processed. Rented / Sold = the transaction actually completed.
- **A request is not a transaction.** Submitting a Rent or Buy request must
  never mark a property reserved, rented or sold.
- **No double-taking.** Two customers must never both succeed on the same
  property. This is enforced in the internal system's database, not here.
- **Sell is a service, not a status.** A Sell submission is a customer's own
  property for Sales to review. It is never published automatically.

## Public endpoints (no login)

### `GET /public/properties?service=rent|buy`

Published properties. The website additionally hides anything not open for the
requested service (see `isListed` in `api.js`), so the endpoint may return
every published property or pre-filter; both work.

```jsonc
[
  {
    "id": 101,
    "slug": "villa-12",                  // stable, URL-safe
    "title": "Villa 12 · 3 Bedroom",
    "type": "Villa",                     // Villa | Apartment | House | Land | Penthouse | Commercial
    "services": ["buy"],                 // set by the Sales Officer: any of "rent", "buy"
    "status": "available",               // available | reserved | rented | sold
    "currency": "TZS",                   // optional; defaults to TZS (config.js)
    "price": {
      "sale": 185000000,                 // when offered to buy
      "rent": { "amount": 1200000, "period": "month" }  // when offered to rent
    },
    "location": "Riverside Estate, Dar es Salaam",
    "project": { "slug": "riverside-estate", "name": "Riverside Estate" },  // or null
    "bedrooms": 3, "bathrooms": 2, "area": 240,          // area in m²
    "featured": true,
    "photos": [{ "url": "https://…/1.jpg", "alt": "Front of the villa" }],
    "summary": "One line for the card.",
    "description": "Full text for the details page.",
    "features": ["Private garden", "Off-street parking"]
  }
]
```

Never include: owner or client details, contract data, internal notes, staff
names, cost prices, or anything from the finance modules.

### `GET /public/properties/:slug`

One property in the same shape, **whatever its status**, so an old link can
say "Sold — no longer available" instead of a dead page. `404` if it was never
published or has been withdrawn.

### `GET /public/projects?service=rent|buy`

```jsonc
[{
  "slug": "riverside-estate", "name": "Riverside Estate", "location": "Dar es Salaam",
  "summary": "…", "status": "Selling now",
  "services": ["buy"],                          // any of "rent", "buy"
  "photos": [{ "url": "https://…/1.jpg", "alt": "…" }]
}]
```

**Required in the internal system:** when the Sales Officer uploads a
project's photos, they must first choose whether the project is offered for
**Rent**, **Buy** or both. That choice is `services`. The public Projects page
filters by it (All / Rent / Buy), badges each project, and links a project to
its homes in the matching listing.

### `POST /public/enquiries`

General question from the Contact page. No account needed.
Body: `{ name, email, phone?, topic, message }`. Should become a Lead.

## Customer endpoints (customer login)

Customer accounts are **separate from staff accounts**. A customer session must
never reach the staff API, and a staff login must not work here.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/customer/auth/signup` | `{ full_name, email, phone, password }` → creates ONE account for Rent, Buy and Sell. `409` if the email exists. |
| `POST` | `/customer/auth/login` | `{ email, password }` → session. `401` on bad details. |
| `POST` | `/customer/auth/logout` | Ends the session. |
| `GET`  | `/customer/me` | The signed-in customer, or `401`. |
| `POST` | `/customer/requests` | Rent / Buy request: `{ property, service, message, preferred_contact }`. Goes to the Sales Officer. Must refuse a property that is not `available` for that service. |
| `POST` | `/customer/sell-requests` | **Signed-in customers only** (`401` otherwise). The public Sell page shows the form only after log in / sign up; a visitor sees a log-in gate. The customer follows the review in the Selling section of their portal. Sell submission, `multipart/form-data`: `title, type, location, area?, bedrooms?, bathrooms?, description, asking_price?, price_notes?, owner_name, owner_phone, owner_email?, is_owner, photos[]`. Goes to the Sales Officer for review. |
| `GET`  | `/customer/portal` | The adaptive portal (below). |

The site sends requests with `credentials: "include"`, so a cookie session
works. The session mechanism itself is the internal system's choice.

### `GET /customer/portal`

Only the services the customer actually uses are present; the portal shows a
section for each key and nothing for missing ones.

```jsonc
{
  "customer": { "name": "…", "email": "…" },
  "services": {
    "rent": [ /* case */ ],
    "buy":  [ /* case */ ],
    "sell": [ /* case */ ]
  }
}
```

A **case** (one rental, one purchase, one sale):

```jsonc
{
  "id": "B-0877",
  "property": { "slug": "villa-12", "title": "…", "location": "…", "type": "Villa" },
  "status": "Contract active",                 // customer-facing wording
  "stages": [                                  // customer-facing progress
    { "label": "Request received", "state": "done", "date": "3 Mar 2026" },
    { "label": "Legal review", "state": "current" },
    { "label": "Completion and handover", "state": "upcoming", "note": "…" }
  ],
  "contract": { "number": "MKY-2026-0102", "status": "Active", "signed": "25 Mar 2026" },   // Rent / Buy
  "rental":   { "start": "…", "end": "…", "period": "12 months" },                         // Rent
  "ownership": "…",                                                                        // Buy, optional
  "asking_price": 150000000, "currency": "TZS", "officer": { "name": "…" },                // Sell
  "payments": {
    "currency": "TZS", "total": 0, "paid": 0, "balance": 0,
    "next_due": { "amount": 0, "date": "…" },
    "installments": [{ "label": "Deposit", "due": "…", "amount": 0, "status": "paid|partial|pending|overdue" }],
    "history": [{ "date": "…", "amount": 0, "method": "…", "reference": "…", "receipt": true }]
  },
  "documents": [{ "name": "Sale agreement …", "kind": "Contract" }]
}
```

`stages` are produced by the internal system from its real contract workflow
(Sales → Legal → Accountant → MD → Legal → customer signature → Active), in
plain words. The portal never shows internal comments, staff notes, or reasons
a contract was sent back.

## Still undecided (the website is built to take either answer)

| Question | Where it is handled |
|---|---|
| Is Reserved used, and shown publicly? | `RESERVED_ON_WEBSITE` in `config.js` |
| Rent price structure (monthly, per 3/6/12 months…) | `price.rent.period` is displayed as sent |
| TZS only, or TZS + USD | `currency` per property; default in `config.js` |
| Price goes live directly, or after MD approval | Internal system only publishes approved prices |
| Sign-up verification (email, SMS, none) | Internal system; the form only collects details |
| Contract signing method, document downloads | Portal lists documents; download links added when decided |
| Online payment | Not built. Payments shown are those recorded by the Accountant |
| Sell: agency agreement, fees, documents, payout | Portal shows "Next steps" as provided by the internal system |
| Handover documents and notification method | Portal shows the stage and any note the system sends |
