/* The Customer Portal: ONE account, ONE portal. It shows a section for each
   service the customer actually uses (Rent, Buy, Sell) and nothing else, so a
   customer who rents and sells sees both in the same place.

   Every stage, amount and document comes from the internal system; the portal
   only presents it. Where a business rule is still undecided, the data says
   so (see DEMO_PORTALS in data.js) instead of the portal inventing detail. */
import { CONNECTED, DEMO_PORTAL_KEYS, currentCustomer, demoPortal, getPortal, logOut } from "../api.js";
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
  } else if (CONNECTED) {
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
      <p class="lede" style="margin-inline:auto">Customer accounts open once this website is connected to the MKUYU system. Until then, see how the portal adapts to each customer:</p>
      <div class="cta-actions">${DEMO_PORTAL_KEYS.map((key) => `<a class="btn btn--soft" href="?demo=${key}">${escapeHtml(demoPortal(key).label)}</a>`).join("")}</div>
    </div>`;
    return;
  }

  render(host, data, demoKey);
}

function render(host, data, demoKey) {
  const services = Object.keys(SECTIONS).filter((key) => (data.services?.[key] || []).length);
  const tabs = [{ key: "overview", label: "Overview", icon: "grid" },
    ...services.map((key) => ({ key, label: SECTIONS[key].label, icon: SECTIONS[key].icon, count: data.services[key].length }))];

  host.innerHTML = `
    ${demoKey ? `<div class="demo-switch" role="note">${icon("info")}<span><strong>Sample portal.</strong> Invented customer, for review only. See another:</span>
      ${DEMO_PORTAL_KEYS.map((key) => `<a class="btn btn--small ${key === demoKey ? "btn--primary" : "btn--soft"}" href="?demo=${key}" ${key === demoKey ? 'aria-current="page"' : ""}>${escapeHtml(demoPortal(key).label)}</a>`).join("")}</div>` : ""}
    <div class="portal">
      <nav class="portal-nav" role="tablist" aria-label="Portal sections">
        <div class="portal-brand"><img class="logo" src="assets/images/brand/mkuyu-logo-192.png" alt="MKUYU" width="40" height="40"><div><strong>${escapeHtml(data.customer?.name || "My MKUYU")}</strong><span>Customer portal</span></div></div>
        ${tabs.map((tab, index) => `<button type="button" role="tab" id="tab-${tab.key}" aria-controls="panel" aria-selected="${index === 0}" data-tab="${tab.key}">
          ${icon(tab.icon)}<span>${escapeHtml(tab.label)}</span>${tab.count ? `<span class="count">${tab.count}</span>` : ""}</button>`).join("")}
        ${CONNECTED && !demoKey ? `<button type="button" data-logout>${icon("lock")}<span>Log out</span></button>` : ""}
      </nav>
      <div id="panel" role="tabpanel" class="portal-panel" tabindex="-1"></div>
    </div>`;

  const panel = host.querySelector("#panel");
  const show = (key) => {
    host.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === key)));
    panel.setAttribute("aria-labelledby", `tab-${key}`);
    panel.innerHTML = key === "overview" ? overview(data, services) : data.services[key].map((item) => caseCard(key, item)).join("");
    panel.style.animation = "none"; void panel.offsetWidth; panel.style.animation = "";
    initReveal(panel);
    panel.querySelectorAll("[data-goto]").forEach((a) => a.addEventListener("click", (event) => { event.preventDefault(); show(a.dataset.goto); panel.focus(); }));
  };
  host.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => show(button.dataset.tab)));
  host.querySelector("[data-logout]")?.addEventListener("click", async () => { await logOut(); window.location.assign("index.html"); });
  show("overview");
}

/* ---------------- Overview ---------------- */

function overview(data, services) {
  const cases = services.flatMap((key) => data.services[key].map((item) => ({ key, item })));
  const money = cases.filter(({ item }) => item.payments);
  const unused = Object.keys(SECTIONS).filter((key) => !services.includes(key));
  const firstName = String(data.customer?.name || "").split(" ")[0];

  return `
    <div class="portal-greeting">
      <span class="eyebrow">My MKUYU</span>
      <h1>${cases.length ? "Welcome back" : "Welcome"}${firstName ? `, ${escapeHtml(firstName)}` : ""}</h1>
      <p class="lede" style="margin:0">${cases.length
        ? `You are ${services.map((key) => SECTIONS[key].label.toLowerCase()).join(" and ")} with MKUYU. Everything below updates as our team moves your case forward.`
        : "You have not started anything yet. Choose a service to begin."}</p>
    </div>

    ${money.length ? `<div class="stat-row">${money.map(({ item }) => {
      const p = item.payments;
      return `<div class="stat"><span>${escapeHtml(item.property.title)}</span><strong>${escapeHtml(formatMoney(p.balance, p.currency, { exact: true }))}</strong><small>Balance remaining</small></div>
        ${p.next_due ? `<div class="stat"><span>Next payment</span><strong>${escapeHtml(formatMoney(p.next_due.amount, p.currency, { exact: true }))}</strong><small>Due ${escapeHtml(p.next_due.date)}</small></div>` : ""}`;
    }).join("")}</div>` : ""}

    ${cases.length ? `<div class="grid" style="gap:1rem">${cases.map(({ key, item }) => `<a class="start-tile" href="#" data-goto="${key}" data-reveal style="grid-template-columns:auto 1fr auto;align-items:center;gap:1rem">
        <span class="feature-icon" style="margin:0">${icon(SECTIONS[key].icon)}</span>
        <span style="display:grid;gap:.1rem"><strong>${escapeHtml(item.property.title)}</strong><span>${escapeHtml(SECTIONS[key].label)} · ${escapeHtml(item.status)}</span></span>
        ${icon("arrow")}
      </a>`).join("")}</div>` : ""}

    ${unused.length ? `<div>
      <h2 style="font-size:1.3rem;margin-bottom:1rem">${cases.length ? "Something else?" : "Start here"}</h2>
      <div class="start-grid">${unused.map((key) => `<a class="start-tile" href="${SECTIONS[key].href}" data-reveal>
        <span class="feature-icon">${icon(SECTIONS[key].icon)}</span><strong>${escapeHtml(SECTIONS[key].start)}</strong><span>${escapeHtml(SECTIONS[key].startText)}</span></a>`).join("")}
      </div></div>` : ""}`;
}

/* ---------------- One case (a rental, a purchase, a sale) ---------------- */

function caseCard(key, item) {
  const art = item.property.photo?.url
    ? `<img src="${escapeHtml(item.property.photo.url)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
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
      ${item.payments ? payments(item.payments) : ""}
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
      <tbody>${p.history.map((row) => `<tr><td>${escapeHtml(row.date)}</td><td class="num">${m(row.amount)}</td><td>${escapeHtml(row.method)}</td><td>${escapeHtml(row.reference || "—")}</td><td>${row.receipt ? "Recorded" : "—"}</td></tr>`).join("")}</tbody>
    </table></div>
    <p class="field-hint">Payments are recorded by MKUYU's accounts team after they are verified.</p>` : ""}
  </section>`;
}

function documents(list = []) {
  if (!list.length) return "";
  return `<section><h3>Documents</h3>
    <ul class="doc-list">${list.map((doc) => `<li>${icon("file")}<span>${escapeHtml(doc.name)}</span><small>${escapeHtml(doc.kind)}</small></li>`).join("")}</ul>
    <p class="field-hint">How documents are delivered to you (download, email or in person) is being finalised by MKUYU.</p>
  </section>`;
}
