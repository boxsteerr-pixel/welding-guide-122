(function () {
  "use strict";
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;

  const notice = document.createElement("div");
  notice.className = "pwa-update-notice";
  notice.hidden = true;
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  const label = document.createElement("span");
  label.textContent = "发现新版操作手册";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "立即更新";
  notice.append(label, button);
  document.body.append(notice);

  let registration;
  let requested = false;
  let watched;
  function checkWaiting() {
    if (registration.waiting && navigator.serviceWorker.controller) notice.hidden = false;
  }
  function watchInstalling() {
    const worker = registration.installing;
    if (!worker || worker === watched) return;
    watched = worker;
    worker.addEventListener("statechange", function () {
      if (worker.state === "installed") checkWaiting();
    });
  }
  button.addEventListener("click", function () {
    if (!registration || !registration.waiting) return;
    requested = true;
    button.disabled = true;
    button.textContent = "正在更新…";
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  });
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (requested) location.reload();
  });
  navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).then(function (result) {
    registration = result;
    registration.addEventListener("updatefound", watchInstalling);
    watchInstalling();
    checkWaiting();
    if (navigator.onLine !== false) registration.update().catch(function () {});
  }).catch(function () {});
  window.addEventListener("online", function () {
    if (registration) registration.update().catch(function () {});
  });
})();
