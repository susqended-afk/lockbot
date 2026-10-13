// Procedural canvas textures — no external image assets needed for the prototype.
import * as THREE from 'three';
import { makeRng } from '../util.js';

let maxAniso = 4;
export const setMaxAnisotropy = (n) => (maxAniso = n);

const cache = new Map();

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTex(c, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

function noise(ctx, w, h, amount, rng, base = 0) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * amount + base;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// ------------------------------------------------------------------ ground
export const asphalt = () =>
  cached('asphalt', () => {
    const rng = makeRng(11);
    const [c, x] = canvas(512);
    x.fillStyle = '#2a2c30';
    x.fillRect(0, 0, 512, 512);
    noise(x, 512, 512, 38, rng);
    // aggregate speckles
    for (let i = 0; i < 4000; i++) {
      const g = 30 + rng() * 60;
      x.fillStyle = `rgba(${g},${g},${g + 4},${0.3 + rng() * 0.4})`;
      x.fillRect(rng() * 512, rng() * 512, 1 + rng() * 2, 1 + rng() * 2);
    }
    // patches + cracks
    for (let i = 0; i < 7; i++) {
      x.fillStyle = `rgba(20,21,24,${0.25 + rng() * 0.25})`;
      x.beginPath();
      x.ellipse(rng() * 512, rng() * 512, 20 + rng() * 60, 10 + rng() * 40, rng() * 3, 0, Math.PI * 2);
      x.fill();
    }
    x.strokeStyle = 'rgba(12,12,14,0.6)';
    for (let i = 0; i < 10; i++) {
      x.lineWidth = 0.5 + rng() * 1.2;
      x.beginPath();
      let px = rng() * 512, py = rng() * 512;
      x.moveTo(px, py);
      for (let j = 0; j < 8; j++) {
        px += (rng() - 0.5) * 50;
        py += (rng() - 0.5) * 50;
        x.lineTo(px, py);
      }
      x.stroke();
    }
    return toTex(c);
  });

export const concrete = () =>
  cached('concrete', () => {
    const rng = makeRng(12);
    const [c, x] = canvas(512);
    x.fillStyle = '#8d8a84';
    x.fillRect(0, 0, 512, 512);
    noise(x, 512, 512, 26, rng);
    for (let i = 0; i < 30; i++) {
      x.fillStyle = `rgba(60,58,54,${rng() * 0.12})`;
      x.beginPath();
      x.arc(rng() * 512, rng() * 512, 4 + rng() * 30, 0, Math.PI * 2);
      x.fill();
    }
    // slab joints every 1/4 tile (1 tile = 6m)
    x.strokeStyle = 'rgba(40,38,36,0.7)';
    x.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      x.beginPath();
      x.moveTo(i * 128, 0);
      x.lineTo(i * 128, 512);
      x.moveTo(0, i * 128);
      x.lineTo(512, i * 128);
      x.stroke();
    }
    // gum spots / stains
    for (let i = 0; i < 40; i++) {
      x.fillStyle = `rgba(30,30,30,${0.2 + rng() * 0.3})`;
      x.beginPath();
      x.arc(rng() * 512, rng() * 512, 1 + rng() * 2.5, 0, Math.PI * 2);
      x.fill();
    }
    return toTex(c);
  });

export const grass = () =>
  cached('grass', () => {
    const rng = makeRng(13);
    const [c, x] = canvas(512);
    x.fillStyle = '#3d5a26';
    x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 18000; i++) {
      const g = 70 + rng() * 70;
      x.fillStyle = `rgba(${g * 0.55},${g},${g * 0.35},0.5)`;
      x.fillRect(rng() * 512, rng() * 512, 1, 2 + rng() * 3);
    }
    for (let i = 0; i < 25; i++) {
      x.fillStyle = `rgba(95,80,50,${rng() * 0.25})`;
      x.beginPath();
      x.ellipse(rng() * 512, rng() * 512, 10 + rng() * 40, 6 + rng() * 25, rng() * 3, 0, Math.PI * 2);
      x.fill();
    }
    return toTex(c);
  });

export const dirt = () =>
  cached('dirt', () => {
    const rng = makeRng(14);
    const [c, x] = canvas(256);
    x.fillStyle = '#5b4a36';
    x.fillRect(0, 0, 256, 256);
    noise(x, 256, 256, 40, rng);
    return toTex(c);
  });

// ------------------------------------------------------------------ facades
// Each facade texture covers 8 windows across x 8 floors. Returns {map, emissive}.
function facade(key, opts) {
  return cached(key, () => {
    const rng = makeRng(opts.seed);
    const S = 512, cell = S / 8;
    const [c, x] = canvas(S);
    const [ce, xe] = canvas(S);
    x.fillStyle = opts.wall;
    x.fillRect(0, 0, S, S);
    xe.fillStyle = '#000';
    xe.fillRect(0, 0, S, S);
    if (opts.brick) {
      for (let r = 0; r < S / 8; r++) {
        for (let k = 0; k < S / 16 + 1; k++) {
          const off = r % 2 ? 8 : 0;
          const v = 0.8 + rng() * 0.35;
          x.fillStyle = `rgb(${opts.brick[0] * v | 0},${opts.brick[1] * v | 0},${opts.brick[2] * v | 0})`;
          x.fillRect(k * 16 - off, r * 8, 15, 7);
        }
      }
    }
    if (opts.panels) {
      x.strokeStyle = 'rgba(0,0,0,0.25)';
      x.lineWidth = 2;
      for (let i = 0; i <= 8; i++) {
        x.beginPath();
        x.moveTo(0, i * cell);
        x.lineTo(S, i * cell);
        x.stroke();
      }
    }
    noise(x, S, S, opts.noise ?? 18, rng);
    for (let fy = 0; fy < 8; fy++) {
      for (let fx = 0; fx < 8; fx++) {
        const wx = fx * cell + cell * opts.winPad;
        const wy = fy * cell + cell * opts.winTop;
        const ww = cell * (1 - opts.winPad * 2);
        const wh = cell * opts.winH;
        const lit = rng() < opts.lit;
        const g = x.createLinearGradient(wx, wy, wx + ww, wy + wh);
        g.addColorStop(0, opts.glassA);
        g.addColorStop(1, opts.glassB);
        x.fillStyle = g;
        x.fillRect(wx, wy, ww, wh);
        if (opts.frame) {
          x.strokeStyle = opts.frame;
          x.lineWidth = 3;
          x.strokeRect(wx, wy, ww, wh);
          x.beginPath();
          x.moveTo(wx + ww / 2, wy);
          x.lineTo(wx + ww / 2, wy + wh);
          x.stroke();
        }
        if (opts.sill) {
          x.fillStyle = opts.sill;
          x.fillRect(wx - 3, wy + wh, ww + 6, 4);
        }
        if (lit) {
          const warm = rng();
          const col = warm < 0.6 ? [255, 200, 120] : warm < 0.85 ? [200, 220, 255] : [255, 150, 90];
          const b = 0.55 + rng() * 0.45;
          xe.fillStyle = `rgb(${col[0] * b | 0},${col[1] * b | 0},${col[2] * b | 0})`;
          xe.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
          // blinds / curtains
          if (rng() < 0.5) {
            xe.fillStyle = 'rgba(0,0,0,0.55)';
            xe.fillRect(wx + 2, wy + 2, ww - 4, (wh - 4) * rng() * 0.6);
          }
        }
      }
    }
    return { map: toTex(c), emissive: toTex(ce) };
  });
}

export const FACADES = {
  office: () => facade('f_office', { seed: 21, wall: '#5d6670', glassA: '#1b2a3a', glassB: '#4a6a85', winPad: 0.06, winTop: 0.1, winH: 0.78, lit: 0.45, frame: '#2b3138', panels: true, noise: 10 }),
  glass: () => facade('f_glass', { seed: 22, wall: '#26323d', glassA: '#132230', glassB: '#5d86a6', winPad: 0.02, winTop: 0.04, winH: 0.9, lit: 0.35, frame: '#0e141a', noise: 6 }),
  brick: () => facade('f_brick', { seed: 23, wall: '#6b3a2c', brick: [120, 58, 42], glassA: '#151b22', glassB: '#3b4a58', winPad: 0.24, winTop: 0.22, winH: 0.55, lit: 0.4, frame: '#d9d2c3', sill: '#bdb3a0' }),
  projects: () => facade('f_projects', { seed: 24, wall: '#a8957a', brick: [150, 128, 100], glassA: '#141a1f', glassB: '#38444f', winPad: 0.28, winTop: 0.25, winH: 0.45, lit: 0.5, frame: '#e2dccf', sill: '#7f735f' }),
  stucco: () => facade('f_stucco', { seed: 25, wall: '#c9b79a', glassA: '#1a2027', glassB: '#4a5866', winPad: 0.26, winTop: 0.24, winH: 0.5, lit: 0.35, frame: '#f2efe8', sill: '#9c8c72', noise: 22 }),
  warehouse: () =>
    cached('f_warehouse', () => {
      const rng = makeRng(26);
      const [c, x] = canvas(512);
      const [ce, xe] = canvas(512);
      x.fillStyle = '#6f746f';
      x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 64; i++) {
        x.fillStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
        x.fillRect(i * 8, 0, 4, 512);
      }
      noise(x, 512, 512, 20, rng);
      // rust streaks
      for (let i = 0; i < 30; i++) {
        x.fillStyle = `rgba(120,60,20,${rng() * 0.25})`;
        x.fillRect(rng() * 512, rng() * 512, 2 + rng() * 5, 30 + rng() * 120);
      }
      // high strip windows
      xe.fillStyle = '#000';
      xe.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 8; i++) {
        x.fillStyle = '#2a3238';
        x.fillRect(i * 64 + 8, 16, 48, 18);
        if (rng() < 0.4) {
          xe.fillStyle = '#b8c8d0';
          xe.fillRect(i * 64 + 10, 18, 44, 14);
        }
      }
      return { map: toTex(c), emissive: toTex(ce) };
    }),
  siding: () =>
    cached('f_siding', () => {
      const rng = makeRng(27);
      const [c, x] = canvas(512);
      const [ce, xe] = canvas(512);
      x.fillStyle = '#e8e4da';
      x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 64; i++) {
        x.fillStyle = 'rgba(0,0,0,0.10)';
        x.fillRect(0, i * 8 + 6, 512, 2);
      }
      noise(x, 512, 512, 10, rng);
      xe.fillStyle = '#000';
      xe.fillRect(0, 0, 512, 512);
      // 4 windows across, 2 floors (house texture tile = 12m x 7m)
      for (let fy = 0; fy < 2; fy++) {
        for (let fx = 0; fx < 4; fx++) {
          const wx = fx * 128 + 34, wy = fy * 256 + 60, ww = 60, wh = 110;
          x.fillStyle = '#f7f6f2';
          x.fillRect(wx - 8, wy - 8, ww + 16, wh + 16);
          x.fillStyle = '#26303a';
          x.fillRect(wx, wy, ww, wh);
          x.fillStyle = '#f7f6f2';
          x.fillRect(wx + ww / 2 - 2, wy, 4, wh);
          x.fillRect(wx, wy + wh / 2 - 2, ww, 4);
          // shutters
          x.fillStyle = 'rgba(40,50,60,0.75)';
          x.fillRect(wx - 26, wy - 4, 14, wh + 8);
          x.fillRect(wx + ww + 12, wy - 4, 14, wh + 8);
          if (rng() < 0.45) {
            xe.fillStyle = '#ffc77a';
            xe.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
          }
        }
      }
      return { map: toTex(c), emissive: toTex(ce) };
    }),
};

export const roofTex = () =>
  cached('roof', () => {
    const rng = makeRng(31);
    const [c, x] = canvas(256);
    x.fillStyle = '#3a3b3d';
    x.fillRect(0, 0, 256, 256);
    noise(x, 256, 256, 30, rng);
    return toTex(c);
  });

export const shingles = () =>
  cached('shingles', () => {
    const rng = makeRng(32);
    const [c, x] = canvas(256);
    x.fillStyle = '#3b3533';
    x.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 16; r++) {
      for (let k = 0; k < 9; k++) {
        const v = 40 + rng() * 30;
        x.fillStyle = `rgb(${v},${v - 4},${v - 6})`;
        x.fillRect(k * 32 - (r % 2) * 16, r * 16, 30, 14);
      }
    }
    return toTex(c);
  });

export const storefront = () =>
  cached('storefront', () => {
    const rng = makeRng(33);
    const [c, x] = canvas(512, 256);
    const [ce, xe] = canvas(512, 256);
    x.fillStyle = '#4a4440';
    x.fillRect(0, 0, 512, 256);
    xe.fillStyle = '#000';
    xe.fillRect(0, 0, 512, 256);
    // two shop bays per tile (tile = 12m wide x 4.5m tall)
    for (let b = 0; b < 2; b++) {
      const ox = b * 256;
      x.fillStyle = '#1a1e22';
      x.fillRect(ox + 20, 70, 150, 170);
      x.fillStyle = '#20262c';
      x.fillRect(ox + 185, 90, 55, 150); // door
      x.fillStyle = '#9aa3a8';
      x.fillRect(ox + 20, 66, 220, 6);
      // security gate lines
      if (rng() < 0.5) {
        x.fillStyle = 'rgba(150,150,150,0.35)';
        for (let i = 0; i < 30; i++) x.fillRect(ox + 20, 72 + i * 6, 150, 2);
      }
      // interior light
      const g = xe.createLinearGradient(0, 70, 0, 240);
      g.addColorStop(0, '#d8e8ff');
      g.addColorStop(1, '#7b8a9a');
      xe.fillStyle = g;
      xe.fillRect(ox + 24, 74, 142, 162);
      xe.fillStyle = 'rgba(0,0,0,0.5)';
      for (let i = 0; i < 4; i++) xe.fillRect(ox + 30 + i * 35, 150, 25, 86); // shelves
      x.fillStyle = 'rgba(255,255,255,0.08)';
      x.fillRect(ox + 24, 74, 60, 162);
    }
    noise(x, 512, 256, 14, rng);
    return { map: toTex(c), emissive: toTex(ce) };
  });

export const garageDoor = () =>
  cached('garagedoor', () => {
    const [c, x] = canvas(256);
    x.fillStyle = '#9a9c9e';
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 16; i++) {
      x.fillStyle = i % 2 ? '#86888a' : '#a7a9ab';
      x.fillRect(0, i * 16, 256, 14);
    }
    noise(x, 256, 256, 16, makeRng(34));
    return toTex(c);
  });

export const containerTex = () =>
  cached('container', () => {
    const [c, x] = canvas(256);
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 32; i++) {
      x.fillStyle = i % 2 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.0)';
      x.fillRect(i * 8, 0, 4, 256);
    }
    noise(x, 256, 256, 25, makeRng(35));
    return toTex(c);
  });

// ------------------------------------------------------------------ signs, graffiti, decals
export const SIGN_TEXTS = [
  ['LIQUOR', '#ff3355'], ['24/7 MINI MART', '#33d6ff'], ['CHECKS CASHED', '#ffd23f'], ['WINGS & FISH', '#ff8a1f'],
  ['BARBER', '#ff3355'], ['PAWN', '#ffd23f'], ['TIRES & RIMS', '#33ff99'], ['LAUNDROMAT', '#33d6ff'],
  ['PHONE REPAIR', '#c055ff'], ['PIZZA', '#ff8a1f'], ['BEAUTY SUPPLY', '#ff55c8'], ['CHINESE FOOD', '#ff3355'],
  ['GOLD & GRILLZ', '#ffd23f'], ['SNEAKERS', '#33ff99'], ['TAQUERIA', '#ff8a1f'], ['OPEN', '#ff3355'],
];
export const SPECIAL_SIGNS = {
  chop: ['EZ AUTO PARTS', '#ffb000'], garage: ['THE SPOT', '#33d6ff'], export: ['PORT EXPORTS', '#33ff99'],
  police: ['POLICE', '#3a8bff'], spray: ['FRESH COAT', '#ff55c8'], gas: ['PUMP N GO', '#ff3355'],
};

/** Atlas of neon signs: 4 columns x 8 rows of 256x128. Returns {map, emissive, uv(i)} */
export const signAtlas = () =>
  cached('signs', () => {
    const W = 1024, H = 1024, cw = 256, ch = 128;
    const [c, x] = canvas(W, H);
    const [ce, xe] = canvas(W, H);
    const all = [...SIGN_TEXTS, ...Object.values(SPECIAL_SIGNS)];
    x.fillStyle = '#111';
    x.fillRect(0, 0, W, H);
    xe.fillStyle = '#000';
    xe.fillRect(0, 0, W, H);
    all.forEach(([text, col], i) => {
      const cx = (i % 4) * cw, cy = Math.floor(i / 4) * ch;
      x.fillStyle = '#16181b';
      x.fillRect(cx + 4, cy + 4, cw - 8, ch - 8);
      x.strokeStyle = '#333';
      x.lineWidth = 4;
      x.strokeRect(cx + 6, cy + 6, cw - 12, ch - 12);
      const size = text.length > 12 ? 30 : text.length > 8 ? 38 : 54;
      for (const ctx of [x, xe]) {
        ctx.font = `bold ${size}px Impact, "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = col;
        ctx.shadowBlur = 14;
        ctx.fillStyle = col;
        ctx.fillText(text, cx + cw / 2, cy + ch / 2 + 2);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.6;
        ctx.fillText(text, cx + cw / 2, cy + ch / 2 + 2);
        ctx.globalAlpha = 1;
      }
    });
    const map = toTex(c, { repeat: false });
    const emissive = toTex(ce, { repeat: false });
    const index = (name) => all.findIndex(([t]) => t === name);
    const uv = (i) => {
      const col = i % 4, row = Math.floor(i / 4);
      return { u0: col / 4, u1: (col + 1) / 4, v0: 1 - (row + 1) / 8, v1: 1 - row / 8 };
    };
    return { map, emissive, uv, index, count: all.length };
  });

const TAGS = ['BOOST', 'EASTSIDE', 'KING', 'OG', 'HOOD', 'ZONE 6', 'REST UP', 'NO LOVE', 'BLOCK', 'WESTEND', '4EVA', 'SKRT'];
/** Graffiti atlas: 4x4 cells of 256x128 with transparent background. */
export const graffitiAtlas = () =>
  cached('graffiti', () => {
    const rng = makeRng(41);
    const [c, x] = canvas(1024, 512);
    x.clearRect(0, 0, 1024, 512);
    const cols = ['#ff3a6e', '#3ad2ff', '#ffe03a', '#7dff3a', '#c43aff', '#ff8a2a', '#ffffff'];
    for (let i = 0; i < 16; i++) {
      const cx = (i % 4) * 256, cy = Math.floor(i / 4) * 128;
      const t = TAGS[i % TAGS.length];
      const fill = rng.pick(cols), stroke = rng.pick(['#111', '#1b1b40', '#3a0010']);
      x.save();
      x.translate(cx + 128, cy + 66);
      x.rotate((rng() - 0.5) * 0.25);
      x.font = `bold ${t.length > 6 ? 40 : 58}px Impact, "Arial Black", sans-serif`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.lineJoin = 'round';
      x.lineWidth = 10;
      x.strokeStyle = stroke;
      x.strokeText(t, 0, 0);
      const g = x.createLinearGradient(0, -30, 0, 30);
      g.addColorStop(0, fill);
      g.addColorStop(1, rng.pick(cols));
      x.fillStyle = g;
      x.fillText(t, 0, 0);
      x.lineWidth = 2;
      x.strokeStyle = '#fff';
      x.globalAlpha = 0.5;
      x.strokeText(t, -2, -2);
      x.restore();
      // drips
      x.fillStyle = fill;
      for (let d = 0; d < 5; d++) x.fillRect(cx + 40 + rng() * 170, cy + 80, 2, 10 + rng() * 30);
    }
    return toTex(c, { repeat: false });
  });

export const radial = () =>
  cached('radial', () => {
    const [c, x] = canvas(128);
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return toTex(c, { repeat: false });
  });

/** Forward-facing headlight beam on the road. */
export const beam = () =>
  cached('beam', () => {
    const [c, x] = canvas(128, 256);
    const g = x.createRadialGradient(64, 250, 4, 64, 160, 150);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(52, 256);
    x.lineTo(76, 256);
    x.lineTo(128, 0);
    x.lineTo(0, 0);
    x.closePath();
    x.fill();
    return toTex(c, { repeat: false });
  });

export const chainLink = () =>
  cached('chainlink', () => {
    const [c, x] = canvas(128);
    x.clearRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(190,195,200,0.9)';
    x.lineWidth = 2;
    for (let i = -128; i < 256; i += 16) {
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i + 128, 128);
      x.moveTo(i + 128, 0);
      x.lineTo(i, 128);
      x.stroke();
    }
    return toTex(c, { srgb: true });
  });

export const courtTex = () =>
  cached('court', () => {
    const [c, x] = canvas(512, 1024);
    x.fillStyle = '#2f5d8a';
    x.fillRect(0, 0, 512, 1024);
    x.fillStyle = '#b5532f';
    x.fillRect(24, 24, 464, 976);
    noise(x, 512, 1024, 14, makeRng(42));
    x.strokeStyle = '#f2f2f2';
    x.lineWidth = 6;
    x.strokeRect(24, 24, 464, 976);
    x.beginPath();
    x.moveTo(24, 512);
    x.lineTo(488, 512);
    x.stroke();
    x.beginPath();
    x.arc(256, 512, 70, 0, Math.PI * 2);
    x.stroke();
    for (const end of [24, 1000]) {
      const dir = end === 24 ? 1 : -1;
      x.strokeRect(186, end === 24 ? 24 : 1000 - 230, 140, 230);
      x.beginPath();
      x.arc(256, end + dir * 60, 300, dir > 0 ? 0.25 : Math.PI + 0.25, dir > 0 ? Math.PI - 0.25 : Math.PI * 2 - 0.25);
      x.stroke();
    }
    return toTex(c, { repeat: false });
  });

export const parkingLines = () =>
  cached('parking', () => {
    const [c, x] = canvas(512);
    x.fillStyle = '#34363a';
    x.fillRect(0, 0, 512, 512);
    noise(x, 512, 512, 30, makeRng(43));
    return toTex(c);
  });

export const plateTex = (text) => {
  const [c, x] = canvas(256, 128);
  x.fillStyle = '#f4f4ef';
  x.fillRect(0, 0, 256, 128);
  x.strokeStyle = '#223';
  x.lineWidth = 6;
  x.strokeRect(6, 6, 244, 116);
  x.fillStyle = '#b3121b';
  x.font = 'bold 22px Arial';
  x.textAlign = 'center';
  x.fillText('SAN BRAVO', 128, 32);
  x.fillStyle = '#1b2440';
  x.font = 'bold 56px "Arial Black", Arial';
  x.textBaseline = 'middle';
  x.fillText(text, 128, 80);
  const t = toTex(c, { repeat: false });
  return t;
};

// ------------------------------------------------------------------ clothing / hair
export const fabricTex = (kind, colA, colB = '#ffffff') =>
  cached(`fab_${kind}_${colA}_${colB}`, () => {
    const rng = makeRng(51);
    const [c, x] = canvas(256);
    x.fillStyle = colA;
    x.fillRect(0, 0, 256, 256);
    if (kind === 'denim') {
      for (let i = 0; i < 256; i += 2) {
        x.fillStyle = `rgba(255,255,255,${0.04 + rng() * 0.05})`;
        x.fillRect(0, i, 256, 1);
      }
      for (let i = 0; i < 40; i++) {
        x.fillStyle = 'rgba(255,255,255,0.06)';
        x.fillRect(rng() * 256, rng() * 256, 30 + rng() * 60, 4 + rng() * 8);
      }
    } else if (kind === 'flannel') {
      x.globalAlpha = 0.55;
      x.fillStyle = colB;
      for (let i = 0; i < 256; i += 64) {
        x.fillRect(i, 0, 24, 256);
        x.fillRect(0, i, 256, 24);
      }
      x.fillStyle = '#000';
      x.globalAlpha = 0.25;
      for (let i = 30; i < 256; i += 64) {
        x.fillRect(i, 0, 6, 256);
        x.fillRect(0, i, 256, 6);
      }
      x.globalAlpha = 1;
    } else if (kind === 'camo') {
      const cols = ['#4b5320', '#2f3b1c', '#6b5a3a', '#1e2416'];
      for (let i = 0; i < 70; i++) {
        x.fillStyle = cols[i % cols.length];
        x.beginPath();
        x.ellipse(rng() * 256, rng() * 256, 10 + rng() * 26, 6 + rng() * 16, rng() * 3, 0, Math.PI * 2);
        x.fill();
      }
    } else if (kind === 'jersey') {
      x.fillStyle = colB;
      x.fillRect(0, 30, 256, 12);
      x.fillRect(0, 210, 256, 12);
      x.font = 'bold 90px Impact, "Arial Black", sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.lineWidth = 6;
      x.strokeStyle = colB;
      x.fillStyle = '#ffffff';
      // number drawn twice (front & back faces of the lathe UV wrap)
      for (const cx of [64, 192]) {
        x.strokeText('23', cx, 128);
        x.fillText('23', cx, 128);
      }
    } else if (kind === 'track') {
      x.fillStyle = colB;
      for (const cx of [26, 230]) x.fillRect(cx, 0, 10, 256);
    } else if (kind === 'puffer') {
      for (let i = 0; i < 256; i += 32) {
        const g = x.createLinearGradient(0, i, 0, i + 32);
        g.addColorStop(0, 'rgba(0,0,0,0.35)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
        g.addColorStop(1, 'rgba(0,0,0,0.35)');
        x.fillStyle = g;
        x.fillRect(0, i, 256, 32);
      }
    } else if (kind === 'waves') {
      x.strokeStyle = 'rgba(255,255,255,0.10)';
      x.lineWidth = 3;
      for (let r = 4; r < 360; r += 10) {
        x.beginPath();
        x.arc(128, -40, r, 0, Math.PI);
        x.stroke();
      }
    } else if (kind === 'cornrows') {
      for (let i = 0; i < 256; i += 18) {
        const g = x.createLinearGradient(i, 0, i + 18, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.5)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
        g.addColorStop(1, 'rgba(0,0,0,0.5)');
        x.fillStyle = g;
        x.fillRect(i, 0, 18, 256);
      }
    }
    noise(x, 256, 256, kind === 'denim' ? 20 : 10, rng);
    return toTex(c);
  });
