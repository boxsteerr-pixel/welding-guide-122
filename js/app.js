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

  // Route hashes must not match content element IDs: native fragment scrolling hides the header.
  function sectionFromHash() {
    const name = location.hash.replace(/^#(?:section=)?/, "");
    return sectionNames.includes(name) ? name : "home";
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
    if (!options || !options.fromHistory) history.pushState({ section: name }, "", `#section=${name}`);
    window.scrollTo({ top: 0, behavior: options && options.initial ? "instant" : "smooth" });
    const searchPanel = document.querySelector(".search-panel");
    if (searchPanel) searchPanel.hidden = name !== "home" && name !== "faults";
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
    details.id = `procedure-${item.id}`;
    details.dataset.risk = item.risk || "medium";
    const summary = document.createElement("summary");
    const risk = document.createElement("span");
    risk.className = `risk ${item.risk || "medium"}`;
    risk.append(text(riskLabels[item.risk] || riskLabels.medium));
    const title = document.createElement("span");
    title.append(text(item.title || "未命名项目"));
    summary.append(title);

    const body = document.createElement("div");
    body.className = "entry-body";
    if (item.risk) body.append(risk);
    if (item.summary) {
      const paragraph = document.createElement("p");
      paragraph.append(text(item.summary));
      body.append(paragraph);
    }
    appendList(body, "检查要点", item.checks, false);
    appendList(body, "停止并上报", item.stopConditions, false);

    if (Array.isArray(item.steps) && item.steps.length) {
      const heading = document.createElement("h4");
      heading.append(text(item.presentation === "alternatives" ? "退出方法（两种方法可选）" : "处置步骤"));
      body.append(heading);
      item.steps.forEach(function (step, index) {
        const card = document.createElement("div");
        card.className = "step-card";
        const strong = document.createElement("strong");
        strong.append(text(`${step.label || `步骤 ${index + 1}`} · ${step.title || "操作"}`));
        const paragraph = document.createElement("p");
        paragraph.append(text(step.text || ""));
        card.append(strong, paragraph);
        if (step.image) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "step-image-button";
          button.setAttribute("aria-label", `放大：${step.title}`);
          button.append(buildVisual(step, false));
          button.addEventListener("click", function () { openImage(button, step); });
          const hint = document.createElement("span");
          hint.className = "image-hint";
          hint.append(text("点图放大 · 双指缩放 · 拖动查看"));
          card.append(button, hint);
          if (step.markers && step.markers.length) {
            const legend = document.createElement("ol");
            legend.className = "marker-legend";
            step.markers.forEach(function (marker, i) {
              const li = document.createElement("li");
              const badge = document.createElement("b"); badge.append(text(i + 1));
              li.append(badge, text(marker.label)); legend.append(li);
            });
            card.append(legend);
          }
        }
        body.append(card);
      });
    }
    (item.notes || []).forEach(function (note) {
      const box = document.createElement("aside"); box.className = "procedure-note";
      const h = document.createElement("h4"); h.append(text(note.title));
      const p = document.createElement("p"); p.append(text(note.text));
      box.append(h, p); body.append(box);
    });
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
    if (!filtered.length) {
      container.append(emptyState());
      if (normalizedQuery) {
        container.querySelector("h3").textContent = "没有找到匹配异常";
        container.querySelector("p").textContent = "请尝试其他关键词，或清空搜索查看全部项目。";
      }
    }
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
    const homeFaults = document.querySelector("#home-faults");
    homeFaults.replaceChildren();
    if (!manual.faults.length) homeFaults.append(emptyState());
    manual.faults.slice(0, 4).forEach(function (item, index) {
      const row = document.createElement("button");
      row.type = "button"; row.className = "fault-row"; row.dataset.entryIndex = index;
      const number = document.createElement("b"); number.append(text(index + 1));
      const copy = document.createElement("span");
      const title = document.createElement("strong"); title.append(text(item.title));
      const summary = document.createElement("small"); summary.append(text(item.summary || "查看处置步骤"));
      copy.append(title, summary);
      const arrow = document.createElement("em"); arrow.setAttribute("aria-hidden", "true"); arrow.append(text("›"));
      row.append(number, copy, arrow); homeFaults.append(row);
    });
    const keywords = document.querySelector("#quick-keywords");
    keywords.replaceChildren();
    const quickKeywords = Array.isArray(manual.quickKeywords) ? manual.quickKeywords : manual.faults.flatMap(function (item) { return Array.isArray(item.keywords) ? item.keywords : []; });
    Array.from(new Set(quickKeywords.filter(function (value) { return typeof value === "string" && value.trim(); }))).slice(0, 16).forEach(function (word) {
      const button = document.createElement("button"); button.type = "button"; button.dataset.keyword = word; button.append(text(word)); keywords.append(button);
    });
    if (!keywords.childNodes.length) keywords.append(text("内容录入后显示快捷关键词"));
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
    // Confirm only the version actually loaded and fully rendered, never a clicked link.
    if (window.WeldingUpdates) window.WeldingUpdates.markViewed(manual.machine);
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
    const keyword = event.target.closest("[data-keyword]");
    if (keyword) {
      document.querySelector("#search-input").value = keyword.dataset.keyword;
      document.querySelector("#search-form").requestSubmit();
    }
    const entry = event.target.closest("[data-entry-index]");
    if (entry && state.manual) {
      state.query = ""; document.querySelector("#search-input").value = "";
      setText("#search-summary", "");
      renderCollection("#fault-list", state.manual.faults);
      showSection("faults");
      const details = document.querySelectorAll("#fault-list details")[Number(entry.dataset.entryIndex)];
      if (details) { details.open = true; details.scrollIntoView({ behavior:"smooth", block:"start" }); }
    }
    const expansion = event.target.closest("[data-expand]");
    if (expansion) document.querySelectorAll("#fault-list details").forEach(function (entry) { entry.open = expansion.dataset.expand === "true"; });
    const navigation = event.target.closest("[data-section], [data-go]");
    if (navigation) showSection(navigation.dataset.section || navigation.dataset.go);
  });

  document.querySelector("#search-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!state.manual) return;
    state.query = document.querySelector("#search-input").value;
    showSection("faults");
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
    if (event.state && event.state.image && imageContext) return openImage(imageContext.source, imageContext.step, true);
    if (!document.querySelector("#image-modal").hidden) return closeImage(false);
    showSection((event.state && event.state.section) || sectionFromHash(), { fromHistory: true });
  });

  function buildVisual(step, full) {
    const visual = document.createElement("div"); visual.className = "procedure-visual";
    const size = step.imageSize;
    const crop = full ? [0, 0, size[0], size[1]] : step.crop || [0, 0, size[0], size[1]];
    visual.style.aspectRatio = `${crop[2]} / ${crop[3]}`;
    const img = document.createElement("img");
    img.src = step.image; img.alt = step.alt; img.loading = "lazy"; img.draggable = false;
    img.width = size[0]; img.height = size[1];
    img.style.cssText = `width:${size[0] / crop[2] * 100}%;left:${-crop[0] / crop[2] * 100}%;top:${-crop[1] / crop[3] * 100}%;`;
    visual.append(img);
    (step.markers || []).forEach(function (marker, i) {
      const r = marker.rect;
      const box = document.createElement("span"); box.className = "figure-marker";
      box.setAttribute("aria-hidden", "true");
      box.style.cssText = `left:${(r[0]-crop[0])/crop[2]*100}%;top:${(r[1]-crop[1])/crop[3]*100}%;width:${r[2]/crop[2]*100}%;height:${r[3]/crop[3]*100}%;`;
      const badge = document.createElement("b"); badge.append(text(i + 1)); box.append(badge); visual.append(box);
    });
    return visual;
  }

  const modal = document.querySelector("#image-modal");
  const modalFrame = document.querySelector("#modal-frame");
  const modalViewport = document.querySelector(".image-modal__viewport");
  let imageContext = null;
  let imageHistoryClosing = false;
  let scale = 1, offsetX = 0, offsetY = 0;
  let fullImage = false;
  const pointers = new Map();
  let gesture = null;
  let pointerStartedOnImage = false;

  function applyImageTransform() {
    modalFrame.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    setText("#zoom-level", `${Math.round(scale * 100)}%`);
  }
  function resetImage() { scale = 1; offsetX = 0; offsetY = 0; pointers.clear(); gesture = null; applyImageTransform(); }
  function fitFrame() {
    if (!imageContext || modal.hidden) return;
    const s = imageContext.step;
    const c = fullImage ? [0, 0, ...s.imageSize] : s.crop;
    const width = Math.min(modalViewport.clientWidth - 24, (modalViewport.clientHeight - 20) * c[2] / c[3]);
    modalFrame.style.width = `${width}px`;
  }
  function refreshModalVisual() {
    modalFrame.replaceChildren(buildVisual(imageContext.step, fullImage));
    const img = modalFrame.querySelector("img"); img.id = "modal-image"; img.loading = "eager";
    document.querySelector("#image-view-toggle").textContent = fullImage ? "看细节" : "看全图";
    fitFrame(); resetImage();
  }
  function openImage(source, step, fromHistory) {
    if (!fromHistory) imageContext = { source, step, x: window.scrollX, y: window.scrollY };
    imageHistoryClosing = false; fullImage = false;
    modal.hidden = false; document.body.classList.add("modal-open");
    setText("#image-caption", imageContext.step.title);
    setText("#image-legend", (imageContext.step.markers || []).map((m, i) => `${i + 1} ${m.label}`).join("　·　"));
    refreshModalVisual();
    if (!fromHistory) history.pushState({ image: true, section: state.section }, "", location.href);
    document.querySelector(".image-modal__close").focus({ preventScroll: true });
  }
  function closeImage(useHistory) {
    if (useHistory !== false && history.state && history.state.image) {
      if (!imageHistoryClosing) { imageHistoryClosing = true; history.back(); } return;
    }
    modal.hidden = true; document.body.classList.remove("modal-open"); modalFrame.replaceChildren();
    resetImage(); imageHistoryClosing = false;
    if (imageContext) {
      const position = imageContext;
      if (position.source.isConnected) position.source.focus({ preventScroll: true });
      const restore = () => window.scrollTo({ left: position.x, top: position.y, behavior: "instant" });
      restore(); window.requestAnimationFrame(function () { if (modal.hidden) restore(); });
    }
  }
  document.querySelector(".image-modal__close").addEventListener("click", () => closeImage());
  document.querySelector("#image-view-toggle").addEventListener("click", () => { fullImage = !fullImage; refreshModalVisual(); });
  const annotationButton = document.querySelector("#image-markers-toggle");
  annotationButton.addEventListener("click", () => {
    const hidden = modalFrame.classList.toggle("hide-markers");
    annotationButton.setAttribute("aria-pressed", String(!hidden));
  });
  modal.addEventListener("click", function (event) { if (event.target === modalViewport && !pointerStartedOnImage) closeImage(); });
  modal.querySelectorAll("[data-zoom]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (button.dataset.zoom === "reset") return resetImage();
      scale = Math.min(6, Math.max(1, scale + (button.dataset.zoom === "in" ? .5 : -.5)));
      if (scale === 1) offsetX = offsetY = 0;
      applyImageTransform();
    });
  });
  function startGesture() {
    const p = Array.from(pointers.values());
    if (p.length === 2) {
      const cx = (p[0].x+p[1].x)/2, cy = (p[0].y+p[1].y)/2;
      const bounds = modalViewport.getBoundingClientRect();
      gesture = { distance: Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y), scale,
        x: offsetX, y: offsetY, cx, cy, centerX: bounds.x+bounds.width/2, centerY: bounds.y+bounds.height/2 };
    } else if (p.length === 1) gesture = { px:p[0].x, py:p[0].y, x:offsetX, y:offsetY };
    else gesture = null;
  }
  modalViewport.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerStartedOnImage = Boolean(e.target.closest("#modal-frame"));
    if (!pointerStartedOnImage) return;
    e.preventDefault(); modalViewport.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, {x:e.clientX,y:e.clientY}); startGesture();
  });
  modalViewport.addEventListener("pointermove", function (e) {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, {x:e.clientX,y:e.clientY});
    const p = Array.from(pointers.values());
    if (p.length === 2 && gesture.distance) {
      const g=gesture, cx=(p[0].x+p[1].x)/2, cy=(p[0].y+p[1].y)/2;
      scale = Math.min(6, Math.max(1, g.scale * Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y) / g.distance));
      offsetX=cx-g.centerX-(g.cx-g.centerX-g.x)*scale/g.scale;
      offsetY=cy-g.centerY-(g.cy-g.centerY-g.y)*scale/g.scale;
    } else if (p.length === 1 && scale > 1) {
      offsetX=gesture.x+p[0].x-gesture.px; offsetY=gesture.y+p[0].y-gesture.py;
    }
    if (scale === 1) offsetX = offsetY = 0;
    applyImageTransform();
  });
  function endPointer(e) { pointers.delete(e.pointerId); startGesture(); }
  ["pointerup","pointercancel","lostpointercapture"].forEach(type => modalViewport.addEventListener(type,endPointer));
  window.addEventListener("resize", () => { fitFrame(); resetImage(); });
  window.addEventListener("keydown", function (event) {
    if (modal.hidden) return;
    if (event.key === "Escape") closeImage();
    if (event.key === "Tab") {
      const buttons = Array.from(modal.querySelectorAll("button"));
      const next = (buttons.indexOf(document.activeElement)+(event.shiftKey ? -1 : 1)+buttons.length)%buttons.length;
      event.preventDefault(); buttons[next].focus();
    }
  });

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
    if (!state.deferredInstallPrompt) { document.querySelector("#install-hint").hidden = false; return; }
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

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.addEventListener("hashchange", function () {
    const name = location.hash.replace(/^#(?:section=)?/, "");
    if (!sectionNames.includes(name)) return;
    history.replaceState({ section: name }, "", `#section=${name}`);
    showSection(name, { fromHistory: true, initial: true });
  });
  const initialSection = sectionFromHash();
  history.replaceState({ section: initialSection }, "", `#section=${initialSection}`);
  showSection(initialSection, { fromHistory: true, initial: true });
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) window.scrollTo({ top: 0, behavior: "instant" });
  });
  loadManual().catch(showLoadError);
})();
