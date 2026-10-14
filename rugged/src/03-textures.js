// ============================================================
// TEXTURES — procedural, tileable canvas textures + normal maps
// Everything is generated at boot, so the game ships no image files.
// ============================================================
function ValueNoise(seed) {
  const rnd = mulberry32(seed);
  const vals = new Float32Array(256);
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) { vals[i] = rnd(); perm[i] = i; }
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];
  const lat = (ix, iy, p) => {
    ix = ((ix % p) + p) % p; iy = ((iy % p) + p) % p;
    return vals[perm[(perm[ix & 255] + (iy & 255)) & 511]];
  };
  function noise(x, y, p) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = lat(xi, yi, p), b = lat(xi + 1, yi, p), c = lat(xi, yi + 1, p), d = lat(xi + 1, yi + 1, p);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // tileable fbm on [0,1)^2; px = lattice cells per tile at the base octave
  function fbm(u, v, px = 4, oct = 5, _py = px, gain = 0.5) {
    let s = 0, amp = 0.5, n = 0, f = px;
    for (let o = 0; o < oct; o++) { s += amp * noise(u * f, v * f, f); n += amp; amp *= gain; f *= 2; }
    return s / n;
  }
  // anisotropic version with independent periods
  function fbm2(u, v, px, py, oct = 4, gain = 0.5) {
    let s = 0, amp = 0.5, n = 0, fx = px, fy = py;
    for (let o = 0; o < oct; o++) {
      s += amp * noise2(u * fx, v * fy, fx, fy); n += amp; amp *= gain; fx *= 2; fy *= 2;
    }
    return s / n;
  }
  const lat2 = (ix, iy, px, py) => {
    ix = ((ix % px) + px) % px; iy = ((iy % py) + py) % py;
    return vals[perm[(perm[ix & 255] + (iy & 255)) & 511]];
  };
  function noise2(x, y, px, py) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = lat2(xi, yi, px, py), b = lat2(xi + 1, yi, px, py), c = lat2(xi, yi + 1, px, py), d = lat2(xi + 1, yi + 1, px, py);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  return { noise, fbm, fbm2, rnd };
}

const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
let TEX_SIZE = 1024;

function newCanvas(w, h = w) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

// Build color canvas + normal canvas from per-pixel callbacks.
// fn(u, v, x, y) -> [r,g,b, height, rough]
function genTexture(w, h, fn, opts = {}) {
  const col = newCanvas(w, h), cctx = col.getContext('2d');
  const img = cctx.createImageData(w, h);
  const height = new Float32Array(w * h);
  const rough = opts.rough ? new Uint8ClampedArray(w * h) : null;
  const out = [0, 0, 0, 0, 0];
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      fn(u, v, x, y, out);
      const i = y * w + x, j = i * 4;
      img.data[j] = out[0]; img.data[j + 1] = out[1]; img.data[j + 2] = out[2]; img.data[j + 3] = 255;
      height[i] = out[3];
      if (rough) rough[i] = out[4] * 255;
    }
  }
  cctx.putImageData(img, 0, 0);
  const res = { color: col, height, w, h };
  if (opts.normal !== false) res.normal = heightToNormal(height, w, h, opts.strength ?? 2);
  if (rough) {
    const rc = newCanvas(w, h), rctx = rc.getContext('2d'), ri = rctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const r = rough[i]; ri.data[i * 4] = r; ri.data[i * 4 + 1] = r; ri.data[i * 4 + 2] = r; ri.data[i * 4 + 3] = 255; }
    rctx.putImageData(ri, 0, 0);
    res.rough = rc;
  }
  return res;
}

function heightToNormal(hgt, w, h, strength) {
  const c = newCanvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const ym = ((y - 1 + h) % h) * w, yp = ((y + 1) % h) * w, y0 = y * w;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w, xp = (x + 1) % w;
      const dx = (hgt[y0 + xp] - hgt[y0 + xm]) * strength;
      const dy = (hgt[yp + x] - hgt[ym + x]) * strength;
      let nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const j = (y0 + x) * 4;
      img.data[j] = (nx * 0.5 + 0.5) * 255; img.data[j + 1] = (ny * 0.5 + 0.5) * 255; img.data[j + 2] = (nz * 0.5 + 0.5) * 255; img.data[j + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function toTex(canvas, { srgb = true, repeat = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}
function texSet(gen, repeat = [1, 1]) {
  return {
    map: toTex(gen.color, { repeat }),
    normalMap: gen.normal ? toTex(gen.normal, { srgb: false, repeat }) : null,
    roughnessMap: gen.rough ? toTex(gen.rough, { srgb: false, repeat }) : null,
  };
}

// ---------- surfaces ----------
function genConcrete(S) {
  const N = ValueNoise(11), N2 = ValueNoise(12);
  const g = genTexture(S, S, (u, v, x, y, o) => {
    const n1 = N.fbm(u, v, 4, 6);
    const n2 = N2.fbm(u, v, 32, 3);
    const stain = smooth(0.56, 0.74, N.fbm(u + 0.37, v + 0.11, 2, 4));
    const wet = smooth(0.6, 0.7, N2.fbm(u, v, 3, 3));
    const speck = (N2.noise(u * 512, v * 512, 512) > 0.93) ? -0.08 : 0;
    let b = 0.5 + (n1 - 0.5) * 0.12 + (n2 - 0.5) * 0.12 + speck * 0.6;
    b *= 1 - stain * 0.14 - wet * 0.05;
    o[0] = clamp(b * 255 * 1.02, 0, 255); o[1] = clamp(b * 255 * 1.0, 0, 255); o[2] = clamp(b * 255 * 0.95, 0, 255);
    o[3] = n2 * 0.7 + n1 * 0.3; o[4] = clamp(0.88 - stain * 0.25 - wet * 0.3 + (n2 - 0.5) * 0.1, 0.3, 1);
  }, { rough: true, strength: 3 });
  // cracks
  const ctx = g.color.getContext('2d');
  const rnd = mulberry32(7);
  ctx.strokeStyle = 'rgba(30,28,26,0.55)'; ctx.lineWidth = Math.max(1, S / 700);
  for (let k = 0; k < 4; k++) {
    let x = rnd() * S, y = rnd() * S, a = rnd() * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let i = 0; i < 60; i++) { a += (rnd() - 0.5) * 0.9; x += Math.cos(a) * S / 120; y += Math.sin(a) * S / 120; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  return g;
}

// Painted cinder block, mapped to one full wall height (bottom grime baked in).
// tile covers 1.6m wide x 2.4m tall: 4 blocks x 12 courses, running bond.
function genCinder(W, H) {
  const N = ValueNoise(21), N2 = ValueNoise(22);
  const bw = W / 4, bh = H / 12, mort = Math.max(2, W / 110);
  return genTexture(W, H, (u, v, x, y, o) => {
    const row = Math.floor(y / bh);
    const off = (row % 2) * bw * 0.5;
    const bx = ((x + off) % bw), by = y % bh;
    const edge = Math.min(bx, bw - bx, by, bh - by);
    const isMort = edge < mort;
    const bevel = smooth(mort, mort * 2.6, edge);
    const pores = N2.fbm(u, v, 48, 3);
    const pit = pores < 0.33 ? (0.33 - pores) * 2.2 : 0;
    const paintWear = smooth(0.62, 0.78, N.fbm(u, v, 3, 5));
    const n = N.fbm(u, v, 8, 4);
    let r, gC, b;
    if (isMort) { const m = 0.56 + (n - 0.5) * 0.15; r = m * 0.97; gC = m * 0.95; b = m * 0.9; }
    else {
      const paint = 0.8 + (n - 0.5) * 0.08 - pit * 0.35;
      const raw = 0.55 + (n - 0.5) * 0.2 - pit * 0.3;
      const base = lerp(paint, raw, paintWear * 0.7);
      r = base * 0.98; gC = base * 0.97; b = base * 0.93;
    }
    // grime: darker near floor + water tide line + streaks from top
    const fromBottom = 1 - v;
    const grime = smooth(0.22, 0.0, fromBottom) * 0.38 + smooth(0.06, 0.0, Math.abs(fromBottom - 0.16)) * 0.08 * N.fbm(u, 0.5, 6, 3);
    const streak = smooth(0.7, 0.9, N.fbm2(u, v, 24, 2, 3)) * smooth(0.5, 0.0, v) * 0.15;
    const dark = 1 - grime - streak;
    o[0] = clamp(r * dark * 255, 0, 255); o[1] = clamp(gC * dark * 255, 0, 255); o[2] = clamp(b * dark * 230, 0, 255);
    o[3] = (isMort ? 0 : 0.55 * bevel + 0.45) - pit * 0.35 + pores * 0.08;
    o[4] = isMort ? 0.95 : lerp(0.72, 0.92, paintWear);
  }, { rough: true, strength: 4 });
}

function genWood(S, opts = {}) {
  const N = ValueNoise(opts.seed || 31);
  const c1 = opts.light || [196, 150, 98], c2 = opts.dark || [128, 84, 46];
  const planks = opts.planks || 1;
  return genTexture(S, S, (u, v, x, y, o) => {
    const pk = Math.floor(u * planks), pu = (u * planks) % 1;
    const seedOff = pk * 0.37;
    const warp = N.fbm(u, v + seedOff, 2, 4) * 3.0;
    const ring = 0.5 + 0.5 * Math.sin((pu * 3 + warp + seedOff * 5) * Math.PI * 2 * (opts.rings || 3));
    const fine = N.fbm2((u + seedOff) % 1, v, 64, 2, 3);
    const knot = opts.knots ? smooth(0.82, 0.9, N.fbm(u, v, 4, 3)) : 0;
    let t = clamp(ring * 0.55 + fine * 0.45 + knot * 0.8, 0, 1);
    const gap = planks > 1 ? smooth(0.0, 0.012, Math.min(pu, 1 - pu)) : 1;
    o[0] = lerp(c1[0], c2[0], t) * (0.6 + 0.4 * gap); o[1] = lerp(c1[1], c2[1], t) * (0.6 + 0.4 * gap); o[2] = lerp(c1[2], c2[2], t) * (0.6 + 0.4 * gap);
    o[3] = fine * 0.3 + (1 - ring) * 0.15 + gap * 0.6;
    o[4] = (opts.rough ?? 0.7) + (fine - 0.5) * 0.15;
  }, { rough: true, strength: 2 });
}

// greyscale fabric patterns, tinted by material.color
function genKnit(S) {
  const N = ValueNoise(41);
  return genTexture(S, S, (u, v, x, y, o) => {
    const rib = Math.abs(Math.sin(u * Math.PI * 96));
    const stitch = Math.abs(Math.sin(v * Math.PI * 128 + Math.sin(u * Math.PI * 96) * 1.2));
    const fuzz = N.fbm(u, v, 64, 3);
    const h = rib * 0.6 + stitch * 0.25 + fuzz * 0.3;
    const b = 0.78 + h * 0.18 + (fuzz - 0.5) * 0.1;
    o[0] = o[1] = o[2] = clamp(b * 255, 0, 255); o[3] = h; o[4] = 0.95;
  }, { strength: 1.6 });
}
function genDenim(S) {
  const N = ValueNoise(51);
  return genTexture(S, S, (u, v, x, y, o) => {
    const tw = 0.5 + 0.5 * Math.sin((u * 220 + v * 220) * Math.PI);
    const fuzz = N.fbm(u, v, 128, 2);
    const fade = N.fbm(u, v, 3, 4);
    const weft = N.noise(u * 512, v * 1024, 512) > 0.7 ? 0.25 : 0;
    const b = 0.55 + tw * 0.2 + weft + (fade - 0.5) * 0.35 + (fuzz - 0.5) * 0.1;
    o[0] = clamp(b * 160, 0, 255); o[1] = clamp(b * 185, 0, 255); o[2] = clamp(b * 235, 0, 255);
    o[3] = tw * 0.7 + fuzz * 0.3; o[4] = 0.92;
  }, { strength: 1.5 });
}
function genWeave(S, seed = 61) {
  const N = ValueNoise(seed);
  return genTexture(S, S, (u, v, x, y, o) => {
    const a = Math.sin(u * Math.PI * 160), b = Math.sin(v * Math.PI * 160);
    const over = (Math.floor(u * 80) + Math.floor(v * 80)) % 2 ? Math.abs(a) : Math.abs(b);
    const fuzz = N.fbm(u, v, 64, 3);
    const wear = N.fbm(u, v, 4, 4);
    const br = 0.7 + over * 0.2 + (fuzz - 0.5) * 0.15 + (wear - 0.5) * 0.2;
    o[0] = o[1] = o[2] = clamp(br * 255, 0, 255); o[3] = over * 0.8 + fuzz * 0.2; o[4] = 0.95;
  }, { strength: 1.4 });
}
function genSkin(S) {
  const N = ValueNoise(71);
  return genTexture(S, S, (u, v, x, y, o) => {
    const pores = N.fbm(u, v, 96, 2);
    const mott = N.fbm(u, v, 6, 4);
    const b = 0.93 + (mott - 0.5) * 0.08 - (pores < 0.35 ? 0.04 : 0);
    o[0] = clamp(b * 255, 0, 255); o[1] = clamp(b * 248, 0, 255); o[2] = clamp(b * 244, 0, 255);
    o[3] = pores * 0.5; o[4] = 0.55 + (pores - 0.5) * 0.2;
  }, { strength: 0.6, rough: true });
}
function genHair(S) {
  const N = ValueNoise(81);
  return genTexture(S, S, (u, v, x, y, o) => {
    const strands = N.fbm2(u, v, 160, 6, 3);
    const clump = N.fbm2(u, v, 24, 3, 3);
    const b = 0.55 + strands * 0.5 + (clump - 0.5) * 0.3;
    o[0] = o[1] = o[2] = clamp(b * 255, 0, 255); o[3] = strands * 0.7 + clump * 0.3; o[4] = 0.55;
  }, { strength: 2.5, rough: true });
}
function genLeather(S) {
  const N = ValueNoise(91);
  return genTexture(S, S, (u, v, x, y, o) => {
    const grain = N.fbm(u, v, 48, 3);
    const crease = smooth(0.48, 0.5, N.fbm(u, v, 4, 4)) * smooth(0.52, 0.5, N.fbm(u, v, 4, 4));
    const b = 0.85 + (grain - 0.5) * 0.15 - crease * 0.3;
    o[0] = o[1] = o[2] = clamp(b * 255, 0, 255); o[3] = grain * 0.6 - crease; o[4] = 0.45 + (grain - 0.5) * 0.2;
  }, { strength: 1.6, rough: true });
}
function genPaintedMetal(S, base, rust = 0.2) {
  const N = ValueNoise(101);
  return genTexture(S, S, (u, v, x, y, o) => {
    const n = N.fbm(u, v, 8, 5);
    const r = smooth(1 - rust * 0.5, 1 - rust * 0.3, N.fbm(u + 0.5, v, 6, 5)) * rust * 2;
    const drip = smooth(0.75, 0.9, N.fbm2(u, v, 32, 1, 3)) * v * 0.25;
    const b = 0.95 + (n - 0.5) * 0.08 - drip;
    o[0] = lerp(base[0] * b, 120, r); o[1] = lerp(base[1] * b, 64, r); o[2] = lerp(base[2] * b, 30, r);
    o[3] = n * 0.2 + r * 0.6; o[4] = lerp(0.42, 0.9, r) + (n - 0.5) * 0.1;
  }, { strength: 1.2, rough: true });
}
function genGalvanized(S) {
  const N = ValueNoise(111);
  return genTexture(S, S, (u, v, x, y, o) => {
    const cell = N.noise(u * 40, v * 40, 40);
    const n = N.fbm(u, v, 16, 3);
    const seam = smooth(0.02, 0.0, Math.abs(((u * 4 + v * 0.0) % 1) - 0.5) - 0.48);
    const b = 0.62 + cell * 0.18 + (n - 0.5) * 0.08 - seam * 0.2;
    o[0] = o[1] = clamp(b * 255, 0, 255); o[2] = clamp(b * 262, 0, 255);
    o[3] = cell * 0.2 + seam; o[4] = 0.35 + cell * 0.25;
  }, { strength: 1.5, rough: true });
}
function genCardboard(S) {
  const N = ValueNoise(121);
  return genTexture(S, S, (u, v, x, y, o) => {
    const n = N.fbm(u, v, 8, 4);
    const fib = N.fbm2(u, v, 96, 8, 2);
    const corr = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 70);
    const tape = Math.abs(v - 0.5) < 0.07 ? 1 : 0;
    const b = 0.85 + (n - 0.5) * 0.2 + (fib - 0.5) * 0.08;
    if (tape) { o[0] = 205 * b; o[1] = 170 * b; o[2] = 120 * b; o[4] = 0.35; }
    else { o[0] = 182 * b; o[1] = 138 * b; o[2] = 92 * b; o[4] = 0.9; }
    o[3] = corr * 0.15 + fib * 0.2 + tape * 0.15;
  }, { strength: 1.2, rough: true });
}
function genInsulation(S) {
  const N = ValueNoise(131);
  return genTexture(S, S, (u, v, x, y, o) => {
    const f = N.fbm(u, v, 12, 6, 12, 0.6);
    const b = 0.75 + (f - 0.5) * 0.6;
    o[0] = clamp(250 * b, 0, 255); o[1] = clamp(170 * b, 0, 255); o[2] = clamp(175 * b, 0, 255);
    o[3] = f; o[4] = 1;
  }, { strength: 5, rough: true });
}
function genMattress(S) {
  const N = ValueNoise(141);
  const g = genTexture(S, S, (u, v, x, y, o) => {
    const du = (u * 6) % 1, dv = (v * 6) % 1;
    const d = Math.min(Math.abs(du - dv), Math.abs(du + dv - 1));
    const quilt = smooth(0.0, 0.08, d);
    const n = N.fbm(u, v, 32, 3);
    const stain = smooth(0.6, 0.7, N.fbm(u + 0.2, v, 3, 4)) * 0.18;
    const b = 0.86 + quilt * 0.1 + (n - 0.5) * 0.06;
    o[0] = clamp(b * 240 - stain * 60, 0, 255); o[1] = clamp(b * 236 - stain * 80, 0, 255); o[2] = clamp(b * 226 - stain * 140, 0, 255);
    o[3] = quilt * 0.8 + n * 0.2; o[4] = 0.95;
  }, { strength: 3 });
  return g;
}
function genRug(S) {
  const N = ValueNoise(151);
  return genTexture(S, S, (u, v, x, y, o) => {
    const cx = Math.abs(u - 0.5), cy = Math.abs(v - 0.5);
    const box = Math.max(cx, cy * 1.0);
    const dia = cx + cy;
    let c = [128, 28, 36];
    if (box > 0.46) c = [210, 175, 110];
    else if (box > 0.43) c = [30, 40, 70];
    else if (box > 0.4) c = [210, 175, 110];
    else if (dia < 0.16) c = [30, 40, 70];
    else if (dia < 0.2) c = [210, 175, 110];
    else if (Math.abs(Math.sin(u * 40) * Math.sin(v * 40)) > 0.85) c = [180, 120, 60];
    const pile = N.fbm(u, v, 128, 2);
    const wear = smooth(0.55, 0.75, N.fbm(u, v, 3, 4));
    const b = 0.85 + (pile - 0.5) * 0.25 - wear * 0.2;
    o[0] = c[0] * b; o[1] = c[1] * b; o[2] = c[2] * b; o[3] = pile; o[4] = 1;
  }, { strength: 2 });
}

// ---------- 2D art: meme coin icons (also used by the UI) ----------
function drawMemeIcon(ctx, kind, hue, S, seed = 1) {
  const r = mulberry32(seed * 7919 + 13);
  const cx = S / 2, cy = S / 2;
  ctx.save();
  ctx.clearRect(0, 0, S, S);
  const bg = ctx.createRadialGradient(cx, cy * 0.8, S * 0.05, cx, cy, S * 0.7);
  bg.addColorStop(0, `hsl(${hue},70%,62%)`); bg.addColorStop(1, `hsl(${(hue + 30) % 360},65%,32%)`);
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, S / 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, S / 2, 0, Math.PI * 2); ctx.clip();
  const L = (w) => (ctx.lineWidth = S * w);
  const ink = '#141014';
  const eye = (x, y, rr, look = 0.3) => {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); ctx.strokeStyle = ink; L(0.012); ctx.stroke();
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x + rr * look, y + rr * 0.1, rr * 0.45, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + rr * look + rr * 0.15, y - rr * 0.1, rr * 0.13, 0, 7); ctx.fill();
  };
  const blob = (x, y, rx, ry, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); ctx.strokeStyle = ink; L(0.014); ctx.stroke(); };
  switch (kind) {
    case 'frog': {
      blob(cx, cy + S * 0.12, S * 0.36, S * 0.27, '#5aa83f');
      blob(cx - S * 0.15, cy - S * 0.08, S * 0.13, S * 0.12, '#5aa83f');
      blob(cx + S * 0.15, cy - S * 0.08, S * 0.13, S * 0.12, '#5aa83f');
      eye(cx - S * 0.15, cy - S * 0.08, S * 0.085, 0.35); eye(cx + S * 0.15, cy - S * 0.08, S * 0.085, 0.35);
      ctx.fillStyle = '#5aa83f'; ctx.fillRect(cx - S * 0.26, cy - S * 0.13, S * 0.52, S * 0.035); // smug lids
      ctx.strokeStyle = '#a3322b'; L(0.03); ctx.beginPath(); ctx.moveTo(cx - S * 0.22, cy + S * 0.17); ctx.quadraticCurveTo(cx, cy + S * 0.27, cx + S * 0.24, cy + S * 0.13); ctx.stroke();
      break;
    }
    case 'dog': {
      ctx.fillStyle = '#d99a4e'; ctx.strokeStyle = ink; L(0.014);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * S * 0.3, cy - S * 0.02); ctx.lineTo(cx + s * S * 0.25, cy - S * 0.36); ctx.lineTo(cx + s * S * 0.08, cy - S * 0.17); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      blob(cx, cy + S * 0.05, S * 0.31, S * 0.28, '#d99a4e');
      blob(cx, cy + S * 0.15, S * 0.19, S * 0.15, '#f4e3c8');
      eye(cx - S * 0.12, cy - S * 0.02, S * 0.05, 0.2); eye(cx + S * 0.12, cy - S * 0.02, S * 0.05, 0.2);
      blob(cx, cy + S * 0.09, S * 0.05, S * 0.035, ink);
      ctx.strokeStyle = ink; L(0.015); ctx.beginPath(); ctx.arc(cx - S * 0.04, cy + S * 0.15, S * 0.04, 0, Math.PI); ctx.arc(cx + S * 0.04, cy + S * 0.15, S * 0.04, 0, Math.PI); ctx.stroke();
      // knit hat
      ctx.fillStyle = `hsl(${(hue + 180) % 360},60%,55%)`; ctx.beginPath(); ctx.ellipse(cx, cy - S * 0.2, S * 0.22, S * 0.14, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.fillRect(cx - S * 0.23, cy - S * 0.21, S * 0.46, S * 0.05);
      break;
    }
    case 'cat': {
      ctx.fillStyle = '#9a9aa6'; ctx.strokeStyle = ink; L(0.014);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * S * 0.3, cy - S * 0.05); ctx.lineTo(cx + s * S * 0.27, cy - S * 0.37); ctx.lineTo(cx + s * S * 0.06, cy - S * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      blob(cx, cy + S * 0.05, S * 0.32, S * 0.27, '#9a9aa6');
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#e8d24a'; ctx.beginPath(); ctx.ellipse(cx + s * S * 0.12, cy, S * 0.07, S * 0.05, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.fillRect(cx + s * S * 0.12 - S * 0.012, cy - S * 0.045, S * 0.024, S * 0.09);
        ctx.fillStyle = '#9a9aa6'; ctx.fillRect(cx + s * S * 0.12 - S * 0.08, cy - S * 0.06, S * 0.16, S * 0.035);
      }
      blob(cx, cy + S * 0.1, S * 0.03, S * 0.02, '#e88a9a');
      ctx.strokeStyle = ink; L(0.008);
      for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + s * S * 0.08, cy + S * 0.13 + i * S * 0.02); ctx.lineTo(cx + s * S * 0.32, cy + S * 0.12 + i * S * 0.05); ctx.stroke(); }
      break;
    }
    case 'penguin': {
      blob(cx, cy + S * 0.12, S * 0.3, S * 0.36, '#1f2330');
      blob(cx, cy + S * 0.16, S * 0.2, S * 0.26, '#f3f3f3');
      eye(cx - S * 0.08, cy - S * 0.04, S * 0.05, 0); eye(cx + S * 0.08, cy - S * 0.04, S * 0.05, 0);
      ctx.fillStyle = '#f29a2e'; ctx.beginPath(); ctx.moveTo(cx - S * 0.06, cy + S * 0.04); ctx.lineTo(cx + S * 0.06, cy + S * 0.04); ctx.lineTo(cx, cy + S * 0.12); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ink; L(0.01); ctx.stroke();
      break;
    }
    case 'robot': {
      ctx.strokeStyle = ink; L(0.014);
      ctx.fillStyle = '#b7bec9'; ctx.fillRect(cx - S * 0.26, cy - S * 0.2, S * 0.52, S * 0.46); ctx.strokeRect(cx - S * 0.26, cy - S * 0.2, S * 0.52, S * 0.46);
      ctx.beginPath(); ctx.moveTo(cx, cy - S * 0.2); ctx.lineTo(cx, cy - S * 0.34); ctx.stroke();
      blob(cx, cy - S * 0.36, S * 0.04, S * 0.04, '#ff4d5e');
      for (const s of [-1, 1]) { ctx.fillStyle = '#3ef0ff'; ctx.fillRect(cx + s * S * 0.11 - S * 0.06, cy - S * 0.07, S * 0.12, S * 0.08); ctx.strokeRect(cx + s * S * 0.11 - S * 0.06, cy - S * 0.07, S * 0.12, S * 0.08); }
      ctx.fillStyle = '#5b6170'; ctx.fillRect(cx - S * 0.14, cy + S * 0.08, S * 0.28, S * 0.09);
      ctx.strokeStyle = '#b7bec9'; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(cx - S * 0.14 + i * S * 0.047, cy + S * 0.08); ctx.lineTo(cx - S * 0.14 + i * S * 0.047, cy + S * 0.17); ctx.stroke(); }
      break;
    }
    case 'rocket': {
      ctx.fillStyle = '#0d1030'; ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = '#fff'; for (let i = 0; i < 30; i++) { ctx.globalAlpha = r(); ctx.fillRect(r() * S, r() * S, S * 0.01, S * 0.01); } ctx.globalAlpha = 1;
      ctx.translate(cx, cy); ctx.rotate(0.6);
      ctx.fillStyle = '#ffb547'; ctx.beginPath(); ctx.moveTo(-S * 0.06, S * 0.22); ctx.lineTo(0, S * 0.42); ctx.lineTo(S * 0.06, S * 0.22); ctx.fill();
      blob(0, 0, S * 0.1, S * 0.26, '#eef0f5');
      blob(0, -S * 0.05, S * 0.045, S * 0.045, '#3ec5ff');
      ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.moveTo(-S * 0.1, S * 0.12); ctx.lineTo(-S * 0.18, S * 0.26); ctx.lineTo(-S * 0.08, S * 0.22); ctx.fill(); ctx.beginPath(); ctx.moveTo(S * 0.1, S * 0.12); ctx.lineTo(S * 0.18, S * 0.26); ctx.lineTo(S * 0.08, S * 0.22); ctx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      break;
    }
    case 'moon': {
      ctx.fillStyle = '#0d1030'; ctx.fillRect(0, 0, S, S);
      blob(cx, cy, S * 0.3, S * 0.3, '#f1e6b8');
      for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(160,140,90,0.5)'; ctx.beginPath(); ctx.arc(cx + (r() - 0.5) * S * 0.4, cy + (r() - 0.5) * S * 0.4, S * (0.02 + r() * 0.04), 0, 7); ctx.fill(); }
      eye(cx - S * 0.1, cy - S * 0.04, S * 0.045, 0.1); eye(cx + S * 0.1, cy - S * 0.04, S * 0.045, 0.1);
      ctx.strokeStyle = ink; L(0.018); ctx.beginPath(); ctx.arc(cx, cy + S * 0.06, S * 0.1, 0.2, Math.PI - 0.2); ctx.stroke();
      break;
    }
    case 'burger': {
      blob(cx, cy - S * 0.08, S * 0.3, S * 0.17, '#e3a14b');
      ctx.fillStyle = '#4fa83a'; ctx.fillRect(cx - S * 0.32, cy + S * 0.03, S * 0.64, S * 0.05);
      ctx.fillStyle = '#6b3a22'; ctx.fillRect(cx - S * 0.3, cy + S * 0.07, S * 0.6, S * 0.09); ctx.strokeRect(cx - S * 0.3, cy + S * 0.07, S * 0.6, S * 0.09);
      ctx.fillStyle = '#f2c230'; ctx.fillRect(cx - S * 0.31, cy + S * 0.06, S * 0.62, S * 0.025);
      blob(cx, cy + S * 0.22, S * 0.29, S * 0.07, '#e3a14b');
      ctx.fillStyle = '#fff6dd'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(cx + (r() - 0.5) * S * 0.4, cy - S * 0.12 + (r() - 0.5) * S * 0.12, S * 0.012, S * 0.006, r() * 3, 0, 7); ctx.fill(); }
      eye(cx - S * 0.08, cy - S * 0.08, S * 0.04, 0.2); eye(cx + S * 0.08, cy - S * 0.08, S * 0.04, 0.2);
      break;
    }
    case 'banana': {
      ctx.translate(cx, cy); ctx.rotate(-0.5);
      ctx.fillStyle = '#f5d33a'; ctx.strokeStyle = ink; L(0.014);
      ctx.beginPath(); ctx.moveTo(-S * 0.08, -S * 0.36); ctx.quadraticCurveTo(S * 0.3, -S * 0.1, -S * 0.05, S * 0.36); ctx.quadraticCurveTo(S * 0.12, -S * 0.05, -S * 0.08, -S * 0.36); ctx.fill(); ctx.stroke();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = ink; ctx.fillRect(cx - S * 0.14, cy - S * 0.08, S * 0.3, S * 0.04);
      ctx.beginPath(); ctx.ellipse(cx - S * 0.06, cy - S * 0.04, S * 0.06, S * 0.045, 0, 0, Math.PI); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + S * 0.09, cy - S * 0.04, S * 0.06, S * 0.045, 0, 0, Math.PI); ctx.fill();
      break;
    }
    case 'chad': default: {
      blob(cx, cy + S * 0.02, S * 0.25, S * 0.32, '#e8b48c');
      ctx.fillStyle = '#e8b48c'; ctx.fillRect(cx - S * 0.25, cy + S * 0.05, S * 0.5, S * 0.22);
      ctx.fillStyle = '#3a2618'; ctx.beginPath(); ctx.ellipse(cx, cy - S * 0.22, S * 0.26, S * 0.12, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(58,38,24,0.55)'; ctx.fillRect(cx - S * 0.25, cy + S * 0.12, S * 0.5, S * 0.16);
      ctx.fillStyle = ink; ctx.fillRect(cx - S * 0.22, cy - S * 0.07, S * 0.44, S * 0.035);
      ctx.beginPath(); ctx.ellipse(cx - S * 0.1, cy - S * 0.04, S * 0.09, S * 0.055, 0, 0, Math.PI); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + S * 0.1, cy - S * 0.04, S * 0.09, S * 0.055, 0, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = ink; L(0.016); ctx.beginPath(); ctx.moveTo(cx - S * 0.08, cy + S * 0.15); ctx.lineTo(cx + S * 0.09, cy + S * 0.14); ctx.stroke();
      break;
    }
  }
  // random accessory
  const acc = Math.floor(r() * 5);
  if (acc === 1 && kind !== 'dog' && kind !== 'rocket' && kind !== 'moon') {
    ctx.fillStyle = '#ffd34a'; ctx.strokeStyle = ink; L(0.012);
    ctx.beginPath(); ctx.moveTo(cx - S * 0.14, cy - S * 0.24); ctx.lineTo(cx - S * 0.14, cy - S * 0.36); ctx.lineTo(cx - S * 0.07, cy - S * 0.3); ctx.lineTo(cx, cy - S * 0.39); ctx.lineTo(cx + S * 0.07, cy - S * 0.3); ctx.lineTo(cx + S * 0.14, cy - S * 0.36); ctx.lineTo(cx + S * 0.14, cy - S * 0.24); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = S * 0.02; ctx.beginPath(); ctx.arc(cx, cy, S / 2 - S * 0.01, 0, 7); ctx.stroke();
}

// ---------- posters ----------
function drawPoster(kind, W = 512, H = 720) {
  const c = newCanvas(W, H), ctx = c.getContext('2d');
  const N = ValueNoise(hashStr(kind));
  if (kind === 'hodl') {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b1037'); g.addColorStop(0.55, '#e0567a'); g.addColorStop(1, '#ffb547');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(W / 2, H * 0.52, W * 0.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#16102a'; ctx.beginPath(); ctx.moveTo(0, H * 0.75);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, H * 0.62 + Math.sin(x * 0.02) * 30 + N.noise(x / 40, 0, 64) * 60);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `900 ${W * 0.26}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('HODL', W / 2, H * 0.22);
    ctx.font = `${W * 0.045}px Georgia, serif`; ctx.fillText('Diamond hands are forged under pressure.', W / 2, H * 0.92);
  } else if (kind === 'frog') {
    ctx.fillStyle = '#e9e2cf'; ctx.fillRect(0, 0, W, H);
    const ic = newCanvas(400); drawMemeIcon(ic.getContext('2d'), 'frog', 140, 400, 3);
    ctx.drawImage(ic, W / 2 - 200, H * 0.14, 400, 400);
    ctx.fillStyle = '#141014'; ctx.font = `900 ${W * 0.13}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('FEELS GOOD', W / 2, H * 0.84);
    ctx.font = `${W * 0.05}px "Courier New", monospace`; ctx.fillText('(when number go up)', W / 2, H * 0.92);
  } else if (kind === 'chart') {
    ctx.fillStyle = '#0c0f14'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1d2530'; ctx.lineWidth = 2;
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    let p = H * 0.8;
    for (let i = 0; i < 18; i++) {
      const x = 24 + i * 26, o = p; p -= (Math.random() - 0.25) * 40; const up = p < o;
      ctx.fillStyle = up ? '#38e08c' : '#ff4d5e';
      ctx.fillRect(x - 1, Math.min(o, p) - 14, 2, Math.abs(o - p) + 28);
      ctx.fillRect(x - 8, Math.min(o, p), 16, Math.max(4, Math.abs(o - p)));
    }
    ctx.fillStyle = '#38e08c'; ctx.font = `900 ${W * 0.12}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('NUMBER', W / 2, H * 0.12); ctx.fillText('GO UP', W / 2, H * 0.24);
  } else if (kind === 'lambo') {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#08060f'); g.addColorStop(1, '#3a0d4a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#ff3fd2'; ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(W / 2, H * 0.55); ctx.lineTo(i * W / 11, H); ctx.stroke(); }
    ctx.fillStyle = '#ffb547';
    ctx.beginPath(); ctx.moveTo(W * 0.08, H * 0.6); ctx.lineTo(W * 0.3, H * 0.5); ctx.lineTo(W * 0.62, H * 0.47); ctx.lineTo(W * 0.92, H * 0.55); ctx.lineTo(W * 0.94, H * 0.62); ctx.lineTo(W * 0.08, H * 0.64); ctx.fill();
    ctx.fillStyle = '#111'; for (const x of [0.25, 0.75]) { ctx.beginPath(); ctx.arc(W * x, H * 0.64, W * 0.07, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.font = `900 ${W * 0.1}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('WEN LAMBO', W / 2, H * 0.2);
  } else if (kind === 'wagmi') {
    ctx.fillStyle = '#ffde3b'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#141014'; ctx.font = `900 ${W * 0.2}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('WAGMI', W / 2, H * 0.3);
    ctx.font = `700 ${W * 0.06}px "Arial Black", sans-serif`; ctx.fillText('WORLD TOUR', W / 2, H * 0.4);
    ctx.font = `${W * 0.045}px "Courier New", monospace`;
    ['BASEMENT — NOV 3', 'MOM\'S KITCHEN — NOV 4', 'GARAGE — CANCELLED', 'THE MOON — TBA'].forEach((s, i) => ctx.fillText(s, W / 2, H * (0.55 + i * 0.08)));
  }
  // paper wear + tape
  const img = ctx.getImageData(0, 0, W, H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const n = N.fbm(x / W, y / H, 8, 3);
    const k = 0.88 + n * 0.16;
    const j = (y * W + x) * 4; img.data[j] *= k; img.data[j + 1] *= k; img.data[j + 2] *= k * 0.97;
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = 'rgba(240,235,200,0.55)';
  ctx.save(); ctx.translate(30, 18); ctx.rotate(-0.5); ctx.fillRect(-30, -10, 70, 22); ctx.restore();
  ctx.save(); ctx.translate(W - 30, 18); ctx.rotate(0.5); ctx.fillRect(-40, -10, 70, 22); ctx.restore();
  return c;
}

function drawBoxLabel(text) {
  const g = genCardboardCache || (genCardboardCache = genCardboard(256));
  const c = newCanvas(256), ctx = c.getContext('2d');
  ctx.drawImage(g.color, 0, 0);
  ctx.fillStyle = 'rgba(20,20,30,0.85)'; ctx.font = 'bold 34px "Comic Sans MS", "Marker Felt", cursive'; ctx.textAlign = 'center';
  ctx.save(); ctx.translate(128, 190); ctx.rotate(-0.04); ctx.fillText(text, 0, 0); ctx.restore();
  return c;
}
let genCardboardCache = null;
