(() => {
const supportedLanguages = ["ko", "en", "ja", "es", "vi", "id", "th"];

function getInitialLanguage() {
  let saved;
  try {
    saved = localStorage.getItem("ownground-language");
  } catch {}
  if (supportedLanguages.includes(saved)) return saved;
  const browserLanguages = typeof navigator === "undefined" ? [] :
    (navigator.languages?.length ? navigator.languages : [navigator.language]);
  for (const locale of browserLanguages) {
    const base = String(locale).toLowerCase().split(/[-_]/)[0];
    const code = base === "in" ? "id" : base;
    if (supportedLanguages.includes(code)) return code;
  }
  return "en";
}

function loadLanguage(language) {
  if (!supportedLanguages.includes(language)) throw new Error(`Unsupported language: ${language}`);
  const messages = globalThis.OWNGROUND_MESSAGES?.[language];
  if (!messages) throw new Error(`Missing language pack: ${language}`);
  return messages;
}

function translate(messages, key) {
  return key.split(".").reduce((value, part) => value?.[part], messages) ?? key;
}

globalThis.OWNGROUND_I18N = { supportedLanguages, getInitialLanguage, loadLanguage, translate };
})();

