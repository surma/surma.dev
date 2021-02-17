using Plots;
using Printf;

alpha = 40;
f(D) = D/(2*tan(deg2rad(alpha/2)));
fpd = 300;
sfp(f) = 1/(1/f - 1/fpd);
sl = 10*1000;
slp(f) = 1/(1/f - 1/sl);
c(A, D) = A * (sfp(f(D)) / slp(f(D)) - 1);

As = 10:10:50;
x=10:35; 
y=[(x->c(A, x)/x*100).(x) for A in As];
plot(
  x,y,
  title=@sprintf("Focal plane distance=%dcm, Light source distance=%dm", fpd/10, sl/1000),
  xlabel="Sensor size",
  ylabel="Bokeh relative to sensor size",
  label=reshape((A->@sprintf("A=%dmm",A)).(As),1,:),
  yformatter=(v->@sprintf("%d%%",v)),
  xformatter=(v->@sprintf("%dmm",v)),
  lw=3,
  draw_arrow=true,
  legend=:topleft,
)
savefig("constant-aperture.svg")

Fs=(x->sqrt(2)^x).(1:8)
y=[(x->c(f(x)/F, x)/x*100).(x) for F in Fs];
plot(
  x,y,
  title=@sprintf("Focal plane distance=%dcm, Light source distance=%dm", fpd/10, sl/1000),
  xlabel="Sensor size",
  ylabel="Bokeh relative to sensor size",
  label=reshape((F->@sprintf("A=f/%.1f",F)).(Fs),1,:),
  yformatter=(v->@sprintf("%d%%",v)),
  xformatter=(v->@sprintf("%dmm",v)),
  lw=3,
  draw_arrow=true,
  legend=:topleft,
)
savefig("fstop-aperture.svg")