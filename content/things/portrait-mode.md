---
title: "Why your phone’s portrait mode fakes the blur"
date: "2021-01-15"
live: false
# socialmediaimage: "social.png"
---

Portrait mode blurs out the part of the image that is in the background to make it look... “better”. Turns out the reason for this is physics more than anything else.

<!-- more -->

<link rel="stylesheet" href="/lab/diagram/geometry.css" />

Alright, I will admit: The titular question is not actually the question that prompted me to write this article. What I was trying to figure out if the [significantly bigger sensor in the Ricoh GR III will give let me use a thinner depth of field than the Canon PowerShot G7 X Mark III][camera comparison]. I started researching to understand Depth of Field (DoF), which is the area in your camera’s view that is considered “in focus”. The more I got into it, the more I realized that the underlying physics also explain why on your phone’s camera pretty much _everything_ is in focus. But before we can talk about cameras and sensors, we have to go back to high school and catch up on some basic optics!

## Lenses and light rays
_Real_ lenses, and especially real _camera_ lenses are quite complicated. To keep it somewhat manageable, I wil assume that we are working with “perfect” lenses throughout this article. They don’t have any chromatic abberation (i.e. they don’t bend different wave lengths differently), they don’t have vignetting (i.e. the don’t lose light at the edges) and they are “thin” lenses (i.e. they can be modeled with simplified formulas). I will also only look at bi-convex lenses. While real camera lenses contain all kinds of lenses (concave, convex-concave, aspherical, etc), they aim to behave like a single biconvex lens.

The two most important parameters of a lens for this excursion is its focal length $f$ and diameter $D$. The diameter is literally that, determining the size of the piece of glass. The smaller focal length $f$, the more the light rays are bent. The bigger the focal length $f$, the less they get bent. In the our case of “thin lenses”, the focal length forms a tool for us to _geometrically_ construct where light rays get focused. The rule is that rays that enter the lens parallel to the lens axis, will intersect in the focal point.

<figure>

|||geometry
 {
    width: 500,
    height: 300,
    viewBox: {
      leftX: -200,
      rightX: 300,
      topY: -150,
      bottomY: 150,
    },
    handles: {
      fp: new geometry.Point(150, 0).setName("fp"),
    },
    recalculate() {
      const rayGap = 14;
      this.handles.fp.y = 0;
      this.handles.fp.x = Math.max(this.handles.fp.x, 5);
      const lensCenter = new geometry.Point(0, 0);
      const lens = new geometry.Lens(lensCenter, this.handles.fp.difference(lensCenter), 150);
      const lensplane = lens.asLine();
      const lensaxis = lens.axis();
      const fp = lens.focalPoint();
      const otherFp = lens.otherFocalPoint();
      const axis = lens.axis();
      const top = lens.top();
      const rays = Array.from({length: Math.round(lens.aperture / rayGap)}).map((_, i) => {
        const p1 = top.add(lensplane.pointAtDistance(-i * rayGap)).addSelf(new geometry.Point(-999, 0));
        const p2 = lensplane.project(p1);
        const ray = new geometry.HalfSegment(p2, p1);
        return [
          ray,
          new geometry.Arrow(ray.pointAtDistance(40), p1),
          new geometry.HalfSegment(p2, fp)
        ];
      }).flat();
      const bottomLine = new geometry.Line(new geometry.Point(0, 120), new geometry.Point(1, 0));
      const focalLengthStart = bottomLine.project(lens.bottom());
      return [
        ...rays.map(r => r.addClass("ray")),
        lens.addClass("lens"), 
        lensplane.addClass("lensplane"), 
        otherFp,
        axis.addClass("axis"),
        new geometry.MeasureLine(focalLengthStart, bottomLine.project(this.handles.fp)).addClass("focallength"),
        new geometry.Text(this.handles.fp.add(new geometry.Point(10, -5)), "Focal point"),
        new geometry.Text(lensplane.pointAtDistance(120), "Lens plane"),
        new geometry.Text(axis.pointAtDistance(-180), "Lens axis"),
        new geometry.Text(focalLengthStart.add(new geometry.Point(5, -5)), "Focal length"),
      ];
    },
  }
|||

<figcaption>Rays that enter the lens parallel to the lens axis will intersect the focal point.<br>(Orange points are interactive!)</figcaption>
</figure>




<figure>

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
      p: new geometry.Point(150, 0.01).setName("p"),
      fp: new geometry.Point(50, 0).setName("fp"),
    },
    recalculate() {
      this.handles.fp.y = 0;
      this.handles.p.x = Math.max(this.handles.p.x, this.handles.fp.x + 1);
      const lensCenter = new geometry.Point(0, 0);
      const lens = new geometry.Lens(lensCenter, this.handles.fp.difference(lensCenter), 150);
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
        axis.addClass("axis"),
        new geometry.Text(axis.pointAtDistance(-280), "Lens Axis"),
        new geometry.Text(lensplane.pointAtDistance(120), "Lens Plane"),
        new geometry.Text(this.handles.fp.add(new geometry.Point(10, -5)), "Focal point"),
      ];
    },
  }
|||

<figcaption>A lens focuses light rays onto a point.</figcaption>

</figure>

<figure>

|||geometry
 {
    width: 500,
    height: 300,
    viewBox: {
      leftX: 0,
      rightX: 500,
      topY: -150,
      bottomY: 150,
    },
    handles: {
      p: new geometry.Point(350, -120).setName("p"),
      op: new geometry.Point(480, 10).setName("l"),
    },
    recalculate() {
      const f = 50;
      this.handles.p.y = -120;
      this.handles.p.x = Math.max(4*f, this.handles.p.x);
      const lens = new geometry.Lens(new geometry.Point(0, 0), new geometry.Point(f, 0), 3*f);

      const focalplane = new geometry.Line(this.handles.p, new geometry.Point(0, 1));
      const sensorplane = new geometry.Line(new geometry.Point(0, 0), new geometry.Point(0, 1));
      const sensorTop = sensorplane.pointAtDistance(120);
      const sensorBottom = sensorplane.pointAtDistance(-120);
      const sensor = new geometry.Segment(sensorTop, sensorBottom);
      const pointToSensor = this.handles.p.x - sensor.point.x;
      const dlp = pointToSensor/2 + Math.sqrt(pointToSensor**2/4 - pointToSensor * f);
      const dsl = pointToSensor - dlp;
      lens.center.x = sensor.point.x + dsl;

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
        p.addClass("image"),
        new geometry.Text(this.handles.p.add(new geometry.Point(10, 0)), "Focal plane"),
        new geometry.Text(new geometry.Point(10, -120), "Sensor plane"),
      ];
    },
  }
|||

<figcaption>A lens focuses light rays onto a point.</figcaption>

</figure>

<figure>

|||geometry
 {
    width: 500,
    height: 300,
    viewBox: {
      leftX: 0,
      rightX: 500,
      topY: -150,
      bottomY: 150,
    },
    handles: {
      fp: new geometry.Point(999, 0).setName("fp")
    },
    recalculate() {
      const f = 30;
      const lensCenter = new geometry.Point(1.2*f, 0);
      // Make the handle stay on a circle around the lens center
      this.handles.fp = this.handles.fp.difference(lensCenter).normalizeSelf().scalarSelf(3*f).addSelf(lensCenter);
      const lens = new geometry.Lens(lensCenter, this.handles.fp.difference(lensCenter).normalizeSelf().scalarSelf(f), 2*f);

      const sensorplane = new geometry.Line(new geometry.Point(0, 0), new geometry.Point(0, -1));
      const sensorTop = sensorplane.pointAtDistance(20);
      const sensorBottom = sensorplane.pointAtDistance(-20);
      const sensor = new geometry.Arrow(sensorBottom, sensorTop);

      const {point: projectedSensorTop} = lens.lensProject(sensorTop);
      const {point: projectedSensorBottom} = lens.lensProject(sensorBottom);
      const projectedSensorPlane = geometry.Line.throughPoints(projectedSensorTop, projectedSensorBottom);
      const projectedSensor = new geometry.Arrow(projectedSensorBottom, projectedSensorTop);

      const topLine = new geometry.Line(new geometry.Point(0, -70), new geometry.Point(1, 0));
      return [
        lens.addClass("lens"),
        lens.asLine().addClass("lensplane"),
        lens.axis().addClass("lensplane"),
        sensorplane.addClass("sensorplane"),
        sensor.addClass("sensor"),
        projectedSensor.addClass("sensor"),
        projectedSensorPlane.addClass("sensorplane"),
        new geometry.Text(projectedSensorPlane.intersect(topLine).add(new geometry.Point(10, 0)), "Focal plane"),
        new geometry.Text(new geometry.Point(10, -120), "Sensor plane"),
      ];
    },
  }
|||

<figcaption>A lens focuses light rays onto a point.</figcaption>

</figure>

This journey started in the context of camera lenses, but camera lenses are complext beasts. Even the simplest, so-called “prime lenses”, which are have one fixed focal length and cannot zoom, _are_ actually zoom lenses and consist of multiple lenses. We will discover _some_ of the reasons for this overwhelming amount of lenses later in this article.

<figure>
  <img src="camera-lens.jpg" style="max-width: 700px">
  <figcaption>Camera lenses consist of multiple lenses.</figcaption>
</figure>

For most intents and purposes, these series of individual lenses

[camera comparison]: https://www.dpreview.com/products/compare/side-by-side?products=ricoh_griii&products=canon_g7xiii