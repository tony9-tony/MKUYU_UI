/* Home: the three services up front, then featured Rent / Buy listings. */
import { listProperties } from "../api.js";
import { SERVICES } from "../data.js";
import { escapeHtml, icon, initReveal, propertyCard } from "../ui.js";

export default async function home() {
  renderServices();
  const host = document.getElementById("home-featured");
  const tabs = document.querySelectorAll("#featured-tabs [role=tab]");
  const more = document.getElementById("featured-more");
  if (!host) return;

  const cache = {};
  async function show(service) {
    tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.service === service)));
    host.setAttribute("aria-busy", "true");
    try {
      cache[service] ??= await listProperties({ service });
      const rows = [...cache[service]].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 3);
      host.innerHTML = rows.length
        ? rows.map((property) => propertyCard(property, { service })).join("")
        : `<div class="empty" style="grid-column:1/-1"><h3>Nothing listed right now</h3><p>New properties are added by our sales team as they become available.</p></div>`;
      if (more) {
        more.href = `${service}.html`;
        more.innerHTML = `See all properties to ${service === "rent" ? "rent" : "buy"} ${icon("arrow")}`;
      }
      initReveal(host);
    } catch (error) {
      host.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Listings could not be loaded</h3><p>Please try again in a moment.</p></div>`;
      console.error(error);
    } finally {
      host.removeAttribute("aria-busy");
    }
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => show(tab.dataset.service)));
  await show("buy");
}

function renderServices() {
  const host = document.getElementById("service-grid");
  if (!host) return;
  host.innerHTML = SERVICES.map((service) => `
    <div class="feature" data-reveal>
      <span class="feature-icon">${icon(service.icon)}</span>
      <div><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.text)}</p></div>
    </div>`).join("");
  initReveal(host);
}
