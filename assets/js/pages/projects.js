/* Projects, with how many homes in each are currently listed to rent or buy. */
import { listProjects, listProperties } from "../api.js";
import { escapeHtml, formatMoney, icon, initReveal, propertyArt } from "../ui.js";

export default async function projects() {
  const host = document.getElementById("project-grid");
  if (!host) return;
  let rows = [];
  let listed = [];
  try { [rows, listed] = await Promise.all([listProjects(), listProperties()]); }
  catch (error) {
    console.error(error);
    host.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Projects could not be loaded</h3><p>Please try again in a moment.</p></div>`;
    return;
  }
  host.innerHTML = rows.map((project) => {
    const units = listed.filter((p) => p.project?.slug === project.slug);
    const from = units.map((p) => p.price.sale).filter(Boolean).sort((a, b) => a - b)[0];
    return `<article class="pcard" id="${escapeHtml(project.slug)}" data-reveal>
      <div class="pcard-media">${propertyArt({ type: "apartment" })}<div class="pcard-badges"><span class="badge badge--status">${escapeHtml(project.status)}</span></div>
        ${project.sample ? '<span class="pcard-sample">Sample</span>' : ""}</div>
      <div class="pcard-body">
        <p class="pcard-type">Development</p>
        <h3 class="pcard-title"><a class="pcard-link" href="buy.html?q=${encodeURIComponent(project.name)}">${escapeHtml(project.name)}</a></h3>
        <p class="pcard-loc">${icon("pin")}<span>${escapeHtml(project.location)}</span></p>
        <p class="pcard-summary">${escapeHtml(project.summary)}</p>
        <div class="pcard-foot">
          <p class="pcard-price">${units.length} ${units.length === 1 ? "home" : "homes"} listed<small>${from ? `From ${escapeHtml(formatMoney(from))}` : "Enquire for availability"}</small></p>
          <span class="pcard-cta" aria-hidden="true">View homes ${icon("arrow")}</span>
        </div>
      </div>
    </article>`;
  }).join("");
  initReveal(host);
}
