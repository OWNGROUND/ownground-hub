import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolveRequest, contentTypes } from "../scripts/preview.js";

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

test("MOP-style language menu exposes seven accessible language options", async () => {
  const [html, app, css] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/styles/global.css", "utf8")
  ]);
  const codes = [...html.matchAll(/data-language-option="([a-z]{2})"/g)].map((match) => match[1]);
  assert.deepEqual(codes, languages);
  assert.match(html, /data-language-toggle[\s\S]*aria-expanded="false"/);
  assert.match(html, /data-language-menu[\s\S]*role="group"/);
  assert.match(app, /setAttribute\("aria-expanded"/);
  assert.match(app, /setAttribute\("aria-pressed"/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(app, /languageControl\.contains\(event\.target\)/);
  assert.match(app, /localStorage\.setItem\("ownground-language"/);
  assert.match(css, /grid-template-columns:\s*repeat\(3/);
  assert.match(css, /min-height:\s*2\.75rem/);
  assert.match(css, /width:\s*min\(13\.5rem,\s*calc\(100vw - 3rem\)\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("all supported language packs can be loaded by the existing i18n runtime", async () => {
  await import("../src/i18n/index.js");
  const { supportedLanguages, loadLanguage, translate } = globalThis.OWNGROUND_I18N;
  assert.deepEqual(supportedLanguages, languages);
  for (const code of languages) {
    const pack = loadLanguage(code);
    assert.notEqual(translate(pack, "hero.title"), "hero.title");
    assert.notEqual(translate(pack, "badges.flagship"), "badges.flagship");
    assert.equal(translate(pack, "badges.beta"), "Beta");
    assert.notEqual(translate(pack, "badges.comingSoon"), "badges.comingSoon");
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
  assert.deepEqual(products.map(({ status }) => status), ["flagship", "beta", "comingSoon"]);
  assert.deepEqual(products.flatMap(({ links }) => links.map(({ url }) => url)), ["https://ownground.kr"]);
});

test("Korea-only RoundTable beta notice is separate and has no application URL", async () => {
  await import("../src/data/korea-beta.js");
  const notice = globalThis.OWNGROUND_KOREA_BETA;
  assert.deepEqual(notice, {
    roundtable: {
      title: "베타 테스터 모집 중 · 국내 한정",
      body: "새로운 사업이나 프로젝트를 준비하며, 명확한 주제를 다양한 관점에서 검토하고 발전시키고 싶은 분들의 참여를 기다립니다."
    }
  });
  assert.doesNotMatch(JSON.stringify(notice), /https?:\/\//);
  const app = await readFile("src/app.js", "utf8");
  assert.match(app, /language === "ko" \? koreaBeta\[product\.id\]/);
});

test("footer contact email is a working mailto link in every language", async () => {
  const html = await readFile("index.html", "utf8");
  assert.match(html, /<span data-i18n="footer\.contact"><\/span>/);
  assert.match(html, /<a href="mailto:contact@ownground\.kr">contact@ownground\.kr<\/a>/);
  assert.equal((html.match(/mailto:contact@ownground\.kr/g) ?? []).length, 1);
  await Promise.all(languages.map((code) => import(`../src/i18n/${code}.js`)));
  for (const code of languages) {
    assert.ok(globalThis.OWNGROUND_MESSAGES[code].footer.contact.trim(), `Missing contact label: ${code}`);
  }
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

test("approved v0.2 landing keeps the 3-column compact cards, approved arrow motion and product copy", async () => {
  const [html,css,app] = await Promise.all([readFile("index.html","utf8"),readFile("src/styles/global.css","utf8"),readFile("src/app.js","utf8")]);
  assert.match(html,/id="product-grid"/);
  assert.doesNotMatch(html,/class="hero"|class="philosophy"/);
  assert.doesNotMatch(html,/>제품과 서비스</);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/min-height:217px/);
  assert.match(css,/-webkit-line-clamp:3/);
  assert.match(css,/animation:wave 1s ease-in-out 1\.4s infinite/);
  assert.match(css,/transition-delay:\.09s/);
  assert.match(css,/transition-delay:\.18s/);
  assert.match(app,/베타테스터 모집 중/);
  assert.doesNotMatch(app,/베타테스터 모집 중 · 국내 한정/);
});

test("official OWNGROUND SVG Git objects and Git-filtered working tree match approved hashes on Windows and Linux", async () => {
  const {execFileSync} = await import("node:child_process");
  const assets = [[
    "src/assets/brand/ownground-wordmark-light.svg","e3637d8dcd85418c94ac534837ad8eaf8b301933"
  ],[
    "src/assets/brand/favicon-small.svg","6c4eb7798bd22a62f78605b6a2b31bbaa64dc861"
  ]];
  for (const [filename,expected] of assets) {
    const tracked=execFileSync("git",["rev-parse","HEAD:"+filename],{encoding:"utf8"}).trim();
    const normalized=execFileSync("git",["hash-object","--path="+filename,filename],{encoding:"utf8"}).trim();
    assert.equal(tracked,expected,filename+" committed Git blob identity");
    assert.equal(normalized,expected,filename+" normalized working tree content");
  }
});

test("About Korean copy, meaning and four sections match the Owner v0.1 source", async () => {
  const about=await readFile("about/index.html","utf8");
  const required=[
    "기술보다 먼저, 문제를 이해합니다.",
    "우리는 문제가 발생하는 현실과 그 문제를 마주한 사람을 먼저 살핍니다.",
    "흩어진 정보와 서로 다른 관점을 연결하고, 사람이 스스로 판단하고 실행할 수 있는 기반을 만듭니다.",
    "OWN + GROUND",
    "OWN은 스스로 판단하고 선택하는 주도권을 뜻합니다.",
    "GROUND는 문제가 발생하는 실제 환경이자 변화가 시작되는 기반을 의미합니다.",
    "이 생각은 제조 현장에서 출발했지만, 하나의 산업에만 머무르지 않습니다.",
    "우리가 문제를 해결하는 기준",
    "실제 맥락에서 출발합니다.",
    "단절된 것을 연결합니다.",
    "기록과 의미를 이어갑니다.",
    "변화의 가능성을 남깁니다.",
    "서로 다른 문제, 같은 기준",
    "제품 살펴보기"
  ];
  for (const phrase of required) assert.ok(about.includes(phrase),phrase);
  assert.equal((about.match(/class="about-section"/g)||[]).length,4);
  assert.match(about,/href="\.\.\/"[^>]*><span data-i18n="aboutPage\.actions\.products">제품 살펴보기<\/span>/);
  assert.doesNotMatch(about,/type="submit"/);
});

test("About is directly routable; Contact stays at the email anchor rather than nonexistent route", async () => {
  const [home,about,build,preview]=await Promise.all([
    readFile("index.html","utf8"),readFile("about/index.html","utf8"),
    readFile("scripts/build.js","utf8"),readFile("scripts/preview.js","utf8")
  ]);
  assert.match(home,/href="about\/" data-i18n="nav.about"/);
  assert.match(about,/href="\.\.\/" data-i18n="nav.products"/);
  for (const html of [home,about]) {
    assert.equal((html.match(/data-language-option="/g)||[]).length,7);
    assert.match(html,/href="#contact" data-i18n="nav.contact"/);
    assert.match(html,/mailto:contact@ownground\.kr/);
    assert.doesNotMatch(html,/href="\/contact\/"/);
  }
  assert.match(build,/cp\("about", "dist\/about"/);
  assert.match(preview,/about\/index\.html/);
  assert.match(resolveRequest("/about/"),/dist[\\/]about[\\/]index\.html$/);
  assert.match(resolveRequest("/about"),/dist[\\/]about[\\/]index\.html$/);
});

test("About language keys and visible nodes are complete for all seven languages",async()=>{
  const [html,app]=await Promise.all([readFile("about/index.html","utf8"),readFile("src/app.js","utf8")]);
  assert.doesNotMatch(html,/data-about-translation-notice|currently available in Korean only/);
  assert.match(html,/<article class="about-doc" lang="ko">/);
  assert.match(html,/src="\.\.\/src\/i18n\/about\.js"/);
  assert.match(app,/article.lang=language/);
  assert.match(app,/aboutPage.meta.title/);
  assert.match(app,/aboutPage.meta.description/);
  const keys=[
    "why.title","why.paragraph1","why.paragraph2",
    "identity.title","identity.own","identity.ground","identity.meaning","identity.origin",
    "principles.title","principles.contextTitle","principles.contextBody",
    "principles.connectionTitle","principles.connectionBody",
    "principles.continuityTitle","principles.continuityBody",
    "principles.extensibilityTitle","principles.extensibilityBody",
    "application.title","application.paragraph1","application.paragraph2",
    "application.paragraph3","application.paragraph4","actions.products"
  ];
  for(const key of keys){
    const token='data-i18n="aboutPage.'+key+'"';
    assert.equal(html.split(token).length-1,1,'Missing or duplicate About node '+key);
  }
  await Promise.all(languages.map(code=>import(`../src/i18n/${code}.js`)));
  await import("../src/i18n/about.js");
  for(const code of languages){
    const pack=globalThis.OWNGROUND_MESSAGES[code].aboutPage;
    const fields=flattenKeys(pack).sort();
    assert.equal(fields.length,25,code+" About field count");
    assert.ok(pack.identity.own.includes("OWN"),code+" OWN identity");
    assert.ok(pack.identity.ground.includes("GROUND"),code+" GROUND identity");
    assert.ok(pack.identity.origin.length>24,code+" manufacturing origin");
    assert.ok(pack.principles.continuityBody.length>35,code+" preserve meaning and unverified facts");
    assert.ok(pack.application.paragraph4.length>30,code+" support human judgment");
    for(const key of fields){
      const value=key.split(".").reduce((object,part)=>object[part],pack);
      assert.ok(typeof value==="string"&&value.trim(),code+" "+key);
    }
  }
});

test("Korean Owner-approved About copy is untouched and other languages have localized philosophy",async()=>{
  await Promise.all(languages.map(code=>import(`../src/i18n/${code}.js`)));
  await import("../src/i18n/about.js");
  const packs=globalThis.OWNGROUND_MESSAGES;
  assert.equal(packs.ko.aboutPage.why.title,"기술보다 먼저, 문제를 이해합니다.");
  assert.equal(packs.ko.aboutPage.principles.continuityBody,"새로운 기술을 도입하더라도 기존 정보의 의미를 함부로 지우지 않습니다. 확인되지 않은 것은 사실로 단정하지 않습니다.");
  assert.equal(packs.ko.aboutPage.application.paragraph4,"기술은 그 판단을 대신하기 위한 목적이 아니라, 사람이 더 잘 판단하고 실행하도록 돕는 수단입니다.");
  for(const code of languages.filter(code=>code!=="ko")){
    assert.notEqual(packs[code].aboutPage.why.title,packs.ko.aboutPage.why.title);
    assert.notEqual(packs[code].aboutPage.application.paragraph4,packs.ko.aboutPage.application.paragraph4);
    assert.equal(packs[code].aboutPage.identity.title,"OWN + GROUND");
  }
});

test("product title link exists only for the verified MOP website and tooltip is not clipped",async()=>{
  const [app,css]=await Promise.all([readFile("src/app.js","utf8"),readFile("src/styles/global.css","utf8")]);
  assert.match(app,/const link=product\.links\[0\]/);
  assert.match(app,/class="titlelink"/);
  assert.match(css,/\.tooltip\{position:absolute/);
  assert.match(css,/overflow:visible/);
  assert.match(css,/\.card:has\(\.titlelink:hover\)/);
});

test("G5 fixes: SVG is served with the correct MIME and Japanese About allows safe line wrapping", async () => {
  assert.equal(contentTypes[".svg"],"image/svg+xml");
  const css=await readFile("src/styles/global.css","utf8");
  assert.ok(css.includes(".about-doc[lang=\"ja\"] :is(h1,h2,h3,p){word-break:normal;overflow-wrap:anywhere;line-break:strict}"));
  assert.match(css,/\.about-doc p\{[^}]*word-break:keep-all/);
});
