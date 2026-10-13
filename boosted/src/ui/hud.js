// In-game HUD: cash, wanted stars, minimap, speedometer, prompts, toasts and banners.
import { WORLD } from '../config.js';
import { fmtMoney } from '../util.js';
import { LOCATION_INFO } from '../world/city.js';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

const MAP_EXT = 380; // world half-extent drawn on the map texture
const MAP_PX = 1024;

export class HUD {
  constructor(game, root) {
    this.game = game;
    this.root = h('div', { class: 'screen' });
    root.append(this.root);
    this.toastsEl = h('div', { class: 'toasts' });
    this.cash = h('div', { class: 'hud-cash' });
    this.stars = h('div', { class: 'hud-stars' });
    this.cred = h('div', { class: 'hud-cred' });
    this.clock = h('div', { class: 'hud-clock' });
    this.objective = h('div', { class: 'objective' });
    this.prompt = h('div', { class: 'prompt' });
    this.mapCanvas = h('canvas');
    this.minimap = h('div', { class: 'minimap' }, this.mapCanvas);
    this.evade = h('div', { class: 'evade' });
    this.speedo = h('div', { class: 'speedo' });
    this.banner = h('div', { class: 'banner' });
    this.hint = h('div', { class: 'controls-hint' });
    this.root.append(
      this.toastsEl,
      h('div', { class: 'hud-top-right' }, this.cash, this.stars, this.cred, this.clock),
      this.objective, this.prompt, this.minimap, this.evade, this.speedo, this.banner, this.hint,
    );
    this.last = {};
    this.buildStaticMap();
    this.visible = false;
    this.root.style.display = 'none';
  }

  show(v) {
    this.visible = v;
    this.root.style.display = v ? '' : 'none';
  }

  set(el, key, html) {
    if (this.last[key] === html) return;
    this.last[key] = html;
    el.innerHTML = html;
  }

  toast(text, color = '#3dff8b') {
    const t = h('div', { class: 'toast', style: { borderLeftColor: color } }, text);
    this.toastsEl.append(t);
    while (this.toastsEl.children.length > 5) this.toastsEl.firstChild.remove();
    setTimeout(() => t.remove(), 4200);
  }

  showBanner(big, sub = '', color = '#fff', time = 2.6) {
    this.banner.innerHTML = '';
    this.banner.append(h('div', { class: 'big', style: { color } }, big), h('div', { class: 'sub' }, sub));
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => (this.banner.innerHTML = ''), time * 1000);
  }

  // ------------------------------------------------------------------ map
  buildStaticMap() {
    const g = this.game;
    const c = document.createElement('canvas');
    c.width = c.height = MAP_PX;
    const x = c.getContext('2d');
    const k = MAP_PX / (MAP_EXT * 2);
    const X = (wx) => (wx + MAP_EXT) * k;
    x.fillStyle = '#1b1f24';
    x.fillRect(0, 0, MAP_PX, MAP_PX);
    // roads (everything inside the wall)
    const E = WORLD.HALF + WORLD.ROAD / 2;
    x.fillStyle = '#3a3f47';
    x.fillRect(X(-E), X(-E), (2 * E) * k, (2 * E) * k);
    // water
    x.fillStyle = '#123247';
    x.fillRect(0, X(g.city.waterZ), MAP_PX, MAP_PX);
    const tint = { H: '#26302a', A: '#2b2a2e', C: '#2e2a26', D: '#252b35', I: '#2e2b27', P: '#1f3a22', L: '#2a2c30', G: '#1f2f3a', X: '#3a2f1a', E: '#20303a', S: '#3a2236', O: '#1e2840', F: '#3a2226' };
    for (const b of g.city.blocks) {
      x.fillStyle = tint[b.type] || '#2a2c30';
      x.fillRect(X(b.minX), X(b.minZ), (b.maxX - b.minX) * k, (b.maxZ - b.minZ) * k);
    }
    x.fillStyle = '#4a515b';
    for (const b of g.city.col.boxes) {
      if (b.tag === 'building') x.fillRect(X(b.minX), X(b.minZ), (b.maxX - b.minX) * k, (b.maxZ - b.minZ) * k);
    }
    this.staticMap = c;
    this.mapK = k;
  }

  drawBlips(x, k, toScreen, player, rotateArrow) {
    const g = this.game;
    const t = g.time;
    // contract targets
    const specs = new Set(g.contracts.list.map((c) => c.spec));
    for (const v of g.vehicles.list) {
      if (v === g.player.car) continue;
      if (specs.has(v.specId) && v.role !== 'police') {
        const [sx, sy] = toScreen(v.pos.x, v.pos.z);
        x.fillStyle = '#ffc94a';
        x.beginPath();
        x.arc(sx, sy, 4.5, 0, Math.PI * 2);
        x.fill();
      }
      if (v.role === 'police') {
        const [sx, sy] = toScreen(v.pos.x, v.pos.z);
        x.fillStyle = v.pursuit ? (Math.floor(t * 6) % 2 ? '#ff2d55' : '#2f6bff') : '#6a8cff';
        x.beginPath();
        x.arc(sx, sy, v.pursuit ? 5 : 3.5, 0, Math.PI * 2);
        x.fill();
      }
    }
    for (const loc of g.city.locations) {
      const [sx, sy] = toScreen(loc.x, loc.z, true);
      x.fillStyle = loc.color;
      x.beginPath();
      x.arc(sx, sy, 9, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#000';
      x.font = 'bold 11px Inter, Arial';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(loc.short, sx, sy + 0.5);
    }
    // player arrow
    const [px, py] = toScreen(player.x, player.z);
    x.save();
    x.translate(px, py);
    x.rotate(rotateArrow);
    x.fillStyle = '#fff';
    x.strokeStyle = '#000';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(0, -9);
    x.lineTo(6, 7);
    x.lineTo(0, 3.5);
    x.lineTo(-6, 7);
    x.closePath();
    x.stroke();
    x.fill();
    x.restore();
    void k;
  }

  drawMinimap() {
    const g = this.game;
    const cv = this.mapCanvas;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const S = Math.round(this.minimap.clientWidth * dpr);
    if (cv.width !== S) cv.width = cv.height = S;
    const x = cv.getContext('2d');
    const p = g.player.focus;
    const yaw = g.cam.yaw;
    const zoom = (S / 240) * (g.player.inCar ? 0.8 + 0.2 * (1 - Math.min(1, g.player.car.speed / 50)) : 1.15);
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = '#101317';
    x.fillRect(0, 0, S, S);
    x.save();
    x.translate(S / 2, S / 2);
    x.rotate(yaw - Math.PI);
    x.scale(zoom, zoom);
    x.translate(-p.x, -p.z);
    const k = this.mapK;
    x.drawImage(this.staticMap, -MAP_EXT, -MAP_EXT, MAP_PX / k, MAP_PX / k);
    x.restore();
    const ca = Math.cos(yaw - Math.PI), sa = Math.sin(yaw - Math.PI);
    const R = S / 2 - 10;
    const toScreen = (wx, wz, clampEdge) => {
      const dx = (wx - p.x) * zoom, dz = (wz - p.z) * zoom;
      let sx = dx * ca - dz * sa, sy = dx * sa + dz * ca;
      if (clampEdge) {
        const d = Math.hypot(sx, sy);
        if (d > R) (sx *= R / d), (sy *= R / d);
      }
      return [S / 2 + sx, S / 2 + sy];
    };
    const heading = g.player.inCar ? g.player.car.yaw : g.player.yaw;
    this.drawBlips(x, zoom, toScreen, p, -(heading - yaw));
  }

  drawBigMap(canvas) {
    const g = this.game;
    const S = canvas.width;
    const x = canvas.getContext('2d');
    x.drawImage(this.staticMap, 0, 0, S, S);
    const k = S / (MAP_EXT * 2);
    const toScreen = (wx, wz) => [(wx + MAP_EXT) * k, (wz + MAP_EXT) * k];
    const heading = g.player.inCar ? g.player.car.yaw : g.player.yaw;
    this.drawBlips(x, k, toScreen, g.player.focus, Math.PI - heading);
  }

  // ------------------------------------------------------------------ per-frame
  update() {
    if (!this.visible) return;
    const g = this.game;
    const P = g.player;
    this.set(this.cash, 'cash', fmtMoney(g.cash));
    const lvl = g.wanted.level;
    this.set(this.stars, 'stars', `<b>${'★'.repeat(lvl)}</b>${'★'.repeat(5 - lvl)}`);
    this.stars.classList.toggle('flash', g.wanted.flash > 0);
    this.set(this.cred, 'cred', `STREET CRED LV ${g.credLevel}`);
    this.set(this.clock, 'clock', g.sky.clock + (g.audio.radioOn ? ' · 📻 ON' : ''));
    this.set(this.objective, 'obj', g.objective || '');
    this.objective.style.display = g.objective ? '' : 'none';

    // prompt
    const pr = P.prompt;
    if (pr) {
      const key = `${pr.key}|${pr.text}|${pr.progress != null ? Math.round(pr.progress * 50) : ''}`;
      this.set(this.prompt, 'prompt', `<span class="key">${pr.key}</span><span>${pr.text}</span>${pr.progress ? `<div class="statbar"><i style="width:${Math.min(100, pr.progress * 100)}%"></i></div>` : ''}`);
      void key;
      this.prompt.style.display = '';
    } else this.prompt.style.display = 'none';

    // evade meter
    if (lvl > 0) {
      const e = g.wanted.seen ? 0 : g.wanted.evade / g.wanted.evadeNeeded;
      const bust = g.wanted.bust > 0.05 ? `<div style="color:#ff2d55;margin-top:4px">GETTING BUSTED…</div>` : '';
      this.set(this.evade, 'evade', `${g.wanted.seen ? 'COPS SEE YOU' : 'EVADING…'}<div class="statbar"><i style="width:${Math.round(e * 100)}%"></i></div>${bust}`);
      this.evade.style.display = '';
    } else this.evade.style.display = 'none';

    // speedo
    if (P.inCar) {
      const v = P.car;
      const mph = Math.round(Math.abs(v.vF) * 2.237);
      const tag = v.owned ? '<span class="tag clean">YOURS</span>' : v.hot ? '<span class="tag">HOT</span>' : '<span class="tag clean">CLEAN</span>';
      const nos = v.nitroPower > 0 ? `<label>NITROUS<span></span></label><div class="statbar"><i class="nos" style="width:${Math.round(v.nitroFuel * 100)}%"></i></div>` : '';
      this.set(this.speedo, 'speedo', `<div class="mph">${mph}</div><div class="unit">MPH · GEAR ${v.vF < -0.5 ? 'R' : v.gear}</div><div class="car">${P.carName}${tag}</div>
        <div class="bars"><label>CONDITION<span>${Math.round(v.health * 100)}%</span></label><div class="statbar"><i class="hp" style="width:${Math.round(v.health * 100)}%"></i></div>${nos}</div>`);
      this.speedo.style.display = '';
    } else this.speedo.style.display = 'none';

    const hint = P.inCar
      ? `Gas / Brake<span class="key">W</span><span class="key">S</span><br>Handbrake<span class="key">Space</span><br>Nitrous<span class="key">Shift</span><br>Exit<span class="key">E</span><br>Horn<span class="key">H</span> Radio<span class="key">R</span><br>Map<span class="key">M</span> Menu<span class="key">Esc</span>`
      : `Move<span class="key">WASD</span><br>Sprint<span class="key">Shift</span> Jump<span class="key">Space</span><br>Steal / Enter<span class="key">E</span><br>Radio<span class="key">R</span> Map<span class="key">M</span><br>Menu<span class="key">Esc</span>`;
    this.set(this.hint, 'hint', g.settings.showHints ? hint : '');
    this.drawMinimap();
  }
}

export { LOCATION_INFO };
