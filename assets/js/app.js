/* ==========================================================================
   MKUYU AFRICA — public site entry point
   --------------------------------------------------------------------------
   Sets up the shared page chrome, then loads the module for the current page
   (named by <body data-page="...">). Pages stay readable without JavaScript:
   navigation is real links and every form is a real <form>.
   ========================================================================== */

import { CONNECTED } from "./api.js";
import { initChrome } from "./ui.js";

function previewBar() {
  if (CONNECTED || document.querySelector(".preview-bar")) return;
  const bar = document.createElement("div");
  bar.className = "preview-bar";
  bar.setAttribute("role", "note");
  bar.innerHTML = "<strong>Preview.</strong> Listings are sample records and nothing you submit is sent. Live data arrives once the site is connected to the MKUYU system.";
  document.body.prepend(bar);
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
