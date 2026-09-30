/* Home: rotating showcase, Rent / Buy / Sell search, featured listings. */
import { listProperties } from "../api.js";
import { SERVICES } from "../data.js";
import { SLIDES, SLIDE_INTERVAL_MS } from "../showcase.js";
import { escapeHtml, icon, initReveal, propertyCard, skeletonCards } from "../ui.js";

export default async function home() {
  initShowcase();
  initHeroSearch();
  renderServices();
  await initFeatured();
}

/* ==========================================================================
   Showcase
   ========================================================================== */

// Each placeholder slide gets its own tone and light, so no two look alike.
const PLACEHOLDER_LOOKS = [
  { x: "72%", y: "28%", bg: "#16130f", size: "min(70vmin, 640px)", right: "6%", top: "50%", rot: "0deg" },
  { x: "30%", y: "75%", bg: "#1d1712", size: "min(110vmin, 1000px)", right: "-18%", top: "38%", rot: "-8deg" },
  { x: "88%", y: "80%", bg: "#12100d", size: "min(48vmin, 440px)", right: "12%", top: "36%", rot: "6deg" },
  { x: "50%", y: "12%", bg: "#211b14", size: "min(90vmin, 820px)", right: "-6%", top: "64%", rot: "-3deg" },
];

function slideHTML(slide, index, total) {
  const look = PLACEHOLDER_LOOKS[index % PLACEHOLDER_LOOKS.length];
  const media = slide.layout === "feature" && slide.image
    ? `<div class="slide-media slide-media--feature"${slide.backdrop ? ` style="--backdrop:url('${escapeHtml(slide.backdrop)}')"` : ""}><figure class="slide-feature"><img src="${escapeHtml(slide.image)}" alt="${escapeHtml(slide.alt || slide.title)}" ${index === 0 ? 'fetchpriority="high"' : 'fetchpriority="low"'} decoding="async"></figure></div>`
    : slide.image
    ? `<div class="slide-media"><img src="${escapeHtml(slide.image)}"${slide.imageSmall ? ` srcset="${escapeHtml(slide.imageSmall)} 1280w, ${escapeHtml(slide.image)} 2400w" sizes="100vw"` : ""}${slide.focus ? ` style="object-position:${escapeHtml(slide.focus)}"` : ""} alt="${escapeHtml(slide.alt || slide.title)}" ${index === 0 ? 'fetchpriority="high"' : 'fetchpriority="low"'} decoding="async"></div>`
    : `<div class="slide-placeholder" style="--ph-x:${look.x};--ph-y:${look.y};--ph-bg:${look.bg};--ph-size:${look.size};--ph-right:${look.right};--ph-top:${look.top};--ph-rot:${look.rot}" role="img" aria-label="${escapeHtml(slide.kind)} photo to be supplied">
         <span class="slide-placeholder-label">${icon("camera")}${escapeHtml(slide.kind)} photo to be supplied</span>
       </div>`;
  return `<article class="slide${index === 0 ? " is-active" : ""}${slide.narrow ? " slide--narrow" : ""}" id="slide-${index}" role="group" aria-roledescription="slide" aria-label="${index + 1} of ${total}: ${escapeHtml(slide.title)}">
    ${media}
    ${slide.sample ? '<span class="slide-sample">Sample slide</span>' : ""}
    <div class="slide-content">
      <span class="eyebrow">${escapeHtml(slide.eyebrow)}</span>
      <h2 class="slide-title">${escapeHtml(slide.title)}</h2>
      <p class="slide-text">${escapeHtml(slide.description)}</p>
      ${slide.action ? `<div class="slide-actions"><a class="btn btn--accent" href="${escapeHtml(slide.action.href)}">${escapeHtml(slide.action.label)} ${icon("arrow")}</a></div>` : ""}
    </div>
  </article>`;
}

function initShowcase() {
  const root = document.getElementById("showcase");
  const stage = document.getElementById("showcase-stage");
  const ui = document.getElementById("showcase-ui");
  if (!root || !stage || !ui || !SLIDES.length) return;

  const total = SLIDES.length;
  stage.innerHTML = SLIDES.map((slide, i) => slideHTML(slide, i, total)).join("");
  root.style.setProperty("--slide-ms", `${SLIDE_INTERVAL_MS}ms`);
  const slides = [...stage.querySelectorAll(".slide")];

  if (total > 1) {
    ui.innerHTML = `
      <div class="showcase-dots" role="group" aria-label="Choose a slide">
        ${SLIDES.map((s, i) => `<button type="button" class="showcase-dot" data-go="${i}" aria-controls="slide-${i}" aria-label="Show slide ${i + 1}: ${escapeHtml(s.title)}"><span class="label">${escapeHtml(s.eyebrow)}</span><span class="bar"></span></button>`).join("")}
      </div>
      <span class="showcase-count" aria-hidden="true"><span data-current>01</span> / ${String(total).padStart(2, "0")}</span>
      <div class="showcase-arrows">
        <button type="button" class="icon-btn" data-pause aria-label="Pause slideshow">${icon("pause")}</button>
        <button type="button" class="icon-btn" data-step="-1" aria-label="Previous slide">${icon("prev")}</button>
        <button type="button" class="icon-btn" data-step="1" aria-label="Next slide">${icon("next")}</button>
      </div>`;
  }
  const dots = [...ui.querySelectorAll("[data-go]")];
  const pauseBtn = ui.querySelector("[data-pause]");
  const counter = ui.querySelector("[data-current]");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let active = 0;
  let timer = null;
  let started = 0;
  let remaining = SLIDE_INTERVAL_MS;
  let userPaused = reduceMotion;   // reduced motion: never rotate by itself
  const holds = new Set();          // hover / focus / hidden tab

  const isPaused = () => userPaused || holds.size > 0 || total < 2;

  function render() {
    slides.forEach((slide, i) => {
      const on = i === active;
      slide.classList.toggle("is-active", on);
      slide.toggleAttribute("inert", !on);
      slide.setAttribute("aria-hidden", String(!on));
    });
    dots.forEach((dot, i) => {
      dot.setAttribute("aria-current", String(i === active));
      // restart the progress bar on the new active dot
      const bar = dot.querySelector(".bar");
      bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = "";
    });
    if (counter) counter.textContent = String(active + 1).padStart(2, "0");
  }

  function schedule() {
    clearTimeout(timer);
    root.classList.toggle("is-paused", isPaused());
    stage.setAttribute("aria-live", isPaused() ? "polite" : "off");
    if (isPaused()) return;
    started = performance.now();
    timer = setTimeout(() => go(active + 1), remaining);
  }

  function go(index) {
    active = (index + total) % total;
    remaining = SLIDE_INTERVAL_MS;
    render();
    schedule();
  }

  function hold(reason, on) {
    const wasPaused = isPaused();
    if (on) holds.add(reason); else holds.delete(reason);
    if (!wasPaused && isPaused()) remaining = Math.max(0, remaining - (performance.now() - started));
    schedule();
  }

  function setUserPaused(value) {
    const wasPaused = isPaused();
    userPaused = value;
    if (!wasPaused && isPaused()) remaining = Math.max(0, remaining - (performance.now() - started));
    if (pauseBtn) {
      pauseBtn.innerHTML = icon(userPaused ? "play" : "pause");
      pauseBtn.setAttribute("aria-label", userPaused ? "Play slideshow" : "Pause slideshow");
    }
    schedule();
  }

  ui.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-go]");
    const step = event.target.closest("[data-step]");
    if (dot) go(Number(dot.dataset.go));
    else if (step) go(active + Number(step.dataset.step));
    else if (event.target.closest("[data-pause]")) setUserPaused(!userPaused);
  });

  root.addEventListener("keydown", (event) => {
    if (event.target.closest("input, select, textarea, .hero-search")) return;
    if (event.key === "ArrowRight") { event.preventDefault(); go(active + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); go(active - 1); }
  });

  // Swipe on touch screens.
  let startX = null;
  stage.addEventListener("pointerdown", (event) => { if (event.pointerType !== "mouse") startX = event.clientX; });
  stage.addEventListener("pointerup", (event) => {
    if (startX !== null && Math.abs(event.clientX - startX) > 50) go(active + (event.clientX < startX ? 1 : -1));
    startX = null;
  });

  // Never rotate while someone is reading, pointing or typing, or the tab is hidden.
  stage.addEventListener("mouseenter", () => hold("hover", true));
  stage.addEventListener("mouseleave", () => hold("hover", false));
  root.addEventListener("focusin", () => hold("focus", true));
  root.addEventListener("focusout", (event) => { if (!root.contains(event.relatedTarget)) hold("focus", false); });
  document.addEventListener("visibilitychange", () => hold("hidden", document.hidden));

  if (pauseBtn && reduceMotion) setUserPaused(true);
  render();
  schedule();
}

/* ==========================================================================
   Hero search: Rent / Buy take a search to the listing; Sell goes to the form.
   ========================================================================== */
function initHeroSearch() {
  const box = document.getElementById("hero-search");
  if (!box) return;
  const tabs = [...box.querySelectorAll("[role=tab]")];
  const form = box.querySelector("form");
  const sell = box.querySelector("[data-sell]");
  const choose = (service) => {
    tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.service === service)));
    form.hidden = service === "sell";
    sell.hidden = service !== "sell";
    if (service !== "sell") form.action = `${service}.html`;
  };
  tabs.forEach((tab) => tab.addEventListener("click", () => choose(tab.dataset.service)));
  box.querySelector("[role=tablist]").addEventListener("keydown", (event) => {
    if (!["ArrowRight", "ArrowLeft"].includes(event.key)) return;
    const i = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    const next = tabs[(i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    choose(next.dataset.service);
    next.focus();
  });
  choose("buy");
}

/* ==========================================================================
   Featured listings with a Buy / Rent switch
   ========================================================================== */
async function initFeatured() {
  const host = document.getElementById("home-featured");
  const tabs = document.querySelectorAll("#featured-tabs [role=tab]");
  const more = document.getElementById("featured-more");
  if (!host) return;

  const cache = {};
  async function show(service) {
    tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.service === service)));
    host.setAttribute("aria-busy", "true");
    if (!cache[service]) host.innerHTML = skeletonCards(3);
    try {
      cache[service] ??= await listProperties({ service });
      const rows = [...cache[service]].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 3);
      host.innerHTML = rows.length
        ? rows.map((property) => propertyCard(property, { service })).join("")
        : `<div class="empty" style="grid-column:1/-1">${icon("home")}<h3>Nothing listed right now</h3><p>New properties are added by our sales team as they become available.</p></div>`;
      if (more) {
        more.href = `${service}.html`;
        more.innerHTML = `All properties to ${service === "rent" ? "rent" : "buy"} ${icon("arrow")}`;
      }
      initReveal(host);
    } catch (error) {
      host.innerHTML = `<div class="empty" style="grid-column:1/-1">${icon("info")}<h3>Listings could not be loaded</h3><p>Please try again in a moment.</p></div>`;
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
