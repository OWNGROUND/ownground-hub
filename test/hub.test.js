import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolveRequest } from "../scripts/preview.js";

const flattenKeys = (value, prefix = "") => Object.entries(value).flatMap(([key, child]) => {
  const path = prefix ? `${prefix}.${key}` : key;
  return child && typeof child === "object" ? flattenKeys(child, path) : path;
});

test("KO and EN language packs have matching keys", async () => {
  await Promise.all([import("../src/i18n/ko.js"), import("../src/i18n/en.js")]);
  const { ko, en } = globalThis.OWNGROUND_MESSAGES;
  assert.deepEqual(flattenKeys(ko).sort(), flattenKeys(en).sort());
});

test("canonical Korean copy is unchanged", async () => {
  await import("../src/i18n/ko.js");
  const { ko } = globalThis.OWNGROUND_MESSAGES;
  assert.equal(ko.products.descriptions.mop, "제조 현장이 주도적으로 판단할 수 있도록, 흩어진 데이터와 시스템을 연결합니다.");
  assert.equal(ko.products.descriptions.roundtable, "새로운 도전에서 마주한 문제를 다양한 관점에서 검토하고, 실행 방향을 구체화합니다.");
  assert.equal(ko.products.descriptions.fruitground, "국내 관측과 NASA 기상데이터를 활용해 유망 산지를 탐색합니다.");
  assert.equal(ko.philosophy.title, "기술보다 먼저, 문제를 이해합니다.");
  assert.equal(ko.philosophy.body, "우리는 현장에서 출발해 흩어진 정보와 다양한 관점을 연결하고, 사람이 스스로 판단하고 실행할 수 있도록 돕습니다.");
  assert.equal(ko.footer.contact, "문의");
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
