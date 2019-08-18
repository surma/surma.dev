let token;

const TOKEN_KEY = "token";
const params = new URLSearchParams(location.search);
if (params.has(TOKEN_KEY)) {
  token = params.get(TOKEN_KEY);
}

document.querySelector("form").onsubmit = async evt => {
  evt.preventDefault();
  const formData = new FormData(evt.target);
  const r = await fetch("/.netlify/functions/new_photo", {
    method: "POST",
    body: formData
  });
  if (!r.ok) {
    alert("Something went wrong");
  } else {
    alert("OK!");
    // location.reload();
  }
};
