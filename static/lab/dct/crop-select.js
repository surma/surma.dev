/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

customElements.define("crop-select", class extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({mode: "open"});
    this._cvs = document.createElement("canvas");
    this._ctx = this._cvs.getContext("2d");
    this._cvs.addEventListener("mousedown", this._onDown.bind(this));
    this._cvs.addEventListener("mousemove", this._onMove.bind(this));
    this._cvs.addEventListener("mouseup", this._onUp.bind(this));
    this.shadowRoot.append(this._cvs);
    this._x = this._y = 0;
    this._scale = 1;
    this._width = this._height = 64;
    this._moving = false;
    this._img = {
      width: 0,
      height: 0
    };
  }

  set scale(v) {
    this._scale = v;
    this._update();
  }

  set img(v) {
    this._img = v;
    this._update();
  }

  _update() {
    try {
      Object.assign(this._cvs, {width: this._img.width * this._scale, height: this._img.height * this._scale});
      this._repaint(true);
      this.dispatchEvent(new Event("change"));
    } catch(e) {}
  }

  crop() {
    this._repaint(false);
    const d = this._ctx.getImageData(this._x, this._y, this._width, this._height);
    this._repaint(true);
    return d;
  }

  _repaint(drawRect) {
    this._ctx.drawImage(this._img, 0, 0, this._img.width, this._img.height, 0, 0, this._cvs.width, this._cvs.height);
    if(drawRect) {
      this._ctx.strokeStyle = 'red';
      this._ctx.strokeRect(this._x, this._y, this._width, this._height);
    }
  }

  _onDown(ev) {
    this._moving = true;
  }

  _onUp(ev) {
    this._moving = false;
  }


  _onMove(ev) {
    if(!this._moving) {
      return;
    }
    this._x = ev.offsetX;
    this._y = ev.offsetY;
    this._repaint(true);
    this.dispatchEvent(new Event("change"));
  }
});
