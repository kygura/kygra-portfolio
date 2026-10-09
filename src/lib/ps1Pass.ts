/**
 * PlayStation-style post pass for a low-resolution 2D canvas.
 *
 * The source canvas is rendered at a fraction of CSS resolution; this pass
 * uploads it as a texture and, per output pixel, applies the PS1 GPU's 4x4
 * ordered-dither table in 8-bit space and then truncates to 15-bit colour
 * (5 bits per channel), as the hardware did before writing to VRAM. The GL
 * canvas has the same small backing store and is upscaled by CSS with
 * `image-rendering: pixelated`, so pixels stay hard-edged.
 *
 * Flat background pixels are passed through untouched so the hero meets
 * the page with no seam; only drawn geometry picks up the dither.
 */

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D u_src;
uniform vec2 u_size;
uniform vec3 u_bg;
varying vec2 v_uv;

// PS1 GPU dither table (psx-spx), offsets in 8-bit units.
float dither(vec2 p) {
  float x = mod(p.x, 4.0);
  float y = mod(p.y, 4.0);
  vec4 row;
  if (y < 1.0)      row = vec4(-4.0,  0.0, -3.0,  1.0);
  else if (y < 2.0) row = vec4( 2.0, -2.0,  3.0, -1.0);
  else if (y < 3.0) row = vec4(-3.0,  1.0, -4.0,  0.0);
  else              row = vec4( 3.0, -1.0,  2.0, -2.0);
  if (x < 1.0) return row.x;
  if (x < 2.0) return row.y;
  if (x < 3.0) return row.z;
  return row.w;
}

void main() {
  vec2 px = floor(v_uv * u_size);
  vec3 c = texture2D(u_src, (px + 0.5) / u_size).rgb;
  if (all(lessThan(abs(c - u_bg), vec3(1.5 / 255.0)))) {
    gl_FragColor = vec4(u_bg, 1.0);
    return;
  }
  vec3 c8 = clamp(floor(c * 255.0 + 0.5) + dither(px), 0.0, 255.0);
  vec3 c5 = floor(c8 / 8.0);
  gl_FragColor = vec4(c5 / 31.0, 1.0);
}`;

export interface Ps1Pass {
  /** Draw `src` through the pass. `bg` is the flat background, 0–255. */
  render(src: HTMLCanvasElement, bg: readonly number[]): void;
  dispose(): void;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Returns null when WebGL is unavailable; callers fall back to the 2D canvas. */
export function createPs1Pass(target: HTMLCanvasElement, onLost: () => void): Ps1Pass | null {
  const gl = target.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  // One oversized triangle covers the viewport.
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const uSize = gl.getUniformLocation(prog, "u_size");
  const uBg = gl.getUniformLocation(prog, "u_bg");
  gl.uniform1i(gl.getUniformLocation(prog, "u_src"), 0);

  let lost = false;
  const handleLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    onLost();
  };
  target.addEventListener("webglcontextlost", handleLost);

  return {
    render(src, bg) {
      if (lost) return;
      const w = src.width;
      const h = src.height;
      if (!w || !h) return;
      if (target.width !== w || target.height !== h) {
        target.width = w;
        target.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.uniform2f(uSize, w, h);
      gl.uniform3f(uBg, (bg[0] | 0) / 255, (bg[1] | 0) / 255, (bg[2] | 0) / 255);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      target.removeEventListener("webglcontextlost", handleLost);
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
