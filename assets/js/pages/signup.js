/* Customer sign up: ONE account for Rent, Buy and Sell. How new accounts are
   verified (email link, SMS code, or none) is still undecided, so this form
   only collects the details and leaves verification to the internal system. */
import { NotConnectedError, signUp } from "../api.js";
import { safeNext, showFormResult, validateForm } from "../ui.js";

export default function signup() {
  const form = document.getElementById("signup-form");
  if (!form) return;
  const next = safeNext();
  document.querySelectorAll("[data-keep-next]").forEach((link) => {
    link.href = `${link.getAttribute("href").split("?")[0]}?next=${encodeURIComponent(next)}`;
  });

  const result = document.getElementById("signup-result");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const ok = validateForm(form, () => form.password.value && form.confirm.value !== form.password.value
      ? [[form.confirm, "The two passwords do not match."]]
      : []);
    if (!ok) return;
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      await signUp({
        full_name: form.full_name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        password: form.password.value,
      });
      window.location.assign(next);
    } catch (error) {
      button.disabled = false;
      if (error instanceof NotConnectedError) showFormResult(result, "info", error.title, error.message);
      else if (error.status === 409) showFormResult(result, "error", "That email already has an account", "Log in instead, or use a different email address.");
      else showFormResult(result, "error", "Your account was not created", error.message || "Please try again.");
    }
  });
}
