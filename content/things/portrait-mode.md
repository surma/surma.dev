---
title: "Why your phone’s portrait mode needs to fake the blur"
date: "2021-01-15"
live: false
# socialmediaimage: "social.png"
---

<link rel="stylesheet" href="/lab/diagram/geometry.css" />

<picture>

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
      const lens = new geometry.Lens(new geometry.Point(0, 0), this.handles.fp, 150);
      const lensplane = lens.asLine()
      const otherFp = lens.otherFocalPoint();
      const axis = lens.axis();
      const { point, ray1a, ray1b, ray2a, ray2b } = lens.lensProject(
        this.handles.p
      );
      const {polygon, ray1, ray2} = lens.lightRays(this.handles.p, {projectedP: point});
      return [
        ...[ray1a, ray1b, ray2a, ray2b].map(v => v.addClass("constructionray")),
        lens.addClass("lens"), 
        lensplane.addClass("lensplane"), 
        polygon.addClass("light"),
        otherFp,
        axis.addClass("axis")
      ];
    },
  }
|||

<figcaption>A lens focuses light rays onto a point.</figcaption>

</picture>

<picture>

|||geometry
 {
    width: 500,
    height: 300,
    viewBox: {
      leftX: -80,
      rightX: 420,
      topY: -150,
      bottomY: 150,
    },
    handles: {
      p: new geometry.Point(150, 20).setName("p"),
      op: new geometry.Point(400, 10).setName("l"),
    },
    recalculate() {
      this.handles.p.y = 0;
      const f = 50;
      const lens = new geometry.Lens(new geometry.Point(0, 0), new geometry.Point(f, 0), 3*f);

      const focalplane = new geometry.Line(this.handles.p, new geometry.Point(0, 1));
      const sensorplane = new geometry.Line(new geometry.Point(-50, 0), new geometry.Point(0, 1));
      const sensorTop = sensorplane.pointAtDistance(120);
      const sensorBottom = sensorplane.pointAtDistance(-120);
      const sensor = new geometry.Segment(sensorTop, sensorBottom);
      const pointToSensor = this.handles.p.x - sensor.point.x;
      const dlp = pointToSensor/2 + Math.sqrt(pointToSensor**2/4 - pointToSensor * f);
      const dsl = pointToSensor - dlp;
      lens.center.x = sensor.point.x + dsl;
      lens.fp.x = lens.center.x + f;

      const {polygon, ray1, ray2} = lens.lightRays(this.handles.op);
      const p1 = sensorplane.intersect(ray1);
      const p2 = sensorplane.intersect(ray2);
      const p = new geometry.Segment(p1, p2);
      return [
        sensorplane.addClass("sensorplane"),
        focalplane.addClass("focalplane"),
        sensor.addClass("sensor"),
        lens.addClass("lens"),
        polygon.addClass("light"),
        p.addClass("image")
      ];
    },
  }
|||

<figcaption>A lens focuses light rays onto a point.</figcaption>

</picture>