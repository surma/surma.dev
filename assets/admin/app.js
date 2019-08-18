import {Component} from "preact";
import {html} from "htm/preact";
import GalleryForm from "./gallery-form.js";
import {decode} from "../jwt.js"

const TOKEN_KEY = "token";

export default class App extends Component {
  constructor(...args) {
    super(...args);
    this.state = {
      token: this._getToken()
    };
  }

  _getToken() {
      const params = new URLSearchParams(location.search);
      if (!params.has(TOKEN_KEY)) {
        return null;
      }
      const token = params.get(TOKEN_KEY);
      const {exp} = decode(token);
      if(exp && exp > new Date().getTime()/1000) {
        return token;
      }
      return null;
  }

  render(props, {token}) {
    if(!token) {
      return html`<a href="/.netlify/functions/login?redirect=${location.pathname}">Login</a>`;
    }

    return html`<${GalleryForm} token=${token} />`;
  }
}