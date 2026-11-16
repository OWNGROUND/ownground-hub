(() => {
const { getInitialLanguage, loadLanguage, translate } = globalThis.OWNGROUND_I18N;
const products = globalThis.OWNGROUND_PRODUCTS;

function renderProducts(messages) {
  const grid = document.querySelector("#product-grid");
  grid.replaceChildren(...products.map((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-card__heading">
        <h3>${product.name}</h3>
        ${product.flagship ? `<span class="badge">${translate(messages, "badges.flagship")}</span>` : ""}
      </div>
      <p class="product-tagline">${product.tagline}</p>
      <p class="product-description">${translate(messages, `products.descriptions.${product.id}`)}</p>
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
  document.querySelectorAll("[data-language]").forEach((button) => {
    const active = button.dataset.language === language;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderProducts(messages);
  try {
    localStorage.setItem("ownground-language", language);
  } catch {}
}

document.querySelectorAll("[data-language]").forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.language));
});

setLanguage(getInitialLanguage());
})();

