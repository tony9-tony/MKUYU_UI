/* About: services and frequently asked questions. */
import { FAQS, SERVICES } from "../data.js";
import { escapeHtml, icon, initReveal } from "../ui.js";

export default function about() {
  const services = document.getElementById("service-grid");
  if (services) {
    services.innerHTML = SERVICES.map((s) => `
      <div class="feature" data-reveal><span class="feature-icon">${icon(s.icon)}</span>
        <div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.text)}</p></div></div>`).join("");
    initReveal(services);
  }
  const faq = document.getElementById("faq-grid");
  if (faq) {
    faq.innerHTML = FAQS.map((f) => `
      <div class="card" data-reveal><div class="card-body">
        <h3>${escapeHtml(f.q)}</h3>
        <p style="margin:0;font-size:.95rem;color:var(--ink-soft)">${escapeHtml(f.a)}</p>
      </div></div>`).join("");
    initReveal(faq);
  }
}
