/* General enquiry. No account needed. Property requests go through the
   property page instead, so they reach the Sales Officer as a proper request. */
import { NotConnectedError, submitEnquiry } from "../api.js";
import { showFormResult, validateForm } from "../ui.js";

export default function contact() {
  const form = document.getElementById("enquiry-form");
  if (!form) return;
  const params = new URLSearchParams(window.location.search);
  const property = params.get("property");
  if (property) form.message.value = `I have a question about ${property}.`;
  if (params.get("topic") && [...form.topic.options].some((o) => o.value === params.get("topic"))) form.topic.value = params.get("topic");

  const result = document.getElementById("form-result");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(form)) return;
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      await submitEnquiry(Object.fromEntries(new FormData(form)));
      form.querySelectorAll(".form-grid, button[type=submit]").forEach((el) => { el.hidden = true; });
      showFormResult(result, "success", "Thank you", "Your enquiry has reached our team. We will reply as soon as we can.");
    } catch (error) {
      button.disabled = false;
      if (error instanceof NotConnectedError) showFormResult(result, "info", "Preview only", error.message);
      else showFormResult(result, "error", "Your enquiry was not sent", error.message || "Please try again.");
    }
  });
}
