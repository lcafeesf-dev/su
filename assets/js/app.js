"use strict";

(() => {
  const state = {
    currentScreen: "homeScreen",
    quizStep: 1,
    selectedLine: null,
    resultCode: null,
    previousScreenBeforeMenu: "homeScreen",
    transitioning: false,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };

  const elements = {
    screens: [...document.querySelectorAll(".screen")],
    homeScreen: document.getElementById("homeScreen"),
    quizScreen: document.getElementById("quizScreen"),
    revealScreen: document.getElementById("revealScreen"),
    resultScreen: document.getElementById("resultScreen"),
    menuScreen: document.getElementById("menuScreen"),
    homeShowcaseImages: [document.getElementById("homeImageA"), document.getElementById("homeImageB"), document.getElementById("homeImageC")],
    menuCoverImages: [document.getElementById("menuCoverImageA"), document.getElementById("menuCoverImageB"), document.getElementById("menuCoverImageC")],
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
  const productsByLine = {};
  Object.keys(CAFE_LINES).forEach(lineKey => {
    productsByLine[lineKey] = CAFE_PRODUCTS.filter(product => product.line === lineKey);
  });
  const priceFormatter = new Intl.NumberFormat("en-US");
  let announceTimer = 0;
  let transitionTimer = 0;
  let revealTimer = 0;
  let menuBuilt = false;

  function toPersianDigits(value) {
    return String(value).replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
  }

  function formatPrice(value) {
    const hasPrice = value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
    const numericValue = hasPrice ? Number(value) : DEFAULT_PRODUCT_PRICE;
    return `${toPersianDigits(priceFormatter.format(numericValue)).replace(/,/g, "٬")} تومان`;
  }

  function setImage(imageElement, source, altText) {
    const nextSource = source || DEFAULT_PRODUCT_IMAGE;
    imageElement.onerror = () => {
      imageElement.onerror = null;
      imageElement.src = DEFAULT_PRODUCT_IMAGE;
    };
    if (imageElement.getAttribute("src") !== nextSource) imageElement.src = nextSource;
    imageElement.alt = altText !== undefined && altText !== null ? altText : "تصویر نوشیدنی L Cafe";
  }

  function randomProducts(count) {
    const linePools = Object.values(productsByLine);
    for (let index = linePools.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [linePools[index], linePools[randomIndex]] = [linePools[randomIndex], linePools[index]];
    }
    return linePools.slice(0, count).map(lineProducts => lineProducts[Math.floor(Math.random() * lineProducts.length)]);
  }

  function renderRandomShowcase(imageElements) {
    randomProducts(imageElements.length).forEach((product, index) => {
      const image = imageElements[index];
      image.loading = "eager";
      if ("fetchPriority" in image) image.fetchPriority = index === 0 ? "high" : "low";
      setImage(image, product.image, "");
    });
  }

  function announce(message) {
    window.clearTimeout(announceTimer);
    elements.screenReaderStatus.textContent = "";
    announceTimer = window.setTimeout(() => { elements.screenReaderStatus.textContent = message; }, 20);
  }

  function cancelPendingFlow() {
    window.clearTimeout(transitionTimer);
    window.clearTimeout(revealTimer);
    transitionTimer = 0;
    revealTimer = 0;
    state.transitioning = false;
  }

  function scheduleTransition(callback, delay) {
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => {
      transitionTimer = 0;
      callback();
    }, delay);
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
    state.transitioning = false;
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
      const [firstProduct, secondProduct] = randomProducts(2);
      setImage(elements.quizSceneImageA, firstProduct.image, "");
      setImage(elements.quizSceneImageB, secondProduct.image, "");
      return;
    }
    const lineProducts = productsByLine[state.selectedLine];
    setImage(elements.quizSceneImageA, lineProducts[0].image, "");
    setImage(elements.quizSceneImageB, lineProducts[1].image, "");
  }

  function selectAnswer(answer, button) {
    if (state.transitioning) return;
    state.transitioning = true;
    button.classList.add("is-selected");
    button.setAttribute("aria-pressed", "true");
    if (state.quizStep === 1) {
      state.selectedLine = answer.line;
      state.quizStep = 2;
      scheduleTransition(renderQuizStep, state.reducedMotion ? 0 : 170);
      return;
    }
    state.resultCode = answer.resultCode;
    scheduleTransition(() => revealResult(answer.resultCode), state.reducedMotion ? 0 : 170);
  }

  function startQuiz() {
    cancelPendingFlow();
    state.quizStep = 1;
    state.selectedLine = null;
    state.resultCode = null;
    renderQuizStep();
  }

  function goBackFromQuiz() {
    cancelPendingFlow();
    if (state.quizStep === 2) {
      state.quizStep = 1;
      state.selectedLine = null;
      renderQuizStep();
    } else {
      renderRandomShowcase(elements.homeShowcaseImages);
      showScreen("homeScreen", elements.startQuizButton);
      announce("صفحه شروع");
    }
  }

  function randomEncore(mainCode) {
    const mainProduct = productByCode.get(mainCode);
    const mainLine = mainProduct ? mainProduct.line : null;
    const alternatives = CAFE_PRODUCTS.filter(product => product.code !== mainCode && product.line !== mainLine);
    return alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  function revealResult(code) {
    const product = productByCode.get(code);
    if (!product) {
      state.transitioning = false;
      return;
    }
    setImage(elements.revealImage, product.image, "");
    showScreen("revealScreen", elements.revealTitle);
    announce("در حال نمایش نتیجه شما");
    const revealDuration = state.reducedMotion ? 80 : 760;
    window.clearTimeout(revealTimer);
    revealTimer = window.setTimeout(() => {
      revealTimer = 0;
      renderResult(product);
    }, revealDuration);
  }

  function renderResult(product) {
    state.transitioning = false;
    const line = CAFE_LINES[product.line];
    const encore = randomEncore(product.code);
    const encoreLine = CAFE_LINES[encore.line];

    document.documentElement.style.setProperty("--result-accent", line.accent);
    document.documentElement.style.setProperty("--result-ink", line.ink);
    elements.resultScreen.dataset.line = product.line;
    elements.resultScreen.dataset.productCode = product.code;
    setImage(elements.resultImage, product.image, `تصویر ${product.name}`);
    elements.resultLineEn.textContent = line.name;
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

    elements.encoreImage.dataset.productCode = encore.code;
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
    let imageIndex = 0;
    Object.values(CAFE_LINES).forEach(line => {
      const chapter = document.createElement("section");
      chapter.className = `menu-chapter menu-chapter--${line.key}`;
      chapter.id = `chapter-${line.key}`;
      chapter.dataset.line = line.key;
      chapter.style.setProperty("--chapter-accent", line.accent);
      chapter.style.setProperty("--chapter-ink", line.ink);
      const chapterTitle = document.createElement("h2");
      chapterTitle.className = "menu-chapter-title";
      chapterTitle.id = `chapter-title-${line.key}`;
      chapterTitle.textContent = line.fa;
      chapter.setAttribute("aria-labelledby", chapterTitle.id);
      const chapterHead = document.createElement("header");
      chapterHead.className = "menu-chapter-head";
      const chapterHeading = document.createElement("div");
      chapterHeading.className = "menu-chapter-heading";
      const chapterKicker = document.createElement("span");
      chapterKicker.className = "menu-chapter-kicker";
      chapterKicker.dir = "ltr";
      chapterKicker.textContent = line.name;
      chapterHeading.append(chapterKicker, chapterTitle);
      const chapterIntro = document.createElement("p");
      chapterIntro.textContent = line.intro;
      chapterHead.append(chapterHeading, chapterIntro);
      const productsWrap = document.createElement("div");
      productsWrap.className = "chapter-products";
      productsByLine[line.key].forEach((product, productIndex) => {
        productsWrap.append(createMenuProduct(product, productIndex, imageIndex));
        imageIndex += 1;
      });
      chapter.append(chapterHead, productsWrap);
      fragment.append(chapter);
    });

    elements.menuChapters.replaceChildren(fragment);
  }

  function createMenuProduct(product, index, imageIndex) {
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
    image.loading = imageIndex < 2 ? "eager" : "lazy";
    if ("fetchPriority" in image) image.fetchPriority = imageIndex < 2 ? "high" : "low";
    image.decoding = "async";
    setImage(image, product.image, `تصویر ${product.name}`);
    figure.append(image);

    const price = document.createElement("strong");
    price.className = "menu-product-price";
    price.textContent = formatPrice(product.price);
    frame.append(figure);

    const content = document.createElement("div");
    content.className = "menu-product-copy";
    content.innerHTML = `<h3>${product.name}</h3><p class="menu-product-en" dir="ltr">${product.en}</p><p class="menu-product-description">${product.description}</p><ul class="menu-product-tags">${product.tags.map(tag => `<li>${tag}</li>`).join("")}</ul>`;

    const heading = document.createElement("div");
    heading.className = "menu-product-heading";
    const title = content.querySelector("h3");
    title.before(heading);
    heading.append(title);

    const meta = document.createElement("div");
    meta.className = "menu-product-meta";
    const tags = content.querySelector(".menu-product-tags");
    tags.before(meta);
    meta.append(tags, price);

    article.append(frame, content);
    return article;
  }

  function openMenu(origin = state.currentScreen) {
    if (!menuBuilt) {
      buildMenu();
      menuBuilt = true;
    }
    renderRandomShowcase(elements.menuCoverImages);
    state.previousScreenBeforeMenu = origin === "menuScreen" ? "homeScreen" : origin;
    showScreen("menuScreen", elements.menuTitle);
    announce("منوی کامل نوشیدنی‌های تابستانی");
  }

  function closeMenu() {
    const target = state.previousScreenBeforeMenu === "resultScreen" ? "resultScreen" : "homeScreen";
    const focusTarget = target === "resultScreen" ? elements.resultMenuButton : elements.openMenuButton;
    if (target === "homeScreen") renderRandomShowcase(elements.homeShowcaseImages);
    showScreen(target, focusTarget);
    announce(target === "resultScreen" ? `بازگشت به نتیجه ${elements.resultName.textContent}` : "صفحه شروع");
  }

  function goHome() {
    cancelPendingFlow();
    renderRandomShowcase(elements.homeShowcaseImages);
    showScreen("homeScreen", elements.startQuizButton);
    announce("صفحه شروع");
  }

  function bindEvents() {
    elements.startQuizButton.addEventListener("click", startQuiz);
    elements.openMenuButton.addEventListener("click", () => openMenu("homeScreen"));
    elements.quizBackButton.addEventListener("click", goBackFromQuiz);
    elements.resultHomeButton.addEventListener("click", goHome);
    elements.restartQuizButton.addEventListener("click", startQuiz);
    elements.resultMenuButton.addEventListener("click", () => openMenu("resultScreen"));
    elements.closeMenuButton.addEventListener("click", closeMenu);
    elements.menuQuizButton.addEventListener("click", startQuiz);
    window.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      if (state.currentScreen === "menuScreen") closeMenu();
      else if (state.currentScreen === "quizScreen") goBackFromQuiz();
      else if (state.currentScreen === "resultScreen") goHome();
    });
  }

  renderRandomShowcase(elements.homeShowcaseImages);
  bindEvents();
})();
