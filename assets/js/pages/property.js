/* Property details. Reads the property and its CURRENT status from the data
   layer; the request action is only offered while the internal system reports
   the property as available for that service. */
import { STATUS_LABELS, canRequest, getProperty, listProperties } from "../api.js";
import { escapeHtml, icon, initReveal, priceFor, propertyCard, propertyMedia, serviceBadges, statusBadge } from "../ui.js";

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
    item.project ? ["grid", "Project", item.project.name] : null,
    ["clock", "Status", STATUS_LABELS[item.status]],
  ].filter(Boolean);

  host.innerHTML = `
    <div>
      <div class="gallery-main" id="gallery-main">
        ${propertyMedia(item, "detail")}
        <div class="pcard-badges">${serviceBadges(item)}${statusBadge(item)}</div>
      </div>
      ${item.photos.length > 1 ? `<div class="gallery-thumbs" role="list">${item.photos.map((photo, index) => `
        <button type="button" role="listitem" data-photo="${index}" aria-current="${index === 0}" aria-label="Show photo ${index + 1}">
          <img src="${escapeHtml(photo.url)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
      ${item.photos.length ? "" : '<p class="gallery-note">Photos appear here once our sales team uploads them.</p>'}

      <div class="detail-head">
        <span class="eyebrow">${escapeHtml(item.type)}${item.project ? ` · ${escapeHtml(item.project.name)}` : ""}</span>
        <h1>${escapeHtml(item.title)}</h1>
        <p class="detail-loc">${icon("pin")}<span>${escapeHtml(item.location)}</span></p>
      </div>

      <dl class="facts">${facts.map(([name, label, value]) => `<div>${icon(name)}<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>

      ${item.description ? `<section class="detail-block" data-reveal><h2>About this property</h2><p>${escapeHtml(item.description)}</p></section>` : ""}
      ${item.features.length ? `<section class="detail-block" data-reveal><h2>Features</h2>
        <ul class="feature-list">${item.features.map((f) => `<li>${icon("check")}<span>${escapeHtml(f)}</span></li>`).join("")}</ul></section>` : ""}
      ${item.project ? `<section class="detail-block" data-reveal><h2>Part of ${escapeHtml(item.project.name)}</h2>
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
    const price = priceFor(item, service);
    const open = canRequest(item, service);
    const statusText = {
      available: `Available to ${SERVICE_WORD[service]}`,
      reserved: "Reserved — not open to new requests right now",
      rented: "Rented — no longer available",
      sold: "Sold — no longer available",
    }[item.status];
    panel.innerHTML = `
      ${item.services.length > 1 ? `<div class="segmented" role="tablist" aria-label="Choose a service">
        ${item.services.map((s) => `<button type="button" role="tab" data-service="${s}" aria-selected="${s === service}">${s === "rent" ? "Rent" : "Buy"}</button>`).join("")}
      </div>` : ""}
      <p class="action-price">${escapeHtml(price.amount)}<small>${escapeHtml(price.note)}</small></p>
      <p class="action-status"><span class="dot dot--${escapeHtml(item.status)}"></span>${escapeHtml(statusText)}</p>
      ${open
        ? `<a class="btn btn--primary btn--block" href="request.html?p=${encodeURIComponent(item.slug)}&service=${service}">Request to ${SERVICE_WORD[service]} ${icon("arrow")}</a>
           <p class="action-note">${icon("lock")}<span>A free MKUYU account lets you follow your request from start to finish.</span></p>`
        : `<button class="btn btn--primary btn--block" type="button" disabled>Not available to request</button>
           <p class="action-note"><a href="${service}.html">See other properties to ${SERVICE_WORD[service]}</a></p>`}
      <ul class="action-list">
        <li>${icon("check")}<span>Our sales team reviews every request and contacts you</span></li>
        <li>${icon("check")}<span>Terms, contract and payments are agreed in writing</span></li>
        <li>${icon("check")}<span>Track every step in your customer portal</span></li>
      </ul>`;
    panel.querySelectorAll("[data-service]").forEach((tab) => tab.addEventListener("click", () => {
      service = tab.dataset.service;
      renderPanel();
      panel.querySelector(`[data-service="${service}"]`)?.focus();
      history.replaceState(null, "", `?p=${encodeURIComponent(item.slug)}&service=${service}`);
    }));
  }
  renderPanel();

  host.querySelectorAll("[data-photo]").forEach((button) => button.addEventListener("click", () => {
    const photo = item.photos[Number(button.dataset.photo)];
    const main = document.getElementById("gallery-main");
    main.querySelector("img").replaceWith(Object.assign(document.createElement("img"), { src: photo.url, alt: photo.alt || item.title }));
    host.querySelectorAll("[data-photo]").forEach((b) => b.setAttribute("aria-current", String(b === button)));
  }));

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
