/* Sell: a property owner offers THEIR OWN property to MKUYU. No account and
   no login: the details become a Sell request in the internal system, where
   the Sales team reviews it and Customer Service contacts the owner. Once
   MKUYU accepts the property the owner becomes a Seller Client and the terms
   are agreed in a Sell contract, inside MKUYU. Nothing is published from here. */
import { NotConnectedError, submitSellRequest } from "../api.js";
import { showFormResult, validateForm } from "../ui.js";

export default function sell() {
  const form = document.getElementById("sell-form");
  const result = document.getElementById("sell-result");
  if (!form) return;
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
      const sent = await submitSellRequest({
        name: field("name").value.trim(),
        phone: field("phone").value.trim(),
        email: field("email").value.trim(),
        preferredContact: field("preferred_contact").value,
        propertyType: field("property_type").value,
        location: field("location").value.trim(),
        area: field("area").value ? Number(field("area").value) : null,
        bedrooms: field("bedrooms").value === "" ? "" : Number(field("bedrooms").value),
        askingPrice: field("asking_price").value ? Number(field("asking_price").value) : null,
        titleDeed: field("title_deed").value,
        message: field("message").value.trim(),
        website: field("website").value,
      });
      form.querySelectorAll("fieldset, .card-meta, button[type=submit]").forEach((el) => { el.hidden = true; });
      const how = { phone: "call you", whatsapp: "message you on WhatsApp", email: "email you" }[field("preferred_contact").value];
      showFormResult(result, "success", `Property received · ${sent.reference}`, `Thank you. Our team will review your property and ${how} about the next steps. Keep your reference in case you call us.`);
    } catch (error) {
      button.disabled = false;
      if (error instanceof NotConnectedError) showFormResult(result, "info", error.title, error.message);
      else showFormResult(result, "error", "Your property was not sent", error.message || "Please try again.");
    }
  });
}
