import { decode } from "./jwt.js";
let token;

const TOKEN_KEY = "token";
const params = new URLSearchParams(location.search);
if (params.has(TOKEN_KEY)) {
  token = params.get(TOKEN_KEY);
}

async function shaHash(buffer, hash = "SHA-256") {
  const digest = await crypto.subtle.digest(hash, buffer);
  return [...new Uint8Array(digest)].map(o => o.toString(16)).join("");
}

document.querySelector("form").onsubmit = async evt => {
  evt.preventDefault();
  const file = evt.target.file.files[0];
  const buffer = await new Response(file).arrayBuffer();
  const hash = await shaHash(buffer);
  const req = {
    host: "s3.eu-west-1.amazonaws.com",
    method: "PUT",
    path: `/photography.dassur.ma/${hash}.jpg`,
    headers: {
      "Content-Length": buffer.length,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD"
    }
  };
  const signedReq = await (await fetch("/.netlify/functions/sign_request", {
    method: "POST",
    body: JSON.stringify(req),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  })).json();
  const url = new URL(signedReq.path, `https://${signedReq.host}`).toString();
  const upload = await fetch(url, {
    ...signedReq,
    body: buffer
  });
  return;
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
