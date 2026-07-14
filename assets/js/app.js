"use strict";

(() => {
  const state = {
    currentScreen: "homeScreen",
    quizStep: 1,
    selectedLine: null,
    resultCode: null,
    previousScreenBeforeMenu: "homeScreen",
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };

  const elements = {
    screens: [...document.querySelectorAll(".screen")],
    homeScreen: document.getElementById("homeScreen"),
    quizScreen: document.getElementById("quizScreen"),
    revealScreen: document.getElementById("revealScreen"),
    resultScreen: document.getElementById("resultScreen"),
    menuScreen: document.getElementById("menuScreen"),
    startQuizButton: document.getElementById("startQuizButton"),
    openMenuButton: document.getElementById("openMenuButton"),
    quizBackButton: document.getElementById("quizBackButton"),
    questionCaption: document.getElementById("questionCaption"),
    questionTitle: document.getElementById("questionTitle"),
    answerList: document.getElementById("answerList"),
    stepCurrent: document.getElementById("stepCurrent"),
    stepIndicator: document.querySelector(".step-indicator"),
    quizSceneImageA: document.getElementById("quizSceneImageA"),
    quizSceneImageB: document.getElementById("quizSceneImageB"),
    revealImage: document.getElementById("revealImage"),
    revealTitle: document.getElementById("revealTitle"),
    resultHomeButton: document.getElementById("resultHomeButton"),
    resultImage: document.getElementById("resultImage"),
    resultLineEn: document.getElementById("resultLineEn"),
    resultLineNumber: document.getElementById("resultLineNumber"),
    resultLine: document.getElementById("resultLine"),
    resultName: document.getElementById("resultName"),
    resultNameEn: document.getElementById("resultNameEn"),
    resultPrice: document.getElementById("resultPrice"),
    resultDescription: document.getElementById("resultDescription"),
    resultTags: document.getElementById("resultTags"),
    resultMood: document.getElementById("resultMood"),
    encoreImage: document.getElementById("encoreImage"),
    encoreLine: document.getElementById("encoreLine"),
    encoreName: document.getElementById("encoreName"),
    encoreNameEn: document.getElementById("encoreNameEn"),
    encorePrice: document.getElementById("encorePrice"),
    restartQuizButton: document.getElementById("restartQuizButton"),
    resultMenuButton: document.getElementById("resultMenuButton"),
    closeMenuButton: document.getElementById("closeMenuButton"),
    menuTitle: document.getElementById("menuTitle"),
    menuChapters: document.getElementById("menuChapters"),
    menuQuizButton: document.getElementById("menuQuizButton"),
    screenReaderStatus: document.getElementById("screenReaderStatus")
  };

  const productByCode = new Map(CAFE_PRODUCTS.map(product => [product.code, product]));
  const productsByLine = Object.fromEntries(Object.keys(CAFE_LINES).map(lineKey => [lineKey, CAFE_PRODUCTS.filter(product => product.line === lineKey)]));

  function toPersianDigits(value) {
    return String(value).replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
  }

  function formatPrice(value) {
    const hasPrice = value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
    const numericValue = hasPrice ? Number(value) : DEFAULT_PRODUCT_PRICE;
    return `${toPersianDigits(new Intl.NumberFormat("en-US").format(numericValue)).replace(/,/g, "٬")} تومان`;
  }

  function setImage(imageElement, source, altText) {
    imageElement.onerror = () => {
      imageElement.onerror = null;
      imageElement.src = DEFAULT_PRODUCT_IMAGE;
    };
    imageElement.src = source || DEFAULT_PRODUCT_IMAGE;
    imageElement.alt = altText || "تصویر نوشیدنی L Cafe";
  }

  function announce(message) {
    elements.screenReaderStatus.textContent = "";
    window.setTimeout(() => { elements.screenReaderStatus.textContent = message; }, 20);
  }

  function showScreen(screenId, focusTarget) {
    elements.screens.forEach(screen => {
      const active = screen.id === screenId;
      screen.hidden = !active;
      screen.classList.toggle("is-active", active);
      screen.setAttribute("aria-hidden", String(!active));
    });
    state.currentScreen = screenId;
    window.scrollTo({ top: 0, behavior: state.reducedMotion ? "auto" : "smooth" });
    if (focusTarget) window.setTimeout(() => focusTarget.focus({ preventScroll: true }), state.reducedMotion ? 0 : 80);
  }

  function renderQuizStep() {
    const firstStep = state.quizStep === 1;
    const content = firstStep ? QUIZ_CONTENT.first : QUIZ_CONTENT.second[state.selectedLine];
    elements.questionCaption.textContent = content.caption;
    elements.questionTitle.textContent = content.question;
    elements.stepCurrent.textContent = firstStep ? "01" : "02";
    elements.stepIndicator.setAttribute("aria-valuenow", String(state.quizStep));
    elements.quizBackButton.setAttribute("aria-label", firstStep ? "بازگشت به صفحه اول" : "بازگشت به سؤال اول");
    elements.answerList.replaceChildren();

    content.answers.forEach((answer, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-option";
      button.innerHTML = `<span class="answer-number" aria-hidden="true">0${index + 1}</span><span class="answer-label">${answer.label}</span><span class="answer-arrow" aria-hidden="true">←</span>`;
      button.addEventListener("click", () => selectAnswer(answer, button));
      elements.answerList.append(button);
    });

    updateQuizScene();
    showScreen("quizScreen", elements.questionTitle);
    announce(`مرحله ${toPersianDigits(state.quizStep)} از ۲. ${content.question}`);
  }

  function updateQuizScene() {
    if (state.quizStep === 1) {
      setImage(elements.quizSceneImageA, productsByLine.icedtea[0].image, "");
      setImage(elements.quizSceneImageB, productsByLine.refresher[0].image, "");
      return;
    }
    const lineProducts = productsByLine[state.selectedLine];
    setImage(elements.quizSceneImageA, lineProducts[0].image, "");
    setImage(elements.quizSceneImageB, lineProducts[1].image, "");
  }

  function selectAnswer(answer, button) {
    button.classList.add("is-selected");
    button.setAttribute("aria-pressed", "true");
    if (state.quizStep === 1) {
      state.selectedLine = answer.line;
      state.quizStep = 2;
      window.setTimeout(renderQuizStep, state.reducedMotion ? 0 : 170);
      return;
    }
    state.resultCode = answer.resultCode;
    window.setTimeout(() => revealResult(answer.resultCode), state.reducedMotion ? 0 : 170);
  }

  function startQuiz() {
    state.quizStep = 1;
    state.selectedLine = null;
    state.resultCode = null;
    renderQuizStep();
  }

  function goBackFromQuiz() {
    if (state.quizStep === 2) {
      state.quizStep = 1;
      state.selectedLine = null;
      renderQuizStep();
    } else {
      showScreen("homeScreen", elements.startQuizButton);
      announce("صفحه شروع");
    }
  }

  function randomEncore(mainCode) {
    const alternatives = CAFE_PRODUCTS.filter(product => product.code !== mainCode);
    return alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  function revealResult(code) {
    const product = productByCode.get(code);
    if (!product) return;
    setImage(elements.revealImage, product.image, "");
    showScreen("revealScreen", elements.revealTitle);
    announce("در حال نمایش نتیجه شما");
    const revealDuration = state.reducedMotion ? 80 : 760;
    window.setTimeout(() => renderResult(product), revealDuration);
  }

  function renderResult(product) {
    const line = CAFE_LINES[product.line];
    const encore = randomEncore(product.code);
    const encoreLine = CAFE_LINES[encore.line];

    document.documentElement.style.setProperty("--result-accent", line.accent);
    document.documentElement.style.setProperty("--result-ink", line.ink);
    elements.resultScreen.dataset.line = product.line;
    setImage(elements.resultImage, product.image, `تصویر ${product.name}`);
    elements.resultLineEn.textContent = line.name;
    elements.resultLineNumber.textContent = line.number;
    elements.resultLine.textContent = line.fa;
    elements.resultName.textContent = product.name;
    elements.resultNameEn.textContent = product.en;
    elements.resultPrice.textContent = formatPrice(product.price);
    elements.resultDescription.textContent = product.description;
    elements.resultMood.textContent = product.mood;
    elements.resultTags.replaceChildren(...product.tags.map(tag => {
      const item = document.createElement("li");
      item.textContent = tag;
      return item;
    }));

    setImage(elements.encoreImage, encore.image, `تصویر ${encore.name}`);
    elements.encoreLine.textContent = encoreLine.fa;
    elements.encoreName.textContent = encore.name;
    elements.encoreNameEn.textContent = encore.en;
    elements.encorePrice.textContent = formatPrice(encore.price);

    showScreen("resultScreen", elements.resultName);
    announce(`نتیجه شما: ${product.name}. پیشنهاد دوم تصادفی: ${encore.name}.`);
  }

  function buildMenu() {
    const fragment = document.createDocumentFragment();
    Object.values(CAFE_LINES).forEach(line => {
      const chapter = document.createElement("section");
      chapter.className = `menu-chapter menu-chapter--${line.key}`;
      chapter.id = `chapter-${line.key}`;
      chapter.dataset.line = line.key;
      chapter.style.setProperty("--chapter-accent", line.accent);
      chapter.style.setProperty("--chapter-ink", line.ink);
      const productsWrap = document.createElement("div");
      productsWrap.className = "chapter-products";
      productsByLine[line.key].forEach((product, productIndex) => productsWrap.append(createMenuProduct(product, productIndex)));
      chapter.append(productsWrap);
      fragment.append(chapter);
    });

    elements.menuChapters.replaceChildren(fragment);
  }

  function createMenuProduct(product, index) {
    const article = document.createElement("article");
    article.className = `menu-product${index % 2 ? " menu-product--reverse" : ""}`;
    article.dataset.code = product.code;

    const frame = document.createElement("div");
    frame.className = "menu-product-frame";

    const figure = document.createElement("figure");
    figure.className = "menu-product-image";
    const image = document.createElement("img");
    image.width = 1254;
    image.height = 1254;
    image.loading = "lazy";
    image.decoding = "async";
    setImage(image, product.image, `تصویر ${product.name}`);
    figure.append(image);

    const stamp = document.createElement("div");
    stamp.className = "menu-product-stamp";
    stamp.innerHTML = `<span>PORTRAIT ${String(index + 1).padStart(2, "0")}</span>`;

    const price = document.createElement("strong");
    price.className = "menu-product-price";
    price.textContent = formatPrice(product.price);
    frame.append(figure, stamp, price);

    const content = document.createElement("div");
    content.className = "menu-product-copy";
    content.innerHTML = `<p class="menu-product-sequence" dir="ltr">0${index + 1}</p><h3>${product.name}</h3><p class="menu-product-en" dir="ltr">${product.en}</p><p class="menu-product-description">${product.description}</p><ul class="menu-product-tags">${product.tags.map(tag => `<li>${tag}</li>`).join("")}</ul>`;

    article.append(frame, content);
    return article;
  }

  function openMenu(origin = state.currentScreen) {
    state.previousScreenBeforeMenu = origin === "menuScreen" ? "homeScreen" : origin;
    showScreen("menuScreen", elements.menuTitle);
    announce("منوی کامل نوشیدنی‌های تابستانی");
  }

  function closeMenu() {
    const target = state.previousScreenBeforeMenu === "resultScreen" ? "resultScreen" : "homeScreen";
    const focusTarget = target === "resultScreen" ? elements.resultMenuButton : elements.openMenuButton;
    showScreen(target, focusTarget);
  }

  function observeMenuChapters() {
    const chapterObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      document.querySelectorAll(".chapter-link").forEach(button => button.classList.toggle("is-current", button.dataset.target === visible.target.id));
    }, { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.2, 0.5] });
    document.querySelectorAll(".menu-chapter").forEach(chapter => chapterObserver.observe(chapter));
  }

  function bindEvents() {
    elements.startQuizButton.addEventListener("click", startQuiz);
    elements.openMenuButton.addEventListener("click", () => openMenu("homeScreen"));
    elements.quizBackButton.addEventListener("click", goBackFromQuiz);
    elements.resultHomeButton.addEventListener("click", () => showScreen("homeScreen", elements.startQuizButton));
    elements.restartQuizButton.addEventListener("click", startQuiz);
    elements.resultMenuButton.addEventListener("click", () => openMenu("resultScreen"));
    elements.closeMenuButton.addEventListener("click", closeMenu);
    elements.menuQuizButton.addEventListener("click", startQuiz);
    window.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      if (state.currentScreen === "menuScreen") closeMenu();
      else if (state.currentScreen === "quizScreen") goBackFromQuiz();
      else if (state.currentScreen === "resultScreen") showScreen("homeScreen", elements.startQuizButton);
    });
  }

  buildMenu();
  bindEvents();
  observeMenuChapters();
})();
