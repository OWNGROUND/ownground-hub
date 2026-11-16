(() => {
const supportedLanguages = ["ko", "en"];

function getInitialLanguage() {
  let saved;
  try {
    saved = localStorage.getItem("ownground-language");
  } catch {}
  if (supportedLanguages.includes(saved)) return saved;
  return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

function loadLanguage(language) {
  if (!supportedLanguages.includes(language)) throw new Error(`Unsupported language: ${language}`);
  return globalThis.OWNGROUND_MESSAGES[language];
}

function translate(messages, key) {
  return key.split(".").reduce((value, part) => value?.[part], messages) ?? key;
}

globalThis.OWNGROUND_I18N = { getInitialLanguage, loadLanguage, translate };
})();

