/* Rent and Buy listings. The service comes from <body data-service="rent|buy">.
   Only properties the internal system reports as open for that service are
   shown; rented and sold properties drop out by themselves (api.isListed). */
import { listProperties } from "../api.js";
import { PROPERTY_TYPES } from "../data.js";
import { escapeHtml, initReveal, propertyCard } from "../ui.js";

export default async function listing() {
  const service = document.body.dataset.service === "rent" ? "rent" : "buy";
  const grid = document.getElementById("property-grid");
  const count = document.getElementById("result-count");
  const empty = document.getElementById("no-results");
  const search = document.getElementById("filter-search");
  const type = document.getElementById("filter-type");
  const beds = document.getElementById("filter-beds");
  const sort = document.getElementById("filter-sort");
  if (!grid) return;

  type.innerHTML = `<option value="">All types</option>${PROPERTY_TYPES.map((t) => `<option>${escapeHtml(t)}</option>`).join("")}`;
  const params = new URLSearchParams(window.location.search);
  if (params.get("q")) search.value = params.get("q");
  if (params.get("type")) type.value = params.get("type");

  grid.setAttribute("aria-busy", "true");
  count.textContent = "Loading properties…";
  let all = [];
  try {
    all = await listProperties({ service });
  } catch (error) {
    console.error(error);
    grid.removeAttribute("aria-busy");
    count.textContent = "";
    empty.hidden = false;
    empty.querySelector("h3").textContent = "Listings could not be loaded";
    empty.querySelector("p").textContent = "Please try again in a moment.";
    return;
  }
  grid.removeAttribute("aria-busy");

  const price = (p) => (service === "rent" ? p.price.rent?.amount : p.price.sale) || 0;

  function render() {
    const term = search.value.trim().toLowerCase();
    const minBeds = Number(beds.value || 0);
    let rows = all.filter((p) => {
      if (type.value && p.type !== type.value) return false;
      if (minBeds && p.bedrooms < minBeds) return false;
      if (!term) return true;
      return `${p.title} ${p.location} ${p.type} ${p.project?.name || ""}`.toLowerCase().includes(term);
    });
    if (sort.value === "price-asc") rows = [...rows].sort((a, b) => price(a) - price(b));
    else if (sort.value === "price-desc") rows = [...rows].sort((a, b) => price(b) - price(a));
    else rows = [...rows].sort((a, b) => Number(b.featured) - Number(a.featured));

    grid.innerHTML = rows.map((p) => propertyCard(p, { service })).join("");
    empty.hidden = rows.length > 0;
    count.textContent = rows.length === all.length
      ? `${all.length} ${all.length === 1 ? "property" : "properties"} available to ${service}`
      : `Showing ${rows.length} of ${all.length} properties available to ${service}`;
    initReveal(grid);
  }

  for (const control of [search, type, beds, sort]) {
    control.addEventListener("input", render);
    control.addEventListener("change", render);
  }
  document.getElementById("filters")?.addEventListener("submit", (event) => event.preventDefault());
  render();
}
