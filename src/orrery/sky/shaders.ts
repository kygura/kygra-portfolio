// GLSL for the PS1 pipeline, ported from initSky() in design/mock/index.html. The mock's `uPs1` and `uScan`
// switches are gone (DESIGN A2): the pipeline and the scanline rows are always on. three compiles these as
// GLSL ES 3.00 on WebGL2 (gl_VertexID and array constructors need it), so Sky requires a WebGL2 context.

/** 4x4 ordered-dither threshold in [0, 1). */
const BAY = `float bay(vec2 p){p=mod(floor(p),4.);int i=int(p.x)+int(p.y)*4;
float m[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);return m[i]/16.;}`;

/**
 * Vertex snap to half the internal resolution (uSnap = target size / 2) plus a per-vertex jitter of up to
 * +-0.5 snap cells (scaled by j), seeded by gl_VertexID and re-rolled at 15Hz.
 */
const SNAP = `uniform vec2 uSnap;uniform float uT;
vec4 snap(vec4 c,float j){vec2 n=c.xy/c.w;float s=float(gl_VertexID)+floor(uT*15.)*7.13;
vec2 h=fract(sin(vec2(s*12.9898,s*78.233))*43758.5453)-.5;n=(floor(n*uSnap+.5)+h*j)/uSnap;c.xy=n*c.w;return c;}`;

/** Scene vertex shader: snap + jitter, affine UVs, Gouraud key + rim light, per-vertex linear fog (near 6, far 40). */
export const SCENE_VS = `${SNAP}uniform float uLit,uFog;uniform vec3 uCol,uRim,uL,uL2;varying vec3 vUvw,vC;varying float vF;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vec4 c=snap(projectionMatrix*mv,1.);gl_Position=c;vUvw=vec3(uv*c.w,c.w);
vec3 n=normalize(mat3(modelMatrix)*normal+1e-5);vC=uLit>.5?uCol*(.22+.95*max(dot(n,uL),0.))+uRim*max(dot(n,uL2),0.):uCol;
vF=uFog*clamp((-mv.z-6.)/34.,0.,1.);}`;

/** Scene fragment shader: affine texture lookup (no perspective divide per pixel) and fog quantized to 8 levels. */
export const SCENE_FS = `uniform sampler2D uTex;uniform float uRep,uAmt;uniform vec3 uFogC;varying vec3 vUvw,vC;varying float vF;
void main(){vec2 uv=vUvw.xy/vUvw.z*uRep;vec3 c=vC*mix(vec3(1.),texture2D(uTex,uv).rgb,uAmt);
float f=floor(vF*7.+.5)/7.;gl_FragColor=vec4(mix(c,uFogC,f),1.);}`;

/** Stars: snapped without jitter; bright stars (aB > .97) are 3px sprites. */
export const STAR_VS = `${SNAP}attribute float aB,aP;varying float vB,vP;
void main(){gl_Position=snap(projectionMatrix*modelViewMatrix*vec4(position,1.),0.);gl_PointSize=aB>.97?3.:1.;vB=aB;vP=aP;}`;

/** Twinkle moves each star's dither threshold (3Hz), never its alpha. */
export const STAR_FS = `uniform float uT;uniform sampler2D uSpr;varying float vB,vP;${BAY}
void main(){float th=fract(bay(gl_FragCoord.xy)*.25+vP+floor(uT*3.)*.618)*.55;if(vB<th)discard;
if(vB>.97&&texture2D(uSpr,gl_PointCoord).r<.5)discard;gl_FragColor=vec4(vec3(vB>.97?1.:.25+.4*vB),1.);}`;

export const POST_VS = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;

/**
 * Post pass, upscaling the low-res target with nearest sampling: tear band (uTear = row, rows, on), Bayer dither
 * then 15-bit quantize, palette lock onto the 5-stop ramp [bg, rule, dim, acc2, acc] (fg above .95), dither
 * dissolve (uDis), and 6% scanline darkening on every other output row.
 */
export const POST_FS = `uniform sampler2D tD;uniform vec2 uRes;uniform vec3 uRamp[5];uniform vec3 uFg,uGl,uBg,uTear;
uniform float uBgL,uLock,uDis;varying vec2 vUv;${BAY}
void main(){vec2 uv=vUv;float row=floor(uv.y*uRes.y);bool tb=uTear.z>0.&&row>=uTear.x&&row<uTear.x+uTear.y;
if(tb)uv.x+=(fract(sin(row*91.345)*47453.5453)-.5)*.18;
vec2 p=floor(uv*uRes);vec3 c=texture2D(tD,uv).rgb;float t=bay(p);
vec3 q=clamp(floor((c+(t-.5)/31.)*31.+.5)/31.,0.,1.);
float l=dot(c,vec3(.299,.587,.114)),ln=max(l-uBgL,0.)/(1.-uBgL);
vec3 r=l>.95?uFg:uRamp[int(clamp(floor(ln*4.+t),0.,4.))];
vec3 o=mix(q,r,uLock);if(tb)o=mix(o,uGl,.55);if(t>=uDis)o=uBg;
if(mod(floor(gl_FragCoord.y),2.)<1.)o*=.94;gl_FragColor=vec4(o,1.);}`;
