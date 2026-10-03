/* ==========================================================================
   MKUYU AFRICA — public website assistant ("Ask MKUYU")
   --------------------------------------------------------------------------
   A small helper that answers visitors' questions about MKUYU and this site.

   What it knows, and nothing else:
     - the company's PUBLIC facts and FAQs (data.js),
     - the services Rent / Buy / Sell and how each works on this website,
     - published listings and projects, read through the PUBLIC API only
       (api.js -> /api/v1/public/*, no credentials, no login).

   It has no access to the internal staff system: no staff, accounts,
   passwords, contracts, payments, reports, documents or customer records.
   Questions about those are answered with where to go instead. Everything it
   shows is escaped.

   AI answers: free questions are answered by a local AI model (Qwen through
   Ollama) on the MKUYU server, via POST /api/v1/public/chat. The SERVER gives
   the model only the public facts and the published listings, so the model
   cannot know anything internal. Listing searches, projects and internal
   questions stay rule-based, and when the AI is off or slow the built-in
   answers below are used, so a visitor always gets a reply.
   ========================================================================== */

import { CONNECTED, askAssistant, listProjects, listProperties } from "./api.js";
import { COMPANY, FAQS } from "./data.js";
import { detailsHref, escapeHtml, priceFor } from "./ui.js";

const SVG = {
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6.5z"/></svg>',
};

// ---- Language -----------------------------------------------------------------
const SWAHILI = /\b(habari|mambo|hujambo|salaam|asante|nataka|natafuta|nyumba|kupanga|kununua|kuuza|nunua|panga|uza|bei|wapi|gani|vyumba|chumba|kiwanja|ardhi|ofisi|mawasiliano|namba|simu|milioni|elfu|chini|kodi|je|nina|naomba|karibu|mradi|miradi)\b/i;
const t = (sw, en, lang) => (lang === "sw" ? sw : en);

// ---- What the visitor is asking ---------------------------------------------
const RULES = [
  // Anything internal is refused first, before any other topic can match.
  ["internal", /\b(password|nenosiri|staff|employee|mfanyakazi|admin|login to (the )?system|internal|database|salary|mshahara|report|ripoti|invoice|receipt|risiti|my contract|mkataba wangu|contract status|my payment|malipo yangu|debt|deni|installment status|client list|customer list|account number|bank)\b/i],
  ["greet", /^(hi|hello|hey|habari|mambo|hujambo|salaam|shikamoo|good (morning|afternoon|evening))\b/i],
  ["thanks", /\b(thank|thanks|asante)\b/i],
  ["sell", /\b(sell|selling|kuuza|uza|nauza)\b/i],
  ["projects", /\b(project|projects|mradi|miradi|development|estate)\b/i],
  ["contact", /\b(contact|call|phone|email|office|address|location of (the )?office|mawasiliano|namba|simu|ofisi|wapi mnapatikana)\b/i],
  ["instalment", /\b(instal+ments?|payment plan|pay (in|by) parts|kidogo kidogo|awamu|mkopo|loan|mortgage)\b/i],
  ["diaspora", /\b(diaspora|abroad|nje ya nchi|miliki ardhi)\b/i],
  ["account", /\b(account|sign ?up|log ?in|register|akaunti|jisajili)\b/i],
  ["about", /\b(about|who are you|mkuyu|company|kampuni|vision|ceo|founder|owner)\b/i],
  ["search", /\b(rent|renting|lease|buy|buying|purchase|house|home|villa|apartment|flat|land|plot|commercial|penthouse|bedroom|nyumba|kupanga|kununua|nunua|panga|kiwanja|ardhi|fleti|vyumba|chumba|property|properties|available|price|bei|cheap|budget)\b/i],
];

function intentOf(text) {
  for (const [name, pattern] of RULES) if (pattern.test(text)) return name;
  return "unknown";
}

/** Reads service, type, bedrooms, budget and a place from a free sentence. */
function searchFilters(text) {
  const lower = text.toLowerCase();
  const service = /\b(rent|renting|lease|kupanga|panga|kodi)\b/.test(lower) ? "rent" : /\b(buy|buying|purchase|kununua|nunua)\b/.test(lower) ? "buy" : null;
  // "home" and "nyumba" are general words (any home), so they set no type.
  const types = [["villa", /\bvilla/], ["apartment", /\b(apartment|flat|fleti)/], ["penthouse", /\bpenthouse/], ["land", /\b(land|plot|kiwanja|ardhi)/], ["commercial", /\b(commercial|office space|shop|biashara)/], ["house", /\bhouse/]];
  const type = (types.find(([, re]) => re.test(lower)) || [null])[0];
  const beds = lower.match(/(\d+)\s*(?:-|\s)?(?:bed|bedroom|bedrooms|br|vyumba|chumba)/) || lower.match(/(?:vyumba|chumba)\s*(\d+)/);
  let budget = null;
  const money = lower.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(m|mn|million|millions|milioni|k|elfu|b|bn|billion)?\b/g) || [];
  for (const token of money) {
    const [, n, unit] = token.match(/(\d+(?:\.\d+)?)\s*(\w+)?/) || [];
    const value = Number(n) * ({ m: 1e6, mn: 1e6, million: 1e6, millions: 1e6, milioni: 1e6, k: 1e3, elfu: 1e3, b: 1e9, bn: 1e9, billion: 1e9 }[unit] || 1);
    if (value >= 100000) budget = value;
  }
  return { service, type, bedrooms: beds ? Number(beds[1]) : null, budget, words: lower.split(/[^a-zÀ-ɏ]+/).filter((w) => w.length >= 4) };
}

// ---- Answers ------------------------------------------------------------------
const faq = (needle) => FAQS.find((item) => needle.test(item.q))?.a || "";
const contactLine = (lang) => {
  const ways = [COMPANY.phone && `${t("simu", "phone", lang)} ${COMPANY.phone}`, COMPANY.email && `${t("barua pepe", "email", lang)} ${COMPANY.email}`].filter(Boolean);
  return ways.length
    ? t(`Unaweza kuwasiliana na MKUYU kwa ${ways.join(" au ")}, au kupitia <a href="contact.html">ukurasa wa Mawasiliano</a>.`, `You can reach MKUYU by ${ways.join(" or ")}, or through the <a href="contact.html">Contact page</a>.`, lang)
    : t(`Tuma ujumbe kupitia <a href="contact.html">ukurasa wa Mawasiliano</a> na timu ya MKUYU itakujibu. Ofisi: ${escapeHtml(COMPANY.address)}.`, `Send a message through the <a href="contact.html">Contact page</a> and the MKUYU team will reply. Office: ${escapeHtml(COMPANY.address)}.`, lang);
};

// ---- AI answers ----------------------------------------------------------------
// Only through the MKUYU server (never browser -> model), which hands the model
// public facts only. Plain text comes back; it is escaped here, and page names
// such as buy.html become links.
const PAGES = ["rent.html", "buy.html", "sell.html", "projects.html", "contact.html", "about.html"];
const AI_INTENTS = new Set(["unknown", "about", "instalment", "diaspora", "account", "sell"]);
const history = [];
let aiDown = false;

function aiHtml(reply) {
  let html = escapeHtml(reply).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");
  html = html.replace(/\bproperty\.html\?id=(\d+)/g, '<a href="property.html?id=$1">property.html?id=$1</a>');
  for (const page of PAGES) html = html.split(page).join(`<a href="${page}">${page}</a>`);
  return `<p>${html}</p>`;
}

async function aiAnswer(text, lang) {
  if (!CONNECTED || aiDown) return null;
  try {
    const reply = await askAssistant(text, history.slice(-6), lang);
    history.push({ role: "user", content: text }, { role: "assistant", content: reply });
    return { html: aiHtml(reply), chips: ["rent", "buy", "contact"] };
  } catch (error) {
    // Off or unreachable: stop trying for this visit and use the built-in answers.
    if (![400, 429].includes(error?.status)) aiDown = true;
    return null;
  }
}

async function answer(text, lang) {
  const intent = intentOf(text);
  if (AI_INTENTS.has(intent)) {
    const ai = await aiAnswer(text, lang);
    if (ai) return ai;
  }
  return ruleAnswer(intent, text, lang);
}

async function ruleAnswer(intent, text, lang) {
  switch (intent) {
    case "internal":
      return { html: t(
        `Samahani, mimi ni msaidizi wa tovuti ya umma tu. Sina taarifa za ndani kama akaunti za wafanyakazi, mikataba, malipo au ripoti. Kwa mkataba au malipo yako, wasiliana na MKUYU moja kwa moja. ${contactLine(lang)}`,
        `Sorry, I'm the public website assistant only. I have no access to internal information such as staff accounts, contracts, payments or reports. For your own contract or payments, please contact MKUYU directly. ${contactLine(lang)}`, lang), chips: ["contact"] };
    case "greet":
      return { html: t(`Karibu MKUYU Africa! Naweza kukusaidia kupata nyumba ya <strong>kupanga</strong> au <strong>kununua</strong>, kueleza jinsi ya <strong>kuuza</strong> mali yako, au kukuonyesha miradi yetu.`, `Welcome to MKUYU Africa! I can help you find a home to <strong>rent</strong> or <strong>buy</strong>, explain how to <strong>sell</strong> your property, or show you our projects.`, lang), chips: ["rent", "buy", "sell", "projects"] };
    case "thanks":
      return { html: t("Karibu sana! Kuna kingine naweza kukusaidia?", "You're welcome! Anything else I can help with?", lang), chips: ["rent", "buy", "sell"] };
    case "sell":
      return { html: t(
        `Kuuza mali yako na MKUYU ni rahisi na <strong>hakuhitaji akaunti</strong>: jaza <a href="sell.html">fomu ya Sell</a> (aina ya mali, mahali, bei unayotaka na mawasiliano yako). Timu ya Mauzo inaipitia, Huduma kwa Wateja inakupigia kukueleza hatua zinazofuata, na MKUYU ikikubali mali, mnakubaliana masharti kwenye mkataba wa Sell.`,
        `Selling with MKUYU needs <strong>no account</strong>: fill in the <a href="sell.html">Sell form</a> (property type, location, asking price and how to reach you). Our Sales team reviews it, Customer Service contacts you to explain the next steps, and once MKUYU accepts the property the terms are agreed in a Sell contract.`, lang), chips: ["contact"] };
    case "projects":
      return projectsAnswer(lang);
    case "contact":
      return { html: contactLine(lang), chips: ["rent", "buy"] };
    case "instalment":
      return { html: escapeHtml(faq(/instal/i)) || t("Mipango ya malipo kwa awamu inapatikana kwa masharti husika; wasiliana na timu yetu.", "Instalment plans are available on applicable terms; please ask our team.", lang), chips: ["buy", "contact"] };
    case "diaspora":
      return { html: escapeHtml(faq(/abroad|diaspora/i)), chips: ["contact", "projects"] };
    case "account":
      return { html: t("Huhitaji akaunti: kupanga, kununua na kuuza vyote vinafanyika bila kuingia (login). Acha jina, simu na maelezo, na timu itakupigia.", "You don't need an account: renting, buying and selling all work without logging in. Leave your name, phone and details and our team contacts you.", lang), chips: ["rent", "buy", "sell"] };
    case "about":
      return { html: t(
        `${escapeHtml(COMPANY.name)} ni kampuni ya nyumba na mali za Tanzania. Dira yetu: ${escapeHtml(COMPANY.vision)} Tunatoa nyumba za <a href="rent.html">kupanga</a>, za <a href="buy.html">kununua</a>, na tunawasaidia wamiliki <a href="sell.html">kuuza</a>. Soma zaidi <a href="about.html">Kuhusu MKUYU</a>.`,
        `${escapeHtml(COMPANY.name)} is a Tanzanian property company. Our vision: ${escapeHtml(COMPANY.vision)} We offer homes to <a href="rent.html">rent</a> and to <a href="buy.html">buy</a>, and help owners <a href="sell.html">sell</a>. Read more on <a href="about.html">About MKUYU</a>.`, lang), chips: ["rent", "buy", "projects"] };
    case "search":
      return searchAnswer(text, lang);
    default:
      return { html: t("Sijaelewa vizuri. Jaribu kuuliza, kwa mfano: <em>nyumba ya vyumba 3 ya kupanga</em>, <em>viwanja vya kununua</em>, au <em>ninawezaje kuuza nyumba yangu?</em>", "I didn't quite catch that. Try, for example: <em>3 bedroom house to rent</em>, <em>land to buy under 100m</em>, or <em>how do I sell my house?</em>", lang), chips: ["rent", "buy", "sell", "contact"] };
  }
}

async function projectsAnswer(lang) {
  try {
    const projects = await listProjects();
    if (!projects.length) return { html: t(`Kwa sasa hakuna mradi uliochapishwa. Tazama <a href="projects.html">Miradi</a> baadaye.`, `No projects are published right now. Check <a href="projects.html">Projects</a> again soon.`, lang) };
    const items = projects.slice(0, 5).map((p) => `<li><a href="projects.html">${escapeHtml(p.name)}</a>${p.location ? ` · ${escapeHtml(p.location)}` : ""}</li>`).join("");
    return { html: `${t("Miradi yetu iliyo wazi:", "Our current projects:", lang)}<ul>${items}</ul><a href="projects.html">${t("Tazama miradi yote", "See all projects", lang)} →</a>`, chips: ["rent", "buy"] };
  } catch {
    return { html: t(`Sikuweza kufikia miradi sasa hivi. Tazama <a href="projects.html">Miradi</a>.`, `I couldn't load the projects right now. See <a href="projects.html">Projects</a>.`, lang) };
  }
}

async function searchAnswer(text, lang) {
  const f = searchFilters(text);
  const services = f.service ? [f.service] : ["buy", "rent"];
  let found = [];
  try {
    for (const service of services) {
      const list = await listProperties({ service });
      found.push(...list.map((item) => ({ item, service })));
    }
  } catch {
    return { html: t(`Sikuweza kufikia orodha ya nyumba sasa hivi. Jaribu <a href="buy.html">Nunua</a> au <a href="rent.html">Panga</a>.`, `I couldn't load the listings right now. Try <a href="buy.html">Buy</a> or <a href="rent.html">Rent</a>.`, lang) };
  }
  const seen = new Set();
  found = found.filter(({ item, service }) => {
    if (seen.has(item.slug)) return false;
    if (f.type && !String(item.type).toLowerCase().includes(f.type)) return false;
    if (f.bedrooms && item.bedrooms && item.bedrooms < f.bedrooms) return false;
    if (f.budget) {
      const amount = service === "rent" ? item.price?.rent?.amount : item.price?.sale;
      if (amount && amount > f.budget) return false;
    }
    const place = `${item.location} ${item.project?.name || ""}`.toLowerCase();
    const placeWords = f.words.filter((w) => place.includes(w));
    item._placeScore = placeWords.length;
    seen.add(item.slug);
    return true;
  });
  const wantsPlace = f.words.some((w) => found.some(({ item }) => `${item.location}`.toLowerCase().includes(w)));
  if (wantsPlace) found = found.filter(({ item }) => item._placeScore > 0);
  const where = f.service === "rent" ? "rent.html" : f.service === "buy" ? "buy.html" : "buy.html";
  if (!found.length) {
    return { html: t(
      `Sijapata nyumba inayolingana na ombi lako kwa sasa. Tazama zote kwenye <a href="${where}">${f.service === "rent" ? "Panga" : "Nunua"}</a>, au <a href="contact.html">tuambie unachotafuta</a> na timu itakujulisha.`,
      `I couldn't find a matching listing right now. Browse everything on <a href="${where}">${f.service === "rent" ? "Rent" : "Buy"}</a>, or <a href="contact.html">tell us what you need</a> and our team will let you know.`, lang), chips: ["rent", "buy", "contact"] };
  }
  const cards = found.slice(0, 3).map(({ item, service }) => {
    const price = priceFor(item, service);
    return `<a class="chat-card" href="${escapeHtml(detailsHref(item, service))}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml([item.type, item.bedrooms ? `${item.bedrooms} ${t("vyumba", "bed", lang)}` : "", item.location].filter(Boolean).join(" · "))}</span><em>${escapeHtml(price.amount)} ${escapeHtml(price.note || "")}</em></a>`;
  }).join("");
  const more = found.length > 3 ? `<a href="${where}">${t(`Tazama zote ${found.length}`, `See all ${found.length}`, lang)} →</a>` : "";
  return { html: `${t("Hizi ndizo nilizopata:", "Here is what I found:", lang)}<div class="chat-cards">${cards}</div>${more}<p class="chat-note">${t("Kuomba: fungua nyumba na ubonyeze Request. Huhitaji akaunti.", "To request one: open it and press Request. No account needed.", lang)}</p>` };
}

// ---- Interface --------------------------------------------------------------
const CHIPS = {
  rent: ["Nyumba za kupanga", "Homes to rent", "Show me homes to rent"],
  buy: ["Nyumba za kununua", "Homes to buy", "Show me homes to buy"],
  sell: ["Kuuza mali yangu", "Sell my property", "How do I sell my property?"],
  projects: ["Miradi", "Projects", "Show me your projects"],
  contact: ["Mawasiliano", "Contact MKUYU", "How do I contact MKUYU?"],
};

export function initChatbot() {
  if (document.querySelector(".chat-launcher")) return;
  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "chat-launcher";
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "mkuyu-chat");
  launcher.innerHTML = `<span class="chat-launcher-icon">${SVG.chat}</span><span class="chat-launcher-label">Ask MKUYU</span>`;

  const panel = document.createElement("section");
  panel.className = "chat-panel";
  panel.id = "mkuyu-chat";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "MKUYU assistant");
  panel.hidden = true;
  panel.innerHTML = `
    <header class="chat-head">
      <img src="assets/images/brand/mkuyu-logo-192.png" alt="" width="36" height="36" />
      <div><strong>MKUYU Assistant</strong><span>Public information · Rent · Buy · Sell</span></div>
      <button type="button" class="chat-close" aria-label="Close the assistant">${SVG.close}</button>
    </header>
    <div class="chat-log" role="log" aria-live="polite"></div>
    <div class="chat-chips"></div>
    <form class="chat-form" autocomplete="off">
      <label class="visually-hidden" for="chat-input">Your question</label>
      <input id="chat-input" name="q" maxlength="300" placeholder="Ask about renting, buying or selling…" />
      <button type="submit" aria-label="Send">${SVG.send}</button>
    </form>
    <p class="chat-foot">I only know MKUYU's public information. Please don't share passwords or payment details here.</p>`;
  document.body.append(launcher, panel);

  const log = panel.querySelector(".chat-log");
  const chipsBox = panel.querySelector(".chat-chips");
  const form = panel.querySelector(".chat-form");
  const input = panel.querySelector("input");
  let lang = /^sw\b/i.test(navigator.language || "") ? "sw" : "en";
  let started = false;

  const add = (who, html) => {
    const bubble = document.createElement("div");
    bubble.className = `chat-msg chat-msg--${who}`;
    bubble.innerHTML = html;
    log.append(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  };
  const setChips = (keys = []) => {
    chipsBox.innerHTML = keys.map((key) => `<button type="button" data-chip="${key}">${escapeHtml(t(CHIPS[key][0], CHIPS[key][1], lang))}</button>`).join("");
  };
  const ask = async (text) => {
    const question = String(text || "").trim().slice(0, 300);
    if (!question) return;
    if (SWAHILI.test(question)) lang = "sw";
    else if (/^[a-z0-9\s,.?!'-]+$/i.test(question) && /\b(the|how|what|where|show|want|need|can|do|is)\b/i.test(question)) lang = "en";
    add("user", escapeHtml(question));
    setChips([]);
    const typing = add("bot", '<span class="chat-typing"><i></i><i></i><i></i></span>');
    const reply = await answer(question, lang);
    typing.innerHTML = reply.html;
    if (!CONNECTED && /listings|nyumba|homes|projects|miradi/i.test(reply.html)) {
      typing.insertAdjacentHTML("beforeend", `<p class="chat-note">${t("Tovuti iko kwenye hali ya majaribio; orodha ni sampuli.", "The site is in preview; listings are samples.", lang)}</p>`);
    }
    setChips(reply.chips || []);
    log.scrollTop = log.scrollHeight;
  };

  const open = () => {
    panel.hidden = false;
    // Force a layout so the opening transition runs, without waiting for a
    // frame (a background tab would otherwise never open the panel).
    void panel.offsetWidth;
    panel.classList.add("is-open");
    launcher.setAttribute("aria-expanded", "true");
    launcher.classList.add("is-hidden");
    if (!started) {
      started = true;
      add("bot", t("Habari! Mimi ni msaidizi wa MKUYU. Naweza kukusaidia kupanga, kununua au kuuza mali, na kukupa taarifa za miradi yetu.", "Hello! I'm the MKUYU assistant. I can help you rent, buy or sell property and tell you about our projects.", lang));
      setChips(["rent", "buy", "sell", "projects", "contact"]);
    }
    setTimeout(() => input.focus(), 120);
  };
  const close = () => {
    panel.classList.remove("is-open");
    launcher.setAttribute("aria-expanded", "false");
    launcher.classList.remove("is-hidden");
    setTimeout(() => { if (!panel.classList.contains("is-open")) panel.hidden = true; }, 220);
    launcher.focus();
  };

  launcher.addEventListener("click", open);
  panel.querySelector(".chat-close").addEventListener("click", close);
  panel.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
  chipsBox.addEventListener("click", (event) => {
    const key = event.target.closest("[data-chip]")?.dataset.chip;
    if (key) ask(t(CHIPS[key][0], CHIPS[key][2], lang));
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value;
    input.value = "";
    ask(value);
  });
}
