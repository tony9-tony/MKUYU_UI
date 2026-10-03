/* Projects. A project is an estate (separate homes or plots) or a building
   (floors and numbered units). Its units can be offered to rent, to buy, or
   both, so the list filters by service and every card says which it offers.

   projects.html            all projects (All / To rent / To buy)
   projects.html?p=<slug>   one project: a building floor by floor, an estate
                            as a grid of its homes */
import { getProject, listProjects, listProperties, stateFor } from "../api.js";
import { detailsHref, escapeHtml, formatMoney, icon, initReveal, periodLabel, photoPlaceholder, propertyCard, serviceBadges, skeletonCards } from "../ui.js";

const SERVICE_WORD = { rent: "rent", buy: "buy" };
const STATE_LABEL = { available: "Available", reserved: "Reserved", sold: "Sold", rented: "Rented" };

export default async function projects() {
  const slug = new URLSearchParams(window.location.search).get("p");
  if (slug) return projectDetail(slug);
  return projectList();
}

/* ---------------- All projects ---------------- */
async function projectList() {
  const host = document.getElementById("project-grid");
  const tabsBox = document.getElementById("project-tabs");
  const count = document.getElementById("project-count");
  if (!host) return;
  if (tabsBox) {
    tabsBox.innerHTML = `<button type="button" role="tab" data-service="" aria-controls="project-grid">All</button><button type="button" role="tab" data-service="rent" aria-controls="project-grid">To rent</button><button type="button" role="tab" data-service="buy" aria-controls="project-grid">To buy</button>`;
    tabsBox.hidden = false;
  }
  const tabs = [...(tabsBox?.querySelectorAll("[role=tab]") || [])];

  host.innerHTML = skeletonCards(3);
  let rows = [];
  let listed = [];
  try { [rows, listed] = await Promise.all([listProjects(), listProperties()]); }
  catch (error) {
    console.error(error);
    host.innerHTML = `<div class="empty" style="grid-column:1/-1">${icon("info")}<h3>Projects could not be loaded</h3><p>Please try again in a moment.</p></div>`;
    return;
  }

  const initial = new URLSearchParams(window.location.search).get("service");
  let service = ["rent", "buy"].includes(initial) ? initial : "";

  function card(project) {
    const target = service || (project.services.includes("buy") ? "buy" : project.services[0] || "buy");
    const units = listed.filter((p) => p.project?.slug === project.slug && p.services.includes(target) && !["sold", "rented"].includes(stateFor(p, target)));
    const prices = units.map((p) => (target === "rent" ? p.price.rent?.amount : p.price.sale)).filter(Boolean).sort((a, b) => a - b);
    const photo = project.photos[0];
    const kind = project.kind === "building" ? `Building${project.floors ? ` · ${project.floors} ${project.floors === 1 ? "floor" : "floors"}` : ""}` : "Development";
    const href = `projects.html?p=${encodeURIComponent(project.slug)}${service ? `&service=${service}` : ""}`;
    const offers = project.services.length === 2 ? "Units to rent and to buy" : project.services[0] === "rent" ? "Units to rent" : "Homes for sale";
    return `<article class="pcard" id="${escapeHtml(project.slug)}" data-reveal>
      <div class="pcard-media">
        ${photo ? `<img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.alt || project.name)}" loading="lazy" decoding="async">` : photoPlaceholder("Project photo coming soon")}
        <div class="pcard-badges">${serviceBadges(project)}</div>
        ${project.sample ? '<span class="pcard-sample">Sample</span>' : ""}
      </div>
      <div class="pcard-body">
        <p class="pcard-type">${escapeHtml(kind)}${project.status ? ` · ${escapeHtml(project.status)}` : ""}</p>
        <h3 class="pcard-title"><a class="pcard-link" href="${href}">${escapeHtml(project.name)}</a></h3>
        <p class="pcard-loc">${icon("pin")}<span>${escapeHtml(project.location)}</span></p>
        <p class="pcard-summary">${escapeHtml(project.summary || offers)}</p>
        <div class="pcard-foot">
          <p class="pcard-price">${units.length} ${units.length === 1 ? "unit" : "units"} to ${SERVICE_WORD[target]}<small>${prices[0] ? `From ${escapeHtml(formatMoney(prices[0]))}` : "Enquire for availability"}</small></p>
          <span class="pcard-cta" aria-hidden="true">${project.kind === "building" ? "See floors" : "View homes"} ${icon("arrow")}</span>
        </div>
      </div>
    </article>`;
  }

  function render() {
    tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.service === service)));
    const shown = rows.filter((project) => !service || project.services.includes(service));
    host.innerHTML = shown.length
      ? shown.map(card).join("")
      : `<div class="empty" style="grid-column:1/-1">${icon("grid")}<h3>No projects ${service ? `to ${service}` : ""} right now</h3><p>New developments are added by our sales team as they open.</p></div>`;
    if (count) count.textContent = `${shown.length} ${shown.length === 1 ? "project" : "projects"}${service ? ` with units to ${service}` : ""}`;
    history.replaceState(null, "", service ? `?service=${service}` : window.location.pathname);
    initReveal(host);
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => { service = tab.dataset.service; render(); }));
  render();
}

/* ---------------- One project ---------------- */
function floorName(floor) {
  if (floor === null) return "Other units";
  if (floor === 0) return "Ground floor";
  if (floor < 0) return `Basement ${Math.abs(floor)}`;
  return `Floor ${floor}`;
}

/** One unit on a floor: number, size, price and state for each service. */
function unitTile(unit, service) {
  const services = service ? unit.services.filter((s) => s === service) : unit.services;
  const lines = services.map((s) => {
    const state = stateFor(unit, s);
    const amount = s === "rent" ? (unit.price.rent ? `${formatMoney(unit.price.rent.amount)} ${periodLabel(unit.price.rent.period)}` : "Price on request") : (unit.price.sale ? formatMoney(unit.price.sale) : "Price on request");
    return `<li class="unit-offer unit-offer--${state}"><span class="unit-service">${s === "rent" ? "To rent" : "To buy"}</span><span class="unit-price">${escapeHtml(amount)}</span>${state !== "available" ? `<span class="unit-state">${STATE_LABEL[state]}</span>` : ""}</li>`;
  }).join("");
  const target = services.find((s) => !["sold", "rented"].includes(stateFor(unit, s))) || services[0];
  const closed = services.every((s) => ["sold", "rented"].includes(stateFor(unit, s)));
  const facts = [unit.type, unit.bedrooms ? `${unit.bedrooms} bed` : "", unit.area ? `${unit.area.toLocaleString("en-US")} m²` : ""].filter(Boolean).join(" · ");
  const photo = unit.photos[0];
  return `<a class="unit-tile${closed ? " unit-tile--closed" : ""}" href="${escapeHtml(detailsHref(unit, target))}">
    ${photo ? `<span class="unit-thumb"><img src="${escapeHtml(photo.url)}" alt="" loading="lazy" decoding="async">${photo.illustration ? '<span class="unit-illus">Illustration</span>' : ""}</span>` : ""}
    <span class="unit-number">${escapeHtml(unit.unit || unit.title)}</span>
    <span class="unit-facts">${escapeHtml(facts)}</span>
    <ul class="unit-offers">${lines}</ul>
  </a>`;
}

async function projectDetail(slug) {
  const hero = document.querySelector(".page-hero .wrap");
  const host = document.getElementById("project-grid");
  const tabsBox = document.getElementById("project-tabs");
  const count = document.getElementById("project-count");
  if (!host) return;
  host.innerHTML = skeletonCards(3);

  let project;
  try { project = await getProject(slug); }
  catch (error) {
    console.error(error);
    host.innerHTML = `<div class="empty" style="grid-column:1/-1">${icon("info")}<h3>This project could not be loaded</h3><p>Please try again in a moment.</p></div>`;
    return;
  }
  if (!project) {
    host.innerHTML = `<div class="empty" style="grid-column:1/-1">${icon("grid")}<h3>Project not found</h3><p><a href="projects.html">See all projects</a></p></div>`;
    return;
  }

  document.title = `${project.name} · MKUYU Africa`;
  if (hero) {
    hero.innerHTML = `<a class="btn btn--soft btn--small" href="projects.html">← All projects</a>
      <span class="eyebrow" style="display:block;margin-top:1.2rem">${project.kind === "building" ? "Building" : "Development"}${project.location ? ` · ${escapeHtml(project.location)}` : ""}</span>
      <h1>${escapeHtml(project.name)}</h1>
      <p class="lede">${project.kind === "building"
        ? `${project.properties.length} ${project.properties.length === 1 ? "unit" : "units"} on ${new Set(project.properties.map((u) => u.floor)).size} ${new Set(project.properties.map((u) => u.floor)).size === 1 ? "floor" : "floors"}. Each unit shows whether it is to rent, to buy, or both, and whether it is still available.`
        : `${project.properties.length} ${project.properties.length === 1 ? "home" : "homes"} in this development.`}</p>`;
  }

  const offered = ["rent", "buy"].filter((s) => project.properties.some((u) => u.services.includes(s)));
  const initial = new URLSearchParams(window.location.search).get("service");
  let service = offered.includes(initial) ? initial : "";
  if (tabsBox) {
    tabsBox.innerHTML = offered.length > 1
      ? `<button type="button" role="tab" data-service="" aria-controls="project-grid">All units</button>${offered.map((s) => `<button type="button" role="tab" data-service="${s}" aria-controls="project-grid">To ${s}</button>`).join("")}`
      : "";
    tabsBox.hidden = offered.length < 2;
  }
  const tabs = [...(tabsBox?.querySelectorAll("[role=tab]") || [])];

  function render() {
    tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.service === service)));
    const units = project.properties.filter((u) => !service || u.services.includes(service));
    const open = units.filter((u) => (service ? [service] : u.services).some((s) => !["sold", "rented"].includes(stateFor(u, s))));
    if (count) count.textContent = `${units.length} ${units.length === 1 ? "unit" : "units"}${service ? ` to ${service}` : ""} · ${open.length} available`;
    history.replaceState(null, "", `?p=${encodeURIComponent(slug)}${service ? `&service=${service}` : ""}`);

    if (!units.length) {
      host.className = "grid grid--3";
      host.innerHTML = `<div class="empty" style="grid-column:1/-1">${icon("grid")}<h3>No units ${service ? `to ${service}` : ""} in this project right now</h3><p><a href="contact.html">Tell us what you are looking for</a> and our team will let you know.</p></div>`;
      return;
    }
    if (project.kind !== "building") {
      host.className = "grid grid--3";
      host.innerHTML = units.map((u) => propertyCard(u, { service: service || undefined })).join("");
      initReveal(host);
      return;
    }
    // A building: top floor first, as on a building's directory board.
    const floors = new Map();
    for (const unit of units) {
      const key = unit.floor;
      if (!floors.has(key)) floors.set(key, []);
      floors.get(key).push(unit);
    }
    const order = [...floors.keys()].sort((a, b) => (a === null ? 1 : b === null ? -1 : b - a));
    host.className = "floor-list";
    host.innerHTML = order.map((floor) => `<section class="floor"${floor === null ? "" : ` id="floor-${floor}"`} data-reveal>
        <header class="floor-head"><h2>${escapeHtml(floorName(floor))}</h2><span>${floors.get(floor).length} ${floors.get(floor).length === 1 ? "unit" : "units"}</span></header>
        <div class="floor-units">${floors.get(floor).map((unit) => unitTile(unit, service)).join("")}</div>
      </section>`).join("");
    initReveal(host);
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => { service = tab.dataset.service; render(); }));
  render();
}
