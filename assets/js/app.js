/* ==========================================================================
   MKUYU AFRICA — public site entry point
   --------------------------------------------------------------------------
   Sets up the shared page chrome, then loads the module for the current page
   (named by <body data-page="...">). Pages stay readable without JavaScript:
   navigation is real links and every form is a real <form>.
   ========================================================================== */

import { CONNECTED } from "./api.js";
import { icon, initChrome } from "./ui.js";

/* A small, dismissible note while the site runs on sample data. Dismissal is
   remembered for this browser tab only. */
function previewBar() {
  if (CONNECTED || document.querySelector(".preview-bar")) return;
  try { if (sessionStorage.getItem("mkuyu-preview-dismissed")) return; } catch { /* storage unavailable: show it */ }
  const bar = document.createElement("div");
  bar.className = "preview-bar";
  bar.setAttribute("role", "note");
  bar.innerHTML = `<span><strong>Preview.</strong> Listings and slides are samples, and nothing you submit is sent until the site is connected to the MKUYU system.</span>
    <button type="button" aria-label="Dismiss preview note">${icon("close")}</button>`;
  bar.querySelector("button").addEventListener("click", () => {
    bar.remove();
    try { sessionStorage.setItem("mkuyu-preview-dismissed", "1"); } catch { /* ignore */ }
  });
  // On Home the note would sit over the hero search, so it waits until the
  // visitor has scrolled past the showcase.
  if (document.body.dataset.header !== "overlay") { document.body.append(bar); return; }
  const reveal = () => {
    if (window.scrollY < window.innerHeight * 0.7) return;
    window.removeEventListener("scroll", reveal);
    document.body.append(bar);
  };
  window.addEventListener("scroll", reveal, { passive: true });
  reveal();
}

document.addEventListener("DOMContentLoaded", async () => {
  previewBar();
  initChrome();
  const page = document.body.dataset.page;
  if (!page) return;
  try {
    const module = await import(`./pages/${page}.js`);
    await module.default?.();
  } catch (error) {
    console.error(`[mkuyu] the "${page}" page failed to start`, error);
  }
});
