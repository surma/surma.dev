import { html, render, svg } from "lit1.3.0/lit-html.js";

export class Geometry {
  name = "";
  cssClasses = [];

  addClass(...classes) {
    this.cssClasses.push(...classes);
    return this;
  }

  setName(name) {
    this.name = name;
    return this;
  }
}

export class Point extends Geometry {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }

  differenceSelf(other) {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  copy() {
    return new Point(this.x, this.y);
  }

  difference(other) {
    return this.copy().differenceSelf(other);
  }

  orthogonalSelf() {
    [this.x, this.y] = [this.y, -this.x];
    return this;
  }

  orthogonal() {
    return this.copy().orthogonalSelf();
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }

  scalarSelf(f) {
    this.x *= f;
    this.y *= f;
    return this;
  }

  scalar(f) {
    return this.copy().scalarSelf(f);
  }

  addSelf(other) {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  add(other) {
    return this.copy().addSelf(other);
  }

  negateSelf() {
    this.x *= -1;
    this.y *= -1;
    return this;
  }

  negate() {
    return this.copy().negateSelf();
  }

  normalizeSelf() {
    const l = this.length();
    this.x /= l;
    this.y /= l;
    return this;
  }

  normalize() {
    return this.copy().normalizeSelf();
  }

  length() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  render() {
    return svg`<circle cx=${this.x} cy=${
      this.y
    } r=5 class=${this.cssClasses.join(" ")} data-type="point" data-name=${
      this.name
    } />`;
  }

  isInVicinity(x, y, delta = 5) {
    return Math.abs(x - this.x) < delta && Math.abs(y - this.y) < delta;
  }

  distanceTo(other) {
    return this.difference(other).length();
  }

  mirrorOnSelf(other) {
    return this.differenceSelf(other).negate().addSelf(other);
  }

  mirrorOn(other) {
    return this.copy().mirrorOnSelf(other);
  }

  toSVG(withComma = true) {
    return [this.x, this.y].join(withComma ? "," : " ");
  }
}

export class Line extends Geometry {
  constructor(point, direction) {
    super();
    this.point = point;
    this.direction = direction.normalizeSelf();
  }

  static throughPoints(p1, p2) {
    return new Line(p1, p1.difference(p2));
  }

  project(p) {
    return this.direction.scalar(
      p.dotProduct(this.direction) / this.direction.dotProduct(this.direction)
    );
  }

  render() {
    const p1 = this.point.add(this.direction.copy().scalarSelf(-1000));
    const p2 = this.point.add(this.direction.copy().scalarSelf(1000));
    return svg`<line x1=${p1.x} x2=${p2.x} y1=${p1.y} y2=${
      p2.y
    } stroke=black class=${this.cssClasses.join(
      " "
    )} data-type="line" data-name=${this.name} />`;
  }

  intersect(other) {
    const p1 = this.point.copy();
    const p2 = this.point.add(this.direction);
    const p3 = other.point.copy();
    const p4 = other.point.add(other.direction);

    const tn = (p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x);
    const td = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    const t = tn / td;
    return this.point.add(this.direction.scalar(t));
  }
}

export class Segment extends Line {
  constructor(p1, p2) {
    super(p1, p2.difference(p1));
    this.p1 = p1;
    this.p2 = p2;
  }
  render() {
    return svg`<line x1=${this.p1.x} x2=${this.p2.x} y1=${this.p1.y} y2=${
      this.p2.y
    } stroke=black class=${this.cssClasses.join(
      " "
    )} data-type="line" data-name=${this.name} />`;
  }
}

export class HalfSegment extends Segment {
  constructor(p1, p2) {
    super(p1, p2);
  }

  static withDirection(p1, direction) {
    return new HalfSegment(p1, p1.add(direction));
  }
  render() {
    const p2 = this.p1.add(this.direction.scalar(1000));
    return svg`<line x1=${this.p1.x} x2=${p2.x} y1=${this.p1.y} y2=${
      p2.y
    } stroke=black class=${this.cssClasses.join(
      " "
    )} data-type="line" data-name=${this.name} />`;
  }
}

export class Lens extends Geometry {
  constructor(center, fp, aperture) {
    super();
    this.center = center;
    this.fp = fp;
    this.aperture = aperture;
  }

  asLine() {
    const direction = this.fp.difference(this.center).orthogonalSelf();
    return new Line(this.center, direction);
  }

  otherFocalPoint() {
    return this.fp.mirrorOn(this.center);
  }

  render() {
    const lensPlane = this.asLine().addClass("lensplane");
    const fp1 = this.fp;
    const fp2 = this.otherFocalPoint();
    const dir = this.fp.difference(this.center).normalizeSelf();

    const top = this.center.add(
      lensPlane.direction.scalar(this.aperture / 2)
    );
    const bottom = top.mirrorOn(this.center);
    const r = this.aperture * 3;
    const thickness = 10;
    return svg`
      <g data-name=${this.name} data-type="lens" class=${this.cssClasses.join(
      " "
    )}>
        <path class="lens" d="M ${top.toSVG()} l ${dir
      .scalar(thickness / 2)
      .toSVG()} A ${r} ${r} 0 0 1 ${bottom
      .add(dir.scalar(thickness / 2))
      .toSVG()} l ${dir
      .scalar(-thickness)
      .toSVG()} A ${r} ${r} 0 0 1 ${top
      .add(dir.scalar(-thickness / 2))
      .toSVG()} z" />
        ${lensPlane.render()}
        ${fp1.render()}
        ${fp2.render()}
      </g>
    `;
  }

  lensProject(p) {
    const lensPlane = this.asLine();
    let fp = this.fp;
    let otherFp = this.otherFocalPoint();
    if (p.distanceTo(otherFp) < p.distanceTo(fp)) {
      [fp, otherFp] = [otherFp, fp];
    }
    const ray1a = new Segment(p, lensPlane.project(p));
    const ray1b = new HalfSegment(lensPlane.intersect(ray1a), otherFp);
    const lensp = new HalfSegment(p, fp).intersect(lensPlane);
    const ray2a = new Segment(p, lensp);
    const ray2b = HalfSegment.withDirection(
      lensp,
      otherFp.difference(fp).normalizeSelf()
    );
    const point = ray2b.intersect(ray1b);
    return { point, ray1a, ray1b, ray2a, ray2b };
  }
}

function serializeViewBox(vb) {
  return `${vb.leftX} ${vb.topY} ${vb.rightX - vb.leftX} ${
    vb.bottomY - vb.topY
  }`;
}

// function flipsFromVie

export function instantiateDiagram(diagram, target) {
  let draggedHandle = null;
  function screenToSvgCoordinates(svg, x, y) {
    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [svgP.x, svgP.y];
  }
  function mousedown(ev) {
    const svg = ev.target.closest("svg");
    const [x, y] = screenToSvgCoordinates(svg, ev.clientX, ev.clientY);
    const itemName = Object.entries(diagram.handles).find(([name, item]) =>
      item.isInVicinity(x, y)
    )?.[0];
    if (itemName) {
      draggedHandle = itemName;
    }
  }
  function mousemove(ev) {
    if (!draggedHandle) {
      return;
    }
    const svg = ev.target.closest("svg");
    const pt = diagram.handles[draggedHandle];
    [pt.x, pt.y] = screenToSvgCoordinates(svg, ev.clientX, ev.clientY);
    rerender();
  }
  function mouseup(ev) {
    draggedHandle = null;
  }
  function rerender() {
    render(
      html`
        <svg
          @mousedown=${mousedown}
          @mousemove=${mousemove}
          @mouseup=${mouseup}
          width=${diagram.width}
          height=${diagram.height}
          viewBox=${serializeViewBox(diagram.viewBox)}
        >
          ${diagram.recalculate().map((item) => item.render())}
          ${Object.values(diagram.handles).map((item) => item.render())}
        </svg>
      `,
      target
    );
  }
  rerender();
}