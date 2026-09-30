/* Sell: a customer submits THEIR OWN property for MKUYU to help sell. It
   becomes a Sell request for the Sales Officer to review; nothing is published
   automatically. Legal and document requirements are still being decided, so
   this form asks only for the property, its pricing and a way to contact the
   owner. */
import { CONNECTED, NotConnectedError, currentCustomer, submitSellRequest } from "../api.js";
import { PROPERTY_TYPES } from "../data.js";
import { escapeHtml, showFormResult, validateForm } from "../ui.js";

const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export default function sell() {
  const form = document.getElementById("sell-form");
  if (!form) return;
  const type = document.getElementById("sell-type");
  type.insertAdjacentHTML("beforeend", PROPERTY_TYPES.map((t) => `<option>${escapeHtml(t)}</option>`).join(""));

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
    // With the live system a submission belongs to a customer account, so the
    // seller can follow the review in their portal.
    if (CONNECTED && !(await currentCustomer().catch(() => null))) {
      showFormResult(result, "info", "Log in to submit", "One MKUYU account covers renting, buying and selling. Log in or create an account, then submit again.");
      result.querySelector("div").insertAdjacentHTML("beforeend", `<p style="margin-top:.7rem"><a class="btn btn--primary btn--small" href="login.html?next=sell.html">Log in</a> <a class="btn btn--outline btn--small" href="signup.html?next=sell.html">Create an account</a></p>`);
      return;
    }
    const data = new FormData(form);
    data.delete("photos");
    photos.forEach((file) => data.append("photos", file));
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      await submitSellRequest(data);
      form.querySelectorAll("fieldset, button[type=submit]").forEach((el) => { el.hidden = true; });
      showFormResult(result, "success", "Property submitted", "Our sales team will review it and contact you. You can follow the review in your portal.");
    } catch (error) {
      button.disabled = false;
      if (error instanceof NotConnectedError) showFormResult(result, "info", "Preview only", error.message);
      else showFormResult(result, "error", "Your property was not submitted", error.message || "Please try again.");
    }
  });
}
