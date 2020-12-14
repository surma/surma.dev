export async function init(KEY, set) {
  let darkMode = document.documentElement.classList.contains("forcedark");

  const btn = document.createElement("button");
  btn.textContent = "Toggle dark mode";
  btn.classList.add("darkmode-toggle");
  document.querySelector("header").appendChild(btn);

  btn.onclick = async () => {
    darkMode = !darkMode
    set(darkMode);
  };
}