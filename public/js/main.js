const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("[data-nav]");
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

if (csrfToken) {
  document.querySelectorAll("form").forEach((form) => {
    if (form.querySelector('input[name="_csrf"]')) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "_csrf";
    input.value = csrfToken;
    form.appendChild(input);
  });
}

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll("[data-confirm]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    if (!window.confirm(form.dataset.confirm || "¿Confirmar esta acción?")) {
      event.preventDefault();
    }
  });
});
