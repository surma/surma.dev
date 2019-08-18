import { render } from "preact";
import { html } from "htm/preact";
import App from "./admin/app.js";

render(
  html`
    <${App} />
  `,
  document.body
);
