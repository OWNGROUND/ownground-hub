import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolveRequest } from "../scripts/preview.js";

const flattenKeys = (value, prefix = "") => Object.entries(value).flatMap(([key, child]) => {
  const path = prefix ? `${prefix}.${key}` : key;
  return child && typeof child === "object" ? flattenKeys(child, path) : path;
});

const languages = ["ko", "en", "ja", "es", "vi", "id", "th"];

test("all seven complete language packs have identical nonempty keys", async () => {
  await Promise.all(languages.map((code) => import(`../src/i18n/${code}.js`)));
  const messages = globalThis.OWNGROUND_MESSAGES;
  const keys = flattenKeys(messages.ko).sort();
  for (const code of languages) {
    const pack = messages[code];
    assert.deepEqual(flattenKeys(pack).sort(), keys, `Missing or extra translation keys in ${code}`);
    for (const key of keys) {
      const value = key.split(".").reduce((object, part) => object[part], pack);
      assert.equal(typeof value, "string", `${code} ${key}`);
      assert.ok(value.trim(), `Empty translation: ${code} ${key}`);
    }
  }
});

test("language selector supports seven languages without crowding the mobile header", async () => {
  const [html, app, css] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/styles/global.css", "utf8")
  ]);
  const codes = [...html.matchAll(/<option value="([a-z]{2})"/g)].map((match) => match[1]);
  assert.deepEqual(codes, languages);
  assert.match(html, /data-language-select/);
  assert.match(app, /addEventListener\("change"/);
  assert.match(css, /min-height:\s*2\.75rem/);
});

test("all supported language packs can be loaded by the existing i18n runtime", async () => {
  await import("../src/i18n/index.js");
  const { supportedLanguages, loadLanguage, translate } = globalThis.OWNGROUND_I18N;
  assert.deepEqual(supportedLanguages, languages);
  for (const code of languages) {
    const pack = loadLanguage(code);
    assert.notEqual(translate(pack, "hero.title"), "hero.title");
    assert.notEqual(translate(pack, "badges.flagship"), "badges.flagship");
    assert.notEqual(translate(pack, "philosophy.body"), "philosophy.body");
  }
});

test("canonical Korean copy is unchanged", async () => {
  await import("../src/i18n/ko.js");
  const { ko } = globalThis.OWNGROUND_MESSAGES;
  assert.equal(ko.hero.title, "장벽을 낮추고, 가능성을 연결합니다.");
  assert.equal(ko.hero.description, "우리는 문제의 본질을 이해하고, 사람과 정보, 기술을 연결해 더 나은 판단과 실행을 돕습니다.");
  assert.equal(ko.products.descriptions.mop, "제조 현장이 주도적으로 판단할 수 있도록, 흩어진 데이터와 시스템을 연결합니다.");
  assert.equal(ko.products.descriptions.roundtable, "새로운 도전에서 마주한 문제를 다양한 관점에서 검토하고, 실행 방향을 구체화합니다.");
  assert.equal(ko.products.descriptions.fruitground, "국내 관측과 NASA 기상데이터를 활용해 유망 산지를 탐색합니다.");
  assert.equal(ko.philosophy.title, "기술보다 먼저, 문제를 이해합니다.");
  assert.equal(ko.philosophy.body, "우리는 현장에서 출발해 흩어진 정보와 다양한 관점을 연결하고, 사람이 스스로 판단하고 실행할 수 있도록 돕습니다.");
  assert.equal(ko.footer.contact, "문의");
});

test("English Hero v1.1 is present in the language pack", async () => {
  await import("../src/i18n/en.js");
  const { en } = globalThis.OWNGROUND_MESSAGES;
  assert.equal(en.hero.title, "We lower barriers and connect possibilities.");
  assert.equal(en.hero.description, "We understand the core of each problem and connect people, information, and technology to help people make better decisions and take action.");
});

test("only the verified MOP introduction URL is active", async () => {
  await import("../src/data/products.js");
  const products = globalThis.OWNGROUND_PRODUCTS;
  assert.deepEqual(products.map(({ name }) => name), ["MOP", "RoundTable", "FRUITGROUND"]);
  assert.deepEqual(products.flatMap(({ links }) => links.map(({ url }) => url)), ["https://ownground.kr"]);
  assert.deepEqual(products.filter(({ flagship }) => flagship).map(({ id }) => id), ["mop"]);
});

test("preview server cannot read outside the build folder", () => {
  assert.equal(resolveRequest("/%2e%2e%2fpackage.json"), null);
  assert.match(resolveRequest("/src/app.js"), /dist[\\/]src[\\/]app\.js$/);
});

test("the page works when index.html is opened directly", async () => {
  const [html, app] = await Promise.all([readFile("index.html", "utf8"), readFile("src/app.js", "utf8")]);
  assert.doesNotMatch(html, /type="module"/);
  assert.doesNotMatch(app, /\b(fetch|import)\s*\(/);
});
