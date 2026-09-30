/* Projects. Each project is published by the Sales Officer for Rent, Buy or
   both (chosen when its photos are uploaded), so the page filters by service
   and every card says which it is. A card leads to that project's homes in
   the matching listing. */
import { listProjects, listProperties } from "../api.js";
import { escapeHtml, formatMoney, icon, initReveal, photoPlaceholder, serviceBadges, skeletonCards } from "../ui.js";

export default async function projects() {
  const host = document.getElementById("project-grid");
  const tabs = [...document.querySelectorAll("#project-tabs [role=tab]")];
  const count = document.getElementById("project-count");
  if (!host) return;

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
    // Where the card leads: the service being viewed, else the project's own.
    const target = service || (project.services.includes("buy") ? "buy" : project.services[0] || "buy");
    const units = listed.filter((p) => p.project?.slug === project.slug && p.services.includes(target));
    const prices = units.map((p) => (target === "rent" ? p.price.rent?.amount : p.price.sale)).filter(Boolean).sort((a, b) => a - b);
    const photo = project.photos[0];
    return `<article class="pcard" id="${escapeHtml(project.slug)}" data-reveal>
      <div class="pcard-media">
        ${photo ? `<img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.alt || project.name)}" loading="lazy" decoding="async">` : photoPlaceholder("Project photo coming soon")}
        <div class="pcard-badges">${serviceBadges(project)}</div>
        ${project.sample ? '<span class="pcard-sample">Sample</span>' : ""}
      </div>
      <div class="pcard-body">
        <p class="pcard-type">Development${project.status ? ` · ${escapeHtml(project.status)}` : ""}</p>
        <h3 class="pcard-title"><a class="pcard-link" href="${target}.html?q=${encodeURIComponent(project.name)}">${escapeHtml(project.name)}</a></h3>
        <p class="pcard-loc">${icon("pin")}<span>${escapeHtml(project.location)}</span></p>
        <p class="pcard-summary">${escapeHtml(project.summary)}</p>
        <div class="pcard-foot">
          <p class="pcard-price">${units.length} ${units.length === 1 ? "home" : "homes"} to ${target}<small>${prices[0] ? `From ${escapeHtml(formatMoney(prices[0]))}` : "Enquire for availability"}</small></p>
          <span class="pcard-cta" aria-hidden="true">View homes ${icon("arrow")}</span>
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
    if (count) count.textContent = `${shown.length} ${shown.length === 1 ? "project" : "projects"}${service ? ` with homes to ${service}` : ""}`;
    history.replaceState(null, "", service ? `?service=${service}` : window.location.pathname);
    initReveal(host);
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => { service = tab.dataset.service; render(); }));
  render();
}
