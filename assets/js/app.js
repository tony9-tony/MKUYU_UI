/* ==========================================================================
   MKUYU AFRICA — public site behaviour
   --------------------------------------------------------------------------
   Progressive enhancement only. Every page works with JavaScript disabled:
   navigation is real links, the enquiry form is a real <form>. This file adds
   the mobile menu, client-side filtering, and inline validation.

   There is NO backend and NO network call anywhere in this file. The enquiry
   form validates and confirms locally; wiring it to a real inbox is a
   deployment decision, not something to fake in a static site.
   ========================================================================== */

import { PROPERTIES, PROPERTY_TYPES, formatTZS, projectBySlug, propertiesForProject } from "./data.js";

/* Escapes text before it is placed in innerHTML. Every dynamic value goes
   through this, so catalogue text can never inject markup. */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

const money = (value) => `<span class="price">${escapeHtml(formatTZS(value))}<small>Asking price</small></span>`;

function mediaFor(item) {
  // No photography is bundled with the sample data, so the card falls back to a
  // branded gradient rather than a broken image.
  return `<div class="card-media">
    <span class="placeholder" aria-hidden="true">${item.type === "Land" ? "◫" : "⌂"}</span>
    <span class="card-tag">${escapeHtml(item.status)}</span>
  </div>`;
}

function propertyCard(item) {
  return `<article class="card">
    ${mediaFor(item)}
    <div class="card-body">
      <h3><a href="property.html?p=${encodeURIComponent(item.slug)}" style="text-decoration:none;color:inherit">${escapeHtml(item.name)}</a></h3>
      <p class="card-meta">${escapeHtml(item.location)}</p>
      <div class="card-foot">
        ${money(item.price)}
        <a class="btn btn--outline" href="property.html?p=${encodeURIComponent(item.slug)}">View</a>
      </div>
    </div>
  </article>`;
}

/* ---------------- Mobile navigation ---------------- */
function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");
  if (!toggle || !nav) return;
  const setOpen = (open) => {
    nav.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  };
  toggle.addEventListener("click", () => setOpen(nav.hidden));
  nav.addEventListener("click", (event) => { if (event.target.tagName === "A") setOpen(false); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") setOpen(false); });
  setOpen(false);
}

/* ---------------- Property filtering ---------------- */
function initFilters() {
  const grid = document.getElementById("property-grid");
  if (!grid) return;
  const search = document.getElementById("filter-search");
  const type = document.getElementById("filter-type");
  const project = document.getElementById("filter-project");
  const sort = document.getElementById("filter-sort");
  const count = document.getElementById("result-count");
  const empty = document.getElementById("no-results");

  if (type) {
    type.innerHTML = PROPERTY_TYPES.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  }

  function render() {
    const term = (search?.value || "").trim().toLowerCase();
    const wantedType = type?.value || "All types";
    const wantedProject = project?.value || "";

    let rows = PROPERTIES.filter((item) => {
      if (wantedType !== "All types" && item.type !== wantedType) return false;
      if (wantedProject && item.project !== wantedProject) return false;
      if (!term) return true;
      return `${item.name} ${item.location} ${item.type} ${item.status}`.toLowerCase().includes(term);
    });

    const order = sort?.value || "featured";
    if (order === "price-asc") rows = [...rows].sort((a, b) => a.price - b.price);
    else if (order === "price-desc") rows = [...rows].sort((a, b) => b.price - a.price);
    else if (order === "name") rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));

    grid.innerHTML = rows.map(propertyCard).join("");
    if (empty) empty.hidden = rows.length > 0;
    if (count) {
      count.textContent = rows.length === 0
        ? "No properties match your filters."
        : `Showing ${rows.length} of ${PROPERTIES.length} properties.`;
    }
  }

  for (const control of [search, type, project, sort]) {
    control?.addEventListener("input", render);
    control?.addEventListener("change", render);

/* ---------------- Property detail page ---------------- */
function initPropertyDetail() {
  const host = document.getElementById("property-detail");
  if (!host) return;
  const params = new URLSearchParams(window.location.search);
  const item = PROPERTIES.find((p) => p.slug === params.get("p")) || null;

  if (!item) {
    host.innerHTML = `<div class="empty">
      <h3>Property not found</h3>
      <p>That listing is no longer available. <a href="properties.html">Browse all properties</a>.</p>
    </div>`;
    return;
  }

  const project = projectBySlug(item.project);
  const siblings = propertiesForProject(item.project).filter((p) => p.slug !== item.slug);
  const facts = [
    ["Property type", item.type], ["Status", item.status],
    ["Bedrooms", item.beds || "—"], ["Bathrooms", item.baths || "—"],
    ["Size", item.area ? `${item.area} m²` : "—"], ["Project", project?.name || "—"],
  ];

  host.innerHTML = `
    <div class="detail-gallery"><span class="placeholder" aria-hidden="true">⌂</span></div>
    <div class="card-body" style="padding-top:1.5rem">
      <span class="eyebrow">${escapeHtml(item.type)} · ${escapeHtml(item.status)}</span>
      <h1 style="font-size:clamp(1.7rem,3.6vw,2.4rem)">${escapeHtml(item.name)}</h1>
      <p class="card-meta">${escapeHtml(item.location)}</p>
      <p>${escapeHtml(item.blurb)}</p>
      <ul class="facts">${facts.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</ul>
      ${item.features?.length ? `<h3 style="margin-top:1.6rem">What this home offers</h3>
        <ul class="card-meta" style="padding-left:1.1rem">${item.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>` : ""}
    </div>

    <aside class="sticky-panel">
      <div class="price-box">
        <span class="price">${escapeHtml(formatTZS(item.price))}</span>
        <p class="plan">Instalment payment plans available on applicable terms.</p>
        <ul>
          <li>Full title and ownership documentation</li>
          <li>Written sale agreement before payment</li>
          <li>Independent legal review encouraged</li>
        </ul>
        <a class="btn btn--primary btn--block" href="contact.html?property=${encodeURIComponent(item.name)}">Enquire about this property</a>
        <a class="btn btn--outline btn--block" style="margin-top:.6rem" href="contact.html">Book a viewing</a>
      </div>
      ${project ? `<div class="card" style="margin-top:1.2rem"><div class="card-body">
        <h3>${escapeHtml(project.name)}</h3>
        <p class="card-meta">${escapeHtml(project.location)} · ${escapeHtml(project.status)}</p>
        <p style="font-size:.93rem">${escapeHtml(project.summary)}</p>
        <a href="properties.html?project=${encodeURIComponent(project.slug)}">View everything in this project →</a>
      </div></div>` : ""}
      ${siblings.length ? `<div style="margin-top:1.5rem">
        <h3>More in this project</h3>
        <div class="grid" style="gap:1rem">${siblings.map(propertyCard).join("")}</div>
      </div>` : ""}
    </aside>`;
}

/* ---------------- Enquiry form ---------------- */
function initEnquiry() {
  const form = document.getElementById("enquiry-form");
  if (!form) return;
  const prefill = new URLSearchParams(window.location.search).get("property");
  if (prefill) {
    const message = form.elements.message;
    if (message) message.value = `I would like to enquire about ${prefill}. Please send me the full details, pricing and payment options.`;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    for (const node of form.querySelectorAll(".field-error")) node.remove();
    form.querySelectorAll("input, textarea, select").forEach((el) => el.removeAttribute("aria-invalid"));

    const problems = [];
    for (const field of form.querySelectorAll("[required]")) {
      const value = String(field.value || "").trim();
      if (!value) problems.push([field, "This field is required."]);
      else if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) problems.push([field, "Enter a valid email address."]);
    }

    for (const [field, message] of problems) {
      const note = document.createElement("p");
      note.className = "field-error";
      note.id = `${field.id}-error`;
      note.textContent = message;
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", note.id);
      field.insertAdjacentElement("afterend", note);
    }

    if (problems.length) {
      problems[0][0].focus();
      return;
    }

    form.hidden = true;
    const done = document.getElementById("form-success");
    if (done) {
      done.hidden = false;
      done.focus();
      done.scrollIntoView({ block: "center" });
    }
  });
}

function initYear() {
  for (const node of document.querySelectorAll("[data-year]")) {
    node.textContent = String(new Date().getFullYear());
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initFilters();
  initPropertyDetail();
  initEnquiry();
  initYear();
});

  }
  render();
}
