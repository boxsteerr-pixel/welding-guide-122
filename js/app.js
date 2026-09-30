(function () {
  "use strict";

  const state = { manual: null, section: "home", query: "", deferredInstallPrompt: null };
  const sectionNames = ["home", "faults", "maintenance", "safety"];
  const riskLabels = { high: "高风险", medium: "注意", low: "一般" };

  function text(value) {
    return document.createTextNode(value == null ? "" : String(value));
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function showSection(name, options) {
    if (!sectionNames.includes(name)) name = "home";
    state.section = name;
    document.querySelectorAll("[data-page]").forEach(function (section) {
      section.classList.toggle("active", section.dataset.page === name);
    });
    document.querySelectorAll("[data-section]").forEach(function (button) {
      const active = button.dataset.section === name;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    if (!options || !options.fromHistory) history.pushState({ section: name }, "", `#${name}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "faults") document.querySelector("#search-input").focus({ preventScroll: true });
  }

  function appendList(parent, title, values, ordered) {
    if (!Array.isArray(values) || !values.length) return;
    const heading = document.createElement("h4");
    heading.append(text(title));
    const list = document.createElement(ordered ? "ol" : "ul");
    values.forEach(function (value) {
      const li = document.createElement("li");
      li.append(text(typeof value === "string" ? value : value.text));
      list.append(li);
    });
    parent.append(heading, list);
  }

  function buildEntry(item) {
    const details = document.createElement("details");
    details.className = "manual-entry";
    details.dataset.risk = item.risk || "medium";
    const summary = document.createElement("summary");
    const risk = document.createElement("span");
    risk.className = `risk ${item.risk || "medium"}`;
    risk.append(text(riskLabels[item.risk] || riskLabels.medium));
    const title = document.createElement("span");
    title.append(text(item.title || "未命名项目"));
    summary.append(risk, title);

    const body = document.createElement("div");
    body.className = "entry-body";
    if (item.summary) {
      const paragraph = document.createElement("p");
      paragraph.append(text(item.summary));
      body.append(paragraph);
    }
    appendList(body, "检查要点", item.checks, false);
    appendList(body, "停止并上报", item.stopConditions, false);

    if (Array.isArray(item.steps) && item.steps.length) {
      const heading = document.createElement("h4");
      heading.append(text("处置步骤"));
      body.append(heading);
      item.steps.forEach(function (step, index) {
        const card = document.createElement("div");
        card.className = "step-card";
        const strong = document.createElement("strong");
        strong.append(text(`步骤 ${index + 1} · ${step.title || "操作"}`));
        const paragraph = document.createElement("p");
        paragraph.append(text(step.text || ""));
        card.append(strong, paragraph);
        if (step.image) {
          const image = document.createElement("img");
          image.src = step.image;
          image.alt = step.alt || step.title || item.title || "操作步骤图片";
          image.loading = "lazy";
          image.addEventListener("click", function () { openImage(image); });
          const hint = document.createElement("span");
          hint.className = "image-hint";
          hint.append(text("点击查看大图"));
          card.append(image, hint);
        }
        body.append(card);
      });
    }
    details.append(summary, body);
    return details;
  }

  function emptyState() {
    return document.querySelector("#empty-template").content.cloneNode(true);
  }

  function searchableText(item) {
    return JSON.stringify(item).toLocaleLowerCase("zh-CN");
  }

  function renderCollection(selector, items, query) {
    const container = document.querySelector(selector);
    container.replaceChildren();
    const normalizedQuery = (query || "").trim().toLocaleLowerCase("zh-CN");
    const filtered = normalizedQuery ? items.filter(function (item) { return searchableText(item).includes(normalizedQuery); }) : items;
    if (!filtered.length) container.append(emptyState());
    else filtered.forEach(function (item) { container.append(buildEntry(item)); });
    return filtered.length;
  }

  function renderManual(manual) {
    state.manual = manual;
    const machine = manual.machine;
    document.title = `${machine.machineName} · ${machine.manualTitle}`;
    setText("#machine-name", machine.machineName);
    setText("#manual-title", machine.manualTitle);
    setText("#machine-state", machine.contentStatus);
    setText("#manual-version", `版本 ${machine.manualVersion} · 更新 ${machine.lastUpdated}`);
    setText("#footer-machine", machine.machineName);
    setText("#footer-version", machine.manualVersion);
    setText("#fault-count", manual.faults.length);
    setText("#maintenance-count", manual.maintenance.length);
    setText("#safety-count", manual.safety.length);

    const notices = document.querySelector("#notices");
    notices.replaceChildren();
    manual.notices.forEach(function (item) {
      const box = document.createElement("div");
      box.className = `notice notice--${item.level || "info"}`;
      const title = document.createElement("strong");
      const body = document.createElement("p");
      title.append(text(item.title));
      body.append(text(item.body));
      box.append(title, body);
      notices.append(box);
    });
    renderCollection("#fault-list", manual.faults, state.query);
    renderCollection("#maintenance-list", manual.maintenance);
    renderCollection("#safety-list", manual.safety);
  }

  async function loadManual() {
    const response = await fetch("./data/manual.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`手册数据读取失败：${response.status}`);
    const manual = await response.json();
    ["faults", "maintenance", "safety", "notices"].forEach(function (key) {
      if (!Array.isArray(manual[key])) throw new Error(`手册数据缺少数组：${key}`);
    });
    if (!manual.machine || !manual.machine.machineId) throw new Error("手册数据缺少设备配置");
    renderManual(manual);
  }

  function showLoadError(error) {
    console.error(error);
    const notices = document.querySelector("#notices");
    notices.innerHTML = "";
    const box = document.createElement("div");
    box.className = "notice";
    const title = document.createElement("strong");
    const body = document.createElement("p");
    title.append(text("手册数据暂时无法读取"));
    body.append(text("请检查网络后刷新；若已安装，可确认离线资源是否完成更新。"));
    box.append(title, body);
    notices.append(box);
  }

  document.addEventListener("click", function (event) {
    const navigation = event.target.closest("[data-section], [data-go]");
    if (navigation) showSection(navigation.dataset.section || navigation.dataset.go);
  });

  document.querySelector("#search-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!state.manual) return;
    state.query = document.querySelector("#search-input").value;
    const count = renderCollection("#fault-list", state.manual.faults, state.query);
    setText("#search-summary", state.query.trim() ? `找到 ${count} 项结果` : "");
  });

  document.querySelector("#search-input").addEventListener("input", function (event) {
    if (!event.target.value && state.manual) {
      state.query = "";
      renderCollection("#fault-list", state.manual.faults);
      setText("#search-summary", "");
    }
  });

  window.addEventListener("popstate", function (event) {
    if (!document.querySelector("#image-modal").hidden) return closeImage(false);
    showSection((event.state && event.state.section) || location.hash.slice(1) || "home", { fromHistory: true });
  });

  const modal = document.querySelector("#image-modal");
  const modalImage = document.querySelector("#modal-image");
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let dragStart = null;
  let pinchStart = null;

  function applyImageTransform() {
    modalImage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  }

  function resetImage() { scale = 1; offsetX = 0; offsetY = 0; applyImageTransform(); }

  function openImage(source) {
    modalImage.src = source.currentSrc || source.src;
    modalImage.alt = source.alt;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    resetImage();
    history.pushState({ image: true }, "", location.href);
    document.querySelector(".image-modal__close").focus();
  }

  function closeImage(useHistory) {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    modalImage.removeAttribute("src");
    resetImage();
    if (useHistory !== false && history.state && history.state.image) history.back();
  }

  document.querySelector(".image-modal__close").addEventListener("click", function () { closeImage(); });
  modal.addEventListener("click", function (event) { if (event.target === modal) closeImage(); });
  modal.querySelectorAll("[data-zoom]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (button.dataset.zoom === "reset") return resetImage();
      scale = Math.min(4, Math.max(1, scale + (button.dataset.zoom === "in" ? .4 : -.4)));
      if (scale === 1) { offsetX = 0; offsetY = 0; }
      applyImageTransform();
    });
  });
  modalImage.addEventListener("pointerdown", function (event) {
    if (scale <= 1) return;
    modalImage.setPointerCapture(event.pointerId);
    dragStart = { x: event.clientX - offsetX, y: event.clientY - offsetY };
  });
  modalImage.addEventListener("pointermove", function (event) {
    if (!dragStart) return;
    offsetX = event.clientX - dragStart.x;
    offsetY = event.clientY - dragStart.y;
    applyImageTransform();
  });
  modalImage.addEventListener("pointerup", function () { dragStart = null; });
  modalImage.addEventListener("touchstart", function (event) {
    if (event.touches.length === 2) {
      pinchStart = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY) / scale;
    }
  }, { passive: true });
  modalImage.addEventListener("touchmove", function (event) {
    if (event.touches.length === 2 && pinchStart) {
      const distance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
      scale = Math.min(4, Math.max(1, distance / pinchStart));
      applyImageTransform();
    }
  }, { passive: true });
  modalImage.addEventListener("touchend", function () { pinchStart = null; }, { passive: true });
  window.addEventListener("keydown", function (event) { if (event.key === "Escape" && !modal.hidden) closeImage(); });

  function updateNetworkStatus() {
    const node = document.querySelector("#network-status");
    node.textContent = navigator.onLine ? "在线" : "离线";
    node.classList.toggle("offline", !navigator.onLine);
  }
  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
  updateNetworkStatus();

  const installButton = document.querySelector("#install-button");
  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener("click", async function () {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener("appinstalled", function () { state.deferredInstallPrompt = null; installButton.hidden = true; });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).catch(function (error) {
        console.error("设备手册 Service Worker 注册失败", error);
      });
    });
  }

  const initialSection = sectionNames.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
  history.replaceState({ section: initialSection }, "", `#${initialSection}`);
  showSection(initialSection, { fromHistory: true });
  loadManual().catch(showLoadError);
})();
