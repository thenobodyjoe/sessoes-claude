// ============================================================
// The lens: the 2D scene is uploaded as a texture and finished on the GPU. Real motion blur
// (several sub-frames accumulated inside the shutter), chromatic aberration that spikes on the hits,
// a bright-pass bloom, flashes, scanline glitches for the failing lamp, vignette and film grain.
// ============================================================
const GL = {};
const VS = `#version 300 es
in vec2 p; out vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const FS_ACC = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform float uW;
in vec2 vUv; out vec4 o;
void main() { o = vec4(texture(uTex, vUv).rgb * uW, 1.0); }`;
const FS_POST = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime, uCA, uGrain, uVig, uGlitch, uBloom, uSeed;
uniform vec4 uFlash;
in vec2 vUv; out vec4 o;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 uv = vUv;
  if (uGlitch > 0.0) {
    float band = floor(uv.y * 54.0);
    if (h(vec2(band, uSeed)) < uGlitch * 0.55) uv.x += (h(vec2(band * 1.37, uSeed + 3.1)) - 0.5) * 0.14 * uGlitch;
  }
  vec2 d = uv - 0.5;
  float ca = uCA * (0.35 + 2.2 * dot(d, d));
  vec3 col;
  col.r = texture(uTex, uv + d * ca).r;
  col.g = texture(uTex, uv).g;
  col.b = texture(uTex, uv - d * ca).b;
  // bloom from the mip chain: smooth, wide, and cheap
  vec3 bl = max(textureLod(uTex, uv, 3.0).rgb - 0.5, 0.0) * 0.5
          + max(textureLod(uTex, uv, 4.5).rgb - 0.42, 0.0) * 0.6
          + max(textureLod(uTex, uv, 6.0).rgb - 0.35, 0.0) * 0.7;
  col += bl * uBloom;
  float v = smoothstep(1.0, 0.28, length(d * vec2(1.0, 0.82)) * 1.32);
  col *= mix(1.0, v, uVig);
  col = mix(col, uFlash.rgb, uFlash.a);
  col += (h(uv * uRes + fract(uTime * 7.13)) - 0.5) * uGrain;
  o = vec4(col, 1.0);
}`;

function glInit(canvas) {
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false });
  if (!gl) throw new Error('WebGL2 is not available');
  GL.gl = gl;
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = fs => {
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  };
  GL.acc = prog(FS_ACC); GL.post = prog(FS_POST);
  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = fmt => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (fmt) gl.texImage2D(gl.TEXTURE_2D, 0, fmt[0], W, H, 0, fmt[1], fmt[2], null);
    return t;
  };
  GL.scene = tex(null);
  // accumulation buffer: half-float when the GPU can render to it, else 8-bit
  const hf = gl.getExtension('EXT_color_buffer_float');
  GL.accTex = tex(hf ? [gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT] : [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE]);
  GL.fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, GL.fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, GL.accTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  GL.halfFloat = !!hf;
}
function glUpload(src) {
  const gl = GL.gl;
  gl.bindTexture(gl.TEXTURE_2D, GL.scene);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
}
function glAccumulate(first, w) {
  const gl = GL.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, GL.fbo);
  gl.viewport(0, 0, W, H);
  if (first) { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.useProgram(GL.acc.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, GL.scene);
  gl.uniform1i(GL.acc.u.uTex, 0); gl.uniform1f(GL.acc.u.uW, w);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function glPost(fromAcc, P) {
  const gl = GL.gl;
  gl.viewport(0, 0, W, H);
  gl.useProgram(GL.post.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fromAcc ? GL.accTex : GL.scene);
  gl.generateMipmap(gl.TEXTURE_2D);
  const u = GL.post.u;
  gl.uniform1i(u.uTex, 0);
  gl.uniform2f(u.uRes, W, H);
  gl.uniform1f(u.uTime, P.time); gl.uniform1f(u.uCA, P.ca); gl.uniform1f(u.uGrain, P.grain);
  gl.uniform1f(u.uVig, P.vig); gl.uniform1f(u.uGlitch, P.glitch); gl.uniform1f(u.uBloom, P.bloom);
  gl.uniform1f(u.uSeed, P.seed);
  gl.uniform4f(u.uFlash, P.flash[0], P.flash[1], P.flash[2], P.flash[3]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// lens settings over time
const CA_HITS = [[1, 0.018], [2, 0.03], [4, 0.05], [6, 0.012], [8, 0.03], [11, 0.022], [14, 0.022], [17, 0.022], [19.25, 0.015],
                 [20, 0.03], [22, 0.02], [22.25, 0.04], [22.4, 0.03], [24, 0.06], [25.25, 0.012], [26.25, 0.02], [28, 0.045]];
function postAt(t) {
  const b = t / BEAT;
  let ca = 0.0022;
  for (const [h, k] of CA_HITS) ca += k * kick(b, h, 5.5);
  let glitch = 0;
  if (b > 2.55 && b < 3.5 && lampAt(b) < 0.5) glitch = 0.55;
  if (b > 3.3 && b < 3.5) glitch = Math.max(glitch, 0.9 * seg(b, 3.3, 3.5));
  if (b > 23.28 && b < 23.6) glitch = Math.max(glitch, 0.6 * (1 - seg(b, 23.28, 23.6)));
  let flash = [1, 1, 1, 0];
  const fl = (b0, c, a, r) => { const k = a * kick(b, b0, r); if (k > flash[3]) flash = [c[0], c[1], c[2], k]; };
  fl(4, [1, 1, 1], 0.9, 4.5);
  fl(22.12, [0.85, 1, 0.9], 0.22, 6);
  fl(24, [1, 1, 1], 0.4, 5);
  fl(28, [1, 0.93, 0.7], 0.3, 4);
  return { time: t, ca, glitch, flash, seed: Math.floor(b * 24), grain: 0.032, vig: 0.5, bloom: 0.55 };
}
