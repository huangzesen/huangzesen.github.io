/* zesen.me: one live WebGL2 scene per page, chosen by the body's theme-* class (set in _src/build.py). Raw WebGL2, no libraries.
   Without WebGL2 the page keeps its CSS background and js/site.js draws the old field lines. With reduced motion, a software
   renderer, or a machine that cannot keep up, the scene settles on one still frame. These are drawings, not data. */
(function () {
  'use strict';

  var TAU = Math.PI * 2, SCENES = {};

  /* ---------- GLSL shared by everything ---------- */
  var HEAD = '#version 300 es\nprecision highp float;\nprecision highp int;\n' +
    'uniform vec2 uRes;uniform float uPx;uniform float uT;uniform vec3 uPtr;uniform float uDim;uniform float uScroll;uniform vec4 uK[8];uniform vec4 uA[8];\n';
  var NOISE = `
#define TAU 6.2831853
#define PI 3.14159265
float pw(float x,float y){return pow(max(x,1e-5),y);}
float ss(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
float h11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p,int o){float a=.5,s=0.;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<o;i++){s+=a*vn(p);p=m*p+17.;a*=.5;}return s;}
`;
  var FRAG = HEAD + NOISE + 'uniform sampler2D uBake;out vec4 C;float dith(){return (h21(gl_FragCoord.xy)-.5)/170.;}\n';
  var VS_QUAD = HEAD + 'out vec2 vP;void main(){vec2 q=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vP=q*uRes;gl_Position=vec4(q*2.-1.,0.,1.);}';

  function vsLines(code) {
    return HEAD + NOISE + 'layout(location=0) in vec4 aI;out float vS,vId,vCross,vHeat;uniform float uSeg;\n' + code + `
void main(){float k=float(gl_VertexID),e=1./uSeg,s=floor(k*.5)*e,sd=mod(k,2.)*2.-1.,id=float(gl_InstanceID);
vec4 a=path(s,id),b=path(min(s+e,1.),id),c=path(max(s-e,0.),id);
vec2 t=b.xy-c.xy;float L=length(t);t=L>1e-4?t/L:vec2(1.,0.);
float w=a.z>0.?a.z+.7/uPx:0.;vec2 p=a.xy+vec2(-t.y,t.x)*sd*w;
vS=s;vId=id;vCross=sd;vHeat=a.w;gl_Position=vec4(p/uRes*2.-1.,0.,1.);}`;
  }
  function vsPoints(code, shape) {
    return HEAD + NOISE + 'layout(location=0) in vec4 aI;out vec2 vQ;out float vId;out vec4 vD;\n' + code + '\n' +
      (shape || 'vec2 shape(vec2 q,vec4 a){return q*a.z;}') + `
void main(){vec2 q=vec2(float(gl_VertexID&1),float((gl_VertexID>>1)&1))*2.-1.;float id=float(gl_InstanceID);vec4 a=place(id);
vQ=q;vId=id;vD=a;gl_Position=vec4((a.xy+shape(q,a))/uRes*2.-1.,0.,1.);}`;
  }

  /* a field of faint stars, used behind several scenes */
  function stars(density, dim) {
    return {
      type: 'points', blend: 'add', n: function (A) { return Math.min(700, Math.round(A.W * A.H / density)); },
      place: 'vec4 place(float id){vec2 h=vec2(h11(id*1.37+3.1),h11(id*2.71+7.7));float m=h11(id*5.1+.3);m=m*m*m;return vec4(h*uRes,1.1+2.6*m,m);}',
      sprite: 'vec4 sprite(){float d=dot(vQ,vQ);float tw=.66+.34*sin(uT*(.5+h11(vId)*1.4)+vId);float a=exp(-d*5.)*(.2+.9*vD.w)*tw*(1.-.45*uDim)*' + (dim || '1.') + ';vec3 c=mix(vec3(.78,.86,1.),vec3(1.,.93,.78),h11(vId*3.3));return vec4(c*a,0.);}'
    };
  }
  function lang() { return document.documentElement.lang === 'lzh' ? 1 : 0; }

  /* ---------- About: the Sun, the Parker spiral and Parker Solar Probe's orbit ---------- */
  var HELIO = `
vec2 SUN(){return uRes.x<720.?vec2(uRes.x*.8,uRes.y*.25):vec2(uRes.x*.8,uRes.y*.56);}
float AU(){return max(uRes.x*.6,uRes.y*1.05);}
float RS(){return uRes.x<720.?20.:max(22.,min(uRes.y*.058,56.));}
`;
  SCENES.about = {
    full: true, still: 31,
    hint: ['Move or tap: launch a switchback along the Parker spiral. The bright dot is Parker Solar Probe.', '拂之或触之，以发折返于磁力线。明点者，帕克太阳探测器也。'],
    n: 30,
    launch: function (A, x, y, amp, spread) {
      var au = Math.max(A.W * 0.6, A.H * 1.05), c = A.W < 720 ? [A.W * 0.8, A.H * 0.25] : [A.W * 0.8, A.H * 0.56];
      var dx = x - c[0], dy = y - c[1], r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      var id = Math.round((th + r / au - A.T * 0.045) / TAU * this.n), n = this.n;
      id = ((id % n) + n) % n;
      A.kick(id, Math.max(r - 30, 0), A.T, amp);
      for (var i = 1; i <= (spread || 0); i++) { A.kick((id + i) % n, Math.max(r - 30, 0), A.T, amp * 0.8); A.kick((id - i + n) % n, Math.max(r - 30, 0), A.T, amp * 0.8); }
    },
    move: function (A, x, y) { if (A.T - (this.lastKick || -9) > 0.45) { this.lastKick = A.T; this.launch(A, x, y, 0.62, 0); } },
    press: function (A, x, y) { this.launch(A, x, y, 0.9, 1); },
    tick: function (A) {
      var P = 40, M = A.T * TAU / P + 1.2, e = 0.881, E = M;
      for (var i = 0; i < 7; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      A.a[0] = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    },
    layers: [
      { type: 'quad', blend: 'none', fs: HELIO + `
void main(){vec2 c=SUN(),p=vP-c;float d=length(p),R=RS();vec2 dir=p/max(d,1.);
vec2 uv=vP/uRes;vec3 col=mix(vec3(.024,.047,.115),vec3(.052,.098,.215),ss(1.25,0.,length((uv-vec2(.5,-.2))*vec2(.8,1.))));
float near=ss(R*20.,R*11.,d),st=0.,st2=0.;if(near>0.){st=fbm(dir*2.2+vec2(uT*.012,0.),4);st2=fbm(dir*5.5-vec2(0.,uT*.018),3);}
float glow=pw(R/max(d,R),1.45);
col+=vec3(1.,.70,.36)*glow*(.30+1.05*st*st2*2.*near);
col+=vec3(.55,.42,.7)*pw(R/max(d,R),.62)*.07;
vec3 surf=mix(vec3(1.,.74,.36),vec3(1.,.97,.86),pw(1.-min(d/R,1.),.45));
surf*=.9+.2*fbm(p/R*5.+uT*.05,3);
col=mix(col,surf,ss(R,R-1.4,d));
C=vec4(col+dith(),1.);}` },
      stars(3400),
      { type: 'lines', blend: 'add', n: 30, seg: 300, path: HELIO + `
const float N=30.;
void bend(inout float r,inout float off,inout float heat,float rr,float x0,float w,float a){float u=(rr-x0)/w,g=exp(-u*u);r-=2.7*a*w*u*g;off+=1.25*a*w*g/max(rr,30.);heat=max(heat,a*g);}
vec4 path(float s,float id){vec2 c=SUN();float au=AU(),rm=max(uRes.x,uRes.y)*1.3,R0=RS()*.7;
float rr=R0+(rm-R0)*pw(s,1.4),r=rr,off=0.,heat=0.;
for(int j=0;j<2;j++){float fj=float(j),h=h11(id*7.31+fj*13.1+1.),v=46.+60.*h;float x0=mod(h*rm*4.+uT*v,rm+300.)-60.;
float a=step(.62-.2*fj,h11(id*3.3+fj))*(.42+.38*h)*ss(10.,120.,x0);bend(r,off,heat,rr,x0,11.+.05*x0+18.*h,a);}
for(int j=0;j<8;j++){vec4 k=uK[j];if(k.w<=0.)continue;float dd=abs(mod(id-k.x+N*.5,N)-N*.5);if(dd>.5)continue;
float age=uT-k.z,x0=k.y+age*105.;bend(r,off,heat,rr,x0,16.+.03*x0,k.w*ss(0.,.3,age)*ss(11.,6.,age));}
float th=id/N*TAU+uT*.045-r/au+off;
return vec4(c+r*vec2(cos(th),sin(th)),.42+.9*heat,heat);}`, ink: `
const float N=30.;
vec4 ink(){float c=exp(-vCross*vCross*2.4),f=pw(max(1.-vS,0.),1.6),h=clamp(vHeat,0.,1.);
float sec=ss(-.25,.25,sin(vId/N*TAU+uT*.045+.9));
vec3 col=mix(vec3(.50,.68,.98),vec3(.92,.76,.44),sec);col=mix(col,vec3(1.,.95,.78),h);
float a=(.035+.52*f+.92*h*(.45+.55*f))*c*ss(0.,.03,vS)*(1.-.5*uDim);return vec4(col*a,0.);}` },
      { type: 'lines', blend: 'add', n: 4, seg: 420, path: HELIO + `
vec4 path(float s,float id){vec2 c=SUN();float au=AU(),a=s*TAU,r;
if(id<2.5){r=(id<.5?.387:id<1.5?.723:1.)*au;}else{r=.388*(1.-.881*.881)/(1.+.881*cos(a))*au;a+=2.75;}
return vec4(c+r*vec2(cos(a),sin(a)),id<2.5?.32:.42,0.);}`, ink: `
vec4 ink(){float c=exp(-vCross*vCross*2.4);
if(vId<2.5){float dash=step(.45,fract(vS*(vId<.5?90.:vId<1.5?170.:240.)));return vec4(vec3(.62,.70,.86)*.13*dash*c,0.);}
float d=fract(uA[0].x/TAU-vS+1.);
return vec4(vec3(1.,.9,.66)*(.16+.8*exp(-d*11.))*c,0.);}` },
      { type: 'points', blend: 'add', n: 4, place: HELIO + `
vec4 place(float id){vec2 c=SUN();float au=AU();
if(id>2.5){float nu=uA[0].x,r=.388*(1.-.881*.881)/(1.+.881*cos(nu));float a=nu+2.75;return vec4(c+r*au*vec2(cos(a),sin(a)),7.,1.);}
float rr=id<.5?.387:id<1.5?.723:1.,per=id<.5?88.:id<1.5?225.:365.,a=uT*TAU/(per*.4545)+id*2.1+.9;
return vec4(c+rr*au*vec2(cos(a),sin(a)),5.,id);}`, sprite: `
vec4 sprite(){float d=dot(vQ,vQ);
if(vId>2.5){float a=exp(-d*14.)+.35*exp(-d*3.);return vec4(vec3(1.,.93,.72)*a,0.);}
vec3 c=vId<.5?vec3(.75,.72,.68):vId<1.5?vec3(.95,.83,.62):vec3(.45,.72,1.);
return vec4(c*exp(-d*7.)*.85,0.);}` },
      { type: 'points', blend: 'add', n: 170, place: HELIO + `
vec4 place(float id){vec2 c=SUN();float h=h11(id*1.9+.2),h2=h11(id*4.3+1.),rm=max(uRes.x,uRes.y)*1.1;
float r=mod(h*rm+uT*(44.+60.*h2),rm)+RS();float a=h2*TAU+id;return vec4(c+r*vec2(cos(a),sin(a)),1.6,r/rm);}`, sprite: `
vec4 sprite(){float d=dot(vQ,vQ);float a=exp(-d*5.)*.5*pw(max(1.-vD.w,0.),1.8);return vec4(vec3(1.,.86,.62)*a,0.);}` }
    ]
  };

  /* ---------- Research overview: an orrery whose bodies are the five topics ---------- */
  var ORB = { tint: [[.62, .42, 1], [.9, .3, .2], [.42, .72, 1], [.2, .85, .8], [1, .66, .2]], w: [.17, .13, .105, .08, .06], ph: [.6, 2.4, 4.1, 5.5, 1.5], size: [15, 12, 13, 14, 18], ring: [.40, .55, .70, .85, 1] };
  SCENES.research = {
    full: true, still: 12,
    hint: ['Each body is a topic. Point at one to name it, click to open it.', '一星一题。指之见其名，触之入其篇。'],
    init: function (A) {
      this.links = [].slice.call(document.querySelectorAll('.site-nav .sub-menu a')).slice(0, 5);
      this.hover = -1; this.heat = [0, 0, 0, 0, 0]; this.ph = ORB.ph.slice();
    },
    tick: function (A, dt) {
      var nar = A.W < 720, cx = A.W * (nar ? .52 : .67), cy = A.H * (nar ? .34 : .56), R = nar ? A.W * .47 : Math.min(A.W * .3, A.H * .56), fl = .42, tilt = -.2, big = nar ? .95 : 1.45;
      var ct = Math.cos(tilt), st = Math.sin(tilt);
      A.a[20] = cx; A.a[21] = cy; A.a[22] = R; A.a[23] = fl;
      var hit = -1, best = 1e9;
      for (var i = 0; i < 5; i++) {
        this.ph[i] += dt * ORB.w[i] * (this.hover >= 0 ? .12 : 1);
        var rr = R * ORB.ring[i], x = Math.cos(this.ph[i]) * rr, y = Math.sin(this.ph[i]) * rr * fl, px = cx + x * ct - y * st, py = cy + x * st + y * ct;
        var depth = 1 - .26 * Math.sin(this.ph[i]), r = ORB.size[i] * depth * big;
        this.heat[i] += ((this.hover === i ? 1 : 0) - this.heat[i]) * Math.min(1, dt * 7);
        A.a[i * 4] = px; A.a[i * 4 + 1] = py; A.a[i * 4 + 2] = r * (1 + .28 * this.heat[i]); A.a[i * 4 + 3] = this.heat[i];
        if (A.ptr.on && A.ptr.inHero) { var d = Math.hypot(A.ptr.x - px, A.ptr.y - py); if (d < r + 16 && d < best) { best = d; hit = i; } }
      }
      if (hit !== this.hover) {
        this.hover = hit;
        A.hero.style.cursor = hit >= 0 ? 'pointer' : '';
        if (hit < 0) A.label('');
      }
      if (hit >= 0 && this.links[hit]) A.label(this.links[hit].textContent, A.a[hit * 4], A.a[hit * 4 + 1] + A.a[hit * 4 + 2] + 12);
    },
    press: function (A, x, y) {
      if (!A.ptr.inHero) return;
      for (var i = 0; i < 5; i++) if (Math.hypot(x - A.a[i * 4], y - A.a[i * 4 + 1]) < A.a[i * 4 + 2] + 16 && this.links[i]) { location.href = this.links[i].getAttribute('href'); return; }
    },
    layers: [
      { type: 'quad', blend: 'none', fs: `
void main(){vec2 uv=vP/uRes,c=uA[5].xy;float d=length((vP-c)*vec2(1.,2.4))/max(uA[5].z,1.);
vec3 col=mix(vec3(.022,.042,.105),vec3(.052,.096,.21),ss(1.3,0.,length((uv-vec2(.5,-.2))*vec2(.8,1.))));
col+=vec3(.75,.58,.3)*exp(-d*d*3.5)*.13;C=vec4(col+dith(),1.);}` },
      stars(3000),
      { type: 'lines', blend: 'add', n: 5, seg: 240, path: `
vec4 path(float s,float id){float a=s*TAU,R=uA[5].z*(id<.5?.40:id<1.5?.55:id<2.5?.70:id<3.5?.85:1.),ct=cos(-.2),st=sin(-.2);
float x=cos(a)*R,y=sin(a)*R*uA[5].w;return vec4(uA[5].xy+vec2(x*ct-y*st,x*st+y*ct),.42,sin(a));}`, ink: `
vec4 ink(){float c=exp(-vCross*vCross*2.2);float front=.5-.5*vHeat;return vec4(vec3(.89,.78,.51)*(.10+.26*front)*c*(1.-.5*uDim),0.);}` },
      { type: 'points', blend: 'over', n: 6, place: `
vec4 place(float id){if(id>4.5)return vec4(uA[5].xy,17.,0.);return vec4(uA[int(id)].xy,uA[int(id)].z/.6,uA[int(id)].w);}`, sprite: `
vec3 cmapA(float h){return h<.33?mix(vec3(.34,.5,.8),vec3(.49,.38,.9),h*3.):h<.66?mix(vec3(.49,.38,.9),vec3(.8,.27,.67),(h-.33)*3.):mix(vec3(.8,.27,.67),vec3(1.,.74,.24),(h-.66)*3.);}
vec4 sprite(){float r=length(vQ),i=vId;
if(i>4.5){float rays=exp(-abs(vQ.x*vQ.y)*60.)*exp(-r*r*2.5)*.8;float a=exp(-r*r*16.)+.3*exp(-r*r*4.)+rays;return vec4(vec3(1.,.87,.58)*a,0.);}
float R=.6,d=r/R,hov=vD.w;vec3 tint=i<.5?vec3(.62,.42,1.):i<1.5?vec3(.9,.34,.24):i<2.5?vec3(.45,.72,1.):i<3.5?vec3(.2,.85,.8):vec3(1.,.66,.2);
vec3 glow=tint*exp(-max(r-R,0.)*(9.-5.*hov))*(.28+.5*hov);if(d>=1.)return vec4(glow*ss(1.,.7,r),0.);
vec3 n=vec3(vQ/R,sqrt(1.-d*d));vec2 L2=normalize(uA[5].xy-vD.xy);float l=clamp(dot(n,normalize(vec3(L2,.7))),0.,1.);
vec3 s;
if(i<.5){float v=n.y-.5/cosh(n.x*3.2+sin(uT*.3));s=cmapA(.5+.5*sin(v*11.));}
else if(i<1.5){float w=fbm(n.xy*3.+4.,4);s=mix(vec3(.86,.84,.79),vec3(.1,.1,.12),ss(.42,.62,w));s=mix(s,vec3(.76,.2,.13),ss(.2,.15,length(n.xy-vec2(.15,-.1))));}
else if(i<2.5){vec2 g=abs(fract(n.xy*3.2)-.5);s=mix(vec3(.05,.23,.47),vec3(.92,.96,1.),ss(.43,.49,max(g.x,g.y)));}
else if(i<3.5){float w=fbm(n.xy*2.6+9.,4);s=mix(vec3(.02,.13,.17),vec3(.07,.62,.62),w);s=mix(s,vec3(.98,.73,.3),ss(.55,.72,w));}
else{float w=fbm(n.xy*4.+uT*.05,4);s=mix(vec3(.85,.34,.06),vec3(1.,.84,.45),w*1.25);l=.4+.6*l;}
vec3 col=s*(.14+.98*l)+tint*pw(1.-n.z,3.)*.4;float a=ss(1.,.95,d);return vec4(col*a+glow*(1.-a),a);}` }
    ]
  };

  /* ---------- Alfvénons: a bundle of field lines, two solitary twists colliding (colours from the page's own angle colour bar) ---------- */
  SCENES.alfvenons = {
    full: true, still: 8.2,
    hint: ['A sketch, not simulation output. Click anywhere empty to launch another pair.', '此示意之图，非模拟所得。触空处，复发一对。'],
    geo: function (A) { var nar = A.W < 720; return { cx: A.W * (nar ? .5 : .68), cy: A.H * (nar ? .36 : .5), S: nar ? A.W * .62 : Math.max(A.W * .27, A.H * .46) }; },
    press: function (A, x) { var g = this.geo(A), x0 = (x - g.cx) / g.S; A.kick(x0 - .9, 1, A.T, 1); A.kick(x0 + .9, -1, A.T, 1); },
    layers: [
      { type: 'quad', bake: true, every: 0, scale: .5, fs: `
void main(){vec2 uv=vP/uRes,q=vP/min(uRes.x,uRes.y);float n=fbm(q*1.6+3.,5),m=fbm(q*2.7+fbm(q*1.2,3)*2.,4);
vec3 col=mix(vec3(.026,.016,.075),vec3(.075,.034,.17),n);col+=vec3(.19,.05,.26)*pw(m,3.)*1.4;
col+=vec3(.32,.11,.4)*exp(-dot((uv-vec2(.68,.5))*vec2(1.,2.1),(uv-vec2(.68,.5))*vec2(1.,2.1))*5.)*.38;C=vec4(col,1.);}` },
      { type: 'quad', blend: 'none', fs: `void main(){vec3 c=texture(uBake,vP/uRes).rgb*(1.-.4*uDim);C=vec4(c+dith(),1.);}` },
      { type: 'lines', blend: 'add', n: 130, seg: 280, path: `
const float N=130.;
void pulse(inout vec3 p,inout float heat,float x,float y,float z,float x0,float amp,float ch){float u=(x-x0)/.25,E=1./cosh(u),R=exp(-(y*y+z*z)/.26),a=amp*E*R;if(a<.002)return;
float psi=ch*u*1.9+uT*.5*ch;p.y+=.46*a*cos(psi);p.z+=.46*a*sin(psi);p.x-=.25*1.75*u*E*E*R*amp;heat+=a;}
vec4 path(float s,float id){float i=id+.5,rho=sqrt(i/N)*.68,al=i*2.39996,x=mix(-3.,3.,s),y=rho*cos(al),z=rho*sin(al);
vec3 p=vec3(x,y,z);float heat=0.;
float T=17.,f=mod(uT,T)/T;float e=ss(0.,.08,f)*ss(1.,.9,f);
pulse(p,heat,x,y,z,mix(-3.1,2.7,f),e,1.);pulse(p,heat,x,y,z,mix(2.9,-2.9,f),e*.9,-1.);
for(int j=0;j<8;j++){vec4 k=uK[j];if(k.w<=0.)continue;float age=uT-k.z;if(age>12.)continue;pulse(p,heat,x,y,z,k.x+k.y*age*.34,k.w*ss(0.,.5,age)*ss(12.,8.,age),k.y);}
float yaw=-.42+(uPtr.x/uRes.x-.5)*.16*uPtr.z,pitch=.24+(uPtr.y/uRes.y-.5)*.1*uPtr.z,roll=.1;
float cy=cos(yaw),sy=sin(yaw),cp=cos(pitch),sp=sin(pitch);vec3 q=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);q=vec3(q.x,q.y*cp-q.z*sp,q.y*sp+q.z*cp);
float pf=1./(1.+q.z*.2);vec2 o=q.xy*pf;o=vec2(o.x*cos(roll)-o.y*sin(roll),o.x*sin(roll)+o.y*cos(roll));
bool nar=uRes.x<720.;vec2 c=uRes*(nar?vec2(.5,.36):vec2(.68,.5));float S=nar?uRes.x*.62:max(uRes.x*.27,uRes.y*.46);
return vec4(c+o*S,(.4+.85*clamp(heat,0.,1.))*pf,clamp(heat,0.,1.5));}`, ink: `
vec3 cmap(float h){h=clamp(h,0.,1.);return h<.2?mix(vec3(.34,.5,.8),vec3(.49,.38,.9),h*5.):h<.4?mix(vec3(.49,.38,.9),vec3(.8,.27,.67),(h-.2)*5.):h<.6?mix(vec3(.8,.27,.67),vec3(.98,.43,.2),(h-.4)*5.):h<.8?mix(vec3(.98,.43,.2),vec3(1.,.75,.24),(h-.6)*5.):mix(vec3(1.,.75,.24),vec3(1.,.94,.59),(h-.8)*5.);}
vec4 ink(){float c=exp(-vCross*vCross*2.3),h=min(vHeat,1.);vec3 col=cmap(.06+.94*h);
float clear=uRes.x<720.?1.:mix(.2,1.,ss(.46,.72,gl_FragCoord.x/uPx/uRes.x));float a=(.07+.34*h*h+.1*h)*c*(1.-.74*uDim)*ss(0.,.06,vS)*ss(1.,.94,vS)*clear;return vec4(col*a,0.);}` }
    ]
  };

  /* ---------- LingTai 灵台: ink-wash ranges; agents on the ridges passing mail ---------- */
  var RIDGE = `
float ridge(float x,float i){bool nar=uRes.x<720.;float px=(uPtr.x/uRes.x-.5)*uPtr.z*(4.+i*11.);x+=px;
float f=(1.3+i*.75)/max(uRes.x,560.)*2.1;float base=(nar?.40-i*.075:.52-i*.115)*uRes.y;
float swell=(.13-.02*i)*uRes.y*ss(.34,1.,x/uRes.x)*(i<1.5?1.:.6)-(.06*uRes.y)*(1.-ss(0.,.5,x/uRes.x));
float big=fbm(vec2(x*f+i*7.3,i*3.1),3),fine=fbm(vec2(x*f*5.+i*2.,i),4);
return base+swell+(big-.5)*uRes.y*(.34-.03*i)+(pw(fine,1.4)-.2)*uRes.y*.06;}
`;
  SCENES.lingtai = {
    full: true, still: 40, light: true,
    hint: ['Click: the nearest agent sends mail.', '触之，则近者致书。'],
    press: function (A, x, y) { for (var i = 0; i < 3; i++) A.kick(x, y, A.T, 1 + i); },
    layers: [
      { type: 'quad', bake: true, every: 2, scale: .55, fs: RIDGE + `
void main(){float x=vP.x,y=vP.y;vec3 paper=vec3(.902,.894,.868),inkc=vec3(.075,.078,.094);
float ink=0.;float mist=fbm(vec2(x*.0022+uT*.012,y*.006-uT*.004),4);
for(int k=0;k<4;k++){float i=float(k),r=ridge(x,i);if(y>r)continue;float d=(r-y)/uRes.y;
float tex=.58+.75*fbm(vec2(x*.013+i*5.,y*.042+i),4);
float dark=(i<.5?.15:i<1.5?.3:i<2.5?.5:.78);
float wash=(.2+.8*exp(-d*(i<2.5?7.:4.5)))*tex;
float m=ss(.0,.42,d)*(.5+.75*mist);wash*=1.-min(m*(i<2.5?1.15:.5),.95);
ink=ink+(1.-ink)*clamp(dark*wash,0.,1.);}
ink*=1.-.82*uDim;C=vec4(mix(paper,inkc,ink),1.);}` },
      { type: 'quad', blend: 'none', fs: `
void main(){vec3 c=texture(uBake,vP/uRes).rgb;float g=fbm(vP*vec2(.55,.9),3)-.5,g2=vn(vP*vec2(.04,1.1))-.5;c*=1.+g*.035+g2*.018;C=vec4(c+dith(),1.);}` },
      { type: 'points', blend: 'over', n: 22, place: RIDGE + `
vec4 place(float id){float h=h11(id*2.3+.7),x=(.04+.92*h)*uRes.x+sin(uT*.05+id)*5.,lay=1.+mod(id,3.);
float y=ridge(x,lay)+2.;float s=3.1+1.6*h11(id*4.1);return vec4(x,y,s,id);}`, sprite: `
vec4 sprite(){float r=length(vQ);float a=ss(1.,.74,r)*(1.-.8*uDim);bool seal=mod(vId,7.)<.5;vec3 c=seal?vec3(.68,.16,.09):vec3(.06,.06,.08);
float halo=seal?.0:ss(1.,.5,r)*.0;return vec4(c*a,a+halo);}` },
      { type: 'lines', blend: 'over', n: 14, seg: 60, path: RIDGE + `
vec2 agent(float id){float h=h11(id*2.3+.7),x=(.04+.92*h)*uRes.x+sin(uT*.05+id)*5.,lay=1.+mod(id,3.);return vec2(x,ridge(x,lay)+2.);}
vec4 path(float s,float id){vec2 a,b;float head;
if(id<6.){float per=5.5+id*.9,t=(uT+id*1.7)/per,k=floor(t);head=fract(t);a=agent(mod(k*5.+id*3.,22.));b=agent(mod(k*11.+id*7.+3.,22.));}
else{vec4 q=uK[int(id)-6];if(q.w<=0.)return vec4(0.);float age=uT-q.z;if(age>2.2)return vec4(0.);head=age/2.2;
float best=1e9,bi=0.;for(int i=0;i<22;i++){float d=distance(agent(float(i)),q.xy);if(d<best){best=d;bi=float(i);}}a=agent(bi);b=agent(mod(bi+q.w*5.+floor(q.z*3.),22.));}
float dist=distance(a,b);vec2 p=mix(a,b,s);p.y+=sin(s*PI)*min(dist*.28,uRes.y*.16);return vec4(p,.5,head);}`, ink: `
vec4 ink(){float c=exp(-vCross*vCross*2.);float d=vHeat-vS;float trail=d>=0.?exp(-d*7.):exp(d*60.);float a=(.08+.62*trail)*c*ss(0.,.08,vHeat)*ss(1.,.86,vHeat)*(1.-.85*uDim);
vec3 col=mix(vec3(.08,.08,.1),vec3(.68,.16,.09),trail*trail);return vec4(col*a,a);}` }
    ]
  };

  /* ---------- ScienceIDE: a cyanotype sheet. The test case is Sod's shock tube (the exact solution); poke the output and the verifier grades it ---------- */
  var SOD = `
float sod(float x,float t){float xi=(x-.5)/max(t,.001);if(xi<-1.18322)return 1.;if(xi<-.07027)return pw(.83333+.14086*(-xi),5.);if(xi<.92745)return .42632;if(xi<1.75216)return .26557;return .125;}
float defect(float x){float d=0.;for(int j=0;j<8;j++){vec4 k=uK[j];if(k.y==0.)continue;float age=uT-k.z;float u=(x-k.x)/k.w;d+=k.y*exp(-age/1.1)*exp(-u*u)*sin(u*7.);}return d;}
float output_(float x,float t){float h=.0085;return (sod(x-h,t)+2.*sod(x,t)+sod(x+h,t))*.25+defect(x);}
float runT(){return .02+.2*fract(uT/17.);}
`;
  function jsSod(x, t) { var xi = (x - .5) / Math.max(t, .001); if (xi < -1.18322) return 1; if (xi < -.07027) return Math.pow(.83333 + .14086 * -xi, 5); if (xi < .92745) return .42632; if (xi < 1.75216) return .26557; return .125; }
  SCENES.scienceide = {
    full: true, still: 9.5, quietBelow: true,
    hint: ['Move across the plot to inject a defect. The verifier re-runs the physics.', '拂其图以入瑕，校者复验其理。'],
    init: function (A) {
      var el = document.createElement('div'); el.className = 'sci-readout'; el.setAttribute('aria-hidden', 'true'); A.hero.appendChild(el); this.el = el; this.nextAuto = 4;
    },
    rect: function (A) {
      var nar = A.W < 860, w = nar ? A.W * .84 : Math.min(A.W * .36, 520), h = nar ? A.heroH * .26 : A.heroH * .56, x = nar ? A.W * .08 : A.W - w - Math.max(50, A.W * .045), topOff = nar ? A.heroH * .66 : A.heroH * .22;
      return { x: x, y: A.H - (A.heroTop + topOff + h), w: w, h: h, cssLeft: x, cssTop: topOff + h + 26 };
    },
    defectAt: function (A, x) {
      var d = 0;
      for (var j = 0; j < 8; j++) { var o = j * 4, a = A.k[o + 1]; if (!a) continue; var age = A.T - A.k[o + 2], u = (x - A.k[o]) / A.k[o + 3]; d += a * Math.exp(-age / 1.1) * Math.exp(-u * u) * Math.sin(u * 7); }
      return d;
    },
    tick: function (A) {
      var r = this.rect(A); A.a[0] = r.x; A.a[1] = r.y; A.a[2] = r.w; A.a[3] = r.h;
      var inP = A.ptr.on && A.ptr.x > r.x && A.ptr.x < r.x + r.w && A.ptr.y > r.y && A.ptr.y < r.y + r.h;
      A.a[4] = inP ? A.ptr.x : -1; A.a[5] = inP ? A.ptr.y : -1;
      if (inP && A.T - (this.lastKick || -9) > .3) { this.lastKick = A.T; A.kick((A.ptr.x - r.x) / r.w, .12, A.T, .035); }
      if (!inP && A.T > this.nextAuto) { this.nextAuto = A.T + 6.5; A.kick(.2 + Math.random() * .7, .13, A.T, .04); }
      var f = A.T / 17, t = .02 + .2 * (f - Math.floor(f)), sum = 0, n = 400, h = .0085;
      for (var i = 0; i < n; i++) {
        var x = (i + .5) / n, ref = jsSod(x, t);
        sum += Math.abs((jsSod(x - h, t) + 2 * ref + jsSod(x + h, t)) * .25 + this.defectAt(A, x) - ref);
      }
      var L1 = sum / n, pass = L1 < .006, L = lang();
      if (A.T - (this.lastRead || -9) > .1 && this.el) {
        this.lastRead = A.T; this.el.style.left = r.cssLeft + 'px'; this.el.style.top = r.cssTop + 'px';
        var cur = inP ? ('x ' + ((A.ptr.x - r.x) / r.w).toFixed(3) + ', ρ ' + ((A.ptr.y - r.y) / r.h * 1.1).toFixed(3) + '  ') : '';
        this.el.textContent = (L ? 'Sod 激波管，t = ' : 'Sod shock tube, t = ') + t.toFixed(3) + '  ' + cur + (L ? 'L1 差 ' : 'L1 error ') + L1.toFixed(4) + (pass ? (L ? '，过' : ', passes') : (L ? '，未过' : ', fails'));
        this.el.classList.toggle('fail', !pass);
      }
    },
    layers: [
      { type: 'quad', bake: true, every: 0, scale: 1, fs: `
float gl(float v,float w){float d=abs(fract(v/w+.5)-.5)*w;return 1.-ss(0.,1.1/uPx,d);}
void main(){vec2 q=vP/380.;float m=fbm(q*1.1+2.,5),f=fbm(vP*vec2(.012,.4),3),f2=fbm(vP*vec2(.4,.012)+9.,3);
vec3 col=mix(vec3(.035,.15,.335),vec3(.066,.225,.45),m);col+=vec3(.02,.03,.045)*(f+f2-1.);
vec2 corner=abs(vP/uRes-.5)*2.;col*=1.-.32*pw(max(corner.x,corner.y),3.);
float a=max(gl(vP.x,20.),gl(vP.y,20.))*.055+max(gl(vP.x,100.),gl(vP.y,100.))*.13;col=mix(col,vec3(.88,.94,1.),a);C=vec4(col,1.);}` },
      { type: 'quad', blend: 'none', fs: `void main(){C=vec4(texture(uBake,vP/uRes).rgb+dith(),1.);}` },
      { type: 'lines', blend: 'over', n: 30, seg: 1, path: `
vec4 path(float s,float id){vec2 o=uA[0].xy,d=uA[0].zw;vec2 a,b;
if(id<.5){a=o;b=o+vec2(d.x,0.);}else if(id<1.5){a=o;b=o+vec2(0.,d.y);}else if(id<2.5){a=o+vec2(0.,d.y);b=o+d;}else if(id<3.5){a=o+vec2(d.x,0.);b=o+d;}
else if(id<14.5){float t=(id-4.)/10.;a=o+vec2(d.x*t,0.);b=a+vec2(0.,mod(id,5.)<.5?-11.:-6.);}
else{float t=(id-15.)/11.;a=o+vec2(0.,d.y*t/1.1*1.0);b=a+vec2(mod(id-15.,5.)<.5?-11.:-6.,0.);}
return vec4(mix(a,b,s),.45,0.);}`, ink: `vec4 ink(){float a=.72*exp(-vCross*vCross*1.6);return vec4(vec3(.9,.95,1.)*a,a);}` },
      { type: 'lines', blend: 'over', n: 2, seg: 500, path: SOD + `
vec4 path(float s,float id){float t=runT(),y=id<.5?sod(s,t):output_(s,t);return vec4(uA[0].x+s*uA[0].z,uA[0].y+y/1.1*uA[0].w,id<.5?.5:.95,id);}`, ink: `
vec4 ink(){float f=fract(uT/17.);float fade=ss(0.,.04,f)*ss(1.,.96,f);float c=exp(-vCross*vCross*2.);
float dash=vId<.5?step(.5,fract(vS*90.)):1.;float a=(vId<.5?.62:1.)*dash*c*fade;vec3 col=vId<.5?vec3(.78,.87,1.):vec3(1.);return vec4(col*a,a);}` },
      { type: 'lines', blend: 'over', n: 2, seg: 1, path: `
vec4 path(float s,float id){if(uA[1].x<0.)return vec4(0.);vec2 o=uA[0].xy,d=uA[0].zw;vec2 p=id<.5?vec2(o.x+d.x*s,uA[1].y):vec2(uA[1].x,o.y+d.y*s);return vec4(p,.42,0.);}`, ink: `
vec4 ink(){float a=.62*exp(-vCross*vCross*1.6);return vec4(vec3(1.,.82,.45)*a,a);}` }
    ]
  };

  /* ---------- ALE astronomy: a Hubble-palette sky. The pointer is a point-mass gravitational lens; stars and nebula obey the lens equation ---------- */
  SCENES.ale = {
    full: true, still: 14,
    hint: ['Your pointer is a lensing mass: the sky bends by the point-lens equation. The sky itself is invented. Click to add mass.', '指所至，有质量焉，天光为之曲折，依透镜之式。星云则虚构也。触之增其质。'],
    init: function (A) { this.lx = A.W * .68; this.ly = A.H * .55; this.E = 0; this.Eg = 1; },
    press: function () { this.Eg = this.Eg > 1.7 ? 1 : this.Eg + .55; },
    tick: function (A, dt) {
      var tx, ty, s = Math.min(1, dt * 5);
      if (A.ptr.on) { tx = A.ptr.x; ty = A.ptr.y; }
      else { tx = A.W * (.66 + .2 * Math.sin(A.T * .11)); ty = A.H * (.58 + .22 * Math.sin(A.T * .17 + 1)); s = Math.min(1, dt * .9); }
      this.lx += (tx - this.lx) * s; this.ly += (ty - this.ly) * s;
      var base = Math.max(46, Math.min(A.W, A.H) * .085) * this.Eg;
      this.E += (base - this.E) * Math.min(1, dt * 3);
      A.a[0] = this.lx; A.a[1] = this.ly; A.a[2] = this.E;
    },
    layers: [
      { type: 'quad', bake: true, every: 0, scale: .6, fs: `
void main(){vec2 uv=vP/min(uRes.x,uRes.y)*1.75;vec2 w=vec2(fbm(uv+1.7,5),fbm(uv+8.3,5));vec2 w2=vec2(fbm(uv+w*2.+3.,5),fbm(uv+w*2.+11.,5));
float n=fbm(uv+w2*2.3,6),dust=ss(.40,.70,fbm(uv*1.5+w*3.2+21.,6)),e=fbm(uv*.8+w2+5.,4);
vec3 col=vec3(.006,.014,.032);col+=vec3(.02,.2,.25)*pw(n,2.5)*3.1;col+=vec3(.96,.52,.14)*pw(max(n-.44,0.),2.)*8.5*ss(.36,.6,e);col+=vec3(1.,.86,.62)*pw(max(n-.6,0.),2.)*11.*ss(.42,.6,e);
col*=1.-.86*dust;float mask=mix(.1,1.,ss(.22,.78,vP.x/uRes.x))*(.55+.45*ss(1.1,.2,abs(vP.y/uRes.y-.55)*2.));C=vec4(col*mask,1.);}` },
      { type: 'quad', blend: 'none', fs: `
void main(){vec2 L=uA[0].xy,th=vP-L;float r2=dot(th,th)+.5,E=uA[0].z;vec2 b=vP-th*(E*E/r2);
vec3 c=texture(uBake,b/uRes).rgb;c*=1.-.46*uDim;C=vec4(c+dith(),1.);}` },
      { type: 'points', blend: 'add', n: function (A) { return Math.min(1600, Math.round(A.W * A.H / 1150)) * 2; }, count: true, place: `
uniform float uN;
vec4 src;float sign_;
vec4 place(float id){float half_=uN*.5,i=mod(id,half_);sign_=id<half_?1.:-1.;float m=h11(i*5.1+.3);m=m*m*m;float big=step(.982,h11(i*8.7+2.));vec2 s=vec2(h11(i*1.37+3.1),h11(i*2.71+7.7))*uRes;
vec2 L=uA[0].xy;float E=uA[0].z;vec2 be=s-L;float bl=max(length(be),.5),u=bl/E,root=sqrt(u*u+4.);
float th=.5*E*(u+sign_*root);vec2 pos=L+be/bl*th;
float mu=abs((u*u+2.)/(u*root)+sign_)*.5;mu=min(mu,14.);
if(sign_<0.&&mu<.012)return vec4(0.);
float r=big>.5?15.+10.*m:1.5+2.6*m;src=vec4(be/bl,th/E,mu);
return vec4(pos,r,big>.5?mu*(1.+m)+.0:-mu*(.16+m*.9));}`, shape: `
vec2 shape(vec2 q,vec4 a){if(a.z<=0.)return vec2(0.);vec2 rad=src.xy*sign_,tan_=vec2(-rad.y,rad.x);float x=1./max(src.z*src.z,.0025);float st=min(1./max(abs(1.-x),.07),9.),sr=1./(1.+x);return a.z*(rad*q.x*max(sr,.25)+tan_*q.y*st*(st>1.2?.9:1.));}`, sprite: `
vec4 sprite(){float d=dot(vQ,vQ),i=vId,big=vD.w>0.?1.:0.,b=abs(vD.w);float core=exp(-d*(big>.5?70.:6.))+big*.25*exp(-d*14.);float sp=0.;if(big>.5){sp=(exp(-abs(vQ.x)*5.)*exp(-vQ.y*vQ.y*340.)+exp(-abs(vQ.y)*5.)*exp(-vQ.x*vQ.x*340.))*.7;}
vec3 c=mix(vec3(.72,.84,1.),vec3(1.,.82,.58),h11(i*3.3+1.));float tw=.84+.16*sin(uT*(.4+h11(i)*1.1)+i);float a=(core+sp)*min(b,2.6)*tw*(1.-.45*uDim);return vec4(c*a,0.);}` }
    ]
  };

  /* ---------- Solar wind: the limb in EUV colours, coronal loops, wind streaming away. Click for a flare and a CME ---------- */
  var LIMB = `
vec2 SC(){return uRes.x<720.?vec2(uRes.x*.7,uRes.y*.1):vec2(uRes.x+max(uRes.y*.92,uRes.x*.46)*.62,uRes.y*.52);}
float SR(){return uRes.x<720.?uRes.x*.6:max(uRes.y*.92,uRes.x*.46);}
`;
  SCENES.solar = {
    full: true, still: 22,
    hint: ['A drawing in the colours of the Sun in EUV, not data. Click for a flare.', '此绘日之远紫外色，非观测所得。触之，发耀斑。'],
    press: function (A, x, y) {
      var nar = A.W < 720, R = nar ? A.W * .6 : Math.max(A.H * .92, A.W * .46), cx = nar ? A.W * .7 : A.W + R * .62, cy = nar ? A.H * .1 : A.H * .52;
      var ang = Math.atan2(y - cy, -(x - cx));
      A.kick(ang, A.T, 0, 1);
    },
    layers: [
      { type: 'quad', bake: true, every: 2, scale: .5, fs: LIMB + `
void main(){vec2 c=SC();float R=SR();vec2 p=vP-c;float r=length(p),a=atan(p.y,-p.x);vec2 dir=p/max(r,1.);float h=(r-R)/R;
float fringe=(vn(vec2(a*210.,uT*.25))*.6+vn(vec2(a*70.,uT*.18))*.4)*.016;float e=h-fringe;
vec3 col=vec3(.03,.012,.008);
if(e<0.){float mu=sqrt(max(1.-r*r/(R*R),0.));vec2 uv=p/R/(.42+mu)*5.2;vec2 w=vec2(fbm(uv+uT*.012,4),fbm(uv+9.-uT*.01,4));float n=fbm(uv*1.25+w*2.4,5);n=pw(n,1.5)*2.7;
col=mix(vec3(.40,.075,.012),vec3(1.,.47,.08),clamp(n,0.,1.));col=mix(col,vec3(1.,.88,.58),ss(.8,1.35,n));col*=.42+.95*pw(1.-mu,1.6);
col*=ss(-.001,-.012,e)*.25+.75;}
else{float st=fbm(vec2(a*3.2+4.,h*.35-uT*.008),4);float wind=fbm(vec2(a*26.,log(1.+h*4.)*7.-uT*.34),3),fine=vn(vec2(a*95.,log(1.+h*4.)*16.-uT*.8));
float g=exp(-e*7.5)*(.62+.9*st)+.3*exp(-e*1.5)*(.3+1.3*st);g*=.75+.5*wind;
col+=vec3(1.,.48,.13)*g*.58;col+=vec3(1.,.72,.34)*exp(-e*2.6)*pw(wind,3.)*.75*(.5+fine);
col+=vec3(1.,.82,.5)*exp(-e*42.)*.8;}
col*=mix(1.,.68,uDim);C=vec4(col,1.);}` },
      { type: 'quad', blend: 'none', fs: `void main(){C=vec4(texture(uBake,vP/uRes).rgb+dith(),1.);}` },
      { type: 'lines', blend: 'add', n: 64, seg: 56, path: LIMB + `
vec4 path(float s,float id){float R=SR();vec2 c=SC();float h=h11(id*3.7+1.),h2=h11(id*9.1+2.),h3=h11(id*5.3+4.);
float a0=(h-.5)*1.9+(uRes.x<720.?1.25:0.),span=.018+.075*h2*h2+.012*h3,hgt=(.022+.15*h2*h2*(.5+h3))*(1.+.05*sin(uT*.25+id));
float a=a0+span*(s-.5)*2.+.02*h3*sin(s*PI);float r=R*(1.+hgt*sin(PI*s));return vec4(c+r*vec2(-cos(a),sin(a)),.5+.5*h3,h);}`, ink: `
vec4 ink(){float c=exp(-vCross*vCross*2.2);float rain=exp(-pw((fract(vS*1.5+uT*.07+vHeat*7.)-.5)*9.,2.));float foot=exp(-pw((vS-.5)*2.,8.)*0.)*(.55+.45*pw(abs(vS-.5)*2.,3.));
vec3 col=mix(vec3(1.,.62,.2),vec3(1.,.94,.68),rain);float a=(.2+.6*rain*.8)*foot*c*(.5+.7*h11(vId*2.2));return vec4(col*a*(1.-.25*uDim),0.);}` },
      { type: 'lines', blend: 'add', n: 24, seg: 60, path: LIMB + `
vec4 path(float s,float id){int j=int(mod(id,8.));vec4 k=uK[j];if(k.w<=0.)return vec4(0.);float age=uT-k.y;if(age<0.||age>10.)return vec4(0.);
float R=SR(),n=floor(id/8.),o=(s-.5)*2.,rise=R*.012+age*(62.-n*11.)*(R/800.+.4),a=k.x+o*.55*(1.-exp(-age*.7));float r=R+rise*sqrt(max(1.-o*o,0.))*(1.+.06*sin(o*17.+id));
return vec4(SC()+r*vec2(-cos(a),sin(a)),3.4-n,1.-age/10.);}`, ink: `
vec4 ink(){float c=exp(-vCross*vCross*2.6);float a=vHeat*vHeat*(.32+.2*sin(vS*80.+vId))*c*ss(0.,.1,vS)*ss(1.,.9,vS);return vec4(vec3(1.,.84,.56)*a,0.);}` },
      { type: 'points', blend: 'add', n: 8, place: LIMB + `
vec4 place(float id){vec4 k=uK[int(id)];if(k.w<=0.)return vec4(0.);float age=uT-k.y;if(age<0.||age>5.)return vec4(0.);float R=SR();return vec4(SC()+R*vec2(-cos(k.x),sin(k.x)),40.+age*26.,1.-age/5.);}`, sprite: `
vec4 sprite(){float d=dot(vQ,vQ);float a=vD.w*vD.w*vD.w*(exp(-d*22.)*1.8+exp(-d*5.)*.6);return vec4(vec3(1.,.9,.7)*a,0.);}` }
    ]
  };

  /* ---------- Publications: the sky is the list. Each star is a work on this page, by year; first-author works are gold and joined in order ---------- */
  SCENES.publications = {
    full: true, still: 6,
    hint: ['Every star is a work below, placed by year. Gold is first-author. Point at one to name it, click to find it.', '一星一篇，以年序之。金者，首署之文也。指之见其题，触之至其处。'],
    init: function (A) {
      var items = [];
      document.querySelectorAll('[data-pubgroup]').forEach(function (g) {
        g.querySelectorAll('li').forEach(function (li) {
          var yr = li.querySelector('.yr'), m = yr && /\d{4}/.exec(yr.textContent), ti = li.querySelector('.ti');
          if (m) items.push({ y: +m[0], k: g.dataset.pubgroup, li: li, title: ti ? ti.textContent : '' });
        });
      });
      this.items = items;
      this.years = {};
      var seen = {};
      items.forEach(function (it) { seen[it.y] = (seen[it.y] || 0) + 1; }); this.hist = seen;
      this.ymin = Math.min.apply(null, items.map(function (i) { return i.y; })); this.ymax = Math.max.apply(null, items.map(function (i) { return i.y; }));
      var self = this, pf = document.querySelector('.pub-filter');
      if (pf) { var up = function () { self.layout(A); }; pf.addEventListener('input', up); pf.addEventListener('click', up); }
      this.hover = -1;
      var box = document.createElement('div'); box.className = 'pub-years'; box.setAttribute('aria-hidden', 'true'); A.hero.appendChild(box); this.box = box;
      for (var y = this.ymin; y <= this.ymax; y++) { var s = document.createElement('span'); s.textContent = y; box.appendChild(s); }
    },
    resize: function (A) { this.layout(A); },
    layout: function (A) {
      var items = this.items, span = this.ymax - this.ymin + 1, nar = A.W < 720, left = A.W * (nar ? .05 : .07), width = A.W * (nar ? .9 : .9), docTop = A.heroTop + A.scroll, top = A.H - docTop - 60, bottom = A.H - docTop - A.heroH + 112;
      var cw = width / span, pts = [];
      items.forEach(function (it, i) {
        var h1 = fh(it.title, 7), h2 = fh(it.title, 13);
        it.x = left + (it.y - this.ymin + .12 + .76 * h1) * cw; it.py = bottom + (top - bottom) * h2;
      }, this);
      for (var pass = 0; pass < 30; pass++) for (var i = 0; i < items.length; i++) for (var j = 0; j < i; j++) {
        var a = items[i], b = items[j], dx = a.x - b.x, dy = a.py - b.py, d = Math.hypot(dx, dy) + .01, min = nar ? 13 : 24;
        if (d < min) { var f = (min - d) / d * .5; a.x += dx * f; b.x -= dx * f; a.py += dy * f; b.py -= dy * f; }
      }
      items.forEach(function (it) { it.py = Math.min(top, Math.max(bottom, it.py)); });
      var data = new Float32Array(items.length * 4);
      items.forEach(function (it, i) {
        var hid = it.li.hidden, first = it.k === 'first', pre = it.k === 'pre', ws = it.k === 'ws';
        data[i * 4] = it.x; data[i * 4 + 1] = it.py; data[i * 4 + 2] = hid ? 0 : (first ? 19 : pre ? 12 : ws ? 8 : 10.5); data[i * 4 + 3] = first ? 0 : pre ? 1 : ws ? 3 : 2;
      });
      var starsL = this.layers[3]; starsL.data = data; starsL.dirty = true; starsL.count = items.length;
      var chain = items.filter(function (it) { return it.k === 'first' && !it.li.hidden; }).sort(function (a, b) { return a.y - b.y || a.x - b.x; });
      var seg = new Float32Array(Math.max(0, chain.length - 1) * 4);
      for (var c = 0; c + 1 < chain.length; c++) { seg[c * 4] = chain[c].x; seg[c * 4 + 1] = chain[c].py; seg[c * 4 + 2] = chain[c + 1].x; seg[c * 4 + 3] = chain[c + 1].py; }
      var ln = this.layers[2]; ln.data = seg; ln.dirty = true; ln.count = Math.max(0, chain.length - 1);
      if (this.box) [].forEach.call(this.box.children, function (s, k) { s.style.left = (left + (k + .5) * cw) + 'px'; });
    },
    tick: function (A, dt) {
      var hit = -1, best = 1e9;
      if (A.ptr.on && A.ptr.inHero) this.items.forEach(function (it, i) { if (it.li.hidden) return; var d = Math.hypot(A.ptr.x - it.x, A.ptr.y - (it.py + A.scroll)); if (d < 20 && d < best) { best = d; hit = i; } });
      if (hit !== this.hover) { this.hover = hit; A.hero.style.cursor = hit >= 0 ? 'pointer' : ''; if (hit < 0) A.label(''); }
      A.a[0] = hit;
      if (hit >= 0) A.label(this.items[hit].y + '  ' + this.items[hit].title, this.items[hit].x, this.items[hit].py + A.scroll + 18);
    },
    press: function (A, x, y) {
      if (!A.ptr.inHero) return;
      var hit = -1, best = 24;
      this.items.forEach(function (it, i) { if (it.li.hidden) return; var d = Math.hypot(x - it.x, y - (it.py + A.scroll)); if (d < best) { best = d; hit = i; } });
      if (hit < 0) return;
      var li = this.items[hit].li, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      li.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      li.classList.remove('pub-flash'); void li.offsetWidth; li.classList.add('pub-flash');
    },
    layers: [
      { type: 'quad', bake: true, every: 0, scale: .6, fs: `
void main(){vec2 uv=vP/uRes;vec2 q=vP/380.;float band=exp(-pw((uv.y-.62+(uv.x-.5)*.34)*3.2,2.));float n=fbm(q*1.7+fbm(q*2.,3),5),d=fbm(q*3.3+7.,4);
vec3 col=mix(vec3(.018,.032,.085),vec3(.042,.075,.17),ss(1.3,0.,length((uv-vec2(.5,-.2))*vec2(.8,1.))));
col+=vec3(.34,.33,.48)*band*n*n*.42*(1.-.72*ss(.44,.66,d));C=vec4(col,1.);}` },
      { type: 'quad', blend: 'none', fs: `void main(){C=vec4(texture(uBake,vP/uRes).rgb+dith(),1.);}` },
      { type: 'lines', blend: 'add', n: 0, seg: 1, path: `vec4 path(float s,float id){return vec4(mix(aI.xy,aI.zw,s)+vec2(0.,uScroll),.5,0.);}`, ink: `
vec4 ink(){float c=exp(-vCross*vCross*2.);return vec4(vec3(.89,.76,.47)*.42*c,0.);}` },
      { type: 'points', blend: 'add', n: 0, place: `vec4 place(float id){return vec4(aI.xy+vec2(0.,uScroll),aI.z*(id==uA[0].x?1.55:1.),aI.w);}`, sprite: `
vec4 sprite(){float d=dot(vQ,vQ),k=vD.w;float hov=vId==uA[0].x?1.:0.;float tw=.82+.18*sin(uT*(.5+h11(vId)*1.1)+vId*2.);
if(k<.5){float sp=exp(-abs(vQ.x)*5.5)*exp(-vQ.y*vQ.y*180.)+exp(-abs(vQ.y)*5.5)*exp(-vQ.x*vQ.x*180.);float a=(exp(-d*34.)*1.6+exp(-d*6.)*.5+sp*.95)*tw;return vec4(vec3(1.,.84,.5)*a*(1.+hov*.5),0.);}
vec3 c=k<1.5?vec3(1.,.74,.62):k<2.5?vec3(.74,.85,1.):vec3(.62,.72,.9);float a=(exp(-d*14.)*1.5+exp(-d*4.)*.28)*tw*(k<2.5?1.:.72);return vec4(c*a*(1.+hov),0.);}` },
      stars(3000, '.7')
    ]
  };
  function fh(s, seed) { var h = seed * 2654435761 % 4294967296; for (var i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 2654435761); h ^= h >>> 13; } return ((h >>> 0) % 100000) / 100000; }

  /* ---------- CV: a banknote's guilloché, engraved in gilt on intaglio blue ---------- */
  var GUIL = `
vec2 GC(){return uRes.x<720.?vec2(uRes.x*.62,uRes.y*.22):vec2(uRes.x*.875,uRes.y*.56);}
float GR(){return uRes.x<720.?uRes.x*.72:min(uRes.x*.19,uRes.y*.36);}
vec2 bendp(vec2 p){vec2 d=p-uPtr.xy;float g=exp(-dot(d,d)/(2.*80.*80.))*uPtr.z;return p+d/max(length(d),1.)*g*24.;}
`;
  SCENES.cv = {
    full: true, still: 7,
    hint: ['Move: bend the engraving.', '拂之，纹随之曲。'],
    layers: [
      { type: 'quad', bake: true, every: 0, scale: 1, fs: `
void main(){vec2 uv=vP/uRes;vec3 col=mix(vec3(.022,.082,.165),vec3(.05,.15,.27),ss(1.3,0.,length((uv-vec2(.72,.5))*vec2(.9,1.5))));
float h=sin(vP.y*PI*2./3.)*.5+.5;col+=vec3(.024,.034,.046)*h*h;float w=fbm(vP*vec2(.002,.05),3);col*=.94+.12*w;C=vec4(col,1.);}` },
      { type: 'quad', blend: 'none', fs: `void main(){C=vec4(texture(uBake,vP/uRes).rgb+dith(),1.);}` },
      { type: 'lines', blend: 'add', n: 96, seg: 900, path: GUIL + `
vec4 path(float s,float id){float a=s*TAU,fam=mod(id,3.),i=floor(id/3.),ph=i/32.*TAU;float R=GR(),t=uT*.035;float r;
if(fam<.5)r=.66+.22*sin(12.*a+ph+t)*cos(2.*a-ph*.5);else if(fam<1.5)r=.40+.13*sin(18.*a-ph*2.-t*1.4)+.04*sin(3.*a+ph);else r=.93+.05*sin(36.*a+ph*3.+t)+.035*sin(6.*a-ph);
return vec4(bendp(GC()+R*r*vec2(cos(a),sin(a))),.32,fam);}`, ink: `
vec4 ink(){float c=exp(-vCross*vCross*2.2);vec3 col=vHeat<.5?vec3(.90,.75,.42):vHeat<1.5?vec3(.50,.76,.78):vec3(.96,.84,.56);return vec4(col*(vHeat<1.5?.17:.2)*c*mix(.26,1.,ss(1180.,1400.,uRes.x))*(1.-.5*uDim),0.);}` },
      { type: 'lines', blend: 'add', n: 18, seg: 700, path: GUIL + `
vec4 path(float s,float id){float x=s*uRes.x*1.02-uRes.x*.01,ph=id/18.*TAU,t=uT*.05;
float y=38.+13.*sin(x*.028+ph+t)*cos(x*.0041-ph*.5)+6.*sin(x*.11+ph*2.);return vec4(bendp(vec2(x,y)),.3,0.);}`, ink: `
vec4 ink(){float c=exp(-vCross*vCross*2.2);return vec4(vec3(.9,.75,.42)*.2*c*ss(0.,.06,vS)*(1.-.5*uDim),0.);}` }
    ]
  };

  /* ---------- Projects: iron filings on a sheet, with two bar magnets; the pointer holds one of them ---------- */
  var MAG = `
vec2 pole(vec2 p,vec2 c,float q){vec2 d=p-c;float r2=dot(d,d)+50.;return q*d/r2;}
vec2 bar(vec2 p,vec4 m,float q){vec2 u=vec2(cos(m.z),sin(m.z))*(m.w);return pole(p,m.xy+u,q)+pole(p,m.xy-u,-q);}
vec2 BF(vec2 p){return bar(p,uA[0],1.)+bar(p,uA[1],uA[2].x);}
`;
  SCENES.projects = {
    full: true, still: 5,
    hint: ['Iron filings. Your pointer holds a bar magnet: click to flip it.', '铁屑也。指所至有磁石，触之反其极。'],
    init: function (A) { this.q = 1; this.qt = 1; this.mx = A.W * .3; this.my = A.H * .5; this.ang = 1.1; },
    press: function () { this.qt = -this.qt; },
    tick: function (A, dt) {
      var nar = A.W < 720, L = nar ? 26 : 42;
      A.a[0] = A.W * (nar ? .66 : .76) + Math.sin(A.T * .1) * A.W * .03; A.a[1] = A.H * (.52 + .08 * Math.sin(A.T * .14)); A.a[2] = .5 + A.T * .045; A.a[3] = L;
      var tx = A.ptr.on ? A.ptr.x : A.W * (.42 + .16 * Math.sin(A.T * .13)), ty = A.ptr.on ? A.ptr.y : A.H * (.42 + .2 * Math.sin(A.T * .19 + 2)), s = Math.min(1, dt * (A.ptr.on ? 9 : 1.2));
      this.mx += (tx - this.mx) * s; this.my += (ty - this.my) * s; this.ang += dt * .16;
      this.q += (this.qt - this.q) * Math.min(1, dt * 3.4);
      A.a[4] = this.mx; A.a[5] = this.my; A.a[6] = this.ang; A.a[7] = L; A.a[8] = this.q;
    },
    layers: [
      { type: 'quad', bake: true, every: 0, scale: .7, fs: `
void main(){vec2 uv=vP/uRes;float n=fbm(vP*vec2(.012,.018),4),f=fbm(vP*vec2(.3,.03),3);
vec3 col=mix(vec3(.052,.075,.098),vec3(.098,.128,.158),n);col+=vec3(.012)*(f-.5);col*=1.-.42*pw(length((uv-.5)*vec2(1.2,1.3)),2.);C=vec4(col,1.);}` },
      { type: 'quad', blend: 'none', fs: `void main(){C=vec4(texture(uBake,vP/uRes).rgb+dith(),1.);}` },
      { type: 'points', blend: 'add', n: function (A) { return Math.min(15000, Math.round(A.W * A.H / 86)); }, count: true, place: MAG + `
uniform float uN;
vec4 place(float id){vec2 h=vec2(h11(id*1.13+.3),h11(id*2.91+1.1));vec2 p=h*uRes;vec2 b=BF(p);float m=length(b);float s=2.6+5.4*h11(id*.71+2.);return vec4(p,s,m);}`, shape: `
vec2 shape(vec2 q,vec4 a){vec2 b=BF(a.xy);float l=length(b);vec2 u=l>1e-5?b/l:vec2(1.,0.);float k=ss(.0006,.016,a.w);float len=a.z*(.62+.6*k);return u*q.x*len+vec2(-u.y,u.x)*q.y*.62;}`, sprite: `
vec4 sprite(){float ex=ss(1.,.62,abs(vQ.x)),ey=exp(-vQ.y*vQ.y*1.6);float k=ss(.0012,.05,vD.w);vec3 c=mix(vec3(.56,.65,.76),vec3(1.,.88,.68),k*k);float sh=.55+.45*h11(vId*3.1);return vec4(c*ex*ey*(.40+.55*k)*sh*(1.-.55*uDim),0.);}` },
      { type: 'points', blend: 'over', n: 4, place: `
vec4 place(float id){int j=int(id/2.);vec4 m=uA[j];float sgn=mod(id,2.)<.5?1.:-1.;vec2 u=vec2(cos(m.z),sin(m.z))*m.w;return vec4(m.xy+u*sgn,6.5,sgn*(j==1?uA[2].x:1.));}`, sprite: `
vec4 sprite(){float r=length(vQ);vec3 c=mix(vec3(.3,.56,.95),vec3(.92,.28,.22),ss(-.3,.3,vD.w));float a=ss(.72,.6,r);vec3 g=c*exp(-r*r*3.)*.7;return vec4(c*a+g*(1.-a),a);}` }
    ]
  };

  /* ---------- runner ---------- */
  var m = /\btheme-([\w-]+)/.exec(document.body.className), key = m && m[1], S = key && SCENES[key];
  if (!S) return;
  var cv = document.querySelector('.hero-canvas'), hero = document.querySelector('.hero');
  if (!cv || !hero) return;
  var gl = cv.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'default' });
  if (!gl) return;

  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dbg = gl.getExtension('WEBGL_debug_renderer_info');
  var renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  var software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  var maxScale = Math.min(window.devicePixelRatio || 1, S.full ? 1.5 : 2), scale = maxScale;
  var still = reduce || software;

  var A = {
    W: 1, H: 1, T: still ? (S.still || 10) : 0, heroH: 1, heroTop: 0,
    k: new Float32Array(32), a: new Float32Array(32), ptr: { x: 0, y: 0, on: false, inHero: false }, sm: [0, 0, 0], dim: 0, scroll: 0,
    hero: hero, cv: cv, kn: 0,
    kick: function (x, y, z, w) { var i = this.kn++ % 8; this.k[i * 4] = x; this.k[i * 4 + 1] = y; this.k[i * 4 + 2] = z; this.k[i * 4 + 3] = w; },
    label: function (text, x, y) {
      var l = this.lab;
      if (!text) { if (l) l.style.opacity = 0; return; }
      if (!l) { l = this.lab = document.createElement('div'); l.className = 'scene-label'; l.setAttribute('aria-hidden', 'true'); hero.appendChild(l); }
      if (l.textContent !== text) l.textContent = text;
      var r = cv.getBoundingClientRect(), hr = hero.getBoundingClientRect(), cssx = x + r.left - hr.left, cssy = this.H - y + r.top - hr.top;
      l.style.opacity = 1;
      l.style.left = Math.max(8, Math.min(hr.width - l.offsetWidth - 8, cssx - l.offsetWidth / 2)) + 'px';
      l.style.top = Math.max(4, cssy - l.offsetHeight) + 'px';
    }
  };

  var UN = ['uRes', 'uPx', 'uT', 'uPtr', 'uDim', 'uScroll', 'uK', 'uA', 'uSeg', 'uBake', 'uN'];
  function compile(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').slice(0, 3).join(' '));
    return s;
  }
  function program(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}; UN.forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    return { p: p, u: u };
  }

  var bake = null, vao, drawnBake = false, frameNo = 0;
  function build() {
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    S.layers.forEach(function (L) {
      if (L.type === 'quad') L.prog = program(VS_QUAD, FRAG + 'in vec2 vP;\n' + L.fs);
      else if (L.type === 'lines') L.prog = program(vsLines(L.path), FRAG + 'in float vS,vId,vCross,vHeat;\n' + L.ink + '\nvoid main(){C=ink();}');
      else L.prog = program(vsPoints(L.place, L.shape), FRAG + 'in vec2 vQ;in float vId;in vec4 vD;\n' + L.sprite + '\nvoid main(){C=sprite();}');
      L.buf = null; L.vao = null;
    });
    var ok = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
    bake = { tex: gl.createTexture(), fbo: gl.createFramebuffer(), f16: !!ok, w: 0, h: 0 };
  }
  function layerVao(L) {
    if (L.data === undefined) return vao;
    if (!L.vao) {
      L.vao = gl.createVertexArray(); gl.bindVertexArray(L.vao);
      L.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, L.buf);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(0, 1);
      L.dirty = true;
    }
    gl.bindVertexArray(L.vao);
    if (L.dirty) { gl.bindBuffer(gl.ARRAY_BUFFER, L.buf); gl.bufferData(gl.ARRAY_BUFFER, L.data, gl.DYNAMIC_DRAW); L.dirty = false; }
    return L.vao;
  }

  function size() {
    var r = cv.getBoundingClientRect(), hr = hero.getBoundingClientRect();
    A.W = Math.max(1, r.width); A.H = Math.max(1, r.height); A.heroH = hr.height; A.heroTop = hr.top; A.scroll = S.full ? scrollY : 0;
    var w = Math.round(A.W * scale), h = Math.round(A.H * scale);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; drawnBake = false; }
    var L = S.layers.filter(function (l) { return l.bake; })[0];
    if (L) {
      var bw = Math.max(2, Math.round(w * (L.scale || 1))), bh = Math.max(2, Math.round(h * (L.scale || 1)));
      if (bw !== bake.w || bh !== bake.h) {
        bake.w = bw; bake.h = bh;
        gl.bindTexture(gl.TEXTURE_2D, bake.tex);
        if (bake.f16) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, bw, bh, 0, gl.RGBA, gl.HALF_FLOAT, null);
        else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, bw, bh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bake.fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bake.tex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        drawnBake = false;
      }
    }
    if (S.resize && A.ready) S.resize(A);
  }

  function setU(L, n) {
    var u = L.prog.u;
    gl.useProgram(L.prog.p);
    gl.uniform2f(u.uRes, A.W, A.H); gl.uniform1f(u.uPx, cv.width / A.W); gl.uniform1f(u.uT, A.T);
    gl.uniform3f(u.uPtr, A.sm[0], A.sm[1], A.sm[2]); gl.uniform1f(u.uDim, A.dim); gl.uniform1f(u.uScroll, A.scroll);
    if (u.uK) gl.uniform4fv(u.uK, A.k);
    if (u.uA) gl.uniform4fv(u.uA, A.a);
    if (u.uSeg) gl.uniform1f(u.uSeg, L.seg);
    if (u.uN) gl.uniform1f(u.uN, n);
    if (u.uBake) gl.uniform1i(u.uBake, 0);
  }
  function drawLayer(L) {
    var n = typeof L.n === 'function' ? L.n(A) : (L.count != null && L.count !== true ? L.count : L.n);
    if (L.type !== 'quad' && !n) return;
    setU(L, n);
    layerVao(L);
    if (L.type === 'quad') gl.drawArrays(gl.TRIANGLES, 0, 3);
    else if (L.type === 'lines') gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * (L.seg + 1), n);
    else gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
  }
  function draw() {
    frameNo++;
    S.layers.forEach(function (L) {
      if (!L.bake) return;
      if (!drawnBake || (L.every && frameNo % L.every === 0)) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, bake.fbo); gl.viewport(0, 0, bake.w, bake.h); gl.disable(gl.BLEND);
        drawLayer(L); gl.bindFramebuffer(gl.FRAMEBUFFER, null); drawnBake = true;
      }
    });
    gl.viewport(0, 0, cv.width, cv.height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bake.tex);
    S.layers.forEach(function (L) {
      if (L.bake) return;
      if (L.blend === 'none') gl.disable(gl.BLEND);
      else { gl.enable(gl.BLEND); if (L.blend === 'add') gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
      drawLayer(L);
    });
  }

  /* pointer */
  function inHero(e) { var r = hero.getBoundingClientRect(); return e.clientY > r.top && e.clientY < r.bottom; }
  function toCanvas(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, A.H - (e.clientY - r.top)]; }
  var host = S.full ? window : hero;
  host.addEventListener('pointermove', function (e) {
    var p = toCanvas(e); A.ptr.x = p[0]; A.ptr.y = p[1]; A.ptr.on = true; A.ptr.inHero = inHero(e);
    if (!still && S.move) S.move(A, p[0], p[1], e);
  }, { passive: true });
  (S.full ? document.documentElement : hero).addEventListener('pointerleave', function () { A.ptr.on = false; });
  host.addEventListener('pointerdown', function (e) {
    if (still) return;
    if (e.target.closest && e.target.closest('a,button,input,select,label,summary,video,iframe,img,svg,.afl,.ale-map,.site-header,dl')) return;
    var p = toCanvas(e); A.ptr.x = p[0]; A.ptr.y = p[1]; A.ptr.inHero = inHero(e); if (S.press) S.press(A, p[0], p[1], e);
  });

  /* the loop: capped, paused when off screen or idle, settling on a still frame if the machine cannot keep up */
  var raf = 0, last = 0, seen = true, stopped = false, lastInput = performance.now(), winN = 0, winT = 0, skip = 24, quietDone = false;
  var IDLE_MS = 150000;
  function schedule() { if (!raf && !stopped) raf = requestAnimationFrame(frame); }
  function wake() { lastInput = performance.now(); if (!still) schedule(); }
  function frame(now) {
    raf = 0;
    if (stopped || still || !seen) return;
    if (now - lastInput > IDLE_MS) return;
    var past = scrollY > A.heroH * .9;
    if (S.quietBelow && past) { if (!quietDone) { quietDone = true; step(0); draw(); } return; }
    quietDone = false;
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    var raw = now - last, budget = S.full && past ? 31 : 14;
    if (raw < budget) return;
    last = now;
    var dt = Math.min(raw, 50) / 1000;
    A.T += dt;
    step(dt);
    draw();
    if (skip > 0) { skip--; winN = 0; winT = 0; return; }
    if (raw > 400) { winN = 0; winT = 0; return; }
    winN++; winT += raw;
    if (winT > 1600) {
      var avg = winT / winN; winN = 0; winT = 0;
      if (avg > Math.max(25, budget + 10)) {
        if (scale > .7) { scale = Math.max(.7, scale * .8); size(); skip = 6; }
        else if (avg > 70) settle();
      }
    }
  }
  function step(dt) {
    var s = Math.min(1, dt * 8);
    A.sm[0] += (A.ptr.x - A.sm[0]) * s; A.sm[1] += (A.ptr.y - A.sm[1]) * s; A.sm[2] += ((A.ptr.on ? 1 : 0) - A.sm[2]) * Math.min(1, dt * 3);
    if (S.full) { var r = hero.getBoundingClientRect(); A.heroTop = r.top; A.scroll = scrollY; A.dim += (Math.min(1, Math.max(0, scrollY / (A.heroH * .8))) - A.dim) * Math.min(1, dt * 5); }
    else A.dim = 0;
    if (S.tick) S.tick(A, dt);
  }
  function settle() {
    still = true; if (raf) cancelAnimationFrame(raf); raf = 0;
    root.classList.add('scene-still');
    var h = hero.querySelector('.hero-hint'); if (h) h.remove();
    A.T = S.still || A.T; step(.02); draw();
  }

  /* start */
  try {
    build();
    size();
    if (S.init) S.init(A);
    A.ready = true;
    if (S.resize) S.resize(A);
    step(.02);
    draw();
    var err = gl.getError();
    if (err && err !== gl.CONTEXT_LOST_WEBGL) console.warn('hero-scene: GL error', err);
  } catch (e) {
    console.error('hero-scene', e);
    cv.parentNode.replaceChild(cv.cloneNode(false), cv); // a canvas that held a WebGL context cannot give js/site.js a 2D one
    return;
  }
  root.classList.add('scene-on');
  if (still) root.classList.add('scene-still');
  requestAnimationFrame(function () { cv.classList.add('on'); });
  if (!still && S.hint) {
    var hint = document.createElement('span'); hint.className = 'hero-hint'; hint.textContent = S.hint[lang()];
    hero.appendChild(hint);
  }
  var redrawing = 0;
  function onResize() {
    size();
    if (still && !redrawing) { redrawing = requestAnimationFrame(function () { redrawing = 0; step(.02); draw(); }); }
  }
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(S.full ? hero : cv);
  window.addEventListener('resize', onResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
  ['pointermove', 'pointerdown', 'scroll', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, wake, { passive: true }); });
  if (!S.full && 'IntersectionObserver' in window) new IntersectionObserver(function (en) { seen = en[0].isIntersecting; if (seen) schedule(); }).observe(hero);
  if (S.full && still) window.addEventListener('scroll', function () { var d = Math.min(1, scrollY / (A.heroH * .8)); if (Math.abs(d - A.dim) > .04 || Math.abs(scrollY - A.scroll) > 2) { A.dim = d; A.scroll = scrollY; A.heroTop = hero.getBoundingClientRect().top; if (S.tick) S.tick(A, 0); draw(); } }, { passive: true });
  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stopped = true; });
  cv.addEventListener('webglcontextrestored', function () { stopped = false; S.layers.forEach(function (L) { L.vao = null; }); build(); drawnBake = false; bake.w = 0; size(); draw(); schedule(); });
  schedule();
})();
