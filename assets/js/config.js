/* ==========================================================================
   MKUYU AFRICA — public site configuration
   --------------------------------------------------------------------------
   The internal MKUYU system is the single source of truth. The Sales Officer
   manages properties, prices and availability there; this website only
   displays what it is given.

       Sales Officer → Internal MKUYU System → Public API → this website

   API_BASE
     Where the internal system's API is served. Locally that is the staff
     server on port 3003; online it becomes e.g. "https://mkuyu.co.tz/api/v1".
     Set to "" to run in PREVIEW MODE on the clearly labelled sample catalogue
     in data.js, with nothing a visitor submits sent anywhere.

     The endpoints the site expects are documented in docs/PUBLIC-API.md.
   ========================================================================== */

export const API_BASE = devOverride() ?? "http://localhost:3003/api/v1";

/* Developers only: on a localhost page, localStorage "mkuyu-api-base" points
   the site at another server (for example a test server). Ignored everywhere
   else, so visitors can never be redirected. */
function devOverride() {
  try {
    if (!["localhost", "127.0.0.1"].includes(window.location.hostname)) return null;
    const value = window.localStorage.getItem("mkuyu-api-base");
    return value && /^http:\/\/(localhost|127\.0\.0\.1):\d+\/api\/v1$/.test(value) ? value : null;
  } catch { return null; }
}

/* Accounts are only for SELLERS (Sell form + their portal). Renting and buying
   need no account: a request is name, phone, email and budget, sent straight
   to Sales as a Lead. Seller accounts are not built in the internal system
   yet; while this is false the Sell page says so plainly, and the portal can
   be previewed through the sample customers (portal.html?demo=...). */
export const CUSTOMER_ACCOUNTS = false;

/* Rent/Buy requests and Contact enquiries: live, as Leads for Sales. */
export const ONLINE_ENQUIRIES = true;

/* --------------------------------------------------------------------------
   UNDECIDED business rules. Each is kept as a single switch so the final
   decision is a one-line change, not a rewrite.
   -------------------------------------------------------------------------- */

/* A property that is temporarily held while a transaction is processed.
   Whether "reserved" is used at all, and whether the public may see it, is
   still being decided.
     "hide"  - reserved properties are not listed (current default)
     "show"  - listed, marked Reserved, with the request action disabled   */
export const RESERVED_ON_WEBSITE = "hide";

/* Currency used when a property record does not state its own. Whether MKUYU
   also prices in USD is undecided; a record carrying `currency` overrides it. */
export const DEFAULT_CURRENCY = "TZS";
