/* ==========================================================================
   MKUYU AFRICA — public site configuration
   --------------------------------------------------------------------------
   The internal MKUYU system is the single source of truth. The Sales Officer
   manages properties, prices and availability there; this website only
   displays what it is given.

       Sales Officer → Internal MKUYU System → Public API → this website

   API_BASE
     Where the internal system's public API is served, for example
     "https://mkuyu.co.tz/api/v1". While it is empty the site runs in
     PREVIEW MODE: listings come from the clearly labelled sample catalogue in
     data.js, and nothing a visitor submits is sent anywhere. Setting this one
     value switches every page to live data; no page code changes.

     The endpoints the site expects are documented in docs/PUBLIC-API.md.
   ========================================================================== */

export const API_BASE = "";

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
