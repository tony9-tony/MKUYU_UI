/* Property details. Reads the property and its CURRENT status from the data
   layer; the request action is only offered while the internal system reports
   the property as available for that service. */
import { STATUS_LABELS, canRequest, getProperty, listProperties, stateFor } from "../api.js";
import { escapeHtml, icon, initReveal, openLightbox, priceFor, propertyCard, propertyMedia, serviceBadges, statusBadge } from "../ui.js";

const SERVICE_WORD = { rent: "rent", buy: "buy" };

export default async function property() {
  const host = document.getElementById("property-detail");
  if (!host) return;
  const params = new URLSearchParams(window.location.search);

  let item = null;
  try { item = await getProperty(params.get("p") || ""); }
  catch (error) {
    console.error(error);
    host.innerHTML = notFound("This property could not be loaded", "Please try again in a moment.");
    return;
  }
  if (!item) {
    host.innerHTML = notFound("Property not found", "This listing does not exist or has been removed.");
    return;
  }

  let service = item.services.includes(params.get("service")) ? params.get("service") : item.services[0] || "buy";
  document.title = `${item.title} · MKUYU Africa`;
  const crumb = document.getElementById("crumb-service");
  if (crumb) { crumb.href = `${service}.html`; crumb.textContent = service === "rent" ? "Rent" : "Buy"; }
  const crumbTitle = document.getElementById("crumb-title");
  if (crumbTitle) crumbTitle.textContent = item.title;

  const facts = [
    ["home", "Type", item.type],
    item.bedrooms ? ["bed", "Bedrooms", item.bedrooms] : null,
    item.bathrooms ? ["bath", "Bathrooms", item.bathrooms] : null,
    item.area ? ["area", "Area", `${item.area.toLocaleString("en-US")} m²`] : null,
    item.project ? ["grid", "Project", item.project.name, true] : null,
    // One line per category, so "For sale: Sold · For rent: Available" is clear.
    ...item.services.map((s) => ["clock", item.services.length > 1 ? (s === "rent" ? "For rent" : "For sale") : "Status", STATUS_LABELS[stateFor(item, s)]]),
  ].filter(Boolean);

  const many = item.photos.length > 1;
  host.innerHTML = `
    <div>
      <div class="gallery">
        <div class="gallery-main" id="gallery-main" ${many ? 'tabindex="0" aria-roledescription="carousel" aria-label="Property photos"' : ""}>
          ${propertyMedia(item, "large")}
          <div class="pcard-badges">${serviceBadges(item)}${statusBadge(item)}</div>
          ${item.photos.length ? `<button type="button" class="gallery-open" aria-label="Open photo gallery (${item.photos.length} ${item.photos.length === 1 ? "photo" : "photos"})"></button>
            <span class="gallery-count">${icon("images")}${many ? `<span id="gallery-index">1</span>&nbsp;/&nbsp;${item.photos.length}` : item.photos.length}</span>` : ""}
          ${many ? `<button type="button" class="gallery-nav gallery-nav--prev" data-step="-1" aria-label="Previous photo">${icon("prev")}</button>
            <button type="button" class="gallery-nav gallery-nav--next" data-step="1" aria-label="Next photo">${icon("next")}</button>` : ""}
        </div>
        ${many ? `<div class="gallery-thumbs">${item.photos.map((photo, index) => `
          <button type="button" data-photo="${index}" aria-current="${index === 0}" aria-label="Show photo ${index + 1}">
            <img src="${escapeHtml(photo.url)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
        ${item.photos.length ? "" : '<p class="gallery-note">Photos appear here once our sales team uploads them.</p>'}
      </div>

      <div class="detail-head">
        <span class="eyebrow">${escapeHtml(item.type)}${item.project ? `<span data-project-info> · ${escapeHtml(item.project.name)}</span>` : ""}</span>
        <h1>${escapeHtml(item.title)}</h1>
        <p class="detail-loc">${icon("pin")}<span>${escapeHtml(item.location)}</span></p>
      </div>

      <dl class="facts">${facts.map(([name, label, value, project]) => `<div${project ? " data-project-info" : ""}>${icon(name)}<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>

      ${item.description ? `<section class="detail-block" data-reveal><h2>About this property</h2><p>${escapeHtml(item.description)}</p></section>` : ""}
      ${item.features.length ? `<section class="detail-block" data-reveal><h2>Features</h2>
        <ul class="feature-list">${item.features.map((f) => `<li>${icon("check")}<span>${escapeHtml(f)}</span></li>`).join("")}</ul></section>` : ""}
      ${item.project ? `<section class="detail-block" data-reveal data-project-info><h2>Part of ${escapeHtml(item.project.name)}</h2>
        <p class="card-meta">This property belongs to one of our developments.</p>
        <a class="btn btn--soft btn--small" href="projects.html#${encodeURIComponent(item.project.slug)}">About the project ${icon("arrow")}</a></section>` : ""}
    </div>

    <aside class="sticky-panel">
      <div class="action-panel" id="action-panel"></div>
      <div class="card"><div class="card-body">
        <h3>Have a question first?</h3>
        <p class="card-meta" style="margin-bottom:.9rem">Ask our team about this property, the area or payment options.</p>
        <a class="btn btn--outline btn--small" href="contact.html?property=${encodeURIComponent(item.title)}">Ask a question</a>
      </div></div>
    </aside>`;

  const panel = document.getElementById("action-panel");
  function renderPanel() {
    // A project belongs to the sale side; renting is about this property only.
    host.querySelectorAll("[data-project-info]").forEach((element) => { element.hidden = service === "rent"; });
    const price = priceFor(item, service);
    const open = canRequest(item, service);
    // The state of THIS category: a house can be rented and still for sale.
    const state = stateFor(item, service);
    const statusText = {
      available: `Available to ${SERVICE_WORD[service]}`,
      reserved: "Reserved — not open to new requests right now",
      rented: "Rented — no longer available to rent",
      sold: "Sold — no longer available to buy",
    }[state];
    panel.innerHTML = `
      ${item.services.length > 1 ? `<div class="segmented" role="tablist" aria-label="Choose a service">
        ${item.services.map((s) => `<button type="button" role="tab" data-service="${s}" aria-selected="${s === service}">${s === "rent" ? "Rent" : "Buy"}${["sold", "rented"].includes(stateFor(item, s)) ? ` · ${STATUS_LABELS[stateFor(item, s)]}` : ""}</button>`).join("")}
      </div>` : ""}
      <p class="action-price">${escapeHtml(price.amount)}<small>${escapeHtml(price.note)}</small></p>
      <p class="action-status"><span class="dot dot--${escapeHtml(state)}"></span>${escapeHtml(statusText)}</p>
      ${open
        ? `<a class="btn btn--primary btn--block" href="request.html?p=${encodeURIComponent(item.slug)}&service=${service}">Request to ${SERVICE_WORD[service]} ${icon("arrow")}</a>
           <p class="action-note">${icon("user")}<span>No account needed. Leave your details and our team contacts you by phone, WhatsApp or email.</span></p>`
        : `<button class="btn btn--primary btn--block" type="button" disabled>Not available to request</button>
           <p class="action-note"><a href="${service}.html">See other properties to ${SERVICE_WORD[service]}</a></p>`}
      <ul class="action-list">
        <li>${icon("check")}<span>Our sales team reviews every request and contacts you</span></li>
        <li>${icon("check")}<span>Terms, contract and payments are agreed in writing</span></li>
        <li>${icon("check")}<span>Our team keeps you informed at every step</span></li>
      </ul>`;
    panel.querySelectorAll("[data-service]").forEach((tab) => tab.addEventListener("click", () => {
      service = tab.dataset.service;
      renderPanel();
      panel.querySelector(`[data-service="${service}"]`)?.focus();
      history.replaceState(null, "", `?p=${encodeURIComponent(item.slug)}&service=${service}`);
    }));
  }
  renderPanel();

  // The photo slider: Next / Previous buttons on the photo, the thumbnails,
  // the arrow keys and a swipe on a phone all move through every photo.
  let shown = 0;
  const main = document.getElementById("gallery-main");
  function show(index) {
    const count = item.photos.length;
    if (!count) return;
    shown = (index + count) % count;
    const photo = item.photos[shown];
    main.querySelector(":scope > img, :scope > .ph")?.replaceWith(Object.assign(document.createElement("img"), { src: photo.url, alt: photo.alt || item.title }));
    host.querySelectorAll("[data-photo]").forEach((b) => {
      const current = Number(b.dataset.photo) === shown;
      b.setAttribute("aria-current", String(current));
      if (current) b.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    const position = document.getElementById("gallery-index");
    if (position) position.textContent = String(shown + 1);
  }
  host.querySelectorAll("[data-photo]").forEach((button) => button.addEventListener("click", () => show(Number(button.dataset.photo))));
  host.querySelectorAll(".gallery-nav").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    show(shown + Number(button.dataset.step));
  }));
  if (many) {
    main.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") { event.preventDefault(); show(shown + 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); show(shown - 1); }
    });
    let startX = null;
    main.addEventListener("pointerdown", (event) => { if (event.pointerType !== "mouse") startX = event.clientX; });
    main.addEventListener("pointerup", (event) => {
      if (startX === null) return;
      const moved = event.clientX - startX;
      startX = null;
      if (Math.abs(moved) > 40) show(shown + (moved < 0 ? 1 : -1));
    });
  }
  host.querySelector(".gallery-open")?.addEventListener("click", () => openLightbox(item.photos, shown, item.title));

  initReveal(host);
  renderSimilar(item, service);
}

async function renderSimilar(item, service) {
  const section = document.getElementById("similar");
  const grid = document.getElementById("similar-grid");
  if (!section || !grid) return;
  try {
    const rows = (await listProperties({ service })).filter((p) => p.slug !== item.slug).slice(0, 3);
    if (!rows.length) return;
    grid.innerHTML = rows.map((p) => propertyCard(p, { service })).join("");
    section.hidden = false;
    initReveal(grid);
  } catch { /* the details page is complete without suggestions */ }
}

function notFound(title, text) {
  return `<div class="empty" style="grid-column:1/-1">
    <h1 style="font-size:1.6rem">${escapeHtml(title)}</h1>
    <p>${escapeHtml(text)} <a href="buy.html">Properties to buy</a> · <a href="rent.html">Properties to rent</a></p>
  </div>`;
}
