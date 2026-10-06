/* The Customer Portal: ONE account, ONE portal. It shows a section for each
   service the customer actually uses (Rent, Buy, Sell) and nothing else, so a
   customer who rents and sells sees both in the same place.

   Every stage, amount and document comes from the internal system; the portal
   only presents it. Where a business rule is still undecided, the data says
   so (see DEMO_PORTALS in data.js) instead of the portal inventing detail. */
import { ACCOUNTS_LIVE, DEMO_PORTAL_KEYS, canRequest, currentCustomer, getAgreement, signAgreement, customerFileUrl, demoPortal, getPortal, getMessages, getPortalRequests, getVerification, sendMessage, listProperties, logOut, requestCode, resetPassword, submitPortalRequest, uploadVerificationDocument } from "../api.js";
import { escapeHtml, formatMoney, icon, initReveal, photoPlaceholder } from "../ui.js";

const SECTIONS = {
  rent: { label: "Renting", icon: "key", start: "Rent a home", startText: "Browse homes available to rent.", href: "rent.html" },
  buy: { label: "Buying", icon: "home", start: "Buy a property", startText: "Browse homes and land for sale.", href: "buy.html" },
  sell: { label: "Selling", icon: "handshake", start: "Sell your property", startText: "Submit a property for MKUYU to sell.", href: "sell.html" },
};

export default async function portal() {
  const host = document.getElementById("portal-host");
  if (!host) return;
  const params = new URLSearchParams(window.location.search);
  const demoKey = params.get("demo");

  let data = null;
  if (demoKey && demoPortal(demoKey)) {
    data = demoPortal(demoKey);
  } else if (ACCOUNTS_LIVE) {
    const customer = await currentCustomer().catch(() => null);
    if (!customer) { window.location.replace("login.html?next=portal.html"); return; }
    try { data = await getPortal(); }
    catch (error) {
      console.error(error);
      host.innerHTML = `<div class="empty"><h3>Your portal could not be loaded</h3><p>Please refresh the page in a moment.</p></div>`;
      return;
    }
  } else {
    host.innerHTML = `<div class="panel text-center">
      <span class="feature-icon" style="margin:0 auto .8rem">${icon("user")}</span>
      <h1 style="font-size:1.9rem">Your MKUYU portal</h1>
      <p class="lede" style="margin-inline:auto">Customer accounts are still being set up. Until they open, see how the portal adapts to each customer:</p>
      <div class="cta-actions">${DEMO_PORTAL_KEYS.map((key) => `<a class="btn btn--soft" href="?demo=${key}">${escapeHtml(demoPortal(key).label)}</a>`).join("")}</div>
    </div>`;
    return;
  }

  render(host, data, demoKey);
}

/* Everything a customer does happens on this one page. Sections are kept in
   the address (#overview, #buy, #browse…) so the browser's Back button moves
   between sections instead of leaving the portal. */
const PANEL_SECTIONS = ["browse", "requests", "messages", "verify", "account"];

let currentVerification = { verified: true, nationality_confirmed: true };
/** The tick shown next to a verified customer's name. */
const SEAL_PATH = "M23.30 12.00 L23.19 12.59 L22.88 13.14 L22.41 13.65 L21.86 14.10 L21.32 14.50 L20.85 14.88 L20.52 15.27 L20.34 15.71 L20.30 16.23 L20.36 16.82 L20.46 17.49 L20.53 18.20 L20.50 18.88 L20.33 19.50 L19.99 19.99 L19.50 20.33 L18.88 20.50 L18.20 20.53 L17.49 20.46 L16.83 20.36 L16.23 20.30 L15.71 20.34 L15.27 20.52 L14.88 20.85 L14.50 21.32 L14.10 21.86 L13.65 22.41 L13.14 22.88 L12.59 23.19 L12.00 23.30 L11.41 23.19 L10.86 22.88 L10.35 22.41 L9.90 21.86 L9.50 21.32 L9.12 20.85 L8.73 20.52 L8.29 20.34 L7.77 20.30 L7.18 20.36 L6.51 20.46 L5.80 20.53 L5.12 20.50 L4.50 20.33 L4.01 19.99 L3.67 19.50 L3.50 18.88 L3.47 18.20 L3.54 17.49 L3.64 16.82 L3.70 16.23 L3.66 15.71 L3.48 15.27 L3.15 14.88 L2.68 14.50 L2.14 14.10 L1.59 13.65 L1.12 13.14 L0.81 12.59 L0.70 12.00 L0.81 11.41 L1.12 10.86 L1.59 10.35 L2.14 9.90 L2.68 9.50 L3.15 9.12 L3.48 8.73 L3.66 8.29 L3.70 7.77 L3.64 7.17 L3.54 6.51 L3.47 5.80 L3.50 5.12 L3.67 4.50 L4.01 4.01 L4.50 3.67 L5.12 3.50 L5.80 3.47 L6.51 3.54 L7.17 3.64 L7.77 3.70 L8.29 3.66 L8.73 3.48 L9.12 3.15 L9.50 2.68 L9.90 2.14 L10.35 1.59 L10.86 1.12 L11.41 0.81 L12.00 0.70 L12.59 0.81 L13.14 1.12 L13.65 1.59 L14.10 2.14 L14.50 2.68 L14.88 3.15 L15.27 3.48 L15.71 3.66 L16.23 3.70 L16.83 3.64 L17.49 3.54 L18.20 3.47 L18.88 3.50 L19.50 3.67 L19.99 4.01 L20.33 4.50 L20.50 5.12 L20.53 5.80 L20.46 6.51 L20.36 7.17 L20.30 7.77 L20.34 8.29 L20.52 8.73 L20.85 9.12 L21.32 9.50 L21.86 9.90 L22.41 10.35 L22.88 10.86 L23.19 11.41Z";
/** The green verified seal, like the tick next to a verified account name. */
const verifiedTick = (v, { label = true } = {}) => v?.verified
  ? `<span class="verified-badge" role="img" aria-label="Verified" title="Identity verified by MKUYU"><svg class="verified-seal" viewBox="0 0 24 24" aria-hidden="true"><path d="${SEAL_PATH}" fill="currentColor"/><path d="M7.4 12.4l3.1 3.1 6.1-6.5" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>${label ? `<span class="verified-text">Verified</span>` : ""}</span>`
  : "";

function render(host, data, demoKey) {
  currentVerification = data.verification || { verified: true, nationality_confirmed: true };
  const services = Object.keys(SECTIONS).filter((key) => (data.services?.[key] || []).length);
  const needsVerify = data.verification && !data.verification.verified;
  const groups = [
    { label: "My MKUYU", tabs: [{ key: "overview", label: "Overview", icon: "grid" },
      ...services.map((key) => ({ key, label: SECTIONS[key].label, icon: SECTIONS[key].icon, count: data.services[key].length }))] },
    { label: "Find a property", tabs: [{ key: "browse", label: "Browse & request", icon: "search" },
      { key: "requests", label: "My requests", icon: "file", count: data.requests_open || 0 }] },
    { label: "Account", tabs: [{ key: "messages", label: "Messages", icon: "chat", count: data.messages_unread || 0 },
      ...(needsVerify ? [{ key: "verify", label: "Verify my identity", icon: "shield", alert: true }] : []),
      { key: "account", label: "My account", icon: "user" }] },
  ];
  const tabs = groups.flatMap((g) => g.tabs);
  const keys = tabs.map((t) => t.key);
  const name = data.customer?.name || "My MKUYU";

  fillHeader(data, demoKey);
  host.innerHTML = `
    ${demoKey ? `<div class="demo-switch" role="note">${icon("info")}<span><strong>Sample portal.</strong> Invented customer, for review only. See another:</span>
      ${DEMO_PORTAL_KEYS.map((key) => `<a class="btn btn--small ${key === demoKey ? "btn--primary" : "btn--soft"}" href="?demo=${key}" ${key === demoKey ? 'aria-current="page"' : ""}>${escapeHtml(demoPortal(key).label)}</a>`).join("")}</div>` : ""}
    <div class="portal">
      <aside class="portal-side">
        <nav class="portal-nav" aria-label="Portal sections">
          <div class="portal-brand"><span class="avatar" aria-hidden="true">${escapeHtml(initials(name))}</span><div><strong>${escapeHtml(name)}${verifiedTick(data.verification || { verified: true }, { label: false })}</strong><span>${data.diaspora ? "Diaspora customer" : "Customer"}${data.customer?.country ? ` · ${escapeHtml(data.customer.country)}` : ""}</span></div></div>
          ${groups.filter((g) => g.tabs.length).map((g) => `<div class="portal-nav-group"><span class="portal-nav-label">${escapeHtml(g.label)}</span>
            ${g.tabs.map((tab) => `<a href="#${tab.key}" id="tab-${tab.key}" data-tab="${tab.key}" class="${tab.alert ? "is-alert" : ""}">
              ${icon(tab.icon)}<span>${escapeHtml(tab.label)}</span>${tab.count ? `<span class="count">${tab.count}</span>` : tab.alert ? `<span class="dot" aria-label="Action needed"></span>` : ""}</a>`).join("")}</div>`).join("")}
        </nav>
        ${deskCard(data)}
      </aside>
      <div id="panel" class="portal-panel" tabindex="-1" aria-live="polite"></div>
    </div>
    <nav class="portal-tabbar" aria-label="Portal sections">
      ${tabs.map((tab) => `<a href="#${tab.key}" data-tab="${tab.key}">${icon(tab.icon)}<span>${escapeHtml(shortLabel(tab))}</span>${tab.alert ? '<span class="dot" aria-hidden="true"></span>' : ""}</a>`).join("")}
    </nav>`;

  const panel = host.querySelector("#panel");
  const show = (key, { scroll = true } = {}) => {
    if (!keys.includes(key)) key = "overview";
    host.querySelectorAll("[data-tab]").forEach((a) => {
      const on = a.dataset.tab === key;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    panel.setAttribute("aria-labelledby", `tab-${key}`);
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
    const wire = () => {
      panel.querySelectorAll("[data-goto]").forEach((a) => a.addEventListener("click", (event) => { event.preventDefault(); browsePreset = a.dataset.service || ""; go(a.dataset.goto); }));
      panel.querySelectorAll("[data-sign]").forEach((button) => button.addEventListener("click", () => openAgreement(button.closest("[data-signing]"), button.dataset.sign, () => show(key))));
    };
    if (PANEL_SECTIONS.includes(key)) {
      panel.innerHTML = `<div class="portal-loading" role="status"><span class="spinner" aria-hidden="true"></span>Loading…</div>`;
      const loaders = { browse: () => browse(panel, demoKey, go, data), verify: () => verifyPanel(panel, go), requests: () => myRequests(panel, demoKey), messages: () => messagesPanel(panel, data, demoKey), account: () => accountPanel(panel, data, demoKey, go) };
      loaders[key]().then(wire).catch((error) => {
        panel.innerHTML = `<div class="empty"><h3>This could not be loaded</h3><p>${escapeHtml(error.message || "Please try again in a moment.")}</p><p><button type="button" class="btn btn--soft btn--small" data-retry>Try again</button></p></div>`;
        panel.querySelector("[data-retry]").addEventListener("click", () => show(key));
      });
      return;
    }
    panel.innerHTML = key === "overview" ? overview(data, services) : sectionHead(key) + data.services[key].map((item) => caseCard(key, item)).join("");
    panel.style.animation = "none"; void panel.offsetWidth; panel.style.animation = "";
    initReveal(panel);
    wire();
  };
  // Moving to a section changes the address, so Back returns to the previous section.
  const go = (key) => {
    if (`#${key}` === window.location.hash) show(key);
    else window.location.hash = key;
  };
  window.addEventListener("hashchange", () => show(window.location.hash.slice(1)));
  // portal.html?tab=sell (old links) still opens that section.
  const wanted = window.location.hash.slice(1) || new URLSearchParams(window.location.search).get("tab");
  show(keys.includes(wanted) ? wanted : "overview", { scroll: false });
}

/** The portal's own header: who is signed in and how to sign out. No links out. */
function fillHeader(data, demoKey) {
  const slot = document.querySelector("[data-portal-user]");
  if (!slot) return;
  const name = data.customer?.name || "";
  slot.innerHTML = `${name ? `<span class="portal-user"><span class="avatar avatar--small" aria-hidden="true">${escapeHtml(initials(name))}</span><span class="portal-user-name">${escapeHtml(name)}</span>${verifiedTick(data.verification || { verified: true }, { label: false })}</span>` : ""}
    ${ACCOUNTS_LIVE && !demoKey ? `<button type="button" class="btn btn--soft btn--small" data-logout>${icon("lock")}<span>Log out</span></button>` : ""}`;
  slot.querySelector("[data-logout]")?.addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    await logOut();
    window.location.assign("login.html");
  });
}

const initials = (name) => String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "M";
const shortLabel = (tab) => ({ browse: "Browse", requests: "Requests", messages: "Messages", verify: "Verify", account: "Account" }[tab.key] || tab.label);

/** Who to talk to. Always beside the content, so help is never more than a glance away. */
function deskCard(data) {
  const c = data.contact || {};
  const wa = c.whatsapp ? `https://wa.me/${String(c.whatsapp).replace(/\D/g, "")}` : null;
  const desk = data.desk?.name;
  return `<section class="desk-card" aria-label="Your Diaspora Desk">
    <h3>Your Diaspora Desk</h3>
    <p>${desk ? `<strong>${escapeHtml(desk)}</strong> is your contact. The whole desk can help.` : "A Diaspora Desk officer looks after you."}</p>
    ${c.email || wa ? `<ul>
      ${c.email ? `<li>${icon("file")}<a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a></li>` : ""}
      ${wa ? `<li>${icon("handshake")}<a href="${escapeHtml(wa)}" target="_blank" rel="noopener">WhatsApp ${escapeHtml(c.whatsapp)}</a></li>` : ""}
    </ul>` : ""}
    <p class="desk-time">${icon("clock")}<span>East Africa Time (UTC+3)</span></p>
    <p class="desk-warn">${icon("shield")}<span>MKUYU never asks you to pay a person. Pay only to the account shown in your portal.</span></p>
  </section>`;
}

/* Each service section opens with its heading and the way to start another. */
function sectionHead(key) {
  const more = {
    rent: { title: "Renting", text: "Your rentals with MKUYU.", label: "Find another home to rent", service: "rent" },
    buy: { title: "Buying", text: "Your purchases with MKUYU.", label: "Browse more properties", service: "buy" },
    sell: { title: "Selling", text: "Properties MKUYU is selling for you.", label: null },
  }[key];
  return `<div class="panel-head">
    <div><span class="eyebrow">My MKUYU</span><h1>${escapeHtml(more.title)}</h1><p class="lede">${escapeHtml(more.text)}</p></div>
    ${more.label ? `<a class="btn btn--outline btn--small" href="#browse" data-goto="browse" data-service="${more.service}">${escapeHtml(more.label)} ${icon("arrow")}</a>` : ""}
  </div>`;
}

/* ---------------- Overview ---------------- */

function overview(data, services) {
  const cases = services.flatMap((key) => data.services[key].map((item) => ({ key, item })));
  const money = cases.filter(({ item }) => item.payments);
  const firstName = String(data.customer?.name || "").split(" ")[0];
  const unused = Object.keys(SECTIONS).filter((key) => !services.includes(key) && key !== "sell");
  const lede = cases.length
    ? `You are ${services.map((key) => SECTIONS[key].label.toLowerCase()).join(" and ")} with MKUYU. Everything here updates as our team moves your case forward.`
    : "Here is where you are, and what comes next.";
  return `
    <div class="panel-head panel-head--greeting">
      <div><span class="eyebrow">My MKUYU${data.customer?.country ? ` · ${escapeHtml(data.customer.country)}` : ""}</span>
      <h1>${cases.length ? "Welcome back" : "Welcome"}${firstName ? `, ${escapeHtml(firstName)}` : ""}</h1>
      <p class="lede">${escapeHtml(lede)}</p>
      ${data.verification?.verified ? `<p class="verified-line">${verifiedTick(data.verification)}<span>Your identity is verified. You can request any property.</span></p>` : ""}</div>
    </div>
    ${nextStep(data, cases)}

    ${money.length ? `<div class="stat-row">${money.map(({ item }) => {
      const p = item.payments;
      const pct = p.total ? Math.min(100, Math.round((p.paid / p.total) * 100)) : 0;
      return `<div class="stat"><span>${escapeHtml(item.property.title)}</span><strong>${escapeHtml(formatMoney(p.balance, p.currency, { exact: true }))}</strong><small>Balance remaining · ${pct}% paid</small>
          <div class="progress progress--thin" aria-hidden="true"><span style="width:${pct}%"></span></div></div>
        ${p.next_due ? `<div class="stat"><span>Next payment</span><strong>${escapeHtml(formatMoney(p.next_due.amount, p.currency, { exact: true }))}</strong><small>Due ${escapeHtml(p.next_due.date)}</small></div>` : ""}`;
    }).join("")}</div>` : ""}

    ${data.diaspora ? diasporaJourney(data, cases) : ""}

    ${cases.length ? `<section><h2 class="panel-subhead">Your properties</h2><div class="case-links">${cases.map(({ key, item }) => {
      const photo = customerFileUrl(item.property.photo?.url) || item.property.photo?.url;
      return `<a class="case-link" href="#${key}" data-goto="${key}" data-reveal>
        <span class="case-link-art">${photo ? `<img src="${escapeHtml(photo)}" alt="" loading="lazy">` : icon(SECTIONS[key].icon)}</span>
        <span class="case-link-text"><strong>${escapeHtml(item.property.title)}</strong><span>${escapeHtml(SECTIONS[key].label)} · ${escapeHtml(item.status)}</span></span>
        ${icon("arrow")}
      </a>`;
    }).join("")}</div></section>` : ""}

    ${unused.length ? `<section><h2 class="panel-subhead">${cases.length ? "Looking for something else?" : "Start here"}</h2>
      <div class="start-grid">${unused.map((key) => `<a class="start-tile" href="#browse" data-goto="browse" data-service="${key}" data-reveal>
        <span class="feature-icon">${icon(SECTIONS[key].icon)}</span><strong>${escapeHtml(SECTIONS[key].start)}</strong><span>${escapeHtml(SECTIONS[key].startText)}</span></a>`).join("")}
      </div></section>` : ""}`;
}

/** The ONE thing the customer should do now, said plainly, with one button. */
function nextStep(data, cases) {
  const v = data.verification || { verified: true };
  const toSign = cases.find(({ item }) => item.signing?.required);
  const due = cases.filter(({ item }) => item.payments?.next_due).map(({ key, item }) => ({ key, item, overdue: (item.payments.installments || []).some((r) => r.status === "overdue") }));
  let step;
  if (!v.verified && ["unverified", "rejected"].includes(v.status)) {
    step = { tone: v.status === "rejected" ? "alert" : "action", icon: "shield", title: v.status === "rejected" ? "Please upload your documents again" : "Verify your identity",
      text: `${v.message || ""}${v.note ? ` Note from MKUYU: ${v.note}` : ""}`, go: "verify", cta: "Upload documents" };
  } else if (toSign) {
    step = { tone: "action", icon: "file", title: "Your agreement is ready to sign", text: `${toSign.item.property.title}: read every clause, then sign electronically. Nothing is final until you sign.`, go: toSign.key, cta: "Read and sign" };
  } else if (due.some((d) => d.overdue)) {
    const d = due.find((x) => x.overdue);
    step = { tone: "alert", icon: "card", title: "A payment is overdue", text: `${d.item.property.title}: ${formatMoney(d.item.payments.next_due.amount, d.item.payments.currency, { exact: true })}. Please pay to MKUYU's official account, or talk to your Diaspora Desk.`, go: d.key, cta: "See payments" };
  } else if (due.length) {
    const d = due[0];
    step = { tone: "calm", icon: "card", title: `Next payment due ${d.item.payments.next_due.date}`, text: `${d.item.property.title}: ${formatMoney(d.item.payments.next_due.amount, d.item.payments.currency, { exact: true })}. Your receipt appears here once Finance confirms it.`, go: d.key, cta: "See payments" };
  } else if (!v.verified) {
    step = { tone: "calm", icon: "clock", title: "We are checking your documents", text: `${v.message || ""} Requests open as soon as you are verified; meanwhile you can look at every property.`, go: "browse", cta: "Look at properties" };
  } else if (!cases.length && !data.requests_open) {
    step = { tone: "action", icon: "search", title: "Choose your property", text: "Browse what MKUYU has available and press Request. We already have your details.", go: "browse", cta: "Browse properties" };
  } else if (!cases.length) {
    step = { tone: "calm", icon: "clock", title: "The Diaspora Desk has your request", text: "Our team will contact you, usually within one working day. You can follow it under My requests.", go: "requests", cta: "My requests" };
  } else {
    step = { tone: "calm", icon: "check", title: "You are all up to date", text: "Nothing needs your attention right now. We will show the next step here.", go: null };
  }
  return `<section class="next-step next-step--${step.tone}" aria-label="What to do next">
    <span class="next-step-icon">${icon(step.icon)}</span>
    <div><span class="next-step-kicker">${step.tone === "calm" ? "Where you are" : "Next step"}</span><h2>${escapeHtml(step.title)}</h2>${step.text.trim() ? `<p>${escapeHtml(step.text.trim())}</p>` : ""}</div>
    ${step.go ? `<a class="btn ${step.tone === "calm" ? "btn--soft" : "btn--primary"}" href="#${step.go}" data-goto="${step.go}">${escapeHtml(step.cta)} ${icon("arrow")}</a>` : ""}
  </section>`;
}

/* ---------------- The diaspora agreement: read and sign ---------------- */
function signingBlock(signing) {
  if (!signing) return "";
  if (signing.signed_at) return `<section data-signing><p class="notice">${icon("check")}<span><strong>You signed this agreement electronically on ${escapeHtml(signing.signed_at)}</strong> as ${escapeHtml(signing.signed_name || "")}. <a href="#" data-sign="${escapeHtml(String(signing.contract_id))}">Read it again</a></span></p><div data-agreement></div></section>`;
  if (signing.required && currentVerification.nationality_confirmed === false) return `<section data-signing><p class="notice">${icon("clock")}<span><strong>Your agreement is almost ready to sign.</strong> MKUYU's Legal team is confirming your nationality first, which decides the form of ownership in the agreement. We will e-mail you as soon as you can sign.</span></p></section>`;
  if (!signing.required) return `<section data-signing><p><button type="button" class="btn btn--soft btn--small" data-sign="${escapeHtml(String(signing.contract_id))}">Read the agreement</button></p><div data-agreement></div></section>`;
  return `<section data-signing class="sign-call"><h3>Your agreement is ready to sign</h3>
    <p>MKUYU's Legal team and management have approved it. Read every clause, then sign here. Nothing is final until you sign.</p>
    <button type="button" class="btn btn--primary" data-sign="${escapeHtml(String(signing.contract_id))}">Read and sign the agreement</button>
    <div data-agreement></div></section>`;
}

/** The agreement text (# title, ## clause, - item, > note) as safe HTML. */
function agreementHtml(text) {
  const out = [];
  let list = false;
  const close = () => { if (list) { out.push("</ul>"); list = false; } };
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { close(); continue; }
    if (line.startsWith("## ")) { close(); out.push(`<h4>${escapeHtml(line.slice(3))}</h4>`); }
    else if (line.startsWith("# ")) { close(); out.push(`<h3 class="agreement-title">${escapeHtml(line.slice(2))}</h3>`); }
    else if (line.startsWith("- ")) { if (!list) { out.push("<ul>"); list = true; } out.push(`<li>${escapeHtml(line.slice(2))}</li>`); }
    else if (line.startsWith("> ")) { close(); out.push(`<p class="agreement-note">${escapeHtml(line.slice(2))}</p>`); }
    else { close(); out.push(`<p>${escapeHtml(line)}</p>`); }
  }
  close();
  return out.join("");
}

async function openAgreement(section, contractId, refresh) {
  const host = section?.querySelector("[data-agreement]");
  if (!host) return;
  host.innerHTML = `<p class="card-meta">Loading the agreement…</p>`;
  try {
    const a = await getAgreement(contractId);
    host.innerHTML = `<div class="agreement-box" tabindex="0">${agreementHtml(a.text)}</div>
      <p class="field-hint">Document fingerprint (SHA-256): <code>${escapeHtml(a.fingerprint)}</code> · <a href="#" data-print>Print or save as PDF</a></p>
      ${a.can_sign ? `<form class="panel listing-form" data-sign-form novalidate>
        <h3>Sign electronically</h3>
        ${Object.entries(a.confirmations).map(([key, label]) => `<label class="sign-check"><input type="checkbox" name="${key}"> <span>${escapeHtml(label)}</span></label>`).join("")}
        <div class="field"><label>Type your full name<input name="full_name" autocomplete="name" required></label></div>
        <div class="field"><label>Your password<input name="password" type="password" autocomplete="current-password" required></label></div>
        <button class="btn btn--primary" type="submit" disabled>Sign the agreement</button>
        <p class="field-hint">Signing records the date, time, your internet address and the fingerprint above. You will receive a confirmation e-mail.</p>
        <div data-result hidden role="status" aria-live="polite"></div>
      </form>` : ""}`;
    host.querySelector("[data-print]").addEventListener("click", (event) => {
      event.preventDefault();
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<!doctype html><title>${escapeHtml(a.title)} ${escapeHtml(a.contract_number)}</title><style>body{font:14px/1.55 Georgia,serif;max-width:760px;margin:2rem auto;padding:0 1rem}h3{text-align:center}h4{margin:1.4rem 0 .4rem}.agreement-note{font-style:italic;color:#555}</style>${agreementHtml(a.text)}<p style="font-size:11px;color:#666">Fingerprint (SHA-256): ${escapeHtml(a.fingerprint)}</p>`);
      w.document.close(); w.focus(); w.print();
    });
    const form = host.querySelector("[data-sign-form]");
    if (!form) return;
    const box = host.querySelector(".agreement-box");
    const button = form.querySelector("button[type=submit]");
    let readToEnd = false;
    const update = () => { button.disabled = !(readToEnd && [...form.querySelectorAll(".sign-check input")].every((c) => c.checked)); };
    // The button opens only after the whole text has been scrolled through.
    box.addEventListener("scroll", () => { if (box.scrollTop + box.clientHeight >= box.scrollHeight - 24) { readToEnd = true; update(); } });
    if (box.scrollHeight <= box.clientHeight + 24) readToEnd = true;
    form.addEventListener("change", update);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const out = form.querySelector("[data-result]");
      button.disabled = true;
      const confirmations = Object.fromEntries([...form.querySelectorAll(".sign-check input")].map((c) => [c.name, c.checked]));
      try {
        await signAgreement(contractId, { fullName: form.full_name.value, password: form.password.value, confirmations, fingerprint: a.fingerprint });
        refresh();
      } catch (error) {
        out.hidden = false;
        out.innerHTML = `<p class="notice">${icon("info")}<span>${escapeHtml(error.message || "The agreement could not be signed.")}</span></p>`;
        update();
      }
    });
    update();
  } catch (error) {
    host.innerHTML = `<p class="notice">${icon("info")}<span>${escapeHtml(error.message || "The agreement could not be loaded.")}</span></p>`;
  }
}

/* ---------------- The diaspora journey (overview) ---------------- */
function diasporaJourney(data, cases) {
  const v = data.verification || { status: "verified", verified: true };
  const signing = cases.map(({ item }) => item.signing).filter(Boolean);
  const signed = signing.some((s) => s.signed_at);
  const toSign = signing.some((s) => s.required);
  const active = cases.some(({ item }) => item.payments);
  const chose = data.requests_open > 0 || cases.length > 0;
  const steps = [
    { label: "Create your account", state: "done" },
    { label: "Verify your identity", note: v.verified ? "Verified" : v.message, state: v.verified ? "done" : "current", go: v.verified ? null : "verify", cta: "Upload documents" },
    { label: "Choose a property", note: chose ? `${data.requests_open || 0} request${data.requests_open === 1 ? "" : "s"} with the Desk` : v.verified ? "Browse and press Request; the Desk contacts you" : "Opens once your identity is verified", state: chose ? "done" : v.verified ? "current" : "open", go: "browse", cta: chose ? "Browse more" : "Browse properties" },
    { label: "Read and sign your agreement", note: signed ? "Signed" : toSign ? "Your agreement is ready to sign" : "The Desk prepares it once you have chosen", state: signed ? "done" : toSign ? "current" : "upcoming", go: toSign ? cases.find(({ item }) => item.signing?.required)?.key : null, cta: "Read and sign" },
    { label: "Pay and follow construction", note: active ? "Payments, receipts and photos are in your purchase" : "Pay only to MKUYU's official account shown here", state: active ? "current" : "upcoming", go: active ? cases.find(({ item }) => item.payments)?.key : null, cta: "Open" },
  ];
  return `<section class="journey-steps">
      <h2 class="panel-subhead">Your steps</h2>
      <ol>${steps.map((s, i) => `<li class="js-${s.state}">
        <span class="js-dot">${s.state === "done" ? icon("check") : i + 1}</span>
        <div><strong>${escapeHtml(s.label)}</strong>${s.note ? `<small>${escapeHtml(s.note)}</small>` : ""}</div>
        ${s.go && s.state !== "done" || (s.go === "browse") ? `<a href="#${s.go}" class="btn btn--small ${s.state === "current" ? "btn--primary" : "btn--soft"}" data-goto="${s.go}">${escapeHtml(s.cta)}</a>` : ""}
      </li>`).join("")}</ol>
    </section>`;
}

/* ---------------- Identity verification (self sign-ups) ---------------- */
async function verifyPanel(panel, show, { uploaded = null } = {}) {
  const v = await getVerification();
  const kinds = v.kinds || {};
  const have = (kind) => (v.documents || []).some((d) => d.kind === kind);
  const expiryOf = (kind) => (v.documents || []).find((d) => d.kind === kind)?.expires_on || "";
  const canUpload = ["unverified", "rejected", "submitted"].includes(v.status);
  panel.innerHTML = `
    <div class="portal-greeting"><span class="eyebrow">Verify my identity</span><h1>${v.verified ? "You are verified" : "Prove who you are, once"}</h1>${verifiedTick(v)}
      <p class="lede" style="margin:0">${escapeHtml(v.message || "")}</p></div>
    ${v.note ? `<p class="notice">${icon("info")}<span><strong>Note from MKUYU:</strong> ${escapeHtml(v.note)}</span></p>` : ""}
    <ol class="timeline">
      ${[["Upload passport and proof of residence", ["submitted", "desk_checked", "verified"].includes(v.status) ? "done" : "current"],
         ["The Diaspora Desk verifies you", ["submitted", "desk_checked"].includes(v.status) ? "current" : v.status === "verified" ? "done" : "upcoming"],
         ["Verified badge: you can request any property", v.status === "verified" ? "done" : "upcoming"],
         ["Legal confirms your nationality, before you sign an agreement", v.status === "verified" ? (v.nationality_confirmed === false ? "current" : "done") : "upcoming"]]
        .map(([label, state]) => `<li class="tl-${state}"><span class="tl-dot">${state === "done" ? icon("check") : ""}</span><strong>${escapeHtml(label)}</strong></li>`).join("")}
    </ol>
    <section style="margin-top:1.4rem"><h3>Your documents</h3>
      <ul class="doc-list">${["passport", "residence"].map((kind) => `<li>${icon(have(kind) ? "check" : "file")}<span>${escapeHtml(kinds[kind] || kind)}</span><small>${have(kind) ? `Uploaded${expiryOf(kind) ? ` · expires ${escapeHtml(expiryOf(kind))}` : ""}` : "Needed"}</small></li>`).join("")}
        ${(v.documents || []).filter((d) => d.kind === "other").map((d) => `<li>${icon("file")}<span>${escapeHtml(d.name)}</span><small>Other</small></li>`).join("")}</ul>
    </section>
    ${uploaded ? `<p class="notice notice--ok" data-uploaded tabindex="-1" style="margin-top:1rem">${icon("check")}<span><strong>${escapeHtml(uploaded)} uploaded.</strong> ${have("passport") && have("residence") ? "All documents are in: our Diaspora Desk will check them and e-mail you." : `Our Diaspora Desk has it. Please also upload your ${have("passport") ? "proof of residence abroad" : "passport (photo page)"} below.`}</span></p>` : ""}
    ${canUpload ? `<form class="panel listing-form" data-upload novalidate style="margin-top:1rem">
      <div class="field"><label>Which document?<select name="kind">${Object.entries(kinds).map(([k, label]) => `<option value="${k}" ${!have("passport") && k === "passport" ? "selected" : !have("residence") && have("passport") && k === "residence" ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label></div>
      <div class="field" data-expiry><label>Expiry date shown on the document<input name="expires_on" type="date" min="${new Date().toISOString().slice(0, 10)}" required></label></div>
      <div class="field"><label>File (photo or PDF, up to 15 MB)<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required></label></div>
      <button class="btn btn--primary" type="submit">Upload</button>
      <p class="field-hint">Only MKUYU's Diaspora Desk and Legal team can see these files.</p>
      <div data-result hidden role="status" aria-live="polite"></div>
    </form>` : ""}`;
  const form = panel.querySelector("[data-upload]");
  // Passport needs an expiry date; proof of residence may have one; other documents none.
  const syncExpiry = () => {
    const box = form?.querySelector("[data-expiry]");
    if (!box) return;
    const kind = form.kind.value;
    box.hidden = kind === "other";
    form.expires_on.required = kind === "passport";
    box.querySelector("label").firstChild.textContent = kind === "residence" ? "Expiry date, if it has one " : "Expiry date shown on the document";
  };
  form?.kind.addEventListener("change", syncExpiry);
  syncExpiry();
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = form.file.files[0];
    if (form.kind.value !== "other" && form.kind.value !== "residence" && !form.expires_on.value) { form.expires_on.focus(); return; }
    const out = form.querySelector("[data-result]");
    if (!file) { out.hidden = false; out.innerHTML = `<p class="notice">${icon("info")}<span>Choose a file first.</span></p>`; return; }
    const button = form.querySelector("button");
    button.disabled = true;
    button.textContent = "Uploading…";
    try {
      const label = (kinds[form.kind.value] || "Document").split(" (")[0];
      await uploadVerificationDocument(form.kind.value, file, form.expires_on.value);
      // Redraw this section in place: no jump to the top of the page.
      const top = window.scrollY;
      await verifyPanel(panel, show, { uploaded: label });
      window.scrollTo({ top, behavior: "instant" });
      panel.querySelector("[data-uploaded]")?.focus({ preventScroll: true });
    }
    catch (error) { out.hidden = false; out.innerHTML = `<p class="notice">${icon("info")}<span>${escapeHtml(error.message || "Upload failed.")}</span></p>`; button.disabled = false; button.textContent = "Upload"; }
  });
}

/* ---------------- Messages with the Diaspora Desk ---------------- */
let messagesTimer = null;
async function messagesPanel(panel, data, demoKey) {
  clearInterval(messagesTimer);
  const deskName = data.desk?.name;
  if (demoKey) {
    panel.innerHTML = `<div class="portal-greeting"><span class="eyebrow">Messages</span><h1>Talk to the Diaspora Desk</h1>
      <p class="lede" style="margin:0">In a real account you write here and the desk answers in the same place.</p></div>`;
    return;
  }
  const draw = (messages, keepText = "") => {
    panel.innerHTML = `
      <div class="portal-greeting"><span class="eyebrow">Messages</span><h1>Talk to the Diaspora Desk</h1>
        <p class="lede" style="margin:0">Ask anything about a property, your documents or your agreement${deskName ? `. ${escapeHtml(deskName)} and the team` : ". The team"} will answer here, and we e-mail you when they do.</p></div>
      <section class="msg-box" data-messages>
        <div class="msg-thread" data-thread role="log" aria-live="polite">${messages.length ? messages.map((m) => `<div class="msg ${m.from === "staff" ? "msg--desk" : "msg--me"}"><div class="msg-bubble">${escapeHtml(m.body).replace(/\n/g, "<br>")}</div><span class="msg-meta">${escapeHtml(m.name)} · ${escapeHtml(new Date(m.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }))}</span></div>`).join("") : `<p class="field-hint">No messages yet. Write your first question below.</p>`}</div>
        <form class="msg-form" data-send novalidate>
          <label class="visually-hidden" for="msg-text">Your message</label>
          <textarea id="msg-text" name="body" rows="3" maxlength="2000" placeholder="Write to the Diaspora Desk…"></textarea>
          <button class="btn btn--primary" type="submit">Send</button>
          <div data-result hidden role="status" aria-live="polite"></div>
        </form>
      </section>`;
    const thread = panel.querySelector("[data-thread]");
    thread.scrollTop = thread.scrollHeight;
    const form = panel.querySelector("[data-send]");
    form.body.value = keepText;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = form.body.value.trim();
      if (!text) return;
      const button = form.querySelector("button");
      button.disabled = true;
      try { await sendMessage(text); draw((await getMessages()).messages); panel.querySelector("#msg-text")?.focus(); }
      catch (error) {
        const out = form.querySelector("[data-result]");
        out.hidden = false;
        out.innerHTML = `<p class="notice">${icon("info")}<span>${escapeHtml(error.message || "Could not send. Try again.")}</span></p>`;
        button.disabled = false;
      }
    });
  };
  draw((await getMessages()).messages);
  // New replies appear by themselves while this page is open; typing is never lost.
  messagesTimer = setInterval(async () => {
    const box = panel.querySelector("[data-messages]");
    if (!box) { clearInterval(messagesTimer); return; }
    try {
      const text = panel.querySelector("#msg-text")?.value || "";
      const fresh = (await getMessages()).messages;
      if (fresh.length !== box.querySelectorAll(".msg").length) draw(fresh, text);
    } catch { /* try again on the next tick */ }
  }, 20000);
}

/* ---------------- Browse & request (inside the portal) ---------------- */
const CONTACT_LABELS = { email: "E-mail", whatsapp: "WhatsApp", phone: "Phone call" };

let browsePreset = "";
async function browse(panel, demoKey, show, data = {}) {
  const all = await listProperties();
  // Requests open only once MKUYU has verified who the customer is (the server
  // refuses them too). Until then the customer may look, not ask.
  const v = data.verification || { verified: true };
  const locked = !v.verified;
  const state = { service: browsePreset, text: "", max: "" };
  browsePreset = "";
  panel.innerHTML = `
    <div class="portal-greeting"><span class="eyebrow">Browse & request</span><h1>Find your next property</h1>
      <p class="lede" style="margin:0">Everything MKUYU has available. Press <strong>Request</strong>: we already have your details, so there is nothing to fill in again.</p></div>
    ${locked ? `<section class="next-step next-step--${v.status === "rejected" ? "alert" : ["unverified"].includes(v.status) ? "action" : "calm"}" aria-label="Verification needed">
      <span class="next-step-icon">${icon("shield")}</span>
      <div><span class="next-step-kicker">Verification needed</span><h2>${["submitted", "desk_checked"].includes(v.status) ? "You can request once we have verified you" : "Verify your identity to request a property"}</h2>
        <p>${["submitted", "desk_checked"].includes(v.status) ? "We are checking your documents. You can look at every property now; the Request buttons open as soon as you are verified." : "For your safety and MKUYU's, requests, agreements and payments open only after we have confirmed who you are. You can look at every property meanwhile."}</p></div>
      ${["unverified", "rejected"].includes(v.status) ? `<a class="btn btn--primary" href="#verify" data-goto="verify">Upload documents ${icon("arrow")}</a>` : ""}
    </section>` : ""}
    <div class="portal-filters">
      <label>Service<select data-f="service"><option value="">Buy or rent</option><option value="buy">Buy</option><option value="rent">Rent</option></select></label>
      <label>Search<input data-f="text" type="search" placeholder="Name, area or project"></label>
      <label>Max price (TZS)<input data-f="max" type="number" min="0" step="1000000" placeholder="Any"></label>
    </div>
    <div class="portal-listings" data-list></div>`;
  const list = panel.querySelector("[data-list]");
  panel.querySelector('[data-f="service"]').value = state.service;
  const draw = () => {
    const text = state.text.toLowerCase();
    const rows = all.filter((p) => {
      const services = p.services.filter((s) => canRequest(p, s) && (!state.service || s === state.service));
      if (!services.length) return false;
      if (text && !`${p.title} ${p.location} ${p.project?.name || p.project || ""}`.toLowerCase().includes(text)) return false;
      if (state.max) {
        const max = Number(state.max);
        const fits = services.some((s) => (s === "buy" ? p.price.sale : p.price.rent?.amount || 0) <= max);
        if (!fits) return false;
      }
      return true;
    });
    list.innerHTML = rows.length ? rows.map((p) => listingCard(p, state.service, locked)).join("") : `<div class="empty"><h3>Nothing matches</h3><p>Change the filters, or tell us what you are looking for under My requests.</p></div>`;
    initReveal(list);
  };
  panel.querySelectorAll("[data-f]").forEach((input) => input.addEventListener("input", () => { state[input.dataset.f] = input.value.trim(); draw(); }));
  list.addEventListener("click", (event) => {
    const more = event.target.closest("[data-more]");
    if (more) { const box = more.closest(".listing").querySelector(".listing-more"); box.hidden = !box.hidden; more.textContent = box.hidden ? "More details" : "Less"; return; }
    const ask = event.target.closest("[data-ask]");
    if (ask) openRequestForm(ask.closest(".listing"), all.find((p) => String(p.id) === ask.dataset.id), ask.dataset.ask, demoKey, show);
  });
  draw();
}

function listingCard(p, onlyService, locked = false) {
  const photo = p.photos?.[0];
  const services = p.services.filter((s) => canRequest(p, s) && (!onlyService || s === onlyService));
  const price = (s) => s === "buy" ? formatMoney(p.price.sale, p.currency) : `${formatMoney(p.price.rent?.amount, p.currency)}${p.price.rent?.period ? ` / ${p.price.rent.period}` : ""}`;
  const facts = [p.bedrooms ? `${p.bedrooms} bed` : "", p.bathrooms ? `${p.bathrooms} bath` : "", p.area ? `${p.area} m²` : "", p.unit ? `Unit ${p.unit}` : ""].filter(Boolean).join(" · ");
  return `<article class="listing case" data-reveal>
    <div class="listing-row">
      <div class="listing-art">${photo ? `<img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.alt || p.title)}" loading="lazy">` : photoPlaceholder("Photo coming soon", "thumb")}</div>
      <div class="listing-main">
        <h2>${escapeHtml(p.title)}</h2>
        <p class="card-meta">${escapeHtml([p.location, p.type, facts].filter(Boolean).join(" · "))}</p>
        <p class="listing-prices">${services.map((s) => `<span><small>${s === "buy" ? "Buy" : "Rent"}</small> <strong>${escapeHtml(price(s))}</strong></span>`).join("")}</p>
        <div class="listing-actions">${locked ? `<button type="button" class="btn btn--soft btn--small" disabled title="Available once your identity is verified">${icon("lock")} Request after verification</button>` : services.map((s) => `<button type="button" class="btn btn--primary btn--small" data-ask="${s}" data-id="${escapeHtml(String(p.id))}">Request to ${s === "buy" ? "buy" : "rent"}</button>`).join("")}
          <button type="button" class="btn btn--soft btn--small" data-more>More details</button></div>
      </div>
    </div>
    <div class="listing-more" hidden>${p.summary ? `<p><strong>${escapeHtml(p.summary)}</strong></p>` : ""}${p.description ? `<p>${escapeHtml(p.description)}</p>` : ""}${p.features?.length ? `<ul>${p.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>` : ""}
      ${p.photos?.length > 1 ? `<div class="progress-photos">${p.photos.slice(1, 9).map((ph) => `<img src="${escapeHtml(ph.url)}" alt="${escapeHtml(ph.alt || p.title)}" loading="lazy">`).join("")}</div>` : ""}</div>
    <div class="listing-form" hidden></div>
  </article>`;
}

function openRequestForm(card, property, service, demoKey, show) {
  if (!card || !property) return;
  const box = card.querySelector(".listing-form");
  box.hidden = false;
  box.innerHTML = `<form class="panel" novalidate>
    <h3>Request to ${service === "buy" ? "buy" : "rent"}: ${escapeHtml(property.title)}</h3>
    <p class="field-hint">We will use the name, e-mail and phone MKUYU already has for you.</p>
    <div class="field"><label>Your budget in TZS (optional)<input name="budget" type="number" min="0" step="100000" inputmode="numeric"></label></div>
    <div class="field"><label>How should we reach you?<select name="contact">${Object.entries(CONTACT_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label></div>
    <div class="field"><label>Message (optional)<textarea name="message" rows="3" maxlength="1500" placeholder="Questions, preferred time to talk (with your time zone), payment plan you are interested in…"></textarea></label></div>
    <div class="listing-actions"><button class="btn btn--primary" type="submit">Send request</button><button class="btn btn--soft" type="button" data-cancel>Cancel</button></div>
    <div data-result hidden role="status" aria-live="polite"></div>
  </form>`;
  const form = box.querySelector("form");
  form.querySelector("[data-cancel]").addEventListener("click", () => { box.hidden = true; box.innerHTML = ""; });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const result = form.querySelector("[data-result]");
    const button = form.querySelector("button[type=submit]");
    if (demoKey) { result.hidden = false; result.innerHTML = `<p class="notice">${icon("info")}<span>Sample portal: nothing is sent.</span></p>`; return; }
    button.disabled = true;
    try {
      const answer = await submitPortalRequest({ propertyId: property.id, service, budget: form.budget.value, preferredContact: form.contact.value, message: form.message.value.trim() });
      box.innerHTML = `<p class="notice">${icon("check")}<span><strong>Request ${escapeHtml(answer.reference)} sent.</strong> ${escapeHtml(answer.message || "")} <a href="#" data-see>See my requests</a></span></p>`;
      box.querySelector("[data-see]").addEventListener("click", (e) => { e.preventDefault(); show("requests"); });
    } catch (error) {
      button.disabled = false;
      result.hidden = false;
      result.innerHTML = `<p class="notice">${icon("info")}<span>${escapeHtml(error.message || "The request could not be sent. Please try again.")}</span></p>`;
    }
  });
}

async function myRequests(panel, demoKey) {
  const rows = demoKey ? [] : await getPortalRequests();
  panel.innerHTML = `<div class="portal-greeting"><span class="eyebrow">My requests</span><h1>What you asked for</h1>
    <p class="lede" style="margin:0">Each request goes straight to the MKUYU Diaspora Desk. Its status updates here.</p></div>
    ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Reference</th><th>Property</th><th>Service</th><th>Sent</th><th>Status</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${escapeHtml(r.reference)}</td><td>${escapeHtml(r.property)}${r.location ? `<br><small>${escapeHtml(r.location)}</small>` : ""}</td><td>${r.service === "rent" ? "Rent" : "Buy"}</td><td>${escapeHtml(r.date || "")}</td><td>${escapeHtml(r.status)}</td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty"><h3>No request yet</h3><p>Browse MKUYU's properties and press Request on any of them.</p><p><a class="btn btn--primary btn--small" href="#browse" data-goto="browse">Browse properties ${icon("arrow")}</a></p></div>`}`;
}

/* ---------------- My account ---------------- */
async function accountPanel(panel, data, demoKey, go) {
  const c = data.customer || {};
  const v = data.verification || { verified: true, status: "verified" };
  const VERIFY_LABEL = { unverified: "Not verified yet", submitted: "Documents received", desk_checked: "Documents received", rejected: "Documents sent back", verified: "Verified" };
  panel.innerHTML = `
    <div class="panel-head"><div><span class="eyebrow">Account</span><h1>My account</h1><p class="lede">Your details with MKUYU and your password.</p></div></div>
    <section class="account-card">
      <h2 class="panel-subhead">Your details</h2>
      <dl class="kv">
        <dt>Name</dt><dd>${escapeHtml(c.name || "—")}</dd>
        <dt>E-mail</dt><dd>${escapeHtml(c.email || "—")}</dd>
        <dt>Country</dt><dd>${escapeHtml(c.country || "—")}</dd>
        <dt>Identity</dt><dd>${v.verified ? verifiedTick(v) : `<span class="pill pill--${v.status === "rejected" ? "overdue" : "pending"}">${escapeHtml(VERIFY_LABEL[v.status] || v.status)}</span>`}
          ${v.verified ? "" : ` <a href="#verify" data-goto="verify">Open verification</a>`}</dd>
        ${v.verified && v.nationality_confirmed === false ? `<dt>Nationality</dt><dd><span class="pill pill--pending">Legal is confirming</span></dd>` : ""}
      </dl>
      <p class="field-hint">To change your name, e-mail or phone, write to your Diaspora Desk: these details are on your contracts, so MKUYU updates them for you.</p>
    </section>
    <section class="account-card">
      <h2 class="panel-subhead">Password</h2>
      <p>We send a 6-digit code to <strong>${escapeHtml(c.email || "your e-mail")}</strong>. Enter it here with your new password.</p>
      <div data-pw>
        <button type="button" class="btn btn--primary btn--small" data-send-code>Send me a code</button>
      </div>
      <div data-result hidden role="status" aria-live="polite"></div>
    </section>`;
  const box = panel.querySelector("[data-pw]");
  const out = panel.querySelector("[data-result]");
  const say = (kind, text) => { out.hidden = false; out.innerHTML = `<p class="notice ${kind === "ok" ? "notice--ok" : ""}">${icon(kind === "ok" ? "check" : "info")}<span>${escapeHtml(text)}</span></p>`; };
  box.querySelector("[data-send-code]").addEventListener("click", async (event) => {
    if (demoKey || !c.email) { say("info", "Sample portal: nothing is sent."); return; }
    event.currentTarget.disabled = true;
    try {
      await requestCode(c.email);
      say("ok", "Code sent. Check your e-mail (and the Spam folder). It is valid for 10 minutes.");
      box.innerHTML = `<form class="listing-form account-form" novalidate>
        <div class="field"><label>6-digit code<input name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required></label></div>
        <div class="field"><label>New password<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><p class="field-hint">At least 8 characters, with letters and numbers.</p></div>
        <div class="field"><label>Confirm new password<input name="confirm" type="password" autocomplete="new-password" required></label></div>
        <button class="btn btn--primary" type="submit">Change password</button>
      </form>`;
      const form = box.querySelector("form");
      form.code.focus();
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (form.password.value !== form.confirm.value) { say("info", "The two passwords differ. Type the same password twice."); return; }
        const button = form.querySelector("button");
        button.disabled = true;
        try {
          await resetPassword(c.email, form.code.value.replace(/\D/g, ""), form.password.value);
          box.innerHTML = "";
          say("ok", "Your password has been changed. Use it the next time you sign in.");
        } catch (error) { button.disabled = false; say("info", error.message || "The password could not be changed."); }
      });
    } catch (error) { event.currentTarget.disabled = false; say("info", error.message || "The code could not be sent. Please try again."); }
  });
  void go;
}

/* ---------------- One case (a rental, a purchase, a sale) ---------------- */

function caseCard(key, item) {
  const photo = customerFileUrl(item.property.photo?.url) || item.property.photo?.url;
  const art = photo
    ? `<img src="${escapeHtml(photo)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
    : photoPlaceholder("Photo coming soon", "thumb");
  return `<article class="case" data-reveal>
    <header class="case-head">
      <div class="case-art">${art}</div>
      <div><h2>${escapeHtml(item.property.title)}</h2><p>${escapeHtml(item.property.location || "")} · Ref ${escapeHtml(item.id)}</p></div>
      <span class="badge badge--available">${escapeHtml(item.status)}</span>
    </header>
    <div class="case-body">
      <div class="case-cols">
        <section><h3>Progress</h3>${timeline(item.stages)}</section>
        <section>${details(key, item)}</section>
      </div>
      ${signingBlock(item.signing)}
      ${item.payments ? payments(item.payments) : ""}
      ${progress(item.updates)}
      ${documents(item.documents)}
    </div>
  </article>`;
}

function timeline(stages = []) {
  return `<ol class="timeline">${stages.map((stage) => `
    <li class="tl-${escapeHtml(stage.state)}">
      <span class="tl-dot">${stage.state === "done" ? icon("check") : ""}</span>
      <strong>${escapeHtml(stage.label)}</strong>
      ${stage.date ? `<small>${escapeHtml(stage.date)}</small>` : ""}
      ${stage.note ? `<span class="tl-note">${escapeHtml(stage.note)}</span>` : ""}
      ${stage.state === "current" ? '<span class="visually-hidden">(current step)</span>' : ""}
    </li>`).join("")}</ol>`;
}

function details(key, item) {
  const rows = [];
  if (item.contract) rows.push(["Contract", item.contract.number], ["Contract status", item.contract.status], ["Signed", item.contract.signed || "Not yet"]);
  if (key === "rent" && item.rental) rows.push(["Rental starts", item.rental.start], ["Rental ends", item.rental.end], ["Period", item.rental.period]);
  if (key === "sell") {
    if (item.asking_price) rows.push(["Your asking price", formatMoney(item.asking_price, item.currency || "TZS", { exact: true })]);
    if (item.officer) rows.push(["Handled by", item.officer.name]);
  }
  return `<h3>Details</h3>
    ${rows.length ? `<dl class="kv">${rows.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join("")}</dl>` : '<p class="card-meta">Details appear here as your case progresses.</p>'}
    ${item.ownership ? `<p class="notice" style="margin-top:1rem">${icon("info")}<span>${escapeHtml(item.ownership)}</span></p>` : ""}`;
}

function payments(p) {
  const paidPct = p.total ? Math.min(100, Math.round((p.paid / p.total) * 100)) : 0;
  const overdue = (p.installments || []).filter((row) => row.status === "overdue");
  const m = (value) => escapeHtml(formatMoney(value, p.currency, { exact: true }));
  return `<section>
    <h3>Payments</h3>
    <div class="stat-row">
      <div class="stat"><span>Total</span><strong>${m(p.total)}</strong></div>
      <div class="stat"><span>Paid</span><strong>${m(p.paid)}</strong><small>${paidPct}% of total</small></div>
      <div class="stat"><span>Balance</span><strong>${m(p.balance)}</strong></div>
      ${overdue.length ? `<div class="stat stat--alert"><span>Overdue</span><strong>${overdue.length}</strong><small>Please contact our accounts team</small></div>` : ""}
    </div>
    <div class="progress" style="margin:1rem 0 1.4rem" role="progressbar" aria-valuenow="${paidPct}" aria-valuemin="0" aria-valuemax="100" aria-label="Paid so far"><span style="width:${paidPct}%"></span></div>
    ${p.installments?.length ? `<h3>Schedule</h3><div class="table-wrap"><table>
      <thead><tr><th>Payment</th><th>Due</th><th class="num">Amount</th><th>Status</th></tr></thead>
      <tbody>${p.installments.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.due)}</td><td class="num">${m(row.amount)}</td><td><span class="pill pill--${escapeHtml(row.status)}">${escapeHtml(row.status)}</span></td></tr>`).join("")}</tbody>
    </table></div>` : ""}
    ${p.history?.length ? `<h3 style="margin-top:1.4rem">Payment history</h3><div class="table-wrap"><table>
      <thead><tr><th>Date</th><th class="num">Amount</th><th>Method</th><th>Reference</th><th>Receipt</th></tr></thead>
      <tbody>${p.history.map((row) => `<tr><td>${escapeHtml(row.date)}</td><td class="num">${m(row.amount)}</td><td>${escapeHtml(row.method)}</td><td>${escapeHtml(row.reference || "—")}</td><td>${row.receipt_url ? `<a href="${escapeHtml(customerFileUrl(row.receipt_url))}">Download</a>` : row.receipt ? "Recorded" : "—"}</td></tr>`).join("")}</tbody>
    </table></div>
    <p class="field-hint">Payments are recorded by MKUYU's accounts team after they are verified.</p>` : ""}
  </section>`;
}

function documents(list = []) {
  if (!list.length) return "";
  return `<section><h3>Documents</h3>
    <ul class="doc-list">${list.map((doc) => {
      const url = customerFileUrl(doc.url);
      return `<li>${icon("file")}<span>${url ? `<a href="${escapeHtml(url)}">${escapeHtml(doc.name)}</a>` : escapeHtml(doc.name)}</span><small>${escapeHtml(doc.kind)}</small></li>`;
    }).join("")}</ul>
    ${list.some((doc) => doc.url) ? "" : '<p class="field-hint">How documents are delivered to you (download, email or in person) is being finalised by MKUYU.</p>'}
  </section>`;
}

/** Construction progress published by MKUYU for this property's project. */
function progress(updates) {
  if (!Array.isArray(updates)) return "";
  if (!updates.length) return `<section><h3>Construction progress</h3><p class="card-meta">MKUYU will post dated updates with photos here as the work moves forward.</p></section>`;
  return `<section><h3>Construction progress</h3>
    <ol class="progress-feed">${updates.map((u) => `<li>
      <div class="progress-feed-head"><strong>${escapeHtml(u.title)}</strong><small>${escapeHtml(u.date || "")}</small></div>
      ${u.note ? `<p>${escapeHtml(u.note)}</p>` : ""}
      ${u.photos?.length ? `<div class="progress-photos">${u.photos.map((p) => { const src = customerFileUrl(p.url) || p.url; return `<a href="${escapeHtml(src)}" target="_blank" rel="noopener"><img src="${escapeHtml(src)}" alt="${escapeHtml(u.title)}" loading="lazy"></a>`; }).join("")}</div>` : ""}
    </li>`).join("")}</ol>
  </section>`;
}
