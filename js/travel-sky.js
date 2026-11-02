/* The sky behind /travel/ and /wen/travel/: Earth engraved in gilt, lit only by the 0.5 degree blocks from
   data/travel/block_years.json, inside a sketched magnetosphere with the solar wind bending around it.
   It answers the reader: the pointer sends kinks along field lines, whose landing flares the aurora; a click in the
   sky sends a pressure pulse; a year on the chart relights the globe; a block in the table or on the map turns it there.
   Raw WebGL2, no libraries. Without WebGL2 the CSS night sky stays. Physics here is a drawing, not a simulation. */
(function () {
  'use strict';
  if (!document.body.classList.contains('page-travel')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'tv-sky';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', {alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power'});
  if (!gl) return;
  document.body.prepend(canvas);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WEN = document.documentElement.lang === 'lzh';
  const T = WEN ? {
    all: '诸年', year: (y) => y + '年', items: (n) => n + '件', days: (n) => n + '日', span: (a, b) => (a === b ? a + '年' : a + '年至' + b + '年'),
    at: (y, n) => y + '年：' + n + '件', play: '逐年观之', stop: '止',
  } : {
    all: 'All years', year: (y) => String(y), items: (n) => n + (n === '1' ? ' item' : ' items'), days: (n) => n + (n === '1' ? ' day' : ' days'),
    span: (a, b) => (a === b ? String(a) : a + ' to ' + b), at: (y, n) => y + ': ' + n + (n === '1' ? ' item' : ' items'), play: 'Play the years', stop: 'Stop',
  };
  document.body.classList.add('tv-sky-on');
  if (!reduce) document.body.classList.add('tv-sky-live');
  const phone = innerWidth < 760;

  /* ---------- shaders ---------- */
  const HEAD = '#version 300 es\nprecision highp float;\n';
  const NOISE = `
    float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
    float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}`;
  const COLORS = `
    const vec3 GILT=vec3(.886,.776,.510),PALE=vec3(1.,.953,.784),LAPIS=vec3(.114,.196,.392),JADE=vec3(.435,.890,.757);`;
  const FULL_VS = HEAD + `
    const vec2 P[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));
    out vec2 v_uv;
    void main(){gl_Position=vec4(P[gl_VertexID],0,1);v_uv=P[gl_VertexID]*.5+.5;}`;

  /* baked once per size: night gradient, a faint band of nebula, fixed stars */
  const SKY_FS = HEAD + NOISE + `
    uniform vec2 uRes;
    in vec2 v_uv; out vec4 o;
    float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec2(17.,9.);a*=.5;}return s;}
    float stars(vec2 px,float cell,float keep,float rad){
      vec2 g=px/cell,id=floor(g),f=fract(g)-.5;
      if(h21(id+3.7)>keep)return 0.;
      vec2 off=(vec2(h21(id),h21(id+7.1))-.5)*.72;
      return smoothstep(rad/cell,0.,length(f-off))*(.35+.65*h21(id+13.3));
    }
    void main(){
      float asp=uRes.x/uRes.y; vec2 p=vec2(v_uv.x*asp,v_uv.y);
      vec3 c=mix(vec3(.024,.047,.110),vec3(.044,.084,.180),smoothstep(1.35,0.,length(p-vec2(.08*asp,.72))));
      float band=exp(-pow((v_uv.y-.58+.42*(v_uv.x-.5))*3.,2.));
      float n=fbm(p*2.6+vec2(3.,1.)),m=fbm(p*6.+n*2.2);
      c+=band*(vec3(.085,.115,.235)*n*n*1.7+vec3(.15,.10,.085)*m*m*m*1.5);
      vec2 px=gl_FragCoord.xy;
      c+=vec3(.78,.82,.92)*stars(px,5.*uRes.y/900.+4.,.20,1.05)*.55;
      c+=vec3(1.,.95,.84)*stars(px+40.,27.*uRes.y/900.+9.,.26,1.7);
      o=vec4(c,1.);
    }`;
  const BLIT_FS = HEAD + `
    uniform sampler2D uTex; uniform vec2 uShift;
    in vec2 v_uv; out vec4 o;
    void main(){o=vec4(texture(uTex,.5+(v_uv-.5)*.97+uShift).rgb,1.);}`;

  const TWINKLE_VS = HEAD + `
    layout(location=0) in vec4 a;
    uniform float uTime,uPx; uniform vec2 uShift;
    out float v_a;
    void main(){
      gl_Position=vec4((a.xy-uShift*a.z*2.)*2.-1.,0,1);
      float s=sin(uTime*(.5+a.w*1.6)+a.w*40.);
      v_a=(.25+.75*s*s)*(.4+a.z*.6);
      gl_PointSize=(1.5+a.z*2.6)*uPx;
    }`;
  const TWINKLE_FS = HEAD + `
    in float v_a; out vec4 o;
    void main(){vec2 q=gl_PointCoord*2.-1.;float d=dot(q,q);o=vec4(vec3(1.,.96,.86)*exp(-d*7.)*v_a,0.);}`;

  /* the globe: an engraving, shaded by hatch width and lit by a fixed sun */
  const EARTH_VS = HEAD + `
    uniform vec2 uC,uRes; uniform float uR;
    const vec2 Q[4]=vec2[4](vec2(-1,-1),vec2(1,-1),vec2(-1,1),vec2(1,1));
    out vec2 v;
    void main(){vec2 q=Q[gl_VertexID]*1.5;v=q;gl_Position=vec4((uC+q*uR)/uRes*2.-1.,0,1);}`;
  const EARTH_FS = HEAD + NOISE + COLORS + `
    uniform mat3 uE; uniform vec3 uS,uDip;
    uniform sampler2D uLand;
    uniform float uR,uPx,uTime,uAurora,uDim,uLandOn,uTexH,uDay;
    in vec2 v; out vec4 o;
    const float PI=3.14159265;
    float engrave(float q,float wid){
      float qa=fwidth(q),h=1.-smoothstep(wid-qa,wid+qa,abs(fract(q)-.5)*2.);
      return mix(h,wid,smoothstep(.45,.9,qa));
    }
    void main(){
      float r=length(v),px=1./uR;
      if(r>1.){
        vec2 sd=normalize(uS.xy+1e-5);
        float day=pow(max(dot(v/r,sd)*.5+.5,0.),2.2);
        float g=exp(-(r-1.)*8.5)*(.12+.54*day);
        vec3 col=mix(LAPIS*1.5,vec3(.50,.66,.98),day);
        float rim=smoothstep(2.2*px,0.,r-1.)*(.20+.40*day);
        o=vec4((col*g+GILT*rim)*uDim,0.);
        return;
      }
      float z=sqrt(max(1.-r*r,0.));
      vec3 n=vec3(v,z),e=transpose(uE)*n;
      float lat=asin(clamp(e.z,-1.,1.)),lon=atan(e.y,e.x);
      vec2 uv=vec2(lon/(2.*PI)+.5,.5-lat/PI);
      float light=mix(smoothstep(-.10,.60,dot(n,uS)),.82,uDay);

      float lod=max(0.,log2((uTexH/PI)/(uR*max(z,.05))));
      float m=textureLod(uLand,uv,lod).r;
      float b=(textureLod(uLand,uv,lod+3.).r+textureLod(uLand,uv,lod+4.).r+textureLod(uLand,uv,lod+5.).r)/3.;
      float land=smoothstep(.40,.60,m)*uLandOn;
      float clear=smoothstep(.03,.24,z);

      /* sea: deep lapis, a sun glint, and waterlining around the coasts as on old sea charts */
      vec3 sea=mix(vec3(.018,.040,.092),vec3(.058,.128,.262),light*light);
      float f=b*8.5,fa=max(fwidth(f)*1.4,.05);
      float wl=(1.-smoothstep(0.,fa,abs(fract(f)-.5)))*smoothstep(.012,.06,b)*(1.-smoothstep(.34,.5,b));
      sea+=GILT*wl*mix(.07,.34,light)*uLandOn*clear;

      /* land: parallels engraved, thick where the sun falls and fine in shadow */
      float wid=mix(.13,.44,light);
      float base=max(4.,2.9*uPx),lv=log2(uR/base),f0=floor(lv);
      float hatch=mix(engrave(lat*pow(2.,f0),wid),engrave(lat*pow(2.,f0+1.),wid),smoothstep(.72,1.,lv-f0));
      hatch=mix(wid,hatch,clear);
      vec3 ground=mix(vec3(.030,.056,.118),vec3(.082,.078,.076),light);
      vec3 ink=mix(vec3(.27,.34,.50),GILT*1.08,light);
      vec3 terra=ground+ink*hatch*mix(.50,1.,light);
      vec3 c=mix(sea,terra,land);
      float coast=(1.-smoothstep(0.,.24,abs(m-.5)))*uLandOn;
      c+=mix(vec3(.24,.31,.47),GILT*1.05,light)*coast*.6*clear;

      /* graticule every 30 degrees */
      float g1=lat*6./PI,g2=lon*6./PI;
      float gl1=abs(fract(g1+.5)-.5)/max(fwidth(g1),1e-4),gl2=abs(fract(g2+.5)-.5)/max(fwidth(g2),1e-4);
      float grat=(1.-smoothstep(0.,1.3,gl1))+(1.-smoothstep(0.,1.3,gl2))*smoothstep(.05,.4,cos(lat));
      c+=GILT*min(grat,1.)*mix(.05,.13,light);

      /* limb */
      float fr=pow(1.-z,2.6);
      c+=mix(LAPIS*.9,vec3(.46,.62,.98),light)*fr*.62;

      /* aurora, in magnetic coordinates */
      float mm=dot(e,uDip),ang=abs(asin(clamp(mm,-1.,1.)));
      vec3 a1=normalize(cross(uDip,vec3(0,0,1))),a2=cross(uDip,a1);
      vec2 ring=vec2(dot(e,a1),dot(e,a2));
      ring/=max(length(ring),1e-4);
      float nz=vn(ring*3.2+uTime*.10)*.6+vn(ring*11.-uTime*.22+7.)*.4;
      float band=exp(-pow((ang-1.17-(nz-.5)*.13)/.055,2.));
      float veil=exp(-max(ang-1.17,0.)*7.)*smoothstep(1.02,1.17,ang)*.28;
      float au=(band*(.30+.70*nz)+veil*nz)*uAurora*(1.-.75*light);
      c+=mix(JADE,vec3(.64,.50,1.),smoothstep(1.13,1.30,ang))*au*1.6;

      float a=smoothstep(1.,1.-2.*px,r);
      o=vec4(c*uDim*a,a);
    }`;

  /* the places: embers on the engraving */
  const PLACE_VS = HEAD + `
    layout(location=0) in vec4 a; layout(location=1) in float w;
    uniform mat3 uE; uniform vec3 uS; uniform vec2 uC,uRes;
    uniform float uR,uIg,uPx,uDim,uTime;
    out float v_a; out float v_h;
    void main(){
      vec3 p=uE*a.xyz;
      gl_Position=vec4((uC+p.xy*uR)/uRes*2.-1.,0,1);
      float since=uIg-a.w,on=smoothstep(0.,.3,since),flash=exp(-max(since,0.)*1.5)*on;
      float vis=smoothstep(-.01,.09,p.z),dayf=smoothstep(-.1,.55,dot(p,uS));
      float tw=.9+.1*sin(uTime*1.3+a.x*90.+a.y*57.);
      v_a=on*vis*step(.001,w)*(1.-.34*dayf)*tw*(.55+.45*w)*uDim;
      v_h=flash;
      gl_PointSize=v_a>0.?uPx*min(uR/uPx/360.,1.7)*(4.+22.*w*w+7.*w)*(1.+1.5*flash):0.;
    }`;
  const PLACE_FS = HEAD + `
    in float v_a; in float v_h; out vec4 o;
    void main(){
      vec2 q=gl_PointCoord*2.-1.;float d=dot(q,q);
      if(d>1.)discard;
      vec3 halo=mix(vec3(1.,.42,.14),vec3(1.,.68,.30),v_h)*exp(-d*4.6)*(1.-d);
      vec3 core=vec3(1.,.93,.74)*exp(-d*38.);
      o=vec4((halo*.82+core*1.25+vec3(1.,.8,.5)*v_h*(1.-d)*.3)*v_a,0.);
    }`;

  const RING_VS = HEAD + `
    uniform mat3 uE; uniform vec3 uPos; uniform vec2 uC,uRes; uniform float uR,uPx;
    out float v_a;
    void main(){
      vec3 p=uE*uPos;
      gl_Position=vec4((uC+p.xy*uR)/uRes*2.-1.,0,1);
      v_a=smoothstep(.0,.12,p.z);
      gl_PointSize=92.*uPx;
    }`;
  const RING_FS = HEAD + COLORS + `
    uniform float uT; in float v_a; out vec4 o;
    void main(){
      float d=length(gl_PointCoord*2.-1.),t=fract(uT*.9);
      float a=smoothstep(.035,0.,abs(d-t))*(1.-t)+smoothstep(.03,0.,abs(d-fract(t+.5)))*(1.-fract(t+.5))*.6;
      o=vec4(PALE*a*v_a,0.);
    }`;

  /* field lines and wind are soft ribbons: an instanced quad between two points */
  const CORNERS = `const vec2 CO[6]=vec2[6](vec2(0,-1),vec2(1,-1),vec2(0,1),vec2(0,1),vec2(1,-1),vec2(1,1));`;
  const LINE_VS = HEAD + CORNERS + `
    layout(location=0) in vec3 a_l; layout(location=1) in vec2 a_s;
    uniform mat3 uF; uniform vec2 uC,uRes,uPtr;
    uniform float uR,uTime,uDim,uPx,uShock,uSpeed; uniform vec4 uPulse[8];
    out float v_x; out float v_a; out float v_h;
    vec3 point(float L,float ph,float s){
      float lm=acos(1./sqrt(L)),la=(2.*s-1.)*lm,r=L*cos(la)*cos(la);
      float cp=cos(ph),sp=sin(ph),day=max(cp,0.),night=max(-cp,0.),gr=smoothstep(1.,3.2,r);
      r*=1.-(.20+.17*uShock)*day*gr;
      vec3 q=vec3(r*cos(la)*cp,r*cos(la)*sp,r*sin(la));
      q.x*=1.+1.15*night*gr;
      return uF*q;
    }
    float kink(float id,float s){
      float g=0.;
      for(int i=0;i<8;i++){
        vec4 p=uPulse[i];
        if(abs(id-p.x)>.5)continue;
        float u=p.w>.5?1.-s:s,dist=u-(uTime-p.y)*uSpeed;
        g+=exp(-dist*dist/.0026)*p.z;
      }
      return g;
    }
    void main(){
      vec2 c=CO[gl_VertexID];
      float s=mix(a_s.x,a_s.y,c.x);
      vec3 p=point(a_l.x,a_l.y,s);
      vec2 tg=point(a_l.x,a_l.y,min(s+.006,1.)).xy-point(a_l.x,a_l.y,max(s-.006,0.)).xy;
      tg/=max(length(tg),1e-5);
      float h=kink(a_l.z,s);
      float w=(.7+1.5*min(h,1.2))*uPx+.7;
      vec2 sp=uC+p.xy*uR+vec2(-tg.y,tg.x)*(c.y*w+h*uR*.07);
      gl_Position=vec4(sp/uRes*2.-1.,0,1);
      float d=length(p.xy),hid=p.z<0.?smoothstep(.985,1.03,d):1.;
      float near=exp(-dot(sp-uPtr,sp-uPtr)/(2.*uR*uR*.09));
      float base=mix(.30,.13,clamp((a_l.x-1.5)/2.1,0.,1.))*mix(.55,1.,clamp(p.z/length(p)*.5+.5,0.,1.));
      base*=1.-.82*smoothstep(1.3,3.2,d);
      if(p.z>0.)base*=1.-.55*(1.-smoothstep(.94,1.02,d));
      v_x=c.y; v_h=min(h,1.);
      v_a=hid*(base*(1.+near*1.5)+h*1.2)*uDim*uDim;
    }`;
  const LINE_FS = HEAD + COLORS + `
    in float v_x; in float v_a; in float v_h; out vec4 o;
    void main(){o=vec4(mix(GILT,PALE,v_h)*exp(-v_x*v_x*3.2)*v_a,0.);}`;

  /* solar wind: stateless streamlines of a half-body in uniform flow, the shape a magnetopause roughly takes */
  const WIND_VS = HEAD + CORNERS + `
    layout(location=0) in vec4 a;
    uniform vec3 uA,uU,uV; uniform vec2 uC,uRes;
    uniform float uR,uTime,uDim,uPx,uShock,uX;
    out float v_x; out float v_a;
    vec3 flow(float ph,float rho0,float th,out float dfl){
      float x=mix(uX,-uX,ph),A=1.85-.42*uShock;
      float rho=sqrt(rho0*rho0+A*A*(1.-x/sqrt(x*x+rho0*rho0+A*A)));
      dfl=rho-rho0;
      return x*uA+rho*(cos(th)*uU+sin(th)*uV);
    }
    void main(){
      vec2 c=CO[gl_VertexID];
      float ph=fract(a.x+uTime*a.y),rho0=a.z,th=a.w,d0,d1;
      vec3 p0=flow(ph-.016,rho0,th,d0),p1=flow(ph,rho0,th,d1);
      vec2 s0=uC+p0.xy*uR,s1=uC+p1.xy*uR,dir=s1-s0;
      dir/=max(length(dir),1e-3);
      vec2 nrm=vec2(-dir.y,dir.x);
      vec2 sp=mix(s0,s1,c.x)+nrm*c.y*(.8*uPx+.8);
      gl_Position=vec4(sp/uRes*2.-1.,0,1);
      vec3 p=mix(p0,p1,c.x);
      float hid=p.z<0.?smoothstep(.98,1.02,length(p.xy)):1.;
      float life=sqrt(sin(3.14159*clamp(ph,0.,1.)));
      v_x=c.y;
      v_a=hid*life*mix(c.x,1.,.1)*(.15+.26*min(d1,1.2))*uDim;
    }`;
  const WIND_FS = HEAD + `
    in float v_x; in float v_a; out vec4 o;
    void main(){o=vec4(vec3(.74,.82,.98)*exp(-v_x*v_x*3.)*v_a,0.);}`;

  const PILLAR_VS = HEAD + CORNERS + `
    layout(location=0) in vec4 a; layout(location=1) in float w;
    uniform mat3 uE; uniform vec2 uC,uRes; uniform float uR,uPx,uIg,uDim,uOn;
    out float v_x; out float v_t; out float v_a;
    void main(){
      vec2 c=CO[gl_VertexID];
      float on=smoothstep(0.,.3,uIg-a.w),h=(.014+.10*w+.46*w*w*w)*uOn*on;
      vec3 b=uE*a.xyz,t=uE*(a.xyz*(1.+h));
      vec2 s0=uC+b.xy*uR,s1=uC+t.xy*uR,d=s1-s0;
      float l=length(d);
      d=l>1e-3?d/l:vec2(0,1);
      float wd=uPx*min(uR/uPx/360.,2.4)*(.8+3.4*w);
      vec2 sp=mix(s0,s1,c.x)+vec2(-d.y,d.x)*c.y*wd*mix(1.,.6,c.x);
      gl_Position=vec4(sp/uRes*2.-1.,0,1);
      vec3 p=mix(b,t,c.x);
      float hid=p.z<0.?smoothstep(.985,1.02,length(p.xy)):1.;
      v_x=c.y; v_t=c.x;
      v_a=hid*step(.001,w)*uOn*on*uDim;
    }`;
  const PILLAR_FS = HEAD + COLORS + `
    in float v_x; in float v_t; in float v_a; out vec4 o;
    void main(){
      vec3 c=mix(vec3(1.,.46,.15),mix(GILT,PALE,.5),smoothstep(0.,.7,v_t));
      o=vec4(c*exp(-v_x*v_x*2.4)*pow(1.-v_t,1.25)*v_a*.95,0.);
    }`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = (vs, fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const cache = {};
    return {p, u: (n) => (n in cache ? cache[n] : (cache[n] = gl.getUniformLocation(p, n)))};
  };

  let P;
  try {
    P = {
      sky: program(FULL_VS, SKY_FS), blit: program(FULL_VS, BLIT_FS), twinkle: program(TWINKLE_VS, TWINKLE_FS),
      earth: program(EARTH_VS, EARTH_FS), place: program(PLACE_VS, PLACE_FS), ring: program(RING_VS, RING_FS),
      line: program(LINE_VS, LINE_FS), wind: program(WIND_VS, WIND_FS), pillar: program(PILLAR_VS, PILLAR_FS),
    };
  } catch (err) {
    console.error('travel sky: shader failed', err);
    document.body.classList.remove('tv-sky-on', 'tv-sky-live');
    canvas.remove();
    return;
  }

  const empty = gl.createVertexArray();
  const buffer = (data, attrs, divisor) => {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const stride = attrs.reduce((a, b) => a + b, 0) * 4;
    let off = 0;
    attrs.forEach((n, i) => {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, n, gl.FLOAT, false, stride, off);
      gl.vertexAttribDivisor(i, divisor);
      off += n * 4;
    });
    gl.bindVertexArray(null);
    return vao;
  };

  /* ---------- geometry ---------- */
  const rnd = (() => {
    let s = 20261102;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  })();

  const TWINKLES = phone ? 90 : 220;
  const tw = new Float32Array(TWINKLES * 4);
  for (let i = 0; i < TWINKLES; i++) tw.set([rnd(), rnd(), Math.pow(rnd(), 2.2), rnd()], i * 4);
  const twinkleVao = buffer(tw, [4], 0);

  const LS = [1.5, 2.0, 2.7, 3.6];
  const NPHI = phone ? 6 : 9;
  const SEG = phone ? 64 : 96;
  const lines = [];
  LS.forEach((L, li) => {
    for (let k = 0; k < NPHI; k++) lines.push({L, phi: ((k + (li % 2) * 0.5) / NPHI) * 2 * Math.PI, id: lines.length});
  });
  const lineData = new Float32Array(lines.length * SEG * 5);
  lines.forEach((l, i) => {
    for (let k = 0; k < SEG; k++) lineData.set([l.L, l.phi, l.id, k / SEG, (k + 1) / SEG], (i * SEG + k) * 5);
  });
  const lineVao = buffer(lineData, [3, 2], 1);

  const WINDS = phone ? 300 : 900;
  const wd = new Float32Array(WINDS * 4);
  for (let i = 0; i < WINDS; i++) wd.set([rnd(), 0.018 + rnd() * 0.022, Math.sqrt(rnd()) * 6.4 + 0.05, rnd() * 2 * Math.PI], i * 4);
  const windVao = buffer(wd, [4], 1);
  let windCount = WINDS;

  /* ---------- view: a fixed sun on the left, Earth turning under it ---------- */
  const norm = (v) => {
    const n = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / n, v[1] / n, v[2] / n];
  };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const SUN = norm([-0.82, 0.24, 0.20]);
  const WU = norm(cross(SUN, [0, 1, 0]));
  const WV = cross(SUN, WU);
  const rad = (d) => (d * Math.PI) / 180;
  const earthVec = (lat, lon) => [Math.cos(rad(lat)) * Math.cos(rad(lon)), Math.cos(rad(lat)) * Math.sin(rad(lon)), Math.sin(rad(lat))];
  const DIP = earthVec(80.7, -72.7); // the geomagnetic north pole
  const ROLL = -0.36;
  const PITCH = 0.34;
  const SPIN = 0.035;
  const SPEED = 0.55;

  /* The load sequence follows the data: lights come on by first year, over China until about 2017 and over the US after,
     and the view crosses the Pacific between the two. A camera move, not a route. */
  const LON_START = rad(112), LON_END = rad(236);
  const SWING_FROM = 2014.5, SWING_TO = 2019;
  let lon = reduce ? LON_END : LON_START, pitch = PITCH;
  const ptr = {x: 0, y: 0, tx: 0, ty: 0, px: -1e4, py: -1e4};
  let E = new Float32Array(9), F = new Float32Array(9), dipView = [0, 0, 1];
  let mode3d = false, k3 = 0, zoom = 1, zoomGoal = 1, lastTouch = 0;
  const vel = {x: 0, y: 0};
  const layerGoal = {pillars: 0, lines: 1, wind: 1, aurora: 1, day: 0}, layer = {...layerGoal};
  const choice = {pillars: 1, lines: 1, wind: 1, aurora: 1, day: 0};
  const updateMatrices = () => {
    const l = lon + ptr.x * 0.09 * (1 - k3), p = pitch + ptr.y * 0.05 * (1 - k3), roll = ROLL * (1 - k3);
    const cl = Math.cos(l), sl = Math.sin(l), cp = Math.cos(p), sp = Math.sin(p), cr = Math.cos(roll), sr = Math.sin(roll);
    const X = [-sl, cl, 0], Y0 = [0, 0, 1], Z0 = [cl, sl, 0];
    const Y = [Y0[0] * cp - Z0[0] * sp, Y0[1] * cp - Z0[1] * sp, Y0[2] * cp - Z0[2] * sp];
    const Z = [Y0[0] * sp + Z0[0] * cp, Y0[1] * sp + Z0[1] * cp, Y0[2] * sp + Z0[2] * cp];
    const RX = [X[0] * cr - Y[0] * sr, X[1] * cr - Y[1] * sr, X[2] * cr - Y[2] * sr];
    const RY = [X[0] * sr + Y[0] * cr, X[1] * sr + Y[1] * cr, X[2] * sr + Y[2] * cr];
    E = new Float32Array([RX[0], RY[0], Z[0], RX[1], RY[1], Z[1], RX[2], RY[2], Z[2]]);
    dipView = [dot(RX, DIP), dot(RY, DIP), dot(Z, DIP)];
    const m = dipView, s = dot(SUN, m);
    const e1 = norm([SUN[0] - s * m[0], SUN[1] - s * m[1], SUN[2] - s * m[2]]), e2 = cross(m, e1);
    F = new Float32Array([e1[0], e1[1], e1[2], e2[0], e2[1], e2[2], m[0], m[1], m[2]]);
  };

  /* the same field line as the shader, without the kink, to find the one nearest the pointer */
  const fieldPoint = (L, ph, s) => {
    const lm = Math.acos(1 / Math.sqrt(L)), la = (2 * s - 1) * lm;
    let r = L * Math.cos(la) ** 2;
    const cp = Math.cos(ph), sp = Math.sin(ph), day = Math.max(cp, 0), night = Math.max(-cp, 0);
    const t = Math.min(1, Math.max(0, (r - 1) / 2.2)), gr = t * t * (3 - 2 * t);
    r *= 1 - 0.2 * day * gr;
    const q = [r * Math.cos(la) * cp * (1 + 1.15 * night * gr), r * Math.cos(la) * sp, r * Math.sin(la)];
    return [
      F[0] * q[0] + F[3] * q[1] + F[6] * q[2],
      F[1] * q[0] + F[4] * q[1] + F[7] * q[2],
      F[2] * q[0] + F[5] * q[1] + F[8] * q[2],
    ];
  };

  /* ---------- life ---------- */
  let W = 0, H = 0, dpr = 1, scale = 1, time = 0, last = 0, raf = 0, frames = 0, slowSum = 0;
  let storm = 0.34, shock = 0, cx = 0, cy = 0, R = 1, dim = 1, dimGoal = 1, lastScroll = scrollY;
  let landOn = 0, landTex = null, landH = 1;
  let ignite = 0, igniteFrom = 0, igniteTo = 0, igniteStart = -1, shown = false;
  let places = null, placeCount = 0, placeVao = null, pillarVao = null, wBuffer = null, wNow = null, wGoal = null, wMoving = false;
  let ringPos = null, ringStart = 0, pinned = null, shownYear = null, still = reduce, perfSum = 0, perfN = 0;
  const started = performance.now();
  let focus = null, focusPos = null, focusStart = 0;
  let skyTex = null, skyFbo = null;

  const pulses = new Float32Array(32).fill(-100);
  for (let i = 0; i < 8; i++) pulses[i * 4 + 2] = 0;
  let nextPulse = 0, nextAuto = 2.2;
  const landings = [];
  const launch = (id, strength) => {
    if (still) return;
    pulses.set([id, time, strength, rnd() < 0.5 ? 1 : 0], nextPulse * 4);
    nextPulse = (nextPulse + 1) % 8;
    landings.push({at: time + 1 / SPEED, strength});
  };
  const nearestLines = (x, y, n) => {
    const scored = lines.map((l) => {
      let best = 1e9;
      for (const s of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const p = fieldPoint(l.L, l.phi, s);
        if (p[2] < 0 && Math.hypot(p[0], p[1]) < 1) continue;
        best = Math.min(best, Math.hypot(cx / dpr + p[0] * R / dpr - x, H - cy / dpr - p[1] * R / dpr - y));
      }
      return [best, l.id];
    });
    return scored.sort((a, b) => a[0] - b[0]).slice(0, n).map((a) => a[1]);
  };

  const smooth = (t) => {
    const k = Math.min(1, Math.max(0, t));
    return k * k * (3 - 2 * k);
  };
  const place = () => {
    const wide = W >= 760;
    const a = wide ? {x: W * 0.755, y: H * 0.47, r: Math.min(H * 0.43, W * 0.29)} : {x: W * 0.66, y: H * 0.74, r: W * 0.56};
    const b = wide ? {x: W - Math.max(60, (W - 930) / 4), y: H * 0.5, r: Math.min(H * 0.5, W * 0.4)} : {x: W * 0.5, y: H * 0.52, r: W * 0.8};
    const k = smooth(scrollY / (H * 0.85));
    const shiftX = still ? 0 : ptr.x * 8 * (1 - k3), shiftY = still ? 0 : ptr.y * 6 * (1 - k3);
    const stage = {x: W / 2, y: wide ? H * 0.5 : H * 0.46, r: Math.min(W * 0.44, H * (wide ? 0.4 : 0.34)) * zoom};
    const px = a.x + (b.x - a.x) * k, py = a.y + (b.y - a.y) * k, pr = a.r + (b.r - a.r) * k;
    cx = (px + (stage.x - px) * k3 + shiftX) * dpr;
    cy = (H - (py + (stage.y - py) * k3) + shiftY) * dpr;
    R = (pr + (stage.r - pr) * k3) * dpr;
    dimGoal = 1 - 0.26 * k * (focus || mode3d ? 0 : 1);
  };

  const bakeSky = () => {
    if (skyTex) gl.deleteTexture(skyTex);
    if (skyFbo) gl.deleteFramebuffer(skyFbo);
    skyTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, skyTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    skyFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, skyFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, skyTex, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.BLEND);
    gl.useProgram(P.sky.p);
    gl.uniform2f(P.sky.u('uRes'), canvas.width, canvas.height);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  const resize = () => {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5) * scale;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    bakeSky();
  };

  const common = (pr) => {
    gl.useProgram(pr.p);
    gl.uniform2f(pr.u('uC'), cx, cy);
    gl.uniform2f(pr.u('uRes'), canvas.width, canvas.height);
    gl.uniform1f(pr.u('uR'), R);
    gl.uniform1f(pr.u('uPx'), dpr);
    gl.uniform1f(pr.u('uTime'), time);
    gl.uniform1f(pr.u('uDim'), dim);
    gl.uniformMatrix3fv(pr.u('uE'), false, E);
    gl.uniform3fv(pr.u('uS'), SUN);
  };

  const render = () => {
    updateMatrices();
    gl.viewport(0, 0, canvas.width, canvas.height);
    const shift = [ptr.x * 0.006, ptr.y * 0.006];

    gl.disable(gl.BLEND);
    gl.useProgram(P.blit.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, skyTex);
    gl.uniform1i(P.blit.u('uTex'), 0);
    gl.uniform2fv(P.blit.u('uShift'), shift);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(P.twinkle.p);
    gl.uniform1f(P.twinkle.u('uTime'), time);
    gl.uniform1f(P.twinkle.u('uPx'), dpr);
    gl.uniform2fv(P.twinkle.u('uShift'), shift);
    gl.bindVertexArray(twinkleVao);
    gl.drawArrays(gl.POINTS, 0, TWINKLES);

    common(P.wind);
    gl.uniform3fv(P.wind.u('uA'), SUN);
    gl.uniform3fv(P.wind.u('uU'), WU);
    gl.uniform3fv(P.wind.u('uV'), WV);
    gl.uniform1f(P.wind.u('uShock'), shock);
    gl.uniform1f(P.wind.u('uX'), 7.5);
    gl.uniform1f(P.wind.u('uDim'), dim * layer.wind / (1 + (zoom - 1) * 0.5));
    gl.bindVertexArray(windVao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, windCount);

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    common(P.earth);
    gl.uniform3fv(P.earth.u('uDip'), DIP);
    gl.uniform1f(P.earth.u('uAurora'), storm * layer.aurora);
    gl.uniform1f(P.earth.u('uDay'), layer.day);
    gl.uniform1f(P.earth.u('uLandOn'), landOn);
    gl.uniform1f(P.earth.u('uTexH'), landH);
    gl.uniform1i(P.earth.u('uLand'), 0);
    gl.bindTexture(gl.TEXTURE_2D, landTex);
    gl.bindVertexArray(empty);
    if (landTex) gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.blendFunc(gl.ONE, gl.ONE);
    if (placeVao && igniteStart >= 0) {
      common(P.place);
      gl.uniform1f(P.place.u('uIg'), ignite);
      gl.bindVertexArray(placeVao);
      gl.drawArrays(gl.POINTS, 0, placeCount);
    }
    if (pillarVao && igniteStart >= 0 && layer.pillars > 0.002) {
      common(P.pillar);
      gl.uniform1f(P.pillar.u('uIg'), ignite);
      gl.uniform1f(P.pillar.u('uOn'), layer.pillars);
      gl.bindVertexArray(pillarVao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, placeCount);
    }
    if (focusPos || ringPos) {
      common(P.ring);
      gl.uniform3fv(P.ring.u('uPos'), focusPos || ringPos);
      gl.uniform1f(P.ring.u('uT'), still ? 0.4 : time - (focusPos ? focusStart : ringStart));
      gl.bindVertexArray(empty);
      gl.drawArrays(gl.POINTS, 0, 1);
    }

    common(P.line);
    gl.uniform1f(P.line.u('uDim'), dim * Math.sqrt(layer.lines / (1 + (zoom - 1) * 0.9)));
    gl.uniformMatrix3fv(P.line.u('uF'), false, F);
    gl.uniform2f(P.line.u('uPtr'), ptr.px, ptr.py);
    gl.uniform1f(P.line.u('uShock'), shock);
    gl.uniform1f(P.line.u('uSpeed'), SPEED);
    gl.uniform4fv(P.line.u('uPulse'), pulses);
    gl.bindVertexArray(lineVao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, lines.length * SEG);
    gl.bindVertexArray(null);
    if (!shown) {
      shown = true;
      canvas.classList.add('on');
    }
  };

  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const raw = (now - last) / 1000, dt = Math.min(0.05, raw);
    last = now;
    if (!still) time += dt; // with reduced motion only the reader's own hand moves anything

    /* keep it light: a slow machine gets fewer pixels, then less wind */
    if (raw < 3 && now - started > 3500) {
      perfSum += raw;
      perfN++;
      if (perfSum >= 1.5) {
        const avg = perfSum / perfN;
        perfSum = perfN = 0;
        if (avg > 0.03) {
          if (scale > 0.56) {
            scale *= 0.8;
            resize();
          } else if (windCount > 150) {
            windCount = Math.max(150, windCount >> 1);
          } else if (avg > 0.14 && !mode3d) {
            /* still struggling at the lowest setting: settle on a still picture rather than tie up the machine */
            still = true;
            document.body.classList.remove('tv-sky-live');
            cancelAnimationFrame(raf);
            ignite = igniteTo;
            landOn = 1;
            render();
            return;
          }
        }
      }
    }

    ptr.x += (ptr.tx - ptr.x) * (1 - Math.exp(-dt * 3.5));
    ptr.y += (ptr.ty - ptr.y) * (1 - Math.exp(-dt * 3.5));

    const y = scrollY, doc = Math.max(1, document.documentElement.scrollHeight - H);
    lon -= ((y - lastScroll) / doc) * 5.2;
    lastScroll = y;
    k3 += ((mode3d ? 1 : 0) - k3) * (still ? 1 : 1 - Math.exp(-dt * 4.5));
    zoom += (zoomGoal - zoom) * (still ? 1 : 1 - Math.exp(-dt * 7));
    for (const key in layer) layer[key] += (layerGoal[key] - layer[key]) * (still ? 1 : 1 - Math.exp(-dt * 6));
    if (focus && time < focus.until) {
      lon += wrap(focus.lon - lon) * (1 - Math.exp(-dt * 3));
      pitch += (focus.pitch - pitch) * (1 - Math.exp(-dt * 3));
    } else {
      focus = null;
      focusPos = null;
      if (mode3d) {
        lon -= vel.x * dt;
        pitch = Math.max(-1.4, Math.min(1.4, pitch + vel.y * dt));
        const fade = Math.exp(-dt * 2.6);
        vel.x *= fade;
        vel.y *= fade;
        if (!reduce && !pinned && !drag && zoomGoal < 1.6 && time - lastTouch > 6) lon -= SPIN * 0.6 * dt;
      } else {
        if (!still) lon -= SPIN * dt;
        pitch += (PITCH - pitch) * (1 - Math.exp(-dt * 0.8));
      }
    }

    storm += (0.34 - storm) * (1 - Math.exp(-dt / 3));
    shock *= Math.exp(-dt * 1.5);
    while (landings.length && landings[0].at <= time) storm = Math.min(1.5, storm + 0.34 * landings.shift().strength);
    if (time > nextAuto && layerGoal.lines) {
      launch(lines[Math.floor(rnd() * lines.length)].id, 0.62);
      nextAuto = time + 2.6 + rnd() * 3.4;
    }

    if (landTex && landOn < 1) landOn = Math.min(1, landOn + dt / 1.1);
    if (igniteStart >= 0 && ignite < igniteTo) {
      const k = Math.min(1, Math.max(0, (time - igniteStart) / 6));
      ignite = igniteFrom + (igniteTo - igniteFrom) * (k * k * (3 - 2 * k));
      if (!focus && !mode3d) lon = LON_START + (LON_END - LON_START) * smooth((ignite - SWING_FROM) / (SWING_TO - SWING_FROM));
    }
    if (wMoving) {
      let moving = false;
      for (let i = 0; i < placeCount; i++) {
        const d = wGoal[i] - wNow[i];
        if (Math.abs(d) > 0.002) {
          wNow[i] += d * (1 - Math.exp(-dt * 5));
          moving = true;
        } else {
          wNow[i] = wGoal[i];
        }
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, wBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, wNow);
      wMoving = moving;
    }

    place();
    dim += (dimGoal - dim) * (1 - Math.exp(-dt * 4));
    render();
  };

  const redraw = () => {
    if (!still || mode3d) return;
    place();
    render();
  };

  /* ---------- data ---------- */
  const uploadLand = (rows) => {
    const w = phone ? 2048 : 4096, h = w / 2;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d', {willReadFrequently: true});
    x.fillStyle = '#000';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#fff';
    x.beginPath();
    for (const r of rows) {
      r.ring.forEach(([a, b], i) => {
        const X = ((a + 180) / 360) * w, Y = ((90 - b) / 180) * h;
        if (i) x.lineTo(X, Y);
        else x.moveTo(X, Y);
      });
      x.closePath();
    }
    x.fill('evenodd');
    const rgba = x.getImageData(0, 0, w, h).data, r8 = new Uint8Array(w * h);
    for (let i = 0; i < r8.length; i++) r8[i] = rgba[i * 4];
    landTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, landTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, r8);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    landH = h;
  };
  const weight = (n, max) => (n > 0 ? Math.pow(Math.log1p(n) / Math.log1p(max), 0.85) : 0);
  const setupPlaces = (rows) => {
    const size = Math.max(...rows.map((r) => Number(r.size)));
    const cells = new Map();
    for (const r of rows) {
      if (Number(r.size) !== size) continue;
      const key = r.lat + ',' + r.lon;
      const ns = Number(r.lat), ew = Number(r.lon);
      const c = cells.get(key) || {lat: ns + size / 2, lon: ew + size / 2, by: {}, daysBy: {}, total: 0, days: 0, first: 9999, last: 0, place: r.place,
        block: `${size}° ${Math.abs(ns).toFixed(1)}°${ns >= 0 ? 'N' : 'S'} ${Math.abs(ew).toFixed(1)}°${ew >= 0 ? 'E' : 'W'}`};
      c.by[r.year] = Number(r.items);
      c.daysBy[r.year] = Number(r.days);
      c.total += Number(r.items);
      c.days += Number(r.days);
      c.first = Math.min(c.first, Number(r.year));
      c.last = Math.max(c.last, Number(r.year));
      cells.set(key, c);
    }
    places = [...cells.values()];
    placeCount = places.length;
    places.max = Math.max(...places.map((c) => c.total));
    const data = new Float32Array(placeCount * 4);
    places.forEach((c, i) => {
      const v = earthVec(c.lat, c.lon);
      c.v = v;
      data.set([v[0], v[1], v[2], c.first], i * 4);
    });
    wNow = new Float32Array(places.map((c) => weight(c.total, places.max)));
    wGoal = wNow.slice();
    const dataBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dataBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    wBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, wNow, gl.DYNAMIC_DRAW);
    const wire = (divisor) => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, dataBuffer);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(0, divisor);
      gl.bindBuffer(gl.ARRAY_BUFFER, wBuffer);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(1, divisor);
      gl.bindVertexArray(null);
      return vao;
    };
    placeVao = wire(0);
    pillarVao = wire(1);
    const firsts = places.map((c) => c.first);
    igniteFrom = Math.max(2011.5, Math.min(...firsts) - 0.5);
    igniteTo = Math.max(...firsts) + 2;
  };
  const focusOn = (lat, lonDeg, seconds) => {
    if (reduce) return;
    focus = {lon: rad(lonDeg), pitch: mode3d ? rad(lat) : Math.max(-0.55, Math.min(0.95, rad(lat) * 0.85)), until: time + seconds};
    focusPos = earthVec(lat, lonDeg);
    focusStart = time;
  };

  /* ---------- the reader ---------- */
  addEventListener('pointermove', (e) => {
    if (still || mode3d || e.pointerType === 'touch') return;
    ptr.tx = (e.clientX / W) * 2 - 1;
    ptr.ty = 1 - (e.clientY / H) * 2;
    ptr.px = e.clientX * dpr;
    ptr.py = (H - e.clientY) * dpr;
    if (e.target.closest && e.target.closest('.tv-card, .site-header, .site-footer')) return;
    const speed = Math.hypot(e.movementX || 0, e.movementY || 0);
    if (speed > 2 && time - (ptr.lastKink || 0) > 0.3) {
      ptr.lastKink = time;
      launch(nearestLines(e.clientX, e.clientY, 1)[0], 0.8);
      storm = Math.min(1.5, storm + 0.05);
    }
  }, {passive: true});
  addEventListener('pointerdown', (e) => {
    if (still || mode3d || !e.target.closest || e.target.closest('a, button, input, select, label, .tv-card, .site-header, .site-footer')) return;
    nearestLines(e.clientX, e.clientY, 3).forEach((id) => launch(id, 1));
    shock = 1;
    storm = Math.min(1.5, storm + 0.42);
  }, {passive: true});

  document.addEventListener('tv:year', (e) => {
    if (!places) return;
    const year = e.detail;
    let top = null;
    places.forEach((c, i) => {
      const n = year === null ? c.total : c.by[year] || 0;
      wGoal[i] = weight(n, places.max);
      if (n && (!top || n > top.n)) top = {n, c};
    });
    wMoving = true;
    shownYear = year;
    showYear();
    if (still) {
      wNow.set(wGoal);
      gl.bindBuffer(gl.ARRAY_BUFFER, wBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, wNow);
      wMoving = false;
      redraw();
    } else if (year !== null && top && !mode3d) {
      focusOn(top.c.lat, top.c.lon, 3.2);
    }
  });

  let hoverTimer = 0;
  const hoverPlace = (lat, lonDeg) => {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      if (!mode3d) focusOn(lat, lonDeg, 3.5);
    }, 180);
  };
  document.addEventListener('pointerover', (e) => {
    const t = e.target;
    if (!t.closest) return;
    const row = t.closest('tbody[data-draw="blocksTable"] tr');
    if (row) {
      const m = /([\d.]+)°\s*([NS])\s+([\d.]+)°\s*([EW])/.exec(row.cells[0].textContent);
      const size = parseFloat(row.cells[0].textContent) || 0.5;
      if (m) hoverPlace((m[2] === 'N' ? 1 : -1) * parseFloat(m[1]) + size / 2, (m[4] === 'E' ? 1 : -1) * parseFloat(m[3]) + size / 2);
      return;
    }
    const d = t.__data__;
    if (t.tagName === 'rect' && t.closest('#block-map') && d && d.lat !== undefined) hoverPlace(d.lat + 0.25, d.lon + 0.25);
  });

  /* ---------- 3D mode: the globe takes the whole screen and answers directly ---------- */
  const ui = document.querySelector('.tv-3d-ui');
  const openBtn = document.querySelector('.tv-3d-open');
  const $ = (s) => ui.querySelector(s);
  const fmt = (n) => Number(n).toLocaleString('en-US');
  let drag = null, playTimer = 0;
  const touches = new Map();
  let pinch = 0;

  const yearRange = () => {
    const ys = places.flatMap((c) => Object.keys(c.by).map(Number));
    return [Math.min(...ys), Math.max(...ys)];
  };
  const countFor = (c, y) => (y === null ? {items: c.total, days: c.days} : {items: c.by[y] || 0, days: c.daysBy[y] || 0});
  const showYear = () => {
    if (!ui || !places) return;
    const slider = $('.tv-3d-year'), now = $('.tv-3d-now'), all = $('.tv-3d-all');
    if (shownYear === null) {
      slider.value = slider.max;
      now.textContent = T.all;
    } else {
      slider.value = shownYear;
      const n = places.reduce((sum, c) => sum + (c.by[shownYear] || 0), 0);
      now.textContent = T.at(shownYear, fmt(n));
    }
    all.disabled = shownYear === null;
    if (pinned) fillCard(pinned);
  };
  const setYear = (y) => document.dispatchEvent(new CustomEvent('tv:set-year', {detail: y}));
  const stopPlay = () => {
    clearInterval(playTimer);
    playTimer = 0;
    $('.tv-3d-play').textContent = T.play;
    $('.tv-3d-play').setAttribute('aria-pressed', 'false');
  };
  const startPlay = () => {
    const [a, b] = yearRange();
    let y = Math.max(a, 2011);
    $('.tv-3d-play').textContent = T.stop;
    $('.tv-3d-play').setAttribute('aria-pressed', 'true');
    setYear(y);
    playTimer = setInterval(() => {
      y += 1;
      if (y > b) {
        stopPlay();
        setYear(null);
      } else {
        setYear(y);
      }
    }, 800);
  };

  const fillCard = (c) => {
    const card = $('.tv-3d-card'), [a, b] = yearRange();
    card.querySelector('h2').textContent = c.place;
    card.querySelector('.tv-3d-block').textContent = c.block;
    const n = countFor(c, shownYear);
    card.querySelector('.tv-3d-count').textContent = (shownYear === null ? '' : T.year(shownYear) + (WEN ? '：' : ': ')) + T.items(fmt(n.items)) + (WEN ? '，' : ', ') + T.days(fmt(n.days));
    card.querySelector('.tv-3d-span').textContent = T.span(c.first, c.last);
    const svg = card.querySelector('svg'), NS = 'http://www.w3.org/2000/svg', years = b - a + 1, top = Math.max(...Object.values(c.by));
    svg.setAttribute('viewBox', `0 0 ${years * 10} 44`);
    svg.replaceChildren();
    for (let y = a; y <= b; y++) {
      const v = c.by[y] || 0;
      const r = document.createElementNS(NS, 'rect');
      const h = v ? 2 + (Math.sqrt(v) / Math.sqrt(top)) * 40 : 0.6;
      r.setAttribute('x', (y - a) * 10 + 1);
      r.setAttribute('width', 8);
      r.setAttribute('y', 44 - h);
      r.setAttribute('height', h);
      r.setAttribute('class', (v ? 'on' : 'off') + (y === shownYear ? ' now' : ''));
      r.dataset.year = y;
      const tip = document.createElementNS(NS, 'title');
      tip.textContent = T.at(y, fmt(v));
      r.append(tip);
      svg.append(r);
    }
    card.querySelector('.tv-3d-first').textContent = a;
    card.querySelector('.tv-3d-last').textContent = b;
    card.hidden = false;
  };
  const pin = (c) => {
    pinned = c;
    if (!c) {
      $('.tv-3d-card').hidden = true;
      ringPos = null;
      return;
    }
    ringPos = c.v;
    ringStart = time;
    fillCard(c);
    focusOn(c.lat, c.lon, 1.8);
  };
  const pick = (x, y) => {
    if (!places) return null;
    const scalePx = R / dpr, ox = cx / dpr, oy = H - cy / dpr;
    let best = null, bestD = 1e9;
    places.forEach((c, i) => {
      if (wNow[i] < 0.001) return;
      const v = c.v, z = E[2] * v[0] + E[5] * v[1] + E[8] * v[2];
      if (z < 0.02) return;
      const px = E[0] * v[0] + E[3] * v[1] + E[6] * v[2], py = E[1] * v[0] + E[4] * v[1] + E[7] * v[2];
      const d = Math.hypot(ox + px * scalePx - x, oy - py * scalePx - y), reach = 11 + 13 * wNow[i];
      if (d < reach && d - reach * 0.35 < bestD) {
        bestD = d - reach * 0.35;
        best = c;
      }
    });
    return best;
  };
  const showTip = (c, x, y) => {
    const tip = $('.tv-3d-tip');
    if (!c) {
      tip.hidden = true;
      canvas.style.cursor = drag ? 'grabbing' : 'grab';
      if (!pinned) ringPos = null;
      return;
    }
    const n = countFor(c, shownYear);
    tip.replaceChildren(...[c.place, T.items(fmt(n.items)) + (WEN ? '，' : ', ') + T.days(fmt(n.days))].map((s) => {
      const d = document.createElement('div');
      d.textContent = s;
      return d;
    }));
    tip.hidden = false;
    tip.style.left = Math.min(W - tip.offsetWidth - 8, x + 14) + 'px';
    tip.style.top = (y - tip.offsetHeight - 12 < 0 ? y + 14 : y - tip.offsetHeight - 12) + 'px';
    canvas.style.cursor = 'pointer';
    if (!pinned && ringPos !== c.v) {
      ringPos = c.v;
      ringStart = time;
    }
  };
  const zoomBy = (f) => {
    zoomGoal = Math.max(0.6, Math.min(9, zoomGoal * f));
    lastTouch = time;
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (!mode3d) return;
    canvas.setPointerCapture(e.pointerId);
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) {
      const [p, q] = [...touches.values()];
      pinch = Math.hypot(p[0] - q[0], p[1] - q[1]);
      drag = null;
      return;
    }
    drag = {x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0, last: performance.now()};
    vel.x = vel.y = 0;
    focus = null;
    focusPos = null;
    lastTouch = time;
    showTip(null);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!mode3d) return;
    if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) {
      const [p, q] = [...touches.values()], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (pinch) zoomBy(d / pinch);
      pinch = d;
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y, rc = Math.max(40, R / dpr), now = performance.now();
      const dt = Math.max(0.004, (now - drag.last) / 1000);
      lon -= dx / rc;
      pitch = Math.max(-1.4, Math.min(1.4, pitch + dy / rc));
      vel.x = (dx / rc) / dt;
      vel.y = (dy / rc) / dt;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.last = now;
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
      lastTouch = time;
      canvas.style.cursor = 'grabbing';
      if (still) {
        place();
        render();
      }
      return;
    }
    if (e.pointerType !== 'touch') showTip(pick(e.clientX, e.clientY), e.clientX, e.clientY);
  });
  const release = (e) => {
    if (!mode3d) return;
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = 0;
    if (!drag) return;
    const d = drag, now = performance.now();
    drag = null;
    canvas.style.cursor = 'grab';
    if (now - d.last > 90 || reduce) vel.x = vel.y = 0;
    vel.x = Math.max(-3, Math.min(3, vel.x));
    vel.y = Math.max(-3, Math.min(3, vel.y));
    if (d.moved < 6 && now - d.t < 500 && e.type === 'pointerup') {
      const c = pick(e.clientX, e.clientY);
      if (c) {
        pin(c);
      } else {
        pin(null);
        if (layerGoal.lines) {
          nearestLines(e.clientX, e.clientY, 3).forEach((id) => launch(id, 1));
          shock = 1;
          storm = Math.min(1.5, storm + 0.42);
        }
      }
    }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => showTip(null));
  canvas.addEventListener('wheel', (e) => {
    if (!mode3d) return;
    e.preventDefault();
    zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
    $('.tv-3d-tip').hidden = true;
  }, {passive: false});

  const shut = '.site-header, .hero, .tv-page, .site-footer, .skip-link';
  const enter3d = () => {
    if (mode3d || !places) return;
    mode3d = true;
    igniteStart = Math.max(igniteStart, 0); // entering early skips the load sequence: every light is on at once
    ignite = igniteTo;
    landOn = 1;
    lastTouch = time;
    vel.x = vel.y = 0;
    focus = null;
    focusPos = null;
    Object.assign(layerGoal, choice);
    document.body.classList.add('tv-3d-fade');
    document.documentElement.classList.add('tv-3d-lock');
    const show = () => {
      document.body.classList.add('tv-3d');
      ui.hidden = false;
      document.querySelectorAll(shut).forEach((el) => {
        el.inert = true;
      });
      $('.tv-3d-close').focus({preventScroll: true});
      showYear();
    };
    if (reduce) {
      show();
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else {
      setTimeout(show, 300);
    }
  };
  const exit3d = () => {
    if (!mode3d) return;
    mode3d = false;
    stopPlay();
    pin(null);
    zoomGoal = 1;
    vel.x = vel.y = 0;
    Object.assign(layerGoal, {pillars: 0, lines: 1, wind: 1, aurora: 1, day: 0});
    ui.hidden = true;
    $('.tv-3d-tip').hidden = true;
    document.body.classList.remove('tv-3d', 'tv-3d-fade');
    document.documentElement.classList.remove('tv-3d-lock');
    canvas.style.cursor = '';
    document.querySelectorAll(shut).forEach((el) => {
      el.inert = false;
    });
    lastScroll = scrollY;
    if (openBtn) openBtn.focus({preventScroll: true});
    if (reduce) {
      k3 = 0;
      zoom = 1;
      Object.assign(layer, layerGoal);
      cancelAnimationFrame(raf);
      place();
      render();
    }
  };

  if (ui && openBtn) {
    openBtn.addEventListener('click', enter3d);
    $('.tv-3d-close').addEventListener('click', exit3d);
    $('.tv-3d-card-x').addEventListener('click', () => pin(null));
    $('.tv-3d-year').addEventListener('input', (e) => {
      stopPlay();
      setYear(Number(e.target.value));
    });
    $('.tv-3d-all').addEventListener('click', () => {
      stopPlay();
      setYear(null);
    });
    $('.tv-3d-play').addEventListener('click', () => (playTimer ? stopPlay() : startPlay()));
    ui.querySelectorAll('[data-layer]').forEach((box) => {
      box.addEventListener('change', () => {
        choice[box.dataset.layer] = box.checked ? 1 : 0;
        layerGoal[box.dataset.layer] = choice[box.dataset.layer];
      });
    });
    $('.tv-3d-card svg').addEventListener('click', (e) => {
      if (e.target.dataset && e.target.dataset.year) {
        stopPlay();
        setYear(Number(e.target.dataset.year));
      }
    });
    addEventListener('keydown', (e) => {
      if (!mode3d) return;
      if (e.key === 'Escape') {
        exit3d();
        return;
      }
      if (e.target.matches && e.target.matches('input[type=range]')) return;
      const step = 0.16 / Math.max(1, zoomGoal);
      if (e.key === 'ArrowLeft') lon += step;
      else if (e.key === 'ArrowRight') lon -= step;
      else if (e.key === 'ArrowUp') pitch = Math.min(1.4, pitch + step);
      else if (e.key === 'ArrowDown') pitch = Math.max(-1.4, pitch - step);
      else if (e.key === '+' || e.key === '=') zoomBy(1.25);
      else if (e.key === '-' || e.key === '_') zoomBy(0.8);
      else return;
      e.preventDefault();
      lastTouch = time;
    });
  }

  let resizeTimer = 0, lastW = 0, lastH = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      /* a phone's toolbar sliding away is not a real resize */
      if (canvas.clientWidth === lastW && Math.abs(canvas.clientHeight - lastH) < 130) return;
      lastW = canvas.clientWidth;
      lastH = canvas.clientHeight;
      resize();
      redraw();
    }, 150);
  });
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    document.body.classList.remove('tv-sky-on', 'tv-sky-live');
    canvas.style.display = 'none';
  });

  /* ---------- start ---------- */
  lastW = canvas.clientWidth;
  lastH = canvas.clientHeight;
  resize();
  place();
  updateMatrices();

  const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));
  Promise.all([window.tvRows('land'), window.tvRows('block_years')]).then(([land, blocks]) => {
    later(() => {
      uploadLand(land);
      setupPlaces(blocks);
      if (ui) {
        const [a, b] = yearRange();
        $('.tv-3d-year').min = a;
        $('.tv-3d-year').max = b;
        showYear();
      }
      document.body.classList.add('tv-sky-ready');
      if (location.hash === '#3d') requestAnimationFrame(enter3d);
      if (reduce) {
        landOn = 1;
        ignite = 9999;
        igniteStart = 0;
        place();
        render();
        return;
      }
      igniteStart = time + 0.5;
      ignite = igniteFrom;
    });
  }).catch((err) => console.error('travel sky: data failed', err));

  if (!reduce) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
})();
