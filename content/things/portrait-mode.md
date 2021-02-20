---
title: "Why your phone’s portrait mode fakes the blur"
date: "2021-01-15"
live: false
# socialmediaimage: "social.png"
---

Portrait mode blurs out the part of the image that is in the background to make it look... “better”. Turns out the reason for this is physics more than anything else.

<!-- more -->

<link rel="stylesheet" href="/lab/diagram/geometry.css" />

> **Before we start:** I am not a lens expert. Nor am I physicist or an optician. I tried my best to do my due diligence and be upfront when I’m simplifying things, but I might still have gotten things wrong. If you find something, please give me a shout

Alright, I will admit: The titular question is not actually the question that prompted me to write this article. Originally, I wanted to understand why smaller apertures (i.e. higher $f$-Numbers) make your image sharper. Later I wanted to figure out if the [significantly bigger sensor in the Ricoh GR III will get me better background blur than the Canon PowerShot G7 X Mark III][camera comparison]. It turns out that both these questions have closely related answers and they also explain why the background blur that recently got added to most camera phones is fake.

## Portrait mode

Having a blurry background is a common technique in photography to make the viewer focus the subject and not get distracted by elements in the background. Photographers calls this a “shallow depth of field”, because the field (i.e. area) that is in-focus is shallow and introduces “separation” between the foreground subject and background elements. 

<figure>
  <img src="./depth-of-field.jpg" width="1280" height="1275">
  <figcaption>The start and end of depth of field is clearly visible.</figcaption>
</figure>

If you look up how to achieve this shallow depth of field, most photography resources will say “use a wide aperture” and “use a long lens”. And that is somewhat true, and we will figure out why!

> **Be warned!** Photography terminology is a mess and correlation established in experiments is often mistaken for causation. One of my goals for this article is to clear up as much as possible.

Recently, camera phones have gotten a new feature called “portrait mode”, that adds this background blur. It’s called portrait mode because the shallow depth of field is especially popular for portraits. However, the phone’s background blur is fake — it’s added during post-processing and often you can even remove or adjust the background blur after the fact. By visualizing sharp edges in the image, you can see that the blurriness sets in quite abruptly. That’s not how real background blur would behave.

<figure>
  <img src="./portrait-mode.jpg" width="1280" height="960">
  <figcaption>
    Left: Picture taken in “portrait mode” on a Pixel 5.<br>
    Right: The same picture with Photoshop’s “Find Edges” filter applied.
  </figcaption>
</figure>

Why do phones do that? Can’t they just do it _right_? To answer that, we have to go back to school and catch up on some basic optics!

## Optics
In the earlier days of photography, lenses were simple. A single glass lens and a shutter. Today’s lenses, on the other hand, are quite complicated. They fulfil the same purpose based on the same underlying principles, but with a whole bunch of benefits over their primitive counterparts. To keep this article somewhat manageable, I will focus on simple lenses. Not only that, but I will assume that we are working with “perfect” lenses throughout this article. They don’t have any chromatic abberation (i.e. they don’t bend different wave lengths differently), they don’t have vignetting (i.e. the don’t lose light at the edges) and they are “thin” lenses (i.e. they can be modeled with simplified formulas). I will also only look at spherical, bi-convex lenses. That means the lenses are convex (a belly-like shape) on both sides and their curvature is that of a sphere. Contemporary camera lenses contain all kinds of lenses (concave, convex-concave, aspherical, etc).

### Lenses

The two most important parameters of a lens for this excursion is its focal length $f$ and diameter $A$. The diameter is literally that, determining the size of the piece of glass. The focal _length_ describes the distance from the center of the lens to the focal _point_, which also the center of the circle (or sphere, rather) that gives the lens its curvature. The smaller the focal length, the more the light rays get bent towards the focal point when they pass through the lens. The bigger the focal length $f$, the less they get bent. For thin lenses, rule is that rays that enter the lens parallel to the lens axis, will intersect the focal point.

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
      const gap = new geometry.Point(rayGap, 0);
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
      const A = new geometry.MeasureLine(lens.top().addSelf(gap), lens.bottom().addSelf(gap));
        
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
        new geometry.Text(focalLengthStart.add(new geometry.Point(5, -5)), "Focal length f"),
        new geometry.Circle(fp, lens.top().subtractSelf(fp).length()).addClass("dashed"),
        A,
        new geometry.Text(A.middle().addSelf(gap), "A"),
      ];
    },
  }
|||

<figcaption>Rays that enter the lens parallel to the lens axis will intersect the focal point.<br>(Orange points are interactive!)</figcaption>
</figure>

The tracing the rays in reverse yields another rule: Rays that enter the lens by intersecting the focal point will exit the lens parallel to the lens axis. These two rules are very powerful and will allow us to derive pretty much everything we need to answer all our questions.

> **Thicc:** You’ll notice that lenses with a short focal length are anything but thin. I’ll still pretend that they fall into the “thin lens” category for the remainder of this article.

Light in real life is barely ever parallel, but rather radiating out from a point into all directions. More specifically, apart from a few notable exceptions (like mirrors), every material reflects the light that it is hit by evenly into all directions on every point of its surface. So let’s focus on one individual point light source, knowing that any bigger object or surface is just a collection of many of such point light sources.

We have a point that sends light rays into all directions and we put it on one side of our lens. Considering that people were able to take pictures with these simple lenses, there has to be a place on the other side of the lens where all the light rays get focused back into a single point. While the from our point light source will be hitting every part of our lens, we only need to focus on two specific light rays to figure this out: The one light ray that is parallel to the lens axis, and the other ray that intersects the focal point. We know how these rays will behave according to our two rules from above and they will (most likely) also intersect on the _other_ side of the lens. And where these two lines cross, all other rays will intersect as well.

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

The point on the left is often just called “object”, while point on the right is called the “image”. From this _geometric_ construction of where the image will be, we can derive a nice formula describing the relationship between the object’s distance and the image’s distance from the center of the lens:

<figure>

$$
\frac{1}{s} + \frac{1}{s'} = \frac{1}{f}
$$

<figcaption>

The “thin lens equation” describes the relationship between the object’s distance $s$, the image’s distance $s'$ and the lens’ focal length $f$.

</figcaption>
</figure>

## Photography

You’ll notice that if you move the object parallel to the lens plane, the image will also move parallel to the lens plane, although in the opposite direction. This tells us two things: Firstly, the image is upside down. What is above the lens axis on one side of the lens, is below the lens axis on the other. Secondly, and more importantly, if a bunch of objects form a parallel to the lens plane, their images will also form a parallel to the lens plane. Instead of talking about individual points, we can talk about the “image plane” and the “focal plane”. We have now entered the territory of photography.

### The image plane & the focal plane

To take a picture we have to have something that... takes the picture. Yes. Very good explanation. In analogue photography, that is the film or photo paper. In digital cameras — and for the remainder of this article — it’s the sensor. The distance of the sensor to the lens determines which part of the world is “in focus”. The size of the sensor determines the angle of view that will be captured. Focal length affects both focal plane position and angle of view.

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
      fp: new geometry.Point(-200, 0),
    },
    recalculate() {
      const gap = new geometry.Point(1, 0);
      const topline = new geometry.Line(new geometry.Point(0, -120), new geometry.Point(1, 0));
      const bottomline = new geometry.Line(new geometry.Point(0, 120), new geometry.Point(1, 0));

      this.handles.s.x = this.viewBox.leftX + 20;
      this.handles.s.y = Math.min(this.handles.s.y, 1);

      const focalLengthSlider = new geometry.ArrowLine(
        bottomline.project(gap.scalar((this.viewBox.leftX + this.viewBox.rightX)/2-120)), 
        bottomline.project(gap.scalar((this.viewBox.leftX + this.viewBox.rightX)/2+120)), 
      );
      this.handles.fp = focalLengthSlider.clipPoint(this.handles.fp)
      const f = geometry.remap(0, 1, 60, 200)(focalLengthSlider.whereIs(this.handles.fp)/focalLengthSlider.length());
      this.handles.l.y = 0;
      this.handles.l.x = Math.max(this.handles.l.x - this.handles.s.x, f+1)+this.handles.s.x;
      const lensCenter = this.handles.l;
      const lens = new geometry.Lens(lensCenter, gap.scalar(f), 150);

      const sensorplane = new geometry.Line(this.handles.s, new geometry.Point(0, 1));
      const sensorTop = this.handles.s;
      const sensorBottom = this.handles.s.mirrorOn(sensorplane.project(lensCenter));
      const sensor = new geometry.Arrow(sensorTop, sensorBottom);
      const fp = lens.focalPoint();

      const {point: sensorTopP} = lens.lensProject(sensorTop);
      const {point: sensorBottomP} = lens.lensProject(sensorBottom);
      const sensorP = new geometry.Arrow(sensorTopP, sensorBottomP);
      const focalPlane = sensorP.line();
      const angle = new geometry.Polygon(fp, sensorTopP, sensorBottomP);
      const lensTop = lens.plane().project(sensorTop);
      const lensBottom = lens.plane().project(sensorBottom);
      const ray1 = new geometry.HalfSegment(lensBottom, fp);
      const ray2 = new geometry.HalfSegment(lensTop, fp);
      return [
        sensorplane.addClass("sensorplane"),
        focalPlane.addClass("focalplane"),
        sensor.addClass("sensor"),
        lens.addClass("lens"),
        new geometry.Text(topline.project(this.handles.s).addSelf(gap.scalar(10)), "Sensor plane"),
        new geometry.Text(sensorTop.add(sensorBottom).scalarSelf(1/2).addSelf(gap), "D"),
        new geometry.Text(topline.project(sensorTopP).addSelf(gap.scalar(10)), "Focal plane"),
        new geometry.Text(fp.add(gap.scalar(30)), "α").addClass("text-middle"),
        sensorP.addClass("sensor"),
        angle.addClass("fov"),
        new geometry.Segment(sensorTop, lensTop).addClass("dashed"),
        new geometry.Segment(sensorBottom, lensBottom).addClass("dashed"),
        ray1.addClass("dashed"),
        ray2.addClass("dashed"),
        new geometry.Arc(fp, 50, ray1.pointAtDistance(900), ray2.pointAtDistance(900)).addClass("arc"),
        focalLengthSlider,
        new geometry.Text(focalLengthSlider.middle().addSelf(gap.orthogonal().scalar(10)), "f"),
      ];
    },
  }
|||

<figcaption>The distance between sensor and lens determines the position of the focal plane. The size of the sensor determines the angle of view.</figcaption>

</figure>

This leads us to two conclusions: The focal length is directly related to the angle of view. A longer focal length has a smaller angle of view, effectively creating a zoomed-in picture. Similarly, the same lens on a larger sensor will yield a larger angle of view. More specifically, the relationship between sensor size, focal length and angle of view can be described as follows:

<figure>

$$

\frac{D}{2f} = \tan \frac{\alpha}{2}

$$

<figcaption>

The formula describing the relationship between angle of view $\alpha$, the sensor size $D$ and the focal length $f$.

</figcaption>
</figure>

### Focusing

In the diagram above, you can move the lens and change the lens’ focal length to see how it affects the focal plane. However in photography you don’t move the lens and see where our focus plane ends up, you have something that you want to focus _on_, and want to position your lens accordingly. If we know the distance $S$ between our sensor plane and our desired focal plane, we can use the thin lens equation to figure where to place the lens:

<figure>

$$
\begin{array}{rc}
  & \frac{1}{f} = \frac{1}{s} + \frac{1}{s'} \\
  \Leftrightarrow & \frac{1}{f} = \frac{1}{s} + \frac{1}{S - s} \\
  \Leftrightarrow & ... \\
  \Rightarrow & s = \frac{S}{2} \pm \sqrt{\frac{S^2}{4} - Sf} \\
\end{array}
$$
<figcaption>The “focusing equation” (not an official name) determines the lens’ position based on focal length and desired focal plane distance.</figcaption>
</figure>

Apologies for skipping the math there in the middle, but it’s really just a bunch of transformations until you can use the [quadratic formula]. The majority of cameras don’t use this formula, of course, as they can’t measure the distance to the target, but [use phase detection or contrast detection][autofocus]. But something interesting can be derived from the formula: For the result to even exist, the expression in the square root must be positive.

$$
\begin{array}{rcl}
  \frac{S^2}{4} - Sf & > & 0 \\
  \Leftrightarrow S & > & 4f \\
\end{array}
$$

That means, to be able to focus on a subject with lens with focal lens $f$, the subject needs to be at least four times the focal length away from the sensor.

## Bokeh

Now that we know how to focus, determine the focal plane and even determine lens position with a given focal plane, we can take a look what happens when something is _out_ of focus. Looking at the image at the start of the article, you can see the fairly lights turning into larger circles of light, often refferred to as “Bokeh”. Bokeh is Japanese for “blur”, and as such _technically_ refers to anything that is out of focus, but depending on context, it can also be used to refer to the look of out-of-focus point lights specifically.

<figure>
  <img src="bokeh.jpg" loading="lazy" width="1280" height="720" style="max-width: 1280px">
  <figcaption>
  The lights in the background are out of focus and have turned into big circles.<br>
  Screenshot taken from season 5 episode 8 of “Suits”. 
  </figcaption>
</figure>

To figure out how big the circle will be, we’ll have to introduce a couple of variables. First, we have to separate our distance to the focal plane from the distance to our light source. The focal plane is fairly close to the sensor, while the light source is further away. We can now figure out where the lens needs to located to set the right focus, and which point the light from the light source will be focused on.

<figure>

|||geometry
 {
    width: 930,
    height: 480,
    viewBox: {
      leftX: -30,
      rightX: 900,
      topY: -220,
      bottomY: 260,
    },
    handles: {
      p: new geometry.Point(0, -120),
      fp: new geometry.Point(0, 120),
    },
    recalculate() {
      const op = new geometry.Point(this.viewBox.rightX-20, 10);
      const center = (this.viewBox.leftX + this.viewBox.rightX) / 2;
      const topLine = new geometry.Line(new geometry.Point(0, this.viewBox.topY + 20), new geometry.Point(1, 0));
      const topLineB = new geometry.Line(new geometry.Point(0, this.viewBox.topY + 40), new geometry.Point(1, 0));
      const topLineC = new geometry.Line(new geometry.Point(0, this.viewBox.topY + 80), new geometry.Point(1, 0));
      const bottomLine = new geometry.Line(new geometry.Point(0, this.viewBox.bottomY - 10), new geometry.Point(1, 0));
      const slider = new geometry.ArrowLine(
        bottomLine.project(new geometry.Point(center - 100, 0)),
        bottomLine.project(new geometry.Point(center + 100, 0)),
      );
      const ffactor = geometry.clamp(0, slider.whereIs(this.handles.fp)/slider.length(), 1);
      this.handles.fp = slider.pointAtDistance(ffactor*slider.length());
      const f = geometry.remap(0, 1, 80, 140)(ffactor);
      this.handles.p = topLine.project(this.handles.p);
      this.handles.p.x = Math.max(4*f, this.handles.p.x);
      const lens = new geometry.Lens(new geometry.Point(0, 0), new geometry.Point(f, 0), 80);

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

      const {polygon, ray1, ray2, projectedP} = lens.lightRays(op);
      const p1 = sensorplane.intersect(ray1);
      const p2 = sensorplane.intersect(ray2);
      const p = new geometry.Segment(p1, p2);
      const gap = new geometry.Point(10, 0);
      const lensSize = new geometry.MeasureLine(lens.top().addSelf(gap.scalar(-2)), lens.bottom().addSelf(gap.scalar(-2)));
      const Df = new geometry.MeasureLine(sensorplane.intersect(topLineB), topLineB.project(this.handles.p)).shrinkSelf(2);
      const DL = new geometry.MeasureLine(sensorplane.intersect(topLineC), topLineC.project(op)).shrinkSelf(2);
      const bottomLineB = new geometry.Line(new geometry.Point(0, this.viewBox.bottomY - 80), new geometry.Point(1, 0));
      const bottomLineC = new geometry.Line(new geometry.Point(0, this.viewBox.bottomY - 120), new geometry.Point(1, 0));
      const sfp = new geometry.MeasureLine(sensorplane.intersect(bottomLineB), bottomLineB.project(lens.bottom())).shrinkSelf(2);
      const sf = new geometry.MeasureLine(bottomLineB.project(lens.bottom()), bottomLineB.intersect(focalplane)).shrinkSelf(2);
      const slp = new geometry.MeasureLine(bottomLineC.project(projectedP), bottomLineC.project(lens.bottom())).shrinkSelf(2);
      const sl = new geometry.MeasureLine(bottomLineC.project(lens.bottom()), bottomLineC.project(op)).shrinkSelf(2);
      return [
        op,
        sensorplane.addClass("sensorplane"),
        focalplane.addClass("focalplane"),
        sensor.addClass("sensor"),
        lens.addClass("lens"),
        polygon.addClass("light"),
        p.addClass("image"),
        new geometry.Text(this.handles.p.add(gap), "Focal plane"),
        new geometry.Text(sensorplane.intersect(topLine).addSelf(gap), "Sensor plane"),
        fp,
        ofp,
        new geometry.Text(slider.middle().addSelf(gap.orthogonal()), "Focal length").addClass("text-hmiddle"),
        slider,
        lensSize,
        new geometry.Text(lens.top().addSelf(gap.scalar(-4)), "A").addClass("text-hmiddle"),
        Df,
        new geometry.Text(Df.middle().addSelf(gap.orthogonal().scalarSelf(-2)), "D<tspan baseline-shift=sub>focal</tspan>"),
        DL,
        new geometry.Text(DL.middle().addSelf(gap.orthogonal().scalarSelf(-2)), "D<tspan baseline-shift=sub>light</tspan>"),
        sfp,
        new geometry.Text(sfp.middle().addSelf(gap.orthogonal().scalarSelf(-2)), "s'<tspan baseline-shift=sub>focal</tspan>"),
        sf,
        new geometry.Text(sf.middle().addSelf(gap.orthogonal().scalarSelf(-2)), "s<tspan baseline-shift=sub>focal</tspan>"),
        slp,
        new geometry.Text(slp.middle().addSelf(gap.orthogonal().scalarSelf(-2)), "s'<tspan baseline-shift=sub>light</tspan>"),
        sl,
        new geometry.Text(sl.middle().addSelf(gap.orthogonal().scalarSelf(-2)), "s<tspan baseline-shift=sub>light</tspan>"),
        lens.asLine().addClass("lensplane"),
        new geometry.MeasureLine(p1.subtract(gap), p2.subtract(gap)),
        new geometry.Text(p.middle().subtract(gap.scalar(2.5)), "c")
      ];
    },
  }
|||

<figcaption>A lens sets focus on the focal plane, but focuses the light from a light source to a different point, causing the bokeh circle on the sensor.</figcaption>

</figure>

The further away the light source is from the focus plane, the bigger the bokeh circle on the sensor will be. Let’s try and get some hard numbers.

### Deriving a formula

Looking at the rays on the left side of lens in diagram above, we can use the law of similar triangles (or more specifically the [intercept theorem]) to establish the following relationship between the lens aperture $A$ and the bokeh circle size $c$:

$$
  \begin{array}{rrcl}
    & \frac{A}{s'_{\text{light}}} & = & \frac{c}{s'_{\text{focal}} - s'_{\text{light}}} \\
    \Leftrightarrow & c & = & A \left( \frac{s'_\text{focal}}{s'_\text{light}} -1 \right) \\
  \end{array}
$$

To get the values for $s'_\text{light}$ and $s'_\text{focal}$ we can use the focusing equation from above:

$$
  c = A \left( \frac{\frac{D_\text{focal}}{2} + \sqrt{\frac{D_\text{focal}^2}{4} - D_\text{focal}\cdot f}}{\frac{D_\text{light}}{2} - \sqrt{\frac{D_\text{light}^2}{4} - D_\text{light}\cdot f}} - 1 \right)
$$

Admittedly, this formula isn’t simple, intuitive or, honestly, even that helpful. But let’s look at this in an extreme configuration: Let’s move the focal plane as close as possible to the sensor ($D_\text{focal} = 4f$) and move the light source infinitelyz far away ($D_\text{light} \rightarrow \infty$). In this scenario, the formula drastically simplifies (provided you can calculate the limit, which I couldn’t without [help][limit]):

$$
c = A
$$

I found this _fascinating_. In the extreme case, the focal length actually has _no_ influence over the size of the bokeh circles. Lens size alone dictates how big the circle on the sensor is.

### Same-picture comparison

While focal length doesn’t matter in that extreme case, the extreme case is different per lens and effectively creates a different photo. What if we tried to “keep the photo constant”. That way only lens diameter and sensor size are the only variables we have: 

<figure>

|||geometry
 {
    width: 800,
    height: 300,
    viewBox: {
      leftX: -10,
      rightX: 790,
      topY: -150,
      bottomY: 150,
    },
    handles: {
      s: new geometry.Point(0, -50),
      lensSize: new geometry.Point(0, -40),
    },
    recalculate() {
      const alpha = 80;
      const gap = new geometry.Point(10, 0);
      const topline = new geometry.Line(new geometry.Point(0, this.viewBox.topY + 20), new geometry.Point(1, 0));
      const centerX = (this.viewBox.rightX + this.viewBox.leftX) / 2;

      const sensorSizeSlider = new geometry.ArrowLine(
        new geometry.Point(centerX - 100, this.viewBox.bottomY - 20),
        new geometry.Point(centerX + 100, this.viewBox.bottomY - 20),
      );
      this.handles.s = sensorSizeSlider.clipPoint(this.handles.s);
      const sensorSize = geometry.remap(0, sensorSizeSlider.length(), 40, 80)(sensorSizeSlider.whereIs(this.handles.s));

      const focalPlaneCenter = new geometry.Point(390, 0);
      const focalPlane = geometry.Line.yAxis().parallelThroughPoint(focalPlaneCenter);
      const focalPoint = focalPlaneCenter.subtract(new geometry.Point(Math.cos(geometry.deg2rad(alpha/2))*(this.viewBox.bottomY - this.viewBox.topY)*0.9/2, 0));
      const f = sensorSize*2 / (2* Math.tan(geometry.deg2rad(alpha/2)));
      const lensCenter = focalPoint.subtract(new geometry.Point(f, 0));
      this.handles.lensSize.y = geometry.clamp(-70, this.handles.lensSize.y, -20);
      const lens = new geometry.Lens(lensCenter, new geometry.Point(f, 0), -this.handles.lensSize.y*2);
      const otherFocalPoint = lens.otherFocalPoint();
      this.handles.lensSize.x = lensCenter.x;
      const sensorX = lens.lensProject(focalPlane.pointAtDistance(10)).point;
      const sensorplane = geometry.Line.yAxis().parallelThroughPoint(sensorX);
      const sensorTop = sensorplane.project(new geometry.Point(0, -sensorSize));
      const sensorBottom = sensorTop.mirrorOnLine(geometry.Line.xAxis());
      const sensor = new geometry.Segment(sensorTop, sensorBottom);
      const {point: sensorTopP} = lens.lensProject(sensorTop);
      const {point: sensorBottomP} = lens.lensProject(sensorBottom);
      const fov = new geometry.Polygon(
        focalPoint, 
        new geometry.HalfSegment(focalPoint, sensorTopP).pointAtDistance(9999), 
        new geometry.HalfSegment(focalPoint, sensorBottomP).pointAtDistance(9999)
      );
      const lightSource = new geometry.Point(this.viewBox.rightX - 20, 0.01);
      const {polygon: light} = lens.lightRays(lightSource);
      return [
        lens.addClass("lens"), 
        focalPoint,
        otherFocalPoint,
        focalPlane.addClass("focalplane"), 
        sensorplane.addClass("sensorplane"),
        sensor.addClass("sensor"),
        fov.addClass("fov"),
        lightSource,
        light.addClass("light"),
        new geometry.Text(topline.project(sensorTopP).addSelf(gap), "Focal plane"),
        sensorSizeSlider,
        new geometry.Text(sensorSizeSlider.middle().add(gap.orthogonal()), "Sensor size").addClass("text-hmiddle"),
      ];
    },
  }
|||

<figcaption>A lens focuses light rays onto a point.</figcaption>

</figure>

We know from earlier that making the sensor bigger will also increase the angle of view. Since we want to keep angle of view constant, we need to correct for smaller sensor size with shorter focal length, which we know results in a smaller bokeh circle on the sensor. But wait, the sensor is also smaller, so maybe it covers the same _percentage_ of the sensor as before, yielding the exact same image? It’s hard to tell from the diagram, so I guess the only way to tell is use that horrible formula from earlier. But I’ll have [Julia] do the work for me:

<figure>
  <img src="constant-aperture.svg" width=600 height=400>
  <figcaption>When keeping everything but the sensor size constant, the bokeh stays the same.</figcaption>
</figure>

The bokeh stays the same? This goes against everything I found on the internet. There must be something else causing the vast majority of articles to claim the opposite of what I just found — and $f$-Numbers are what’s to blame.

## Aperture

What the diagram above does make clear is that making the lens diameter smaller will also shrink bokeh circle on the sensor. A very small circle, however, is _humanly_ indistinguishable from a point. Or to interpret that another  way: Up until a certain circle size, a human can’t tell the difference between something being perfectly in focus and slightly out of focus. That means that there is a bit of leeway around the focal plane to either side which is called the focus area. Everything within that focus area will be perceived as in-focus by the human eye and is “acceptably sharp”. How much leeway depends on how fast a point grows into a circle the further away it is from the focal plane, and that growth is determined by lens diameter.

> **Circle of confusion:** The biggest circle that is perceived as a point by a human is called the [circle of confusion] (CoC), and it plays a central role in calculating the focus area. The diameter of the CoC depends on your eyesight, obviously, but also how big an image is displayed and from what distance you are looking at it. It’s confusing that many source on the internet list a single CoC diameter for any given sensor size, like listing 0.029mm for a full frame sensor. These are old values, based on printing the a picture on a piece of paper on a specific size (~$26\text{cm} \times 17\text{cm}$) and looking at it from a specific distance (~$25\text{cm}$) with 20/20 vision. 
>
> I won’t go into this with more detail, but these numbers seem unfit for the digital age, where we crop and we zoom. Something that looks in-focus at Instagram-size, can look completely out of focus once zoomed in. If you want to make sure something in focus even after zooming in, your circle of confusion is the size of a single pixel on the sensor. Any bokeh circle that is at most the size of a pixel will still be captured as a single pixel. No matter how much you zoom in. This, however, has implications. I did the math to compare how big the focus area is with traditional CoCs and the pixel-based CoC. The pixel-based CoC leaves you very little room for error as a photograpgher: If the traditional focus area in a portrait setting is 1.5m, it shrinks to just ~28cm with the pixel-based CoC.

In summary that means that a smaller lens creates a bigger focus area. But, alas, lenses are made of glass and can’t just change their size, now can they?

### Lens size & shape

The fact that smaller lens diameters create sharper images has been known since the age of pinhole cameras, which is why photographers came up with mechanisms to adjust a lens’ size. Most lenses do this via an adjustable iris, a bunch of metal blades.

<figure>
  <img src="iris.jpg" loading="lazy" width="800" height="800" style="max-width: 800px">
  <figcaption>
  
  The iris of a lens, consisting of 16 blades.

  </figcaption>
</figure>

The 2d diagrams can’t visualize the circle on the sensor, but the _shape_ of a lens will determine what a point light will look like when it’s out of focus. We have been talking about bokeh circles because pretty much all photography lenses are circular. The opening created by the iris is also circular, although no _perfectly_ so. This can be seen in movies, where you can sometimes count how many blades a lens’ iris had because of how bokeh circles look.

<figure>
  <img src="irisbokeh.jpg" loading="lazy" width="1280" height="720" style="max-width: 1280px">
  <figcaption>
    The bokeh circles look like hexagons, implying a 6-blade iris.<br>
    Screenshot taken from season 5 episode 11 of “Suits”. 
  </figcaption>
</figure>

Lensbaby lenses actively take advantage of the fact that out-of-focus spot lights take the shape of the lens opening and allows you to put shape plates inbetween the lens and sensor:

<figure>
  <img src="#lensbaby.jpg" loading="lazy" width="1280" height="219" style="max-width: 1280px">
  <figcaption>Lensbaby lens using a nice swirl or something. Waiting for Ingrid.</figcaption>
</figure>

### f-stops 

We have talked about the lens diameter, and how the iris allows you to effectively adjust a lens’ size. However, the lens diameter is rarely talked about directly in photography. Instead, they talk about the _aperture_, which is given as a $f$-Number. If you need to refer to the actual lens diameter (or the opening formed by the iris), you talk about the “absolute aperture”. 

The $f$-Number is called $f$-Number because it describes the iris opening as a fraction of the focal length $f$. So for example, a 50mm lens set to $f/2.8$ means the absolute aperture is $A = \frac{f}{2.8} = 17.9mm$. The reason that photographers use $f$-Numbers is that two lenses will allow the same amount of light to hit their <strike>film</strike> sensor, when they are set to the same $f$-Number — regardless of their focal lengths.

That all was just to say that photographers use $f$-Numbers to compare lens configurations. Most articles that were trying to give the “definitive answer” on whether sensor size affects depth of field, do so by taking photos with different sensors and equivalent lenses _at the same $f$-Number_. In that scenario, smaller sensors will yield less bokeh.

For completeness’ sake, let’s redo the graph above with a constant $f$-Number instead of a constant lens diameter, so we can replicate the results from these approaches:

<figure>
  <img src="fstop-aperture.svg" width=600 height=400>
  <figcaption>
  
  Keeping the $f$-Number constant instead of the lens diameter, gives a more realistic and expected outcome of the experiment.
  
  </figcaption>
</figure>

If we keep the $f$-Number constant, bokeh _drastically_ increases with bigger sensors. However, we know that the chain of causality is more complex than that: A smaller sensor requires a shorter focal length to keep the same field of view. A shorter focal length has a smaller aperture given the same $f$-Number. A smaller aperture keeps bokeh circles smaller, which we perceive as sharper images. Blaming less background blur with smaller sensors on the sensor alone is ignoring a whole bunch of other factors.

## Pixel 5 vs Digital Camera

I took a picture with my Pixel 5 and then tried to take the exact same picture with my Canon EOS R.

<figure>
  <img src="./comparison.jpg" loading="lazy" width=2048 height=767>
  <figcaption>
    Left: Photo taken with my Pixel 5, main camera lens.<br>
    Right: Photo taken with my Canon EOS R, with a zoom lens set to 27mm.<br>
    (Images cropped to match aspect ratio, slight color grading.)
  </figcaption>
</figure>

So what did I really do here? My Pixel 5 has a fixed lens, so I took a photo with it first. I then tried to exactly match field of view with my DSLR, using land marks in the photo to align as close as possible. Specifically, we have the same scene with the exact same field of view and same focal plane, while sensor size, sensor position, focal length and lens diameter can change.


Let’s return at the original comparison image from the start of the article. What kind of lens does a Pixel 5 have exactly? And what kind of sensor? Luckily, some of this data is embedded in the EXIF data of the images and can be extracted using `identify` from ImageMagick:

```
$ identify -format 'f=%[EXIF:FocalLength] A=%[EXIF:FNumber]' cam_image.jpg
f=46/1 A=28/10

$ identify -format 'f=%[EXIF:FocalLength] A=%[EXIF:FNumber]' pixel5_image.jpg
f=4380/1000 A=173/100
```

This says that my digital camera image was taken with $f=46mm$ and $f/2.8$ ($A=16.4mm$). The Pixel 5 used $f=4.38mm$ and $f/1.73$ ($A=2.5mm$). 

> **More lies:** I am ignoring the fact that the Pixel 5’s portrait mode crops in, effectively zooming in and giving the phone a longer focal length. Longer focal lenses are typically deemed more flattering for portraits as they have less perspective distortion. Whether this is a technical limitation or a technique to force people to literally take a step back when taking picrtures, is unclear to me.

The aperture on the DSLR is almost 7 times as large as the phones aperture. We just established that in these extreme constellations (close subject, far-away spot light), aperture is the dictating factor of the bokeh circles. To achieve the same bluriness of the DSLR, the Pixel 5 would have to achieve the same aperture of $A=16.4mm = f/0.27$. 

Is such a phone lens possible? This is where I couldn’t find any answers. In my experience, any lens with an aperture bigger than $f/1.4$ is rare and increasingly expensive. Any aperture bigger than $f/1.2$ is virtually unheard of, although they do exist.

<figure>
  <img src="nikkornoct.jpg" loading="lazy" width="1084" height="476" style="max-width: 1084px">
  <figcaption>Nikon’s f/0.95 aperture made waves amongst photographers and will cost you a mere £8.3k.</figcaption>
</figure>

The reality seems to be different: Phones are small(-ish) and physical space is valuable and as such small sensors wil be built into phones. The [Pixel 5, for example, has a $10mm$ sensor][pixel5 sensor]. Smaller sensors require shorter focal lengths for a reasonable field of view, and shorter focal lengths have smaller apertures

## LEFTOVERS


$$
\begin{array}{rrcl}
  & \frac{D_\text{fullframe}}{2 \cdot 46mm} & = & \frac{D_\text{phone}}{2 \cdot 4.38mm}\\
  \Leftrightarrow & \frac{36mm}{2 \cdot 46mm} \cdot 2 \cdot 4.38mm & = & D_\text{phone} \\
  \Leftrightarrow & 3.43mm & = & D_\text{phone} \\
\end{array}
$$

From the diagram we can also learn a short focal length will create a bigger circle than a long focal length at the minimal focal distance. However, moving the focal plane ever so slightly away from the minimal focal length will make the circle shrink much quicker than a comparable focus shift on a longer focal length.

 How much area? Well I’m glad you asked! Our friend the thin lenses equation combined with the [intercept theorem] will let us answer this question. Given a lens with focal length $f$ and diameter $D$, a focal plane at distance $S$ from the sensor and a point at distance $P$ from the sensor, we can calculate the area $B$ that the point will be projected on:

$$
\begin{array}{c}
l = \frac{S}{2} - \sqrt{\frac{S^2}{4} - Sf} \\
D \div (S-l) = B \div l
\end{array}
$$

<figure>
  <img src="intrepid.jpg" loading="lazy" width="609" height="457" style="max-width: 609px">
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
[intercept theorem]: https://en.wikipedia.org/wiki/Intercept_theorem
[circle of confusion]: https://en.wikipedia.org/wiki/Circle_of_confusions
[limit]: https://twitter.com/DasSurma/status/1361293594435403778
[pixel5 sensor]: https://www.dxomark.com/google-pixel-5-camera-review-software-power/
[julia]: https://julialang.org/
[autofocus]: https://en.wikipedia.org/wiki/Autofocus