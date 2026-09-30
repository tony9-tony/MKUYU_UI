/* Customer log in. Customer accounts are separate from MKUYU staff accounts:
   this form only ever talks to the customer endpoints. */
import { NotConnectedError, logIn } from "../api.js";
import { safeNext, showFormResult, validateForm } from "../ui.js";

export default function login() {
  const form = document.getElementById("login-form");
  if (!form) return;
  const next = safeNext();
  document.querySelectorAll("[data-keep-next]").forEach((link) => {
    link.href = `${link.getAttribute("href").split("?")[0]}?next=${encodeURIComponent(next)}`;
  });

  const result = document.getElementById("login-result");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(form)) return;
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      await logIn({ email: form.email.value.trim(), password: form.password.value });
      window.location.assign(next);
    } catch (error) {
      button.disabled = false;
      if (error instanceof NotConnectedError) {
        showFormResult(result, "info", "Preview only", `${error.message} You can look around a sample portal instead.`);
        result.querySelector("div").insertAdjacentHTML("beforeend", '<p style="margin-top:.7rem"><a class="btn btn--soft btn--small" href="portal.html?demo=rent-sell">Open the sample portal</a></p>');
      } else if (error.status === 401) {
        showFormResult(result, "error", "Those details did not match", "Check your email and password and try again.");
      } else {
        showFormResult(result, "error", "You could not be logged in", error.message || "Please try again.");
      }
    }
  });
}
