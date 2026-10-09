(function () {
  "use strict";
  const node = document.querySelector("#currentTime");
  if (!node) return;
  function updateCurrentTime() {
    const now = new Date();
    const value = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    node.textContent = value;
    node.dateTime = value;
  }
  updateCurrentTime();
  window.setInterval(updateCurrentTime, 30000);
  window.addEventListener("pageshow", updateCurrentTime);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) updateCurrentTime();
  });
})();
