import { decode } from "./jwt.js";

let token;

const TOKEN_KEY = "token";
const params = new URLSearchParams(location.search);
if (params.has(TOKEN_KEY)) {
  token = params.get(TOKEN_KEY);
}

document.querySelector("form").onsubmit = async evt => {
  evt.preventDefault();
  const { access_token, token_type } = decode(token);
  const r = await fetch(
    "https://api.github.com/repos/surma/surma.github.io/contents/test123.txt",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token_type} ${access_token}`
      },
      body: JSON.stringify({
        message: "New file from SurmBlog Admin interface",
        content: btoa("ohai")
      })
    }
  );
  if (!r.ok) {
    alert("Gone wrong");
  } else {
    alert("ok");
  }
  // const formData = new FormData(evt.target);
  // const r = await fetch("/.netlify/functions/new_photo", {
  //   method: "POST",
  //   body: formData
  // });
  // if (!r.ok) {
  //   alert("Something went wrong");
  // } else {
  //   alert("OK!");
  //   // location.reload();
  // }
};
