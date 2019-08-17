import { set, get, del } from "idb-keyval";

const TOKEN_KEY = "token";

async function run() {
  let token = await get(TOKEN_KEY);
  const params = new URLSearchParams(location.search);
  if (params.has(TOKEN_KEY)) {
    token = params.get(TOKEN_KEY);
    await set(TOKEN_KEY, token);
    location.search = "";
    return;
  }
  document.querySelector("pre").textContent = !!token
    ? "Loggen in"
    : "Logged out";
}
run();

async function logout() {
  await del(TOKEN_KEY);
  location.reload();
}
document.querySelector("#logout").onclick = logout;

document.querySelector("#create").onclick = async () => {
  const token = await get(TOKEN_KEY);
  if (!token) {
    aler("Not logged in");
    return;
  }
  const r = await fetch(`/.netlify/functions/new_photo`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!r.ok) {
    alert("Failure");
    console.log(r);
    return;
  }
  alert("DONE");
};
