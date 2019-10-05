async function init() {
  const btn = document.createElement("button");
  btn.textContent = "Toggle dark mode";
  btn.classList.add("darkmode-toggle");
  document.querySelector("header").appendChild(btn);
  const darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("forcedark", darkMode);
  btn.onclick = () => {
    document.documentElement.classList.toggle("forcedark");
    document.documentElement.classList.toggle("forcelight");
  };
}
init();
