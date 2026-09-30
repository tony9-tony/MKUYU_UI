/* Sell: a customer submits THEIR OWN property for MKUYU to help sell. It
   becomes a Sell request for the Sales Officer to review; nothing is published
   automatically.

   The form is for signed-in customers only. A visitor sees what the service is
   and is asked to log in or create an account; once signed in, the form
   appears right here on the public Sell page (not inside the portal), and the
   customer follows the review in the Selling section of their portal.

   Legal and document requirements are still being decided, so the form asks
   only for the property, its pricing and a way to contact the owner. */
import { ACCOUNTS_LIVE, NotConnectedError, currentCustomer, submitSellRequest } from "../api.js";
import { PROPERTY_TYPES } from "../data.js";
import { escapeHtml, icon, showFormResult, validateForm } from "../ui.js";

const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export default async function sell() {
  const form = document.getElementById("sell-form");
  const gate = document.getElementById("sell-gate");
  const signedIn = document.getElementById("sell-signed-in");
  if (!form || !gate) return;
  const type = document.getElementById("sell-type");
  type.insertAdjacentHTML("beforeend", PROPERTY_TYPES.map((t) => `<option>${escapeHtml(t)}</option>`).join(""));

  const openForm = (customer, preview = false) => {
    gate.hidden = true;
    form.hidden = false;
    signedIn.innerHTML = preview
      ? `<p class="notice">${icon("info")}<span><strong>Preview.</strong> This is the form a signed-in customer sees. Nothing is sent until customer accounts open.</span></p>`
      : `<p class="notice">${icon("user")}<span>Signed in as <strong>${escapeHtml(customer.full_name || customer.name || customer.email)}</strong>. You will follow the review in the <a href="portal.html?tab=sell">Selling section of your portal</a>.</span></p>`;
    if (customer) {
      if (customer.full_name || customer.name) form.owner_name.value ||= customer.full_name || customer.name;
      if (customer.phone) form.owner_phone.value ||= customer.phone;
      if (customer.email) form.owner_email.value ||= customer.email;
    }
  };

  if (ACCOUNTS_LIVE) {
    const customer = await currentCustomer().catch(() => null);
    if (customer) openForm(customer);
  } else {
    const note = gate.querySelector("[data-preview-note]");
    note.hidden = false;
    note.querySelector("[data-preview-form]").addEventListener("click", () => { openForm(null, true); form.querySelector("input, select")?.focus(); });
  }

  const input = document.getElementById("sell-photos");
  const zone = document.getElementById("sell-dropzone");
  const thumbs = document.getElementById("sell-thumbs");
  let photos = [];

  function setPhotos(files) {
    const images = [...files].filter((file) => file.type.startsWith("image/"));
    photos = [...photos, ...images].slice(0, MAX_PHOTOS);
    thumbs.innerHTML = "";
    for (const file of photos) {
      const img = document.createElement("img");
      img.alt = file.name;
      img.src = URL.createObjectURL(file);
      img.onload = () => URL.revokeObjectURL(img.src);
      thumbs.appendChild(img);
    }
    zone.querySelector("[data-count]").textContent = photos.length ? `${photos.length} of ${MAX_PHOTOS} photos selected` : `Up to ${MAX_PHOTOS} photos · JPG or PNG`;
  }
  input.addEventListener("change", () => setPhotos(input.files));
  for (const name of ["dragenter", "dragover"]) zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.add("is-over"); });
  for (const name of ["dragleave", "drop"]) zone.addEventListener(name, () => zone.classList.remove("is-over"));
  zone.addEventListener("drop", (event) => { event.preventDefault(); setPhotos(event.dataTransfer.files); });

  const result = document.getElementById("sell-result");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const ok = validateForm(form, () => photos.some((f) => f.size > MAX_PHOTO_BYTES)
      ? [[input, "Each photo must be 8 MB or smaller."]]
      : []);
    if (!ok) return;
    const data = new FormData(form);
    data.delete("photos");
    photos.forEach((file) => data.append("photos", file));
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      await submitSellRequest(data);
      form.querySelectorAll("fieldset, button[type=submit]").forEach((el) => { el.hidden = true; });
      showFormResult(result, "success", "Property submitted", "Our sales team will review it and contact you.");
      result.querySelector("div").insertAdjacentHTML("beforeend", `<p style="margin-top:.8rem"><a class="btn btn--primary btn--small" href="portal.html?tab=sell">Follow it in your portal ${icon("arrow")}</a></p>`);
    } catch (error) {
      button.disabled = false;
      if (error instanceof NotConnectedError) showFormResult(result, "info", error.title, error.message);
      else if (error.status === 401) { form.hidden = true; gate.hidden = false; }
      else showFormResult(result, "error", "Your property was not submitted", error.message || "Please try again.");
    }
  });
}
