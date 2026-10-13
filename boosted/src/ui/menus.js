// Title screen, character creator, garage / upgrade shop, chop shop, exports, body shop, pause + settings, map.
import { h } from './hud.js';
import {
  CARS, PERF, PAINTS, FINISHES, RIMS, RIM_COLORS, RIM_SIZES, TINTS, UNDERGLOW, SPOILERS, HOODS, GARAGE_SLOTS, RESPRAY_COST,
  SKIN_TONES, HAIR_COLORS, HAIR_STYLES, FACIAL_HAIR, HEADWEAR, TOPS, BOTTOMS, SHOES, BUILDS, CLOTH_COLORS,
  randomCharacter, randomPlate, carValue, credForLevel,
} from '../config.js';
import { fmtMoney } from '../util.js';
import { chopPrice, exportPrice, repairCost } from '../game/systems.js';

export class Menus {
  constructor(game, root) {
    this.game = game;
    this.root = h('div', { class: 'screen' });
    root.append(this.root);
    this.current = null;
  }

  clear() {
    this.root.innerHTML = '';
    this.current = null;
    this.game.showroom.active = false;
  }

  click() {
    this.game.audio.click();
  }

  // ------------------------------------------------------------------ title
  title() {
    this.clear();
    this.current = 'title';
    const g = this.game;
    const hasSave = !!g.saveData;
    const menu = h('div', { class: 'title-menu' });
    if (hasSave) menu.append(h('button', { class: 'btn primary', onclick: () => (this.click(), g.continueGame()) }, `Continue — ${g.saveData.character?.name || 'Player'}`));
    menu.append(
      h('button', { class: `btn ${hasSave ? '' : 'primary'}`, onclick: () => (this.click(), this.creator('new')) }, 'New Game'),
      h('button', { class: 'btn', onclick: () => (this.click(), this.settings(() => this.title())) }, 'Settings'),
      h('button', { class: 'btn', onclick: () => (this.click(), this.controls(() => this.title())) }, 'How To Play'),
    );
    this.root.append(
      h('div', { class: 'vignette' }),
      h('div', { class: 'title-wrap' },
        h('div', { class: 'title-logo' }, 'BOOST', h('span', {}, 'ED')),
        h('div', { class: 'title-tag' }, 'Steal it · Chop it · Build it · Flip it'),
        menu,
      ),
      h('div', { class: 'version' }, 'PROTOTYPE v0.1 · SAN BRAVO'),
    );
  }

  // ------------------------------------------------------------------ creator
  creator(mode, startLook) {
    this.clear();
    this.current = 'creator';
    const g = this.game;
    const look = { ...(startLook || g.player?.model.look || g.saveData?.character || randomCharacter()) };
    if (mode === 'new' && !startLook) Object.assign(look, randomCharacter(), { name: 'Lil Boost' });
    g.enterShowroom();
    g.showroom.showCharacter(look);
    g.showroom.setZoom('full');
    let tab = 'identity';
    const body = h('div', { class: 'side-body' });
    const tabs = h('div', { class: 'tabs' });
    const refresh = () => {
      g.showroom.showCharacter(look);
      render();
    };
    const set = (k, v) => {
      look[k] = v;
      this.click();
      refresh();
    };
    const chips = (key, opts) =>
      h('div', { class: 'chips' }, opts.map(([id, label]) => h('button', { class: `chip ${look[key] === id ? 'on' : ''}`, onclick: () => set(key, id) }, label)));
    const swatches = (key, cols) =>
      h('div', { class: 'swatches' }, cols.map((c) => {
        const hex = Array.isArray(c) ? c[1] : c;
        return h('button', { class: `sw ${look[key] === hex ? 'on' : ''}`, title: Array.isArray(c) ? c[0] : hex, style: { background: hex }, onclick: () => set(key, hex) });
      }));
    const field = (label, ...kids) => [h('div', { class: 'field' }, label), ...kids];
    const toggle = (key, label) => h('button', { class: `chip ${look[key] ? 'on' : ''}`, onclick: () => set(key, !look[key]) }, label);

    const TABS = [['identity', 'Identity'], ['face', 'Hair & Face'], ['fits', 'Fits'], ['drip', 'Drip']];
    const render = () => {
      tabs.innerHTML = '';
      for (const [id, label] of TABS) tabs.append(h('button', { class: `tab ${tab === id ? 'on' : ''}`, onclick: () => ((tab = id), g.showroom.setZoom(id === 'face' ? 'face' : 'full'), render()) }, label));
      body.innerHTML = '';
      if (tab === 'identity') {
        const name = h('input', { class: 'text', value: look.name, maxlength: 18, oninput: (e) => (look.name = e.target.value) });
        const height = h('input', { type: 'range', min: 1.62, max: 1.98, step: 0.01, value: look.height, oninput: (e) => ((look.height = +e.target.value), g.showroom.showCharacter(look), (hv.textContent = `${Math.floor(look.height * 39.37 / 12)}'${Math.round((look.height * 39.37) % 12)}"`)) });
        const hv = h('span', {}, `${Math.floor(look.height * 39.37 / 12)}'${Math.round((look.height * 39.37) % 12)}"`);
        body.append(
          ...field('Street name', name),
          ...field('Skin tone', swatches('skin', SKIN_TONES)),
          ...field('Build', chips('build', BUILDS)),
          h('div', { class: 'field' }, 'Height', hv), height,
        );
      } else if (tab === 'face') {
        body.append(
          ...field('Hair', chips('hair', HAIR_STYLES)),
          ...field('Hair color', swatches('hairColor', HAIR_COLORS)),
          ...field('Facial hair', chips('facial', FACIAL_HAIR)),
        );
      } else if (tab === 'fits') {
        body.append(
          ...field('Top', chips('top', TOPS)),
          ...field('Top color', swatches('topColor', CLOTH_COLORS)),
          ...field('Accent color', swatches('top2', CLOTH_COLORS)),
          ...field('Bottoms', chips('bottom', BOTTOMS)),
          ...field('Bottoms color', swatches('bottomColor', CLOTH_COLORS)),
          ...field('Kicks', chips('shoes', SHOES)),
          ...field('Kicks color', swatches('shoeColor', CLOTH_COLORS)),
        );
      } else {
        body.append(
          ...field('Headwear', chips('headwear', HEADWEAR)),
          ...field('Headwear color', swatches('headwearColor', CLOTH_COLORS)),
          ...field('Jewelry & extras', h('div', { class: 'toggle-row' }, toggle('chain', 'Gold Chain'), toggle('watch', 'Iced Watch'), toggle('earrings', 'Diamond Studs'), toggle('shades', 'Shades'))),
        );
      }
    };
    render();
    const done = () => {
      this.click();
      look.name = (look.name || '').trim() || 'Lil Boost';
      if (mode === 'new') g.startNewGame(look);
      else g.finishWardrobe(look);
    };
    this.root.append(
      h('div', { class: 'side panel' },
        h('div', { class: 'side-head' }, h('h2', {}, mode === 'new' ? 'Create Your Character' : 'Wardrobe'), h('p', {}, 'Drag the model to spin. Every piece is customizable.')),
        tabs, body,
        h('div', { class: 'side-foot' },
          h('button', { class: 'btn', onclick: () => (this.click(), Object.assign(look, randomCharacter(), { name: look.name }), refresh()) }, 'Randomize'),
          mode !== 'new' ? h('button', { class: 'btn', onclick: () => (this.click(), g.finishWardrobe(null)) }, 'Cancel') : null,
          h('button', { class: 'btn primary', style: { marginLeft: 'auto' }, onclick: done }, mode === 'new' ? 'Hit the Streets' : 'Save Fit'),
        ),
      ),
    );
    g.showroom.active = true;
  }

  // ------------------------------------------------------------------ garage
  garage() {
    this.clear();
    this.current = 'garage';
    const g = this.game;
    g.enterShowroom();
    g.showroom.active = true;
    let tab = g.player.inCar ? 'perf' : 'garage';
    const body = h('div', { class: 'side-body' });
    const tabs = h('div', { class: 'tabs' });
    const info = h('div', { class: 'right-info panel' });
    const foot = h('div', { class: 'side-foot' });

    const car = () => g.player.car;
    const show = () => {
      if (car()) g.showroom.showCar(car().specId, car().up);
      else if (g.garage.length) g.showroom.showCar(g.garage[0].specId, g.garage[0].up);
      else g.showroom.showCharacter(g.player.model.look);
    };

    const buy = (cost, apply, credReq = 1) => {
      if (credReq > g.credLevel) return g.hud.toast(`Requires Street Cred LV ${credReq}`, '#ff2d55');
      if (cost > g.cash) return g.hud.toast('Not enough cash', '#ff2d55');
      g.cash -= cost;
      const v = car();
      const up = { ...v.up };
      const prevColor = v.up.color;
      apply(up);
      v.setUpgrades(up);
      if (v.hot && up.color !== prevColor) {
        v.hot = false;
        g.hud.toast('Fresh paint — VIN swapped, the car is clean');
      }
      if (cost > 0) g.audio.cash();
      else this.click();
      g.save();
      show();
      render();
    };

    const levelChips = (key) => {
      const def = PERF[key];
      const cur = car().up[key] || 0;
      return h('div', { class: 'chips' }, def.levels.map((label, i) => {
        const cost = i > cur ? def.cost.slice(cur + 1, i + 1).reduce((a, b) => a + b, 0) : 0;
        const locked = (def.cred[i] || 1) > g.credLevel;
        return h('button', { class: `chip ${cur === i ? 'on' : ''} ${locked ? 'locked' : ''}`, onclick: () => cur !== i && buy(cost, (u) => (u[key] = i), def.cred[i]) },
          label, cost ? h('span', { class: 'price' }, fmtMoney(cost)) : null, locked ? h('span', { class: 'price', style: { color: '#ff2d55' } }, ` LV${def.cred[i]}`) : null);
      }));
    };
    const pickChips = (key, list, costOf, labelOf = (o) => o.label, idOf = (o) => o.id) => {
      const cur = car().up[key];
      return h('div', { class: 'chips' }, list.map((o, i) => {
        const id = idOf(o, i);
        const cost = id === cur ? 0 : costOf(o, i);
        const credReq = o.cred || 1;
        return h('button', { class: `chip ${cur === id ? 'on' : ''} ${credReq > g.credLevel ? 'locked' : ''}`, onclick: () => cur !== id && buy(cost, (u) => (u[key] = id), credReq) },
          labelOf(o, i), cost ? h('span', { class: 'price' }, fmtMoney(cost)) : null);
      }));
    };
    const field = (label, ...kids) => [h('div', { class: 'field' }, label), ...kids];

    const statBars = () => {
      const v = car();
      if (!v) return h('div');
      const s = CARS[v.specId];
      const bar = (label, val, base) => h('div', {}, label, h('div', { class: 'statbar' }, h('i', { class: val > base + 0.001 ? 'up' : '', style: { width: `${Math.min(100, val * 100)}%` } })));
      return h('div', { class: 'stats' },
        bar('Top speed', v.top / 100, s.top / 100), bar('Acceleration', v.accel / 18, s.accel / 18),
        bar('Handling', v.grip / 11, s.grip / 11), bar('Durability', (1 - v.armor) * 1.4 + 0.15, 0.15));
    };

    const TABS = car()
      ? [['garage', 'Garage'], ['perf', 'Performance'], ['paint', 'Paint'], ['wheels', 'Wheels'], ['style', 'Style']]
      : [['garage', 'Garage']];

    const render = () => {
      const v = car();
      tabs.innerHTML = '';
      for (const [id, label] of TABS) tabs.append(h('button', { class: `tab ${tab === id ? 'on' : ''}`, onclick: () => ((tab = id), this.click(), render()) }, label));
      body.innerHTML = '';
      if (tab === 'garage') {
        const list = h('div', { class: 'carlist' });
        if (v) {
          list.append(h('div', { class: 'caritem on' }, h('div', {}, h('b', {}, `${v.spec.make} ${v.spec.name}`), h('small', {}, `Current ride · ${Math.round(v.health * 100)}% · ${v.hot ? 'HOT' : 'clean'}`)),
            g.garage.length < GARAGE_SLOTS ? h('button', { class: 'btn', onclick: () => (this.click(), g.storeCurrentCar(), show(), render()) }, 'Store') : h('small', { class: 'muted' }, 'Garage full')));
        }
        g.garage.forEach((c, i) => {
          const s = CARS[c.specId];
          list.append(h('div', { class: 'caritem', onmouseenter: () => g.showroom.showCar(c.specId, c.up), onmouseleave: () => show() },
            h('div', {}, h('b', {}, `${s.make} ${s.name}`), h('small', {}, `${fmtMoney(carValue(c.specId, c.up, c.health))} · ${Math.round(c.health * 100)}%${c.hot ? ' · HOT' : ''}`)),
            h('button', { class: 'btn', onclick: () => (this.click(), g.takeOutCar(i), show(), render()) }, v ? 'Swap' : 'Take Out')));
        });
        if (!v && !g.garage.length) list.append(h('div', { class: 'muted', style: { padding: '10px 0' } }, 'No cars stored yet. Steal something nice and bring it here to keep it, upgrade it and make it yours.'));
        body.append(...field(`Your cars (${g.garage.length}/${GARAGE_SLOTS})`, list));
        if (!v) body.append(...field('Wardrobe', h('button', { class: 'btn', onclick: () => (this.click(), this.creator('edit')) }, 'Change your fit')));
        if (v) {
          const rc = repairCost(v);
          body.append(...field('Body shop',
            h('div', { class: 'toggle-row' },
              h('button', { class: 'btn', disabled: v.health >= 0.999, onclick: () => rc <= g.cash && ((g.cash -= rc), (v.health = 1), g.audio.cash(), g.save(), render()) }, `Repair ${fmtMoney(rc)}`),
              h('button', { class: 'btn', disabled: !v.hot, onclick: () => {
                if (RESPRAY_COST > g.cash) return g.hud.toast('Not enough cash', '#ff2d55');
                g.cash -= RESPRAY_COST;
                v.hot = false;
                v.setUpgrades({ ...v.up, plate: randomPlate() });
                g.audio.cash();
                g.hud.toast('New plates & VIN — the car is clean');
                g.save();
                show();
                render();
              } }, `Swap VIN & plates ${fmtMoney(RESPRAY_COST)}`),
            )));
        }
      } else if (tab === 'perf') {
        for (const k of Object.keys(PERF)) body.append(...field(PERF[k].label, levelChips(k)));
      } else if (tab === 'paint') {
        const cur = v.up.color;
        body.append(...field('Paint color', h('div', { class: 'swatches' }, PAINTS.map(([name, hex]) =>
          h('button', { class: `sw ${cur.toLowerCase() === hex.toLowerCase() ? 'on' : ''}`, title: `${name} — ${fmtMoney(500)}`, style: { background: hex }, onclick: () => cur !== hex && buy(500, (u) => (u.color = hex)) })))));
        body.append(h('div', { class: 'muted', style: { fontSize: '12px', marginTop: '6px' } }, 'Any respray swaps the VIN — a hot car comes out clean. $500 per color.'));
        body.append(...field('Finish', pickChips('finish', FINISHES, (o) => o.cost)));
      } else if (tab === 'wheels') {
        body.append(...field('Rims', pickChips('rims', RIMS, (o) => o.cost)));
        body.append(...field('Rim color', pickChips('rimColor', RIM_COLORS, () => 400, (o) => o[0], (o) => o[1])));
        body.append(...field('Rim size', pickChips('rimSize', RIM_SIZES, (o) => o.cost, (o) => o.label, (o, i) => i)));
      } else if (tab === 'style') {
        body.append(...field('Window tint', pickChips('tint', TINTS, (o) => o.cost, (o) => o.label, (o, i) => i)));
        body.append(...field('Underglow', pickChips('underglow', UNDERGLOW, (o) => (o[1] ? 1500 : 0), (o) => o[0], (o) => o[1])));
        body.append(...field('Spoiler', pickChips('spoiler', SPOILERS, (o) => o.cost)));
        body.append(...field('Hood', pickChips('hood', HOODS, (o) => o.cost)));
        const plate = h('input', { class: 'text', value: v.up.plate, maxlength: 8, style: { textTransform: 'uppercase' } });
        body.append(...field('Vanity plate', h('div', { class: 'toggle-row' }, plate, h('button', { class: 'btn', onclick: () => buy(250, (u) => (u.plate = plate.value.toUpperCase().slice(0, 8) || u.plate)) }, 'Set $250'))));
      }
      // right panel
      info.innerHTML = '';
      if (v) {
        const s = v.spec;
        info.append(
          h('div', { class: 'h-display', style: { fontSize: '28px' } }, `${s.make} ${s.name}`),
          h('div', { class: 'muted', style: { fontSize: '13px' } }, `${v.hot ? '🔥 HOT — respray or swap VIN before exporting' : '✔ Clean title'}`),
          h('div', { class: 'row', style: { display: 'flex', justifyContent: 'space-between', marginTop: '12px' } }, h('span', { class: 'muted' }, 'Street value'), h('b', { class: 'money' }, fmtMoney(carValue(v.specId, v.up, v.health)))),
          h('div', { class: 'row', style: { display: 'flex', justifyContent: 'space-between' } }, h('span', { class: 'muted' }, 'Your cash'), h('b', {}, fmtMoney(g.cash))),
          statBars(),
        );
      } else info.append(h('div', { class: 'h-display', style: { fontSize: '26px' } }, 'The Spot'), h('div', { class: 'muted' }, `Cash ${fmtMoney(g.cash)}`));
      foot.innerHTML = '';
      foot.append(h('button', { class: 'btn primary', style: { marginLeft: 'auto' }, onclick: () => (this.click(), g.leaveGarage()) }, car() ? 'Drive Out' : 'Leave'));
    };
    show();
    render();
    this.root.append(
      h('div', { class: 'side panel' }, h('div', { class: 'side-head' }, h('h2', {}, 'The Spot'), h('p', {}, 'Your garage. Store, upgrade and make it yours.')), tabs, body, foot),
      info,
    );
  }

  // ------------------------------------------------------------------ dialogs
  dialog(...kids) {
    this.clear();
    const d = h('div', { class: 'dialog panel' }, ...kids);
    this.root.append(h('div', { class: 'overlay' }, d));
    return d;
  }

  chop(v) {
    this.current = 'chop';
    const g = this.game;
    const price = chopPrice(v);
    const s = v.spec;
    this.dialog(
      h('h2', {}, 'EZ Auto Parts'),
      h('div', { class: 'muted' }, '"No questions asked. We strip it for parts in 10 minutes."'),
      h('div', { class: 'row', style: { marginTop: '14px' } }, h('span', {}, 'Vehicle'), h('b', {}, `${s.make} ${s.name}`)),
      h('div', { class: 'row' }, h('span', {}, 'Condition'), h('b', {}, `${Math.round(v.health * 100)}%`)),
      h('div', { class: 'row' }, h('span', {}, 'Full value (for reference)'), h('b', {}, fmtMoney(carValue(v.specId, v.up, v.health)))),
      h('div', { class: 'row' }, h('span', {}, 'Parts payout'), h('b', { class: 'money' }, fmtMoney(price))),
      v.owned ? h('div', { style: { color: '#ff2d55', marginTop: '10px', fontWeight: 700 } }, 'This is one of YOUR cars. Chopping it is permanent.') : null,
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', onclick: () => (this.click(), g.chopCar(v, price)) }, `Chop it — ${fmtMoney(price)}`),
        h('button', { class: 'btn', onclick: () => (this.click(), g.closeMenu()) }, 'Leave'),
      ),
    );
  }

  export(v) {
    this.current = 'export';
    const g = this.game;
    const s = v.spec;
    const base = exportPrice(v);
    const match = g.contracts.bestMatch(v);
    const list = h('div');
    for (const c of g.contracts.list) {
      const miss = g.contracts.missing(c, v);
      const ok = !miss.length;
      list.append(h('div', { class: `contract ${ok ? 'match' : ''}` },
        h('span', { class: 'reward' }, fmtMoney(c.reward)),
        h('b', {}, `${c.buyer} wants:`),
        h('ul', {}, g.contracts.describe(c).map((t) => h('li', {}, t))),
        miss.length && miss[0] !== 'wrong model' ? h('div', { style: { color: '#ffc94a', fontSize: '12px', marginTop: '4px' } }, `Missing: ${miss.join(', ')}`) : null,
      ));
    }
    const pay = match ? Math.max(match.reward, base) : base;
    this.dialog(
      h('h2', {}, 'Port Exports'),
      h('div', { class: 'muted' }, 'Ships out overseas tonight. Clean cars pay full price.'),
      h('div', { class: 'row', style: { marginTop: '14px' } }, h('span', {}, 'Vehicle'), h('b', {}, `${s.make} ${s.name}`)),
      h('div', { class: 'row' }, h('span', {}, 'Title'), h('b', { style: { color: v.hot ? '#ff2d55' : '#3dff8b' } }, v.hot ? 'HOT (-35%)' : 'CLEAN')),
      h('div', { class: 'row' }, h('span', {}, 'Exporter offer'), h('b', { class: 'money' }, fmtMoney(base))),
      h('div', { class: 'field' }, 'Boost list'), list,
      v.owned ? h('div', { style: { color: '#ffc94a', marginTop: '10px', fontWeight: 700 } }, 'Selling one of your own cars.') : null,
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', onclick: () => (this.click(), g.exportCar(v, pay, match)) }, match ? `Sell to ${match.buyer} — ${fmtMoney(pay)}` : `Sell — ${fmtMoney(pay)}`),
        h('button', { class: 'btn', onclick: () => (this.click(), g.closeMenu()) }, 'Leave'),
      ),
    );
  }

  spray(v) {
    this.current = 'spray';
    const g = this.game;
    const cost = RESPRAY_COST + repairCost(v);
    const seen = g.wanted.level > 0 && g.wanted.seen;
    this.dialog(
      h('h2', {}, 'Fresh Coat'),
      h('div', { class: 'muted' }, 'Respray, new plates, dents knocked out. Cops lose your description.'),
      h('div', { class: 'row', style: { marginTop: '14px' } }, h('span', {}, 'Respray + new VIN'), h('b', {}, fmtMoney(RESPRAY_COST))),
      h('div', { class: 'row' }, h('span', {}, 'Repairs'), h('b', {}, fmtMoney(repairCost(v)))),
      seen ? h('div', { style: { color: '#ff2d55', marginTop: '10px', fontWeight: 700 } }, 'The cops are watching — they saw you pull in. Lose them first.') : null,
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', disabled: seen || cost > g.cash, onclick: () => (this.click(), g.sprayCar(v, cost)) }, `Do it — ${fmtMoney(cost)}`),
        h('button', { class: 'btn', onclick: () => (this.click(), g.closeMenu()) }, 'Leave'),
      ),
    );
  }

  busted(fine, lostCar) {
    this.current = 'busted';
    const g = this.game;
    this.dialog(
      h('h2', { style: { color: '#ff2d55', fontSize: '64px' } }, 'Busted'),
      h('div', { class: 'muted' }, 'Spent the night downtown. Your folks bailed you out.'),
      h('div', { class: 'row', style: { marginTop: '14px' } }, h('span', {}, 'Bail'), h('b', { style: { color: '#ff2d55' } }, `-${fmtMoney(fine)}`)),
      lostCar ? h('div', { class: 'row' }, h('span', {}, 'Impounded'), h('b', {}, lostCar)) : null,
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => (this.click(), g.closeMenu()) }, 'Back to the block')),
    );
  }

  // ------------------------------------------------------------------ pause & settings
  pause() {
    this.current = 'pause';
    const g = this.game;
    const lvl = g.credLevel;
    const next = credForLevel(lvl + 1);
    this.dialog(
      h('h2', {}, 'Paused'),
      h('div', { class: 'row' }, h('span', {}, g.player.model.look.name), h('b', { class: 'money' }, fmtMoney(g.cash))),
      h('div', { class: 'row' }, h('span', {}, `Street Cred LV ${lvl}`), h('b', {}, `${g.xp} / ${next} XP`)),
      h('div', { class: 'row' }, h('span', {}, 'Cars stolen · chopped · exported'), h('b', {}, `${g.stats.stolen} · ${g.stats.chopped} · ${g.stats.exported}`)),
      h('div', { class: 'row' }, h('span', {}, 'Contracts completed'), h('b', {}, `${g.stats.contracts}`)),
      h('div', { class: 'menu-grid', style: { marginTop: '16px' } },
        h('button', { class: 'btn primary', onclick: () => (this.click(), g.closeMenu()) }, 'Resume'),
        h('button', { class: 'btn', onclick: () => (this.click(), this.boostList()) }, 'Boost List'),
        h('button', { class: 'btn', onclick: () => (this.click(), this.map(() => this.pause())) }, 'Map'),
        h('button', { class: 'btn', onclick: () => (this.click(), this.settings(() => this.pause())) }, 'Settings'),
        h('button', { class: 'btn', onclick: () => (this.click(), this.controls(() => this.pause())) }, 'How To Play'),
        h('button', { class: 'btn', onclick: () => (this.click(), g.save(), g.hud.toast('Game saved')) }, 'Save'),
        h('button', { class: 'btn danger', onclick: () => (this.click(), g.save(), g.quitToTitle()) }, 'Save & Quit'),
      ),
    );
  }

  boostList() {
    const g = this.game;
    const list = h('div');
    for (const c of g.contracts.list) {
      list.append(h('div', { class: 'contract' }, h('span', { class: 'reward' }, fmtMoney(c.reward)), h('b', {}, `${c.buyer} wants:`), h('ul', {}, g.contracts.describe(c).map((t) => h('li', {}, t)))));
    }
    this.dialog(
      h('h2', {}, 'Boost List'),
      h('div', { class: 'muted' }, 'Deliver matching cars to Port Exports ($ on the map). Gold dots on the minimap are target models. Upgrade or respray at The Spot to meet the specs.'),
      list,
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => (this.click(), this.pause()) }, 'Back')),
    );
  }

  settings(back) {
    const g = this.game;
    const s = g.settings;
    const apply = () => (g.applySettings(), this.settings(back));
    const chip = (key, val, label) => h('button', { class: `chip ${s[key] === val ? 'on' : ''}`, onclick: () => ((s[key] = val), this.click(), apply()) }, label);
    const slider = (key, min, max, step) => h('input', { type: 'range', min, max, step, value: s[key], onchange: (e) => ((s[key] = +e.target.value), g.applySettings()) });
    this.dialog(
      h('h2', {}, 'Settings'),
      h('div', { class: 'field' }, 'Graphics quality'),
      h('div', { class: 'chips' }, chip('quality', 'low', 'Low'), chip('quality', 'medium', 'Medium'), chip('quality', 'high', 'High'), chip('quality', 'ultra', 'Ultra')),
      h('div', { class: 'field' }, 'Time of day'),
      h('div', { class: 'chips' }, chip('timeMode', 'cycle', 'Day/Night Cycle'), chip('timeMode', 'day', 'Day'), chip('timeMode', 'dusk', 'Sunset'), chip('timeMode', 'night', 'Night')),
      h('div', { class: 'field' }, 'Master volume'), slider('volume', 0, 1, 0.05),
      h('div', { class: 'field' }, 'Radio volume'), slider('music', 0, 1, 0.05),
      h('div', { class: 'field' }, 'Mouse sensitivity'), slider('sensitivity', 0.3, 2.5, 0.05),
      h('div', { class: 'field' }, 'Options'),
      h('div', { class: 'chips' },
        h('button', { class: `chip ${s.invertY ? 'on' : ''}`, onclick: () => ((s.invertY = !s.invertY), apply()) }, 'Invert Y'),
        h('button', { class: `chip ${s.showHints ? 'on' : ''}`, onclick: () => ((s.showHints = !s.showHints), apply()) }, 'Control hints'),
      ),
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => (this.click(), back()) }, 'Done')),
    );
  }

  controls(back) {
    const row = (a, b) => h('div', { class: 'row' }, h('span', {}, a), h('b', {}, b));
    this.dialog(
      h('h2', {}, 'How To Play'),
      h('div', { class: 'muted', style: { marginBottom: '10px' } }, 'Steal cars, lose the cops, then chop them for quick cash, export them for full value, or keep them at The Spot and build them up.'),
      row('Move / Drive', 'W A S D'), row('Look', 'Mouse (click to capture)'), row('Sprint / Nitrous', 'Shift'), row('Jump / Handbrake', 'Space'),
      row('Break in · Carjack · Enter · Exit', 'E (hold to break in)'), row('Horn', 'H'), row('Radio on/off', 'R'), row('Map', 'M'), row('Pause', 'Esc'),
      row('Gamepad', 'RT/LT drive · A handbrake · B nitrous · Y enter/exit'),
      h('div', { class: 'field' }, 'Making money'),
      row('C · EZ Auto Parts', 'Chop any car, any condition — about half value'),
      row('$ · Port Exports', 'Full value for clean cars · boost list pays extra'),
      row('S · Fresh Coat', 'Respray + repair, clears your stars if no cop sees you'),
      row('G · The Spot', 'Store up to 5 cars, upgrade, respray, wardrobe'),
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => (this.click(), back()) }, 'Got it')),
    );
  }

  map(back) {
    this.current = 'map';
    const g = this.game;
    const cv = h('canvas', { width: 900, height: 900 });
    const legend = h('div', { class: 'legend' },
      ...g.city.locations.map((l) => h('span', {}, h('i', { style: { background: l.color } }), l.name)),
      h('span', {}, h('i', { style: { background: '#ffc94a' } }), 'Boost list targets'),
      h('span', {}, h('i', { style: { background: '#ff2d55' } }), 'Police'),
    );
    this.clear();
    this.current = 'map';
    const wrap = h('div', { class: 'bigmap panel' }, cv, legend);
    this.root.append(h('div', { class: 'overlay', onclick: (e) => e.target === e.currentTarget && back() }, wrap));
    g.hud.drawBigMap(cv);
  }
}
