/* ==========================================================================
   MKUYU AFRICA — shared UI building blocks
   --------------------------------------------------------------------------
   Every dynamic value is passed through escapeHtml() before it reaches
   innerHTML, so catalogue text can never inject markup.
   ========================================================================== */

import { STATUS_LABELS, currentCustomer } from "./api.js";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

/* ---------------- Money ---------------- */

/** Compact for cards ("TZS 185 m"), exact for statements ("TZS 2,800,000"). */
export function formatMoney(value, currency = "TZS", { exact = false } = {}) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return exact ? `${currency} 0` : "Price on request";
  if (!exact && n >= 1_000_000_000) return `${currency} ${trim(n / 1_000_000_000, 2)} bn`;
  if (!exact && n >= 1_000_000) return `${currency} ${trim(n / 1_000_000, 1)} m`;
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}
const trim = (n, digits) => Number(n.toFixed(digits)).toString();

/** "per month" from the period the internal system sends; nothing invented. */
export function periodLabel(period) {
  if (!period) return "";
  const known = { month: "per month", year: "per year", week: "per week" };
  return known[period] || `per ${period}`;
}

/** The price to show for a property in a given service context. */
export function priceFor(property, service) {
  const rent = property.price.rent;
  if (service === "rent" || (!service && !property.services.includes("buy"))) {
    return rent?.amount
      ? { amount: formatMoney(rent.amount, property.currency), note: periodLabel(rent.period) || "Rent" }
      : { amount: "Price on request", note: "Rent" };
  }
  const also = !service && property.services.includes("rent") && rent?.amount
    ? `or ${formatMoney(rent.amount, property.currency)} ${periodLabel(rent.period)}`.trim()
    : "Sale price";
  return { amount: formatMoney(property.price.sale, property.currency), note: also };
}

/* ---------------- Icons (inline, inherit colour) ---------------- */

const PATHS = {
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  bed: '<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M3 18v2M21 18v2M7 9V6h4v3"/>',
  bath: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>',
  area: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  handshake: '<path d="M3 11l4-4 5 2 5-2 4 4-8 8zM8 13l3 3M11 11l3 3"/>',
  card: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
};

export function icon(name, className = "icon") {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ""}</svg>`;
}

/* ---------------- Property artwork ----------------
   No photography is fabricated. Until the Sales Officer uploads real photos,
   a property shows a branded illustration of its type. */

let artCount = 0;
export function propertyArt(property, variant = "card") {
  const type = String(property.type || "").toLowerCase();
  const scene = type === "land"
    ? '<path d="M20 150 L200 120 L380 150 L200 190 Z" fill="#eadfce"/><path d="M60 150 L200 128 L340 150 L200 176 Z" fill="none" stroke="#1f3363" stroke-width="2" stroke-dasharray="7 6" opacity=".55"/><circle cx="200" cy="150" r="5" fill="#c8683c"/>'
    : ["apartment", "commercial", "penthouse"].includes(type)
      ? '<rect x="140" y="52" width="120" height="128" rx="4" fill="#1f3363"/><rect x="118" y="92" width="40" height="88" rx="3" fill="#17264a"/><rect x="244" y="104" width="40" height="76" rx="3" fill="#17264a"/>' + windows(154, 66, 4, 5, 22, 20)
      : '<path d="M112 110 L200 56 L288 110 Z" fill="#0f1b33"/><rect x="128" y="108" width="144" height="72" fill="#1f3363"/><rect x="186" y="136" width="28" height="44" rx="2" fill="#e0936a"/><rect x="146" y="124" width="26" height="22" rx="2" fill="#f3eee6" opacity=".9"/><rect x="228" y="124" width="26" height="22" rx="2" fill="#f3eee6" opacity=".9"/>';
  const sky = `sky-${(artCount += 1)}`;
  return `<svg class="art art--${variant}" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escapeHtml(property.type)} illustration">
    <defs><linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf6ef"/><stop offset="1" stop-color="#f1e6d8"/></linearGradient></defs>
    <rect width="400" height="220" fill="url(#${sky})"/>
    <circle cx="318" cy="54" r="22" fill="#e0936a" opacity=".85"/>
    <path d="M0 180 Q100 160 200 176 T400 172 V220 H0 Z" fill="#e9dccb"/>
    ${scene}
    <path d="M0 196 Q120 184 220 196 T400 192 V220 H0 Z" fill="#dccab4"/>
  </svg>`;
}
function windows(x0, y0, cols, rows, dx, dy) {
  let out = "";
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) out += `<rect x="${x0 + c * dx + (c ? 6 : 0)}" y="${y0 + r * dy}" width="16" height="12" rx="1.5" fill="#f3eee6" opacity="${(r + c) % 3 ? ".85" : ".55"}"/>`;
  return out;
}

export function propertyMedia(property, variant = "card") {
  const photo = property.photos[0];
  return photo
    ? `<img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.alt || property.title)}" loading="lazy" decoding="async">`
    : propertyArt(property, variant);
}

/* ---------------- Badges ---------------- */

export function serviceBadges(property) {
  return property.services.map((service) => service === "rent"
    ? '<span class="badge badge--rent">For rent</span>'
    : '<span class="badge badge--buy">For sale</span>').join("");
}

export function statusBadge(property) {
  if (property.status === "available") return "";
  return `<span class="badge badge--status badge--${escapeHtml(property.status)}">${escapeHtml(STATUS_LABELS[property.status])}</span>`;
}

/* ---------------- Property card ---------------- */

export function detailsHref(property, service) {
  return `property.html?p=${encodeURIComponent(property.slug)}${service ? `&service=${service}` : ""}`;
}

/** The public property card. The whole card is one link (a stretched title link). */
export function propertyCard(property, { service } = {}) {
  const price = priceFor(property, service);
  const facts = [
    property.bedrooms ? `<li>${icon("bed")}<span>${property.bedrooms} <span class="sr-label">bedrooms</span><abbr title="bedrooms" aria-hidden="true">bd</abbr></span></li>` : "",
    property.bathrooms ? `<li>${icon("bath")}<span>${property.bathrooms} <span class="sr-label">bathrooms</span><abbr title="bathrooms" aria-hidden="true">ba</abbr></span></li>` : "",
    property.area ? `<li>${icon("area")}<span>${property.area.toLocaleString("en-US")} m²</span></li>` : "",
  ].join("");
  return `<article class="pcard" data-reveal>
    <div class="pcard-media">
      ${propertyMedia(property)}
      <div class="pcard-badges">${serviceBadges(property)}${statusBadge(property)}</div>
      ${property.sample ? '<span class="pcard-sample">Sample</span>' : ""}
    </div>
    <div class="pcard-body">
      <p class="pcard-type">${escapeHtml(property.type)}</p>
      <h3 class="pcard-title"><a class="pcard-link" href="${detailsHref(property, service)}">${escapeHtml(property.title)}</a></h3>
      <p class="pcard-loc">${icon("pin")}<span>${escapeHtml(property.location)}</span></p>
      ${property.summary ? `<p class="pcard-summary">${escapeHtml(property.summary)}</p>` : ""}
      ${facts ? `<ul class="pcard-facts">${facts}</ul>` : ""}
      <div class="pcard-foot">
        <p class="pcard-price">${escapeHtml(price.amount)}<small>${escapeHtml(price.note)}</small></p>
        <span class="pcard-cta" aria-hidden="true">View details ${icon("arrow")}</span>
      </div>
    </div>
  </article>`;
}

/* ---------------- Forms ---------------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Inline validation. Returns true when the form may be submitted. */
export function validateForm(form, extraChecks = () => []) {
  for (const node of form.querySelectorAll(".field-error")) node.remove();
  form.querySelectorAll("[aria-invalid]").forEach((el) => { el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby"); });

  const problems = [];
  for (const field of form.querySelectorAll("input, select, textarea")) {
    if (field.type === "file" || field.type === "checkbox") {
      if (field.required && field.type === "checkbox" && !field.checked) problems.push([field, "Please confirm to continue."]);
      continue;
    }
    const value = String(field.value || "").trim();
    if (field.required && !value) problems.push([field, "This field is required."]);
    else if (value && field.type === "email" && !EMAIL.test(value)) problems.push([field, "Enter a valid email address."]);
    else if (value && field.minLength > 0 && value.length < field.minLength) problems.push([field, `Use at least ${field.minLength} characters.`]);
    else if (value && field.type === "number" && field.min !== "" && Number(value) < Number(field.min)) problems.push([field, `Enter ${field.min} or more.`]);
  }
  problems.push(...extraChecks());

  for (const [field, message] of problems) {
    const note = document.createElement("p");
    note.className = "field-error";
    note.id = `${field.id || field.name}-error`;
    note.textContent = message;
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", note.id);
    (field.closest(".field") || field.parentElement).appendChild(note);
  }
  if (problems.length) problems[0][0].focus();
  return problems.length === 0;
}

/** A status panel under a form: kind is "info", "success" or "error". */
export function showFormResult(host, kind, title, message) {
  host.hidden = false;
  host.className = `form-result form-result--${kind}`;
  host.innerHTML = `${icon(kind === "success" ? "check" : "info")}<div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
  host.setAttribute("tabindex", "-1");
  host.focus({ preventScroll: true });
  host.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/* ---------------- Page chrome ---------------- */

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");
  if (!toggle || !nav) return;
  const mobile = window.matchMedia("(max-width: 960px)");
  const setOpen = (open) => {
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    toggle.innerHTML = icon(open ? "close" : "menu");
  };
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (event) => { if (event.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setOpen(false); toggle.focus(); }
  });
  mobile.addEventListener("change", () => setOpen(false));
  setOpen(false);
}

function initHeaderShadow() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const update = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

/** Fades sections and cards in as they scroll into view. Content is never
    hidden without JavaScript: the hidden state only exists under html.js. */
export function initReveal(root = document) {
  const targets = [...root.querySelectorAll("[data-reveal]:not(.is-visible)")];
  if (!("IntersectionObserver" in window)) { targets.forEach((el) => el.classList.add("is-visible")); return; }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -40px 0px", threshold: 0.08 });
  targets.forEach((el, index) => {
    el.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 60}ms`);
    observer.observe(el);
  });
}

/** Header account link: "Log in" for visitors, "My portal" once signed in. */
async function initAccountLink() {
  const link = document.querySelector("[data-account-link]");
  if (!link) return;
  try {
    const customer = await currentCustomer();
    if (customer) {
      link.href = "portal.html";
      link.innerHTML = `${icon("user")}<span>My portal</span>`;
    }
  } catch { /* the visitor simply stays on "Log in" */ }
}

function initYear() {
  for (const node of document.querySelectorAll("[data-year]")) node.textContent = String(new Date().getFullYear());
}

export function initChrome() {
  initNav();
  initHeaderShadow();
  initAccountLink();
  initYear();
  initReveal();
}

/** The `next` page to return to after login, restricted to this site. */
export function safeNext(fallback = "portal.html") {
  const next = new URLSearchParams(window.location.search).get("next") || "";
  return /^[a-z-]+\.html(\?[^#]*)?$/i.test(next) ? next : fallback;
}
