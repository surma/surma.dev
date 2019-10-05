import { get, set } from "idb-keyval";

const KEY = "darkmode";
async function init() {
  let darkMode = await get(KEY);
  if (typeof darkMode !== "boolean") {
    darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  const btn = document.createElement("button");
  btn.textContent = "Toggle dark mode";
  btn.classList.add("darkmode-toggle");
  document.querySelector("header").appendChild(btn);

  document.documentElement.classList.toggle("forcedark", darkMode);
  btn.onclick = async () => {
    document.documentElement.classList.toggle("forcedark");
    document.documentElement.classList.toggle("forcelight");
    await set(KEY, document.documentElement.classList.contains("forcedark"));
  };
}
init();
