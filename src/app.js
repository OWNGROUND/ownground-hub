(function siteApp(){
  const {getInitialLanguage,loadLanguage,translate}=globalThis.OWNGROUND_I18N;
  const products=globalThis.OWNGROUND_PRODUCTS;
  const koreaBeta=globalThis.OWNGROUND_KOREA_BETA;
  const languageControl=document.querySelector("[data-language-control]");
  const languageToggle=document.querySelector("[data-language-toggle]");
  const languageMenu=document.querySelector("[data-language-menu]");
  const languageCurrent=document.querySelector("[data-language-current]");
  const languageOptions=[...document.querySelectorAll("[data-language-option]")];
  const grid=document.querySelector("#product-grid");
  const isAbout=document.body.dataset.page==="about";
  const arrows = `<span class="stack" aria-hidden="true">
    <svg viewBox="0 0 24 18"><path d="M5 5 L12 12 L19 5"/></svg>
    <svg viewBox="0 0 24 18"><path d="M5 5 L12 12 L19 5"/></svg>
    <svg viewBox="0 0 24 18"><path d="M5 5 L12 12 L19 5"/></svg>
  </span>`;
  const escapeHTML=(s)=>String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const labels={ko:["상세 펼치기","상세 접기"],en:["Show details","Hide details"],ja:["詳細を表示","詳細を閉じる"],es:["Ver detalles","Ocultar detalles"],vi:["Xem chi tiết","Thu gọn"],id:["Lihat detail","Tutup detail"],th:["แสดงรายละเอียด","ซ่อนรายละเอียด"]};
  function toggleLabel(language,name,opened){return `${name} ${(labels[language]||labels.en)[opened?1:0]}`;}
  function measureCard(card){
    const summary=card.querySelector(".copy");
    const button=card.querySelector(".arr");
    if(!summary||!button)return;
    const wasOpen=card.classList.contains("open");
    if(wasOpen)card.classList.remove("open");
    const overflow=summary.scrollHeight>summary.clientHeight+2;
    if(wasOpen)card.classList.add("open");
    const hasExtra=Boolean(card.querySelector(".details"));
    button.hidden=!(overflow||hasExtra);
  }
  function renderProducts(messages,language){
    if(!grid)return;
    grid.replaceChildren(...products.map(product=>{
      const card=document.createElement("article");
      card.className="card";
      card.dataset.product=product.id;
      const betaNotice=language === "ko" ? koreaBeta[product.id] : undefined;
      const link=product.links[0];
      const title=link ? `<a class="titlelink" href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(product.name+" "+(language==="ko"?"홈페이지 이동":translate(messages,"actions.website")))}">${escapeHTML(product.name)}<span class="tooltip" aria-hidden="true">${escapeHTML(product.name+" "+(language==="ko"?"홈페이지 이동":translate(messages,"actions.website")))}</span></a>` : escapeHTML(product.name);
      const status=product.id==="roundtable"&&language==="ko" ? '<span class="status">베타테스터 모집 중</span>' : "";
      const descriptionId=`summary-${product.id}`;
      const detailsId=`detail-${product.id}`;
      card.innerHTML=`
        <div class="cardhead"><div class="left">
          <h2>${title}</h2>
          <span class="badge">${escapeHTML(translate(messages,`badges.${product.status}`))}</span>
        </div>${status}</div>
        <p class="sub">${escapeHTML(translate(messages,`products.taglines.${product.id}`))}</p>
        <div class="copywrap">
          <p class="copy" id="${descriptionId}">${escapeHTML(translate(messages,`products.descriptions.${product.id}`))}</p>
          ${betaNotice ? `<p class="details" id="${detailsId}" hidden>${escapeHTML(betaNotice.body)}</p>` : ""}
        </div>
        <div class="down">
          <button class="arr" type="button" aria-label="${escapeHTML(toggleLabel(language,product.name,false))}"
                  aria-expanded="false" aria-controls="${descriptionId}${betaNotice?" "+detailsId:""}" hidden>${arrows}</button>
        </div>`;
      const toggle=card.querySelector(".arr");
      toggle.addEventListener("click",()=>{
        const opened=card.classList.toggle("open");
        toggle.setAttribute("aria-expanded",String(opened));
        toggle.setAttribute("aria-label",toggleLabel(language,product.name,opened));
        const detail=card.querySelector(".details");
        if(detail)detail.hidden=!opened;
        measureCard(card);
      });
      return card;
    }));
    requestAnimationFrame(()=>[...grid.querySelectorAll(".card")].forEach(measureCard));
  }
  function setLanguage(language){
    const messages=loadLanguage(language);
    document.documentElement.lang=language;
    document.title=isAbout?translate(messages,"aboutPage.meta.title"):translate(messages,"meta.title");
    document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=translate(messages,el.dataset.i18n));
    document.querySelectorAll("[data-i18n-aria-label]").forEach(el=>el.setAttribute("aria-label",translate(messages,el.dataset.i18nAriaLabel)));
    languageCurrent.textContent=language.toUpperCase();
    languageOptions.forEach(button=>{
      const active=button.dataset.languageOption===language;
      button.classList.toggle("is-active",active);
      button.setAttribute("aria-pressed",String(active));
    });
    if(isAbout){
      const article=document.querySelector(".about-doc");
      if(article)article.lang=language;
      const description=document.querySelector('meta[name="description"]');
      if(description)description.setAttribute("content",translate(messages,"aboutPage.meta.description"));
    }
    renderProducts(messages,language);
    try{localStorage.setItem("ownground-language",language)}catch{}
  }
  function closeLanguageMenu(restoreFocus=false){
    languageMenu.hidden=true;
    languageToggle.setAttribute("aria-expanded","false");
    if(restoreFocus)languageToggle.focus();
  }
  languageToggle.addEventListener("click",()=>{
    const willOpen=languageMenu.hidden;
    languageMenu.hidden=!willOpen;
    languageToggle.setAttribute("aria-expanded",String(willOpen));
  });
  languageOptions.forEach(button=>button.addEventListener("click",()=>{
    setLanguage(button.dataset.languageOption);
    closeLanguageMenu(true);
  }));
  document.addEventListener("click",event=>{
    if(!languageControl.contains(event.target))closeLanguageMenu();
  });
  document.addEventListener("keydown",event=>{
    if(event.key === "Escape"&&!languageMenu.hidden)closeLanguageMenu(true);
  });
  window.addEventListener("resize",()=>{
    if(grid)[...grid.querySelectorAll(".card")].forEach(measureCard);
  });
  setLanguage(getInitialLanguage());
})();
