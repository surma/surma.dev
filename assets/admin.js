import { SURMBLOG_AWS_BUCKET_NAME, SURMBLOG_AWS_BUCKET_REGION } from "env:";
import { decode } from "./jwt.js";
import unindent from "./unindent.js";
import { render } from "preact";
import { html } from "htm/preact";

const TOKEN_KEY = "token";

function getToken() {
  const params = new URLSearchParams(location.search);
  if (params.has(TOKEN_KEY)) {
    return params.get(TOKEN_KEY);
  }
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

async function submit(evt) {
  evt.preventDefault();
  const { dateField, fileField, locationField } = evt.target;
  const file = fileField.files[0];
  const fileExt = ext(file.name);
  const buffer = await new Response(file).arrayBuffer();
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
            location: ${locationField.value}
            date: ${dateField.value}
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
}

async function init() {
  let token = getToken();
  if (!token) {
    render(
      html`
        <a href="/.netlify/functions/login">Login</a>
      `,
      document.body
    );
    return;
  }

  render(
    html`
      <form enctype="multipart/form-data" onSubmit=${submit}>
        <label>
          Publish date:
          <input
            type="date"
            name="dateField"
            value=${new Date().toISOString().replace(/T.+$/, "")}
            required
          />
        </label>
        <label>
          Location:
          <input type="text" name="locationField" required />
        </label>
        <label>
          File:
          <input type="file" name="fileField" required />
        </label>
        <input type="submit" value="Publish" />
      </form>
    `,
    document.body
  );
}
init();
