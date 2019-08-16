import { set, get } from "idb-keyval";

async function run() {
  let token = await get("token");
  const params = new URLSearchParams(location.search);
  if (params.has("token")) {
    token = params.get("token");
  }
  document.querySelector("pre").textContent = !!token
    ? "Loggen in"
    : "Logged out";
  await set("token", token);
}
run();
