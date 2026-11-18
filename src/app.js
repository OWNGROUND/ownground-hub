(() => {
const { getInitialLanguage, loadLanguage, translate } = globalThis.OWNGROUND_I18N;
const products = globalThis.OWNGROUND_PRODUCTS;
const koreaBeta = globalThis.OWNGROUND_KOREA_BETA;
const languageControl = document.querySelector("[data-language-control]");
const languageToggle = document.querySelector("[data-language-toggle]");
const languageMenu = document.querySelector("[data-language-menu]");
const languageCurrent = document.querySelector("[data-language-current]");
const languageOptions = [...document.querySelectorAll("[data-language-option]")];

function renderProducts(messages, language) {
  const grid = document.querySelector("#product-grid");
  grid.replaceChildren(...products.map((product) => {
    const card = document.createElement("article");
    const betaNotice = language === "ko" ? koreaBeta[product.id] : undefined;
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-card__heading">
        <h3>${product.name}</h3>
        <span class="badge">${translate(messages, `badges.${product.status}`)}</span>
      </div>
      <p class="product-tagline">${translate(messages, `products.taglines.${product.id}`)}</p>
      <p class="product-description">${translate(messages, `products.descriptions.${product.id}`)}</p>
      ${betaNotice ? `<div class="korea-beta-notice"><strong>${betaNotice.title}</strong><p>${betaNotice.body}</p></div>` : ""}
      <div class="product-actions">
        ${product.links.map((link) => `<a href="${link.url}" rel="noopener">${translate(messages, link.label)}<span aria-hidden="true">↗</span></a>`).join("")}
      </div>`;
    return card;
  }));
}

function setLanguage(language) {
  const messages = loadLanguage(language);
  document.documentElement.lang = language;
  document.title = translate(messages, "meta.title");
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = translate(messages, element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", translate(messages, element.dataset.i18nAriaLabel));
  });
  languageCurrent.textContent = language.toUpperCase();
  languageOptions.forEach((button) => {
    const active = button.dataset.languageOption === language;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderProducts(messages, language);
  try {
    localStorage.setItem("ownground-language", language);
  } catch {}
}

function closeLanguageMenu(restoreFocus = false) {
  languageMenu.hidden = true;
  languageToggle.setAttribute("aria-expanded", "false");
  if (restoreFocus) languageToggle.focus();
}

languageToggle.addEventListener("click", () => {
  const willOpen = languageMenu.hidden;
  languageMenu.hidden = !willOpen;
  languageToggle.setAttribute("aria-expanded", String(willOpen));
});

languageOptions.forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.languageOption);
    closeLanguageMenu(true);
  });
});

document.addEventListener("click", (event) => {
  if (!languageControl.contains(event.target)) closeLanguageMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !languageMenu.hidden) closeLanguageMenu(true);
});

setLanguage(getInitialLanguage());
})();

