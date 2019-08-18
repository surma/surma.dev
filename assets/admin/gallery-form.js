import { SURMBLOG_AWS_BUCKET_NAME, SURMBLOG_AWS_BUCKET_REGION } from "env:";

import { Component } from "preact";
import { html } from "htm/preact";

import { decode } from "../jwt.js";
import unindent from "../unindent.js";

function toDateInputValue(date) {
  return date.toISOString().replace(/T.+$/, "");
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

export default class App extends Component {
  constructor(...args) {
    super(...args);
    this.state = {
      date: toDateInputValue(new Date()),
      state: "waiting"
    };

    this._submit = this._submit.bind(this);
  }

  _submitButtonLabel() {
    switch (this.state.state) {
      case "waiting":
        return "Publish";
      case "processing":
        return "Processing...";
      case "uploading":
        return "Uploading...";
      case "publishing":
        return "Publishing...";
      default:
        return "???";
    }
  }

  _isSubmitDisabled() {
    if (this.state.state !== "waiting") {
      return true;
    }
    if (!this.state.date || !this.state.location || !this.state.file) {
      return true;
    }
    return false;
  }

  render(props, { date, location, file, error }) {
    return html`
      <form enctype="multipart/form-data" onSubmit=${this._submit}>
        <label>
          Publish date:
          <input
            type="date"
            name="dateField"
            value=${date}
            onChange=${ev => this.setState({ date: ev.target.value })}
            required
          />
        </label>
        <label>
          Location:
          <input
            type="text"
            name="locationField"
            onChange=${ev => this.setState({ location: ev.target.value })}
            required
          />
        </label>
        <label>
          File:
          <input
            type="file"
            name="fileField"
            onChange=${ev => this.setState({ file: ev.target.files[0] })}
            required
          />
        </label>
        <input
          type="submit"
          value=${this._submitButtonLabel()}
          disabled=${this._isSubmitDisabled()}
        />
        ${error
          ? html`
              <pre>${error}</pre>
            `
          : null}
      </form>
    `;
  }

  async _submit(evt) {
    evt.preventDefault();
    const { date, location, file } = this.state;
    const { token } = this.props;
    this.setState({ state: "processing" });
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
    this.setState({ state: "uploading" });
    const signingReq = await fetch("/.netlify/functions/sign_request", {
      method: "POST",
      body: JSON.stringify(req),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    if (!signingReq.ok) {
      this.setState({
        error: `Could not sign upload request: ${await resp.text()}`
      });
      return;
    }
    const signedReq = await signingReq.json();
    const url = new URL(signedReq.path, `https://${signedReq.host}`).toString();
    const upload = await fetch(url, {
      ...signedReq,
      body: buffer
    });
    if (!upload.ok) {
      this.setState({
        error: `Could not upload to S3: ${await upload.text()}`
      });
      return;
    }
    const { access_token, token_type } = decode(token);
    this.setState({ state: "publishing" });
    const publishReq = await fetch(
      `https://api.github.com/repos/surma/surma.github.io/contents/content/photography/${date}.md`,
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
              location: ${location}
              date: ${date}
              live: true
              ---
            `)
          )
        })
      }
    );
    if (!publishReq.ok) {
      this.setState({
        error: `Could not commit to GitHub: ${await publishReq.text()}`
      });
      return;
    }
    this.setState({ state: "waiting" });
  }
}
