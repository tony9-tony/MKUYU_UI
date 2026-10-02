/* Rent and Buy listings. The service comes from <body data-service="rent|buy">.
   Every property offered for that service is shown with its state for it:
   open ones first, then those SOLD (Buy page) or RENTED (Rent page), marked
   with a badge and closed to requests (api.isListed / api.stateFor).
   Filters live in the URL, so a filtered view can be shared or bookmarked. */
import { canRequest, listProperties } from "../api.js";
import { PROPERTY_TYPES } from "../data.js";
import { escapeHtml, icon, initReveal, propertyCard, skeletonCards } from "../ui.js";

export default async function listing() {
  const service = document.body.dataset.service === "rent" ? "rent" : "buy";
  const grid = document.getElementById("property-grid");
  const count = document.getElementById("result-count");
  const empty = document.getElementById("no-results");
  const chips = document.getElementById("type-chips");
  const search = document.getElementById("filter-search");
  const beds = document.getElementById("filter-beds");
  const sort = document.getElementById("filter-sort");
  const reset = document.getElementById("filter-reset");
  if (!grid) return;

  const params = new URLSearchParams(window.location.search);
  let type = PROPERTY_TYPES.includes(params.get("type")) ? params.get("type") : "";
  search.value = params.get("q") || "";
  if (["1", "2", "3", "4"].includes(params.get("beds"))) beds.value = params.get("beds");
  if (["price-asc", "price-desc"].includes(params.get("sort"))) sort.value = params.get("sort");

  grid.setAttribute("aria-busy", "true");
  grid.innerHTML = skeletonCards(6);
  count.textContent = "Loading properties…";
  let all = [];
  try {
    all = await listProperties({ service });
  } catch (error) {
    console.error(error);
    grid.removeAttribute("aria-busy");
    grid.innerHTML = "";
    count.textContent = "";
    empty.hidden = false;
    empty.querySelector("h3").textContent = "Listings could not be loaded";
    empty.querySelector("p").textContent = "Please try again in a moment.";
    return;
  }
  grid.removeAttribute("aria-busy");

  const price = (p) => (service === "rent" ? p.price.rent?.amount : p.price.sale) || 0;

  function renderChips() {
    const counts = Object.fromEntries(PROPERTY_TYPES.map((t) => [t, all.filter((p) => p.type === t).length]));
    chips.innerHTML = [["", "All", all.length], ...PROPERTY_TYPES.map((t) => [t, t, counts[t]])]
      .map(([value, label, n]) => `<button type="button" class="chip" data-type="${escapeHtml(value)}" aria-pressed="${value === type}" ${n || !value ? "" : "disabled"}>${escapeHtml(label)}<span class="n">${n}</span></button>`)
      .join("");
  }

  function syncUrl() {
    const next = new URLSearchParams();
    if (search.value.trim()) next.set("q", search.value.trim());
    if (type) next.set("type", type);
    if (beds.value) next.set("beds", beds.value);
    if (sort.value !== "featured") next.set("sort", sort.value);
    const query = next.toString();
    history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }

  function render() {
    const term = search.value.trim().toLowerCase();
    const minBeds = Number(beds.value || 0);
    let rows = all.filter((p) => {
      if (type && p.type !== type) return false;
      if (minBeds && p.bedrooms < minBeds) return false;
      if (!term) return true;
      return `${p.title} ${p.location} ${p.type} ${p.project?.name || ""}`.toLowerCase().includes(term);
    });
    if (sort.value === "price-asc") rows = [...rows].sort((a, b) => price(a) - price(b));
    else if (sort.value === "price-desc") rows = [...rows].sort((a, b) => price(b) - price(a));
    else rows = [...rows].sort((a, b) => Number(b.featured) - Number(a.featured));

    grid.innerHTML = rows.map((p) => propertyCard(p, { service })).join("");
    empty.hidden = rows.length > 0;
    const filtered = rows.length !== all.length;
    reset.hidden = !filtered;
    // Sold / rented ones are listed too, so the count says how many are open.
    const openCount = (list) => list.filter((p) => canRequest(p, service)).length;
    const word = service === "rent" ? "rented" : "sold";
    const closedNote = (list) => { const closed = list.length - openCount(list); return closed ? ` · ${closed} ${word}` : ""; };
    count.textContent = filtered
      ? `Showing ${rows.length} of ${all.length} properties · ${openCount(rows)} available to ${service}${closedNote(rows)}`
      : `${openCount(all)} ${openCount(all) === 1 ? "property" : "properties"} available to ${service}${closedNote(all)}`;
    chips.querySelectorAll(".chip").forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.type === type)));
    syncUrl();
    initReveal(grid);
  }

  renderChips();
  chips.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip || chip.disabled) return;
    type = chip.dataset.type;
    render();
  });
  let debounce;
  search.addEventListener("input", () => { clearTimeout(debounce); debounce = setTimeout(render, 150); });
  for (const control of [beds, sort]) control.addEventListener("change", render);
  document.getElementById("filters")?.addEventListener("submit", (event) => { event.preventDefault(); render(); });
  const clearAll = () => { search.value = ""; beds.value = ""; sort.value = "featured"; type = ""; render(); search.focus(); };
  reset.addEventListener("click", clearAll);
  empty.querySelector("[data-clear]")?.addEventListener("click", clearAll);
  empty.querySelector(".icon-slot")?.insertAdjacentHTML("afterbegin", icon("search"));
  render();
}
