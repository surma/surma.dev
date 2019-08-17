import { set, get, del } from "idb-keyval";

const TOKEN_KEY = "token";

async function run() {
  let token = await get(TOKEN_KEY);
  const params = new URLSearchParams(location.search);
  if (params.has(TOKEN_KEY)) {
    token = params.get(TOKEN_KEY);
  }
  document.querySelector("pre").textContent = !!token
    ? "Loggen in"
    : "Logged out";
  await set(TOKEN_KEY, token);
}
run();

async function logout() {
  await del(TOKEN_KEY);
  location.reload();
}
document.querySelector("#logout").onclick = logout;
