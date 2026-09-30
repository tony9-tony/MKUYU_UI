/* Rent / Buy request. Creates a request in the internal system for the Sales
   Officer to review. It never changes the property's status: a request is not
   a reservation, a rental or a sale. */
import { ACCOUNTS_LIVE, NotConnectedError, canRequest, currentCustomer, getProperty, submitRequest } from "../api.js";
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

  // With the live system a request belongs to a customer account.
  const here = `request.html?p=${encodeURIComponent(item.slug)}&service=${service}`;
  const customer = ACCOUNTS_LIVE ? await currentCustomer().catch(() => null) : null;
  if (ACCOUNTS_LIVE && !customer) {
    host.innerHTML = `${summary(item, service)}
      <div class="panel text-center" style="margin-top:1.5rem">
        <span class="feature-icon" style="margin:0 auto .8rem">${icon("lock")}</span>
        <h1 style="font-size:1.6rem">Log in to send your request</h1>
        <p class="card-meta">One MKUYU account covers renting, buying and selling, and lets you follow every step.</p>
        <div class="cta-actions" style="margin-top:1rem">
          <a class="btn btn--primary" href="login.html?next=${encodeURIComponent(here)}">Log in</a>
          <a class="btn btn--outline" href="signup.html?next=${encodeURIComponent(here)}">Create an account</a>
        </div>
      </div>`;
    return;
  }

  host.innerHTML = `${summary(item, service)}
    <form class="panel" id="request-form" novalidate style="margin-top:1.5rem">
      <h1 style="font-size:1.6rem">Your request to ${verb}</h1>
      <p class="card-meta">Our sales team reviews your request and contacts you to agree the next steps. Sending a request does not reserve the property.</p>
      <div class="form-grid" style="margin-top:1.2rem">
        <div class="field">
          <label for="contact-method">Preferred contact</label>
          <select id="contact-method" name="preferred_contact">
            <option value="phone">Phone call</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div class="field">
          <label for="contact-time">Best time to reach you</label>
          <select id="contact-time" name="contact_time">
            <option value="">Any time</option>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Evening</option>
          </select>
        </div>
        <div class="field full">
          <label for="request-message">Message <span class="req" aria-hidden="true">*</span></label>
          <textarea id="request-message" name="message" required minlength="10" placeholder="${service === "rent" ? "When would you like to move in, and for how long?" : "Tell us about your budget and how you would like to pay."}"></textarea>
          <p class="field-hint">Please do not send identity documents, payment details or account numbers here.</p>
        </div>
      </div>
      <button class="btn btn--primary btn--block" type="submit" style="margin-top:1.2rem">Send request ${icon("arrow")}</button>
      <div id="request-result" hidden role="status" aria-live="polite"></div>
    </form>`;

  const form = document.getElementById("request-form");
  const result = document.getElementById("request-result");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(form)) return;
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      await submitRequest({
        propertySlug: item.slug, service,
        message: `${form.message.value.trim()}${form.contact_time.value ? `\n\nBest time: ${form.contact_time.value}` : ""}`,
        preferredContact: form.preferred_contact.value,
      });
      form.querySelectorAll(".field, .card-meta, button[type=submit]").forEach((el) => { el.hidden = true; });
      showFormResult(result, "success", "Request sent", "Our sales team will review it and contact you. You can follow its progress in your portal.");
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
