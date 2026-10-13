// Wanted level, boost contracts and save data.
import { CARS, CIVILIAN_CARS, PAINTS, FINISHES, carValue } from '../config.js';
import { weightedPick, rand } from '../util.js';

// ------------------------------------------------------------------ wanted
export class Wanted {
  constructor(game) {
    this.game = game;
    this.level = 0;
    this.evade = 0;
    this.seen = false;
    this.bust = 0;
    this.flash = 0;
  }

  add(n, reason) {
    const before = this.level;
    this.level = Math.min(5, this.level + n);
    this.evade = 0;
    if (this.level > before) {
      this.flash = 2;
      this.game.hud.toast(`${'★'.repeat(this.level)}  ${reason}`, '#ff4d5e');
    }
  }

  clear() {
    this.level = 0;
    this.evade = 0;
    this.bust = 0;
  }

  get evadeNeeded() {
    return 5 + this.level * 3;
  }

  update(dt) {
    const g = this.game;
    if (this.flash > 0) this.flash -= dt;
    if (this.level === 0) {
      this.bust = 0;
      return;
    }
    const p = g.player.focus;
    const sight = 40 + this.level * 12;
    let seen = false, nearest = Infinity;
    for (const c of g.vehicles.cops) {
      const d = c.pos.distanceTo(p);
      if (c.pursuit) nearest = Math.min(nearest, d);
      if (d < sight && g.city.col.lineOfSight(c.pos.x, c.pos.z, p.x, p.z, 2)) seen = true;
    }
    this.seen = seen;
    this.nearestCop = nearest;
    if (seen) this.evade = 0;
    else {
      this.evade += dt;
      if (this.evade >= this.evadeNeeded) {
        const lvl = this.level;
        this.clear();
        g.hud.toast('Lost the cops', '#33ff99');
        g.addXP(40 * lvl);
        return;
      }
    }
    // bust: stopped (or on foot) with a cop right on you
    const slow = g.player.inCar ? g.player.car.speed < 2.2 : g.player.speed < 3;
    const close = g.player.inCar ? 7 : 5;
    if (slow && nearest < close) this.bust += dt;
    else this.bust = Math.max(0, this.bust - dt * 1.5);
    if (this.bust > (g.player.inCar ? 2.6 : 1.4)) {
      this.bust = 0;
      g.busted();
    }
  }
}

// ------------------------------------------------------------------ contracts
const BUYERS = ['Big Moe', 'Auntie Pat', 'Cuz from Detroit', 'Lil Tez', 'OG Ray', 'Mr. Kim', 'Dre', 'Santana', 'Yolanda', 'Smokey'];

export class Contracts {
  constructor(game, saved) {
    this.game = game;
    this.list = saved?.length ? saved : [];
    while (this.list.length < 3) this.list.push(this.generate());
  }

  generate() {
    const lvl = this.game.credLevel || 1;
    const spec = weightedPick(rand, CIVILIAN_CARS.map((k) => [k, Math.max(2, 30 - CARS[k].rarity) + (CARS[k].value > 20000 ? 6 : 0)]));
    const req = {};
    const r = rand();
    if (r < 0.45) {
      const [name, hex] = PAINTS[Math.floor(rand() * PAINTS.length)];
      req.paint = { name, hex };
    }
    if (rand() < 0.25 + lvl * 0.08) req.engine = Math.min(3, 1 + Math.floor(rand() * Math.min(3, lvl)));
    if (rand() < 0.25) req.finish = FINISHES[1 + Math.floor(rand() * 3)].id;
    if (rand() < 0.2) req.rimSize = 1 + Math.floor(rand() * 2);
    if (rand() < 0.15 && lvl >= 3) req.blower = 1;
    const base = CARS[spec].value;
    let reward = base * 1.25;
    if (req.paint) reward += 1200;
    if (req.engine) reward += [0, 3500, 10000, 22000][req.engine];
    if (req.finish) reward += FINISHES.find((f) => f.id === req.finish).cost * 1.5;
    if (req.rimSize) reward += [0, 2200, 5000][req.rimSize];
    if (req.blower) reward += 20000;
    return { id: Math.random().toString(36).slice(2, 8), spec, req, reward: Math.round(reward / 100) * 100, buyer: BUYERS[Math.floor(rand() * BUYERS.length)] };
  }

  describe(c) {
    const s = CARS[c.spec];
    const parts = [`${s.make} ${s.name}`];
    if (c.req.paint) parts.push(`${c.req.paint.name} paint`);
    if (c.req.finish) parts.push(`${c.req.finish} finish`);
    if (c.req.engine) parts.push(`Engine Stage ${c.req.engine}+`);
    if (c.req.rimSize) parts.push(`${['', '20"', '24"'][c.req.rimSize]}+ rims`);
    if (c.req.blower) parts.push('Blower');
    return parts;
  }

  /** Which unmet requirements does this vehicle have for contract c (empty = match). */
  missing(c, v) {
    const out = [];
    if (v.specId !== c.spec) return ['wrong model'];
    const u = v.up;
    if (c.req.paint && u.color.toLowerCase() !== c.req.paint.hex.toLowerCase()) out.push(`${c.req.paint.name} paint`);
    if (c.req.finish && u.finish !== c.req.finish) out.push(`${c.req.finish} finish`);
    if (c.req.engine && (u.engine || 0) < c.req.engine) out.push(`Engine Stage ${c.req.engine}`);
    if (c.req.rimSize && (u.rimSize || 0) < c.req.rimSize) out.push('bigger rims');
    if (c.req.blower && !u.blower) out.push('Blower');
    return out;
  }

  bestMatch(v) {
    let best = null;
    for (const c of this.list) if (!this.missing(c, v).length && (!best || c.reward > best.reward)) best = c;
    return best;
  }

  complete(c) {
    const i = this.list.indexOf(c);
    if (i >= 0) this.list.splice(i, 1, this.generate());
  }
}

// ------------------------------------------------------------------ economy helpers
export function chopPrice(v) {
  const base = CARS[v.specId].value;
  return Math.round((base * (0.45 + 0.55 * v.health) * 0.5 + (carValue(v.specId, v.up, 1) - base) * 0.3) / 10) * 10;
}

export function exportPrice(v) {
  const val = carValue(v.specId, v.up, v.health);
  return Math.round((v.hot ? val * 0.65 : val) / 10) * 10;
}

export function repairCost(v) {
  return Math.round(((1 - v.health) * CARS[v.specId].value * 0.12) / 10) * 10;
}

// ------------------------------------------------------------------ save
const KEY = 'boosted_save_v1';
const SKEY = 'boosted_settings_v1';

export const Save = {
  load() {
    try {
      const s = localStorage.getItem(KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  },
  write(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable (private mode / sandbox) */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
  loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(SKEY) || 'null');
    } catch {
      return null;
    }
  },
  writeSettings(s) {
    try {
      localStorage.setItem(SKEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  },
};
