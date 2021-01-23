---
date: "2021-01-15"
live: false
---

<link rel="stylesheet" href="/lab/diagram/geometry.css" />

???

```js
console.log('asd');
```

|||geometry
 {
    width: 500,
    height: 300,
    viewBox: {
      leftX: -300,
      rightX: 200,
      topY: -150,
      bottomY: 150,
    },
    handles: {
      p: new geometry.Point(150, 20).setName("p"),
      fp: new geometry.Point(50, 0).setName("fp"),
    },
    recalculate() {
      this.handles.fp.y = 0;
      this.handles.p.x = Math.max(this.handles.p.x, this.handles.fp.x + 1);
      const lens = new geometry.Lens(new geometry.Point(0, 0), this.handles.fp, 150).addClass(
        "lens"
      );
      const lensplane = lens.asLine().addClass("lensplane");
      const { point, ray1a, ray1b, ray2a, ray2b } = lens.lensProject(
        this.handles.p
      );
      return [
        ray1a, ray1b, ray2a, ray2b, 
        lens, lensplane, 
        lens.lightRays(this.handles.p, {projectedP: point}).addClass("light")
      ];
    },
  }
|||