import { SURMBLOG_AWS_BUCKET_NAME, SURMBLOG_AWS_BUCKET_REGION } from "env:";
import { decode } from "./jwt.js";
import unindent from "./unindent.js";
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

function ext(name) {
  const match = /\.([^.]+)$/.exec(name);
  if (!match) {
    return "";
  }
  return match[1];
}

document.querySelector("form").onsubmit = async evt => {
  evt.preventDefault();
  const { date, file, location } = evt.target;
  const fileExt = ext(file.files[0].name);
  const buffer = await new Response(file.files[0]).arrayBuffer();
  const hash = await shaHash(buffer);
  const req = {
    host: `s3.${SURMBLOG_AWS_BUCKET_REGION}.amazonaws.com`,
    method: "PUT",
    path: `/${SURMBLOG_AWS_BUCKET_NAME}/${hash}.${fileExt}`,
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
  if (!upload.ok) {
    alert("Upload to S3 failed");
    return;
  }
  const { access_token, token_type } = decode(token);
  const r = await fetch(
    `https://api.github.com/repos/surma/surma.github.io/contents/content/photography/${date.value}.md`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token_type} ${access_token}`
      },
      body: JSON.stringify({
        message: "New file from SurmBlog Admin interface",
        content: btoa(
          unindent(`
          ---
          file: ${hash}.${fileExt}
          location: ${location.value}
          date: ${date.value}
          live: true
          ---
        `)
        )
      })
    }
  );
  if (!r.ok) {
    alert("Gone wrong");
  } else {
    alert("ok");
  }
};
