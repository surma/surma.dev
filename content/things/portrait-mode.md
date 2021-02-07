---
title: "Why your phone’s portrait mode fakes the blur"
date: "2021-01-15"
live: false
# socialmediaimage: "social.png"
---

Portrait mode blurs out the part of the image that is in the background to make it look... “better”. Turns out the reason for this is physics more than anything else.

<!-- more -->

<link rel="stylesheet" href="/lab/diagram/geometry.css" />

Alright, I will admit: The titular question is not actually the question that prompted me to write this article. What I was trying to figure out if the [significantly bigger sensor in the Ricoh GR III will give let me use a thinner depth of field than the Canon PowerShot G7 X Mark III][camera comparison]. I started researching to understand Depth of Field (DoF), which is the area in your camera’s view that is considered “in focus”. The more I got into it, the more I realized that the underlying physics also explain why on your phone’s camera pretty much _everything_ is in focus. 

<figure>
  <img src="./comparison.jpg" width="1280" height="563">
  <figcaption>
    Left: Picture taken  on my Pixel 5.<br>
    Middle: The same picture, but in “Portrait mode”.<br>
    Right: A picture taken with my (full-frame) Canon EOS R with my zoom lens at 48mm at f/2.8.<br>
    All pictures cropped to the same aspect ratio (2:3) and slightly color-graded.
</figure>

But before we can talk about cameras and sensors and what these numbers mean, we have to go back to high school and catch up on some basic optics!

## Optics
In the earlier days of photography, lenses were simple. Today’s lenses, on the other hand, are quite complicated. They fulfil the same purpose, but with a whole bunch of benefits over their earlier counterparts. To keep this article somewhat manageable, I will focus on the earlier simpler lenses. Not only that, but I will assume that we are working with “perfect” lenses throughout this article. They don’t have any chromatic abberation (i.e. they don’t bend different wave lengths differently), they don’t have vignetting (i.e. the don’t lose light at the edges) and they are “thin” lenses (i.e. they can be modeled with simplified formulas). I will also only look at spherical, bi-convex lenses. Those lenses are convex on both sides (have a belly-like shape) and their curvature is that of a sphere. Contemporary camera lenses contain all kinds of lenses (concave, convex-concave, aspherical, etc).

### Lenses

The two most important parameters of a lens for this excursion is its focal length $f$ and diameter $A$. The diameter is literally that, determining the size of the piece of glass. The focal length describes the distance of the center of the lens to the focal point, which also the center of the circle (or sphere, rather) that gives the lens its curvature. The smaller the focal length, the more the light rays are bent torwards the focal point when they pass through the lens. The bigger the focal length $f$, the less they get bent. For thin lenses, rule is that rays that enter the lens parallel to the lens axis, will intersect the focal point.

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
      const aperture = 150;
      this.handles.fp.y = 0;
      this.handles.fp.x = Math.max(this.handles.fp.x, aperture/3);
      const lensCenter = new geometry.Point(0, 0);
      const lens = new geometry.Lens(lensCenter, this.handles.fp.difference(lensCenter), aperture);
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

The reverse works as well: Rays that enter the lens by crossing the focal point will exit the lens parallel to the lens axis. This rule is surprisingly powerful and will allow us to derive a whole lot of interesting facts.

> **Note:** You’ll notice that lenses with a short focal length are anything but thin. We’ll still pretend that they fall into the “thin lens” category for the remainder of this article.

Light in real life is barely ever parallel, but rather radiating out into all directions. More specifically, apart from a few notable exceptions (like mirrors), every material reflects the light that it is hit by evenly into all directions. Let’s imagine we have a point that sends light rays into all directions and we put it on one side of our lens. Considering that people were able to take pictures with these simple lenses, there has to be a place on the other side of the lens where all the light rays geet focused back into a single point. 

While there will be light rays hitting every part of our lens, we only need to focus on two of them to figure this out: The one light ray that is parallel to the lens axis, and the other ray that intersects the focal point. We know how these rays will behave and they will (most likely) also intersect on the _other_ side of the lens. And where these two lines cross, all other rays will intersect as well.

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
      p: new geometry.Point(-150, -20).setName("p"),
      fp: new geometry.Point(50, 0).setName("fp"),
    },
    recalculate() {
      const lensCenter = new geometry.Point(0, 0);
      this.handles.fp.y = 0;
      const lens = new geometry.Lens(lensCenter, this.handles.fp.difference(lensCenter), 150);

      this.handles.p.x = Math.min(this.handles.p.x, lens.otherFocalPoint().x - 1);
      const lensplane = lens.asLine()
      const otherFp = lens.otherFocalPoint();
      const axis = lens.axis();
      const { point, ray1a, ray1b, ray2a, ray2b } = lens.lensProject(
        this.handles.p
      );
      const {polygon, ray1, ray2} = lens.lightRays(this.handles.p, {projectedP: point});
      const bottomLine = new geometry.Line(new geometry.Point(0, 120), new geometry.Point(1, 0));
      return [
        ...[ray1a, ray1b, ray2a, ray2b].map(v => v.addClass("constructionray")),
        lens.addClass("lens"), 
        lensplane.addClass("lensplane"), 
        polygon.addClass("light"),
        otherFp,
        axis.addClass("axis"),
        new geometry.Text(this.handles.fp.add(new geometry.Point(10, -5)), "Focal point"),
        point,
        new geometry.MeasureLine(bottomLine.project(lensCenter), bottomLine.project(this.handles.p)).addClass("focallength"),
        new geometry.MeasureLine(bottomLine.project(lensCenter), bottomLine.project(point)).addClass("focallength"),
        new geometry.Text(bottomLine.project(lensCenter).add(new geometry.Point(-20, -5)), "s"),
        new geometry.Text(bottomLine.project(lensCenter).add(new geometry.Point(20, -5)), "s'"),
      ];
    },
  }
|||

<figcaption>A lens focuses light rays onto a point.</figcaption>

</figure>

The point on the left is often just called “object”, while point on the right is called the “image”. From this _geometric_ construction we can derive a nice formula describing the relationship between the object’s distance and the image’s distance from the center of the lens:

<figure>

$$
\frac{1}{s} + \frac{1}{s'} = \frac{1}{f}
$$

<figcaption>

The “thin lens equation” describes the relationship between the object’s distance $s$, and the image’s distance $s'$ and the lens’ focal length $f$.

</figcaption>
</figure>

### The image plane & the focal plane

You’ll notice that if you move the object parallel to the lens plane, the image will also move parallel to the lens plane, although in the opposite direction. This tells us two things: Firstly, the image is upside down. Secondly, instead of talking about individual points and where their image is, we can talk about the “image plane” and the focal plane”. We have now entered the territory of photography.

To take a picture we have to have something that... takes the picture. Yes. Very good explanation. In analogue photography, that is the film or photo paper, in digital cameras — and for the remainder of this article — it’s the sensor. The distance of the sensor to the lens determines which part of the world is “in focus”. The size of the sensor, combined with the focal length of the lens determines the angle of view that will be capture. While some cameras and lenses allow you to have arbitrary angles between image plane and lens plane, we will keep them parallel to each other. For now.

Note that in all the previous diagrams the direction of the light is actually irrellevant. The roles of object and image can be reversed and the diagrams wouldn’t change. With this observation, we can answer the question where the focal plane is. We can place our sensor on one side of the lens, and project it through the lens. The “image” of the sensor is the area of the real world that is in focus; the part of the world that will be projected onto the sensor.

<figure>

|||geometry
 {
    width: 800,
    height: 300,
    viewBox: {
      leftX: -150,
      rightX: 650,
      topY: -150,
      bottomY: 150,
    },
    handles: {
      l: new geometry.Point(100, 0),
      s: new geometry.Point(-80, -50),
      fp: new geometry.Point(220, 0),
    },
    recalculate() {
      this.handles.s.x = this.viewBox.leftX + 20;
      this.handles.s.y = Math.min(this.handles.s.y, 1);
      this.handles.l.y = 0;
      this.handles.l.x = Math.max((this.handles.fp.x + this.handles.s.x) / 2 + 1, this.handles.l.x);
      this.handles.fp.y = 0;
      this.handles.fp.x = Math.max(this.handles.l.x + 10, this.handles.fp.x);
      const lensCenter = this.handles.l;
      const fp = this.handles.fp.difference(lensCenter);
      const lens = new geometry.Lens(lensCenter, fp, 150);

      const sensorplane = new geometry.Line(this.handles.s, new geometry.Point(0, 1));
      const sensorTop = this.handles.s;
      const sensorBottom = this.handles.s.mirrorOn(sensorplane.project(lensCenter));
      const sensor = new geometry.Arrow(sensorTop, sensorBottom);

      const {point: sensorTopP} = lens.lensProject(sensorTop);
      const {point: sensorBottomP} = lens.lensProject(sensorBottom);
      const sensorP = new geometry.Arrow(sensorTopP, sensorBottomP);
      const focalPlane = sensorP.line();
      const angle = new geometry.Polygon(this.handles.fp, sensorTopP, sensorBottomP);
      const lensTop = lens.plane().project(sensorTop);
      const lensBottom = lens.plane().project(sensorBottom);
      const ray1 = new geometry.HalfSegment(lensBottom, this.handles.fp);
      const ray2 = new geometry.HalfSegment(lensTop, this.handles.fp);
      const topline = new geometry.Line(new geometry.Point(0, -120), new geometry.Point(1, 0));
      const bottomline = new geometry.Line(new geometry.Point(0, 120), new geometry.Point(1, 0));
      const gap = new geometry.Point(10, 0);
      const focallength = new geometry.MeasureLine(bottomline.project(this.handles.l), bottomline.project(this.handles.fp))
      return [
        sensorplane.addClass("sensorplane"),
        focalPlane.addClass("focalplane"),
        sensor.addClass("sensor"),
        lens.addClass("lens"),
        new geometry.Text(topline.project(this.handles.s).addSelf(gap), "Sensor plane"),
        new geometry.Text(sensorTop.add(sensorBottom).scalarSelf(1/2).addSelf(gap), "D"),
        new geometry.Text(topline.project(sensorTopP).addSelf(gap), "Focal plane"),
        new geometry.Text(this.handles.fp.add(gap.scalar(3)), "α").addClass("text-middle"),
        sensorP.addClass("sensor"),
        angle.addClass("fov"),
        new geometry.Segment(sensorTop, lensTop).addClass("dashed"),
        new geometry.Segment(sensorBottom, lensBottom).addClass("dashed"),
        ray1.addClass("dashed"),
        ray2.addClass("dashed"),
        new geometry.Arc(this.handles.fp, 50, ray1.pointAtDistance(900), ray2.pointAtDistance(900)).addClass("arc"),
        focallength,
        new geometry.Text(focallength.middle().addSelf(gap.orthogonal()), "f"),
      ];
    },
  }
|||

<figcaption>A lens focuses light rays onto a point.</figcaption>

</figure>

This leads us to two conclusions: The focal length is directly related to the angle of view. A longer focal length has a smaller angle of view, effectively creating a zoomed-in picture. Similarly, the same lens on a larger will yield a larger angle of view. More specifically, the relationship between sensor size, focal length and angle of view can be described as follows:

<figure>

$$

\frac{D}{2f} = \tan \alpha

$$

<figcaption>

The formula describing the relationship between angle of view $\alpha$, the sensor size $D$ and the focal length $f$.

</figcaption>
</figure>

### Focusing

In the demo above, you can move the lens and change the lens’ focal length to see how it affects the focal plane. However in photography you don’t move the lens and see where our focus plane ends up, you have something that you want to focus _on_, and want to position your lens accordingly. If we know the distance $S$ between our sensor plane and our desired focal plane, we can use the thin lens equation to figure where to place the lens:

$$
\begin{array}{rc}
  & \frac{1}{f} = \frac{1}{s} + \frac{1}{s'} \\
  \Leftrightarrow & \frac{1}{f} = \frac{1}{s} + \frac{1}{S - s} \\
  \Leftrightarrow & ... \\
  \Rightarrow & s = \frac{S}{2} \pm \sqrt{\frac{S^2}{4} - Sf} \\
\end{array}
$$

Apologies for skipping the math there in the middle, but it’s really just a bunch of transformations until you can use the [quadratic formula]. The majority of cameras don’t use this formula as they don’t measure the distance to the target, but go by other means. But something interesting can be derived from this result: For the result to exist, the expressing in the square root must be positive, i.e:

$$
\begin{array}{rcl}
  \frac{S^2}{4} - Sf & > & 0 \\
  \Leftrightarrow S & > & 4f \\
\end{array}
$$

That means, to be able to focus on a subject with lens with focal lens $f$, the subject needs to be at least four times the focal length away from the sensor.

### Out of focus

Now that we know how to focus, determine the focal plane and even dtermine lens position with a given focal plane, we can take a look what happens when something is _out_ of focus.

<figure>

|||geometry
 {
    width: 800,
    height: 300,
    viewBox: {
      leftX: 0,
      rightX: 800,
      topY: -150,
      bottomY: 150,
    },
    handles: {
      p: new geometry.Point(350, -120),
      fp: new geometry.Point(0, 120),
      op: new geometry.Point(480, 10),
    },
    recalculate() {
      const center = (this.viewBox.leftX + this.viewBox.rightX) / 2;
      const slider = new geometry.MeasureLine(
        new geometry.Point(center - 100, this.viewBox.bottomY - 30),
        new geometry.Point(center + 100, this.viewBox.bottomY - 30)
      );
      const ffactor = geometry.clamp(0, slider.whereIs(this.handles.fp)/slider.length(), 1);
      this.handles.fp = slider.pointAtDistance(ffactor*slider.length());
      const f = geometry.remap(0, 1, 50, 180)(ffactor);
      this.handles.p.y = -120;
      this.handles.p.x = Math.max(4*f, this.handles.p.x);
      const lens = new geometry.Lens(new geometry.Point(0, 0), new geometry.Point(f, 0), 130);

      const focalplane = new geometry.Line(this.handles.p, new geometry.Point(0, 1));
      const sensorplane = new geometry.Line(new geometry.Point(0, 0), new geometry.Point(0, 1));
      const sensorTop = sensorplane.pointAtDistance(120);
      const sensorBottom = sensorplane.pointAtDistance(-120);
      const sensor = new geometry.Segment(sensorTop, sensorBottom);
      const pointToSensor = this.handles.p.x - sensor.point.x;
      const dlp = pointToSensor/2 + Math.sqrt(pointToSensor**2/4 - pointToSensor * f);
      const dsl = pointToSensor - dlp;
      lens.center.x = sensor.point.x + dsl;

      const fp = lens.focalPoint();
      const ofp = lens.otherFocalPoint();
      this.handles.op.x = Math.max(Math.max(fp.x + 1, ofp.x + 1), this.handles.op.x);
      console.log(this.handles.op.x);

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
        fp,
        ofp,
        new geometry.Text(slider.middle().addSelf(new geometry.Point(0, 20)), "Focal length").addClass("text-hmiddle"),
        slider
      ];
    },
  }
|||

<figcaption>A lens focuses light rays onto a point.</figcaption>

</figure>

Strictly speaking, a point is in focus if and only if it is on the focal plane. Any deviation to either side makes the point out of focus.

<figure>
  <img src="intrepid.jpg" width="609" height="457" style="max-width: 609px">
  <figcaption>
  
  The [Intrepid Mk 4][intrepid] is a contemporary large-format camera, but works in the same way the first cameras did.

  </figcaption>
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

<script src="/lab/diagram/geometry-intromate.js" type="module"></script>

[camera comparison]: https://www.dpreview.com/products/compare/side-by-side?products=ricoh_griii&products=canon_g7xiii
[intrepid]: https://intrepidcamera.co.uk/
[quadratic formula]: https://en.wikipedia.org/wiki/Quadratic_formula