# Public API

The public website shows data from **one source of truth**: the internal MKUYU
system (`RealEstate-System.org`), where the Sales Officer manages properties,
prices and availability.

```
Sales Officer → Internal MKUYU System → /api/v1/public → Public website
Visitor request → Requests (Sales) → Customer Service contacts the customer → report → client
```

The website has **no property database of its own**. Everything it displays
or sends goes through `assets/js/api.js` to `API_BASE` in
`assets/js/config.js`. The endpoints live in the internal system at
`backend/src/routes/public.js` and are covered by `public_api_test.mjs`.

## Rules the internal system owns

- **The Sales Officer publishes directly.** Property → *Public website*: tick
  Buy and/or Rent, set the prices, tick *Show on the public website*. No
  approval step. Publishing is refused without a service or without its price.
- **Status is system-controlled.** `available`, `reserved`, `rented`
  (internally `leased`), `sold`. The website only reads it. Sold and rented
  homes leave the listings by themselves.
- **A request is not a transaction.** A Rent/Buy request never marks a
  property reserved, rented or sold.
- **Projects are categories.** A project has no photos, price or publishing of
  its own; a property chooses its project. The website shows a project while
  it has published homes.
- **No accounts for renting or buying.** Visitors leave their details. Accounts
  are only for sellers (not built yet; `CUSTOMER_ACCOUNTS = false`).

## Reads (no login)

### `GET /public/properties?service=rent|buy`

Listed properties: published, offered for at least one service, available or
reserved. Newest and featured first.

```jsonc
[{
  "id": 101, "slug": "101",
  "title": "Villa 12 · 3 Bedroom",
  "type": "Villa",                        // Land | House | Apartment | Villa | Commercial | Penthouse
  "services": ["rent", "buy"],
  "status": "available",                  // available | reserved | rented | sold
  "currency": "TZS",
  "price": { "sale": 185000000, "rent": { "amount": 2800000, "period": "month" } },
  "location": "Riverside Estate, Dar es Salaam",
  "project": { "slug": "7", "name": "Riverside Estate" },   // or null
  "bedrooms": 3, "bathrooms": 2, "area": 240, "featured": true,
  "photos": [{ "url": "https://…/api/v1/public/properties/101/images/55", "alt": "Villa 12 · 3 Bedroom" }],
  "summary": "One line for the card.",
  "description": "Full text for the details page.",
  "features": ["Private garden", "Backup power"]
}]
```

Never included: owners, clients, contracts, money owed, staff, internal notes,
record-sharing or organization fields.

### `GET /public/properties/:id`

One published property **whatever its status**, so an old link can say
"sold". `404` when unpublished or unknown.

### `GET /public/properties/:id/images/:imageId`

The picture file, only while its property is published.

### `GET /public/projects?service=rent|buy`

Projects that currently have listed homes, derived from those homes:

```jsonc
[{ "slug": "7", "name": "Riverside Estate", "location": "Dar es Salaam",
   "summary": "", "status": "", "services": ["buy"], "photos": [{ "url": "…", "alt": "…" }] }]
```

`services` and the cover photo come from the project's published homes.

## Writes (no login) → Requests and Leads for Sales

Both create a lead record in the internal system (Leads module). Buy/Rent
requests (`source: website`) appear under *Requests*, and contact enquiries
under *Leads*; each has a *Hand to Customer Service* action
that assigns a Customer Service officer to contact the customer.

### `POST /public/requests`

```jsonc
{
  "property": 101,                 // a published, available property offered for `service`
  "service": "buy",                // rent | buy
  "name": "Neema Mollel",          // required, ≤ 80
  "phone": "+255 754 321 987",     // required
  "email": "neema@example.com",    // optional; required if preferred_contact is "email"
  "budget": 200000000,             // required, TZS
  "preferred_contact": "whatsapp", // phone | whatsapp | email
  "message": "Can I view on Saturday?",
  "website": ""                    // hidden spam trap; must stay empty
}
```

`201 { "reference": "W-43" }`. `400` invalid details, `404` unknown or
unpublished property, `409` no longer open for that service, `429` too many
requests from one phone/IP.

### `POST /public/enquiries`

The Contact page: `{ name, phone, email?, topic, preferred_contact, message,
website }`. `201 { "reference": "W-44" }`.

## Cross-origin

The website is served separately, so `server.js` lets any origin `GET`
`/api/v1/public/*` and `POST` `/api/v1/public/requests` and
`/api/v1/public/enquiries`, without credentials. Every other API route keeps
its login and same-origin rules.

## Still undecided (the website is built to take either answer)

| Question | Where it is handled |
|---|---|
| Is Reserved shown publicly? | `RESERVED_ON_WEBSITE` in `config.js` (hidden) |
| TZS only, or TZS + USD | `currency` per property; default in `config.js` |
| Seller accounts: sign-up, verification, what the seller's portal shows | `CUSTOMER_ACCOUNTS`; to be designed |
| Sell: agency agreement, fees, documents, payout | To be designed with the seller portal |
| Contract signing, document downloads, online payment | Not built |
