/* ==========================================================================
   MKUYU AFRICA — data layer
   --------------------------------------------------------------------------
   The ONLY place this website gets data from or sends data to. Every page
   goes through these functions, so:

     * connected  (API_BASE set)  - data comes from the internal MKUYU system
     * preview    (API_BASE empty) - data comes from the sample catalogue, and
                                     submissions are refused honestly

   The website never decides a property's status. It reads the status the
   internal system reports and applies the display rules below.
   The endpoint contract lives in docs/PUBLIC-API.md.
   ========================================================================== */

import { API_BASE, CUSTOMER_ACCOUNTS, ONLINE_ENQUIRIES, RESERVED_ON_WEBSITE, DEFAULT_CURRENCY } from "./config.js";
import * as sample from "./data.js";

export const CONNECTED = Boolean(API_BASE);
/** Customer features need the live system AND customer accounts built there. */
export const ACCOUNTS_LIVE = CONNECTED && CUSTOMER_ACCOUNTS;

export const SERVICES = ["rent", "buy"];
export const STATUS_LABELS = { available: "Available", reserved: "Reserved", rented: "Rented", sold: "Sold" };

/** Raised when an action needs the live system and the site is in preview mode. */
export class NotConnectedError extends Error {
  constructor(action) {
    super(CONNECTED
      ? `${action} is not open yet: customer accounts are still being set up. Nothing has been sent.`
      : `${action} will open once this website is connected to the MKUYU system. Nothing has been sent.`);
    this.name = "NotConnectedError";
    this.title = CONNECTED ? "Not open yet" : "Preview only";
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message || `The request failed (${status}).`);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, { method = "GET", body } = {}) {
  // Public data is read without cookies; only customer calls carry the session.
  const init = { method, credentials: path.startsWith("/customer/") ? "include" : "omit", headers: { Accept: "application/json" } };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  let response;
  try { response = await fetch(`${API_BASE}${path}`, init); }
  catch { throw new ApiError(0, "The MKUYU system could not be reached. Please check your connection and try again."); }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, payload.error);
  return payload;
}

/* ---------------------------------------------------------------------------
   Property display rules
   --------------------------------------------------------------------------- */

/** One consistent shape, whatever the source sends. */
export function normalizeProperty(raw) {
  const services = (Array.isArray(raw.services) ? raw.services : []).filter((s) => SERVICES.includes(s));
  const status = STATUS_LABELS[raw.status] ? raw.status : "available";
  return {
    id: raw.id,
    slug: String(raw.slug || raw.id),
    title: raw.title || "Untitled property",
    type: raw.type || "Property",
    services,
    status,
    currency: raw.currency || DEFAULT_CURRENCY,
    price: { sale: Number(raw.price?.sale) || 0, rent: raw.price?.rent ? { amount: Number(raw.price.rent.amount) || 0, period: raw.price.rent.period || "" } : null },
    location: raw.location || "",
    project: raw.project || null,
    bedrooms: Number(raw.bedrooms) || 0,
    bathrooms: Number(raw.bathrooms) || 0,
    area: Number(raw.area) || 0,
    featured: Boolean(raw.featured),
    photos: Array.isArray(raw.photos) ? raw.photos.filter((p) => p && p.url) : [],
    summary: raw.summary || "",
    description: raw.description || "",
    features: Array.isArray(raw.features) ? raw.features : [],
    sample: Boolean(raw.sample),
  };
}

/** Whether a property belongs in the public listing for `service`. */
export function isListed(property, service) {
  if (service && !property.services.includes(service)) return false;
  if (property.status === "available") return true;
  if (property.status === "reserved") return RESERVED_ON_WEBSITE === "show";
  return false; // rented and sold never appear as available
}

/** Whether a visitor may start a request for `service` on this property. */
export function canRequest(property, service) {
  return property.status === "available" && property.services.includes(service);
}

/* ---------------------------------------------------------------------------
   Catalogue (public, no login)
   --------------------------------------------------------------------------- */

export async function listProperties({ service } = {}) {
  const rows = CONNECTED
    ? await request(`/public/properties${service ? `?service=${encodeURIComponent(service)}` : ""}`)
    : sample.PROPERTIES;
  return rows.map(normalizeProperty).filter((property) => isListed(property, service));
}

/** A single property, whatever its status, so an old link can explain it is gone. */
export async function getProperty(slug) {
  if (CONNECTED) {
    try { return normalizeProperty(await request(`/public/properties/${encodeURIComponent(slug)}`)); }
    catch (error) { if (error.status === 404) return null; throw error; }
  }
  const raw = sample.PROPERTIES.find((p) => p.slug === slug);
  return raw ? normalizeProperty(raw) : null;
}

/** A project, like a property, is published by the Sales Officer for Rent,
    Buy or both; that choice is made when its photos are uploaded. */
export function normalizeProject(raw) {
  return {
    slug: String(raw.slug || raw.id),
    name: raw.name || "Untitled project",
    location: raw.location || "",
    summary: raw.summary || "",
    status: raw.status || "",
    services: (Array.isArray(raw.services) ? raw.services : []).filter((s) => SERVICES.includes(s)),
    photos: Array.isArray(raw.photos) ? raw.photos.filter((p) => p && p.url) : [],
    sample: Boolean(raw.sample),
  };
}

export async function listProjects({ service } = {}) {
  const rows = CONNECTED
    ? await request(`/public/projects${service ? `?service=${encodeURIComponent(service)}` : ""}`)
    : sample.PROJECTS;
  return rows.map(normalizeProject).filter((project) => !service || project.services.includes(service));
}

/* ---------------------------------------------------------------------------
   Customer actions (need the live system and, where noted, a login)
   --------------------------------------------------------------------------- */

/** Rent or Buy request for one property. Needs a customer login. */
export async function submitRequest({ propertySlug, service, message, preferredContact }) {
  if (!ACCOUNTS_LIVE) throw new NotConnectedError("Sending a request");
  return request("/customer/requests", { method: "POST", body: { property: propertySlug, service, message, preferred_contact: preferredContact } });
}

/** Sell submission: the customer's own property, for Sales to review. */
export async function submitSellRequest(formData) {
  if (!ACCOUNTS_LIVE) throw new NotConnectedError("Submitting a property to sell");
  return request("/customer/sell-requests", { method: "POST", body: formData });
}

export async function signUp(details) {
  if (!ACCOUNTS_LIVE) throw new NotConnectedError("Creating an account");
  return request("/customer/auth/signup", { method: "POST", body: details });
}

export async function logIn(credentials) {
  if (!ACCOUNTS_LIVE) throw new NotConnectedError("Logging in");
  return request("/customer/auth/login", { method: "POST", body: credentials });
}

export async function logOut() {
  if (ACCOUNTS_LIVE) await request("/customer/auth/logout", { method: "POST" }).catch(() => {});
}

/** The signed-in customer, or null. Never throws for a visitor who is not logged in. */
export async function currentCustomer() {
  if (!ACCOUNTS_LIVE) return null;
  try { return await request("/customer/me"); }
  catch (error) { if (error.status === 401) return null; throw error; }
}

/** The adaptive portal: one account, sections for the services this customer uses. */
export async function getPortal() {
  if (!ACCOUNTS_LIVE) throw new NotConnectedError("The customer portal");
  return request("/customer/portal");
}

export function demoPortal(key) {
  return sample.DEMO_PORTALS[key] || null;
}
export const DEMO_PORTAL_KEYS = Object.keys(sample.DEMO_PORTALS);

/** General enquiry from the Contact page. No login needed. */
export async function submitEnquiry(details) {
  if (!CONNECTED || !ONLINE_ENQUIRIES) {
    const error = new NotConnectedError("Sending an enquiry online");
    if (CONNECTED) error.message = "Online enquiries are not open yet. Nothing has been sent; please contact MKUYU directly for now.";
    throw error;
  }
  return request("/public/enquiries", { method: "POST", body: details });
}
