/* Shared protocol; each PWA keeps its own copy and independent cache. */
(function () {
  "use strict";
  const prefix = "welding-guide-updates:";
  const ids = ["108", "102", "122", "202", "401", "411", "502"];
  function version(machine) {
    return machine && ids.includes(machine.machineId) &&
      typeof machine.manualVersion === "string" && machine.manualVersion.trim()
      ? machine.manualVersion.trim() : null;
  }
  function read(kind, id) {
    try { return localStorage.getItem(prefix + kind + ":" + id); }
    catch (_) { return null; }
  }
  function write(kind, id, value) {
    try { localStorage.setItem(prefix + kind + ":" + id, value); return true; }
    catch (_) { return false; }
  }
  window.WeldingUpdates = {
    version: version,
    latest: function (id) { return read("latest", id); },
    seen: function (id) { return read("seen", id); },
    rememberLatest: function (machine) {
      const value = version(machine);
      return value ? write("latest", machine.machineId, value) : false;
    },
    markViewed: function (machine) {
      const value = version(machine);
      return value ? write("seen", machine.machineId, value) : false;
    }
  };
})();
