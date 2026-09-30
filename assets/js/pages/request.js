/* Rent / Buy request. No account: the visitor leaves their name, phone, email,
   budget and how they want to be contacted. It reaches the Sales team as a
   Lead; Sales hands it to Customer Service, who contact the customer.
   A request never changes the property's status: it is not a reservation, a
   rental or a sale. */
import { NotConnectedError, canRequest, getProperty, submitRequest } from "../api.js";
import { escapeHtml, icon, priceFor, propertyMedia, showFormResult, validateForm } from "../ui.js";

export default async function request() {
  const host = document.getElementById("request-host");
  if (!host) return;
  const params = new URLSearchParams(window.location.search);
  const service = params.get("service") === "rent" ? "rent" : "buy";
  const verb = service === "rent" ? "rent" : "buy";

  const item = await getProperty(params.get("p") || "").catch(() => null);
  const back = document.getElementById("request-back");
  if (back && item) { back.href = `property.html?p=${encodeURIComponent(item.slug)}&service=${service}`; back.textContent = "← Back to the property"; }
  else if (back) back.href = `${service}.html`;
  if (!item || !canRequest(item, service)) {
    host.innerHTML = `<div class="empty"><h1 style="font-size:1.6rem">This property is not open to requests</h1>
      <p>It may have been reserved, ${service === "rent" ? "rented" : "sold"} or removed. <a href="${service}.html">See other properties to ${verb}</a>.</p></div>`;
    return;
  }

  const price = priceFor(item, service);
  host.innerHTML = `${summary(item, service)}
    <form class="panel" id="request-form" novalidate style="margin-top:1.5rem">
      <h1 style="font-size:1.9rem">Your request to ${verb}</h1>
      <p class="card-meta">No account needed. Leave your details and our team will contact you the way you prefer. Sending a request does not reserve the property.</p>
      <div class="form-grid" style="margin-top:1.2rem">
        <div class="field full">
          <label for="req-name">Full name <span class="req" aria-hidden="true">*</span></label>
          <input id="req-name" name="name" required maxlength="80" autocomplete="name" />
        </div>
        <div class="field">
          <label for="req-phone">Phone <span class="req" aria-hidden="true">*</span></label>
          <input id="req-phone" name="phone" type="tel" required autocomplete="tel" placeholder="+255 7XX XXX XXX" />
        </div>
        <div class="field">
          <label for="req-email">Email</label>
          <input id="req-email" name="email" type="email" autocomplete="email" />
        </div>
        <div class="field">
          <label for="req-budget">Your budget (TZS) <span class="req" aria-hidden="true">*</span></label>
          <input id="req-budget" name="budget" type="number" min="1" step="1" required inputmode="numeric" placeholder="${escapeHtml(service === "rent" ? "per month" : "total")}" />
          <p class="field-hint">Listed at ${escapeHtml(price.amount)} ${escapeHtml(price.note.toLowerCase())}.</p>
        </div>
        <div class="field">
          <label for="req-contact">Contact me by</label>
          <select id="req-contact" name="preferred_contact">
            <option value="phone">Phone call</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div class="field full">
          <label for="req-message">Message</label>
          <textarea id="req-message" name="message" maxlength="1000" placeholder="${service === "rent" ? "When would you like to move in, and for how long?" : "Anything we should know, e.g. a good time to view."}"></textarea>
          <p class="field-hint">Please do not send identity documents, payment details or account numbers here.</p>
        </div>
        <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="trap" />
      </div>
      <button class="btn btn--primary btn--block" type="submit" style="margin-top:1.2rem">Send request ${icon("arrow")}</button>
      <div id="request-result" hidden role="status" aria-live="polite"></div>
    </form>`;

  const form = document.getElementById("request-form");
  const result = document.getElementById("request-result");
  const field = (name) => form.elements.namedItem(name);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const ok = validateForm(form, () => {
      const problems = [];
      const phone = field("phone").value.trim();
      if (phone && !/^\+?[0-9][0-9\s-]{6,18}$/.test(phone)) problems.push([field("phone"), "Enter a valid phone number."]);
      if (field("preferred_contact").value === "email" && !field("email").value.trim()) problems.push([field("email"), "Add your email, or choose phone or WhatsApp."]);
      return problems;
    });
    if (!ok) return;
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const sent = await submitRequest({
        propertySlug: item.slug, service,
        name: field("name").value.trim(),
        phone: field("phone").value.trim(),
        email: field("email").value.trim(),
        budget: Number(field("budget").value),
        preferredContact: field("preferred_contact").value,
        message: field("message").value.trim(),
        website: field("website").value,
      });
      form.querySelectorAll(".form-grid, .card-meta, button[type=submit]").forEach((el) => { el.hidden = true; });
      const how = { phone: "call you", whatsapp: "message you on WhatsApp", email: "email you" }[field("preferred_contact").value];
      showFormResult(result, "success", `Request sent · ${sent.reference}`, `Thank you. Our team will ${how} soon about ${item.title}. Keep your reference in case you call us.`);
    } catch (error) {
      button.disabled = false;
      if (error instanceof NotConnectedError) showFormResult(result, "info", error.title, error.message);
      else showFormResult(result, "error", "Your request was not sent", error.message || "Please try again.");
    }
  });
}

function summary(item, service) {
  const price = priceFor(item, service);
  return `<div class="case">
    <div class="case-head">
      <div class="case-art">${propertyMedia(item, "thumb")}</div>
      <div>
        <span class="badge ${service === "rent" ? "badge--rent" : "badge--buy"}">${service === "rent" ? "Rent" : "Buy"}</span>
        <h2 style="margin-top:.4rem">${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.location)}</p>
      </div>
      <p class="pcard-price" style="margin-left:auto;text-align:right">${escapeHtml(price.amount)}<small>${escapeHtml(price.note)}</small></p>
    </div>
  </div>`;
}
