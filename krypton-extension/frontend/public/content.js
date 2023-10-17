"use strict";

const script = document.createElement("script");
script.setAttribute("type", "module");
script.setAttribute("src", chrome.runtime.getURL("script.js"));
const head =
  document.head ||
  document.getElementsByTagName("head")[0] ||
  document.documentElement;
head.insertBefore(script, head.lastChild);
head.removeChild(script);

window.addEventListener("krypton_injected_script_message", (event) => {
  chrome.runtime.sendMessage(
    {
      channel: "krypton_contentscript_background_channel",
      data: event.detail,
    },
    (response) => {
      // Can return null response if window is killed
      if (!response) {
        return;
      }
      window.dispatchEvent(
        new CustomEvent("krypton_contentscript_message", { detail: response })
      );
    }
  );
});
