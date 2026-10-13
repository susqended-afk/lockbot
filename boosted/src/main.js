// BOOSTED — game bootstrap and main loop.
import * as THREE from 'three';
import { Renderer, QUALITY } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { Audio } from './engine/audio.js';
import { CameraRig } from './engine/camera.js';
import { Sky } from './world/sky.js';
import { City } from './world/city.js';
import { Player } from './entities/player.js';
import { VehicleManager } from './entities/traffic.js';
import { PedManager } from './entities/peds.js';
import { Particles, SkidMarks } from './fx/particles.js';
import { Wanted, Contracts, Save } from './game/systems.js';
import { HUD, h } from './ui/hud.js';
import { Menus } from './ui/menus.js';
import { Showroom } from './showroom.js';
import { defaultCharacter, defaultUpgrades, randomPlate, credLevel, CARS } from './config.js';
import { fmtMoney, clamp } from './util.js';
import * as T from './engine/textures.js';

const DEFAULT_SETTINGS = { quality: 'high', timeMode: 'cycle', volume: 0.8, music: 0.5, sensitivity: 1, invertY: false, showHints: true };
const STEP = 1 / 60;

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.uiRoot = document.getElementById('ui');
    this.r = new Renderer(this.canvas);
    this.input = new Input(this.canvas);
    this.audio = new Audio();
    this.settings = { ...DEFAULT_SETTINGS, ...(Save.loadSettings() || {}) };
    this.saveData = Save.load();

    this.scene = new THREE.Scene();
    this.sky = new Sky(this.scene, this.r.renderer);
    this.city = new City(this.scene);
    this.cam = new CameraRig(this);
    this.showroom = new Showroom(this.r.renderer, this.canvas);
    this.fx = new Particles(this.scene);
    this.skids = new SkidMarks(this.scene);

    this.time = 0;
    this.cash = 0;
    this.xp = 0;
    this.stats = { stolen: 0, chopped: 0, exported: 0, contracts: 0 };
    this.garage = [];
    this.tutorial = 0;

    this.hud = new HUD(this, this.uiRoot);
    this.wanted = new Wanted(this);
    this.player = new Player(this, this.saveData?.character || defaultCharacter());
    this.player.model.root.visible = false;
    this.vehicles = new VehicleManager(this);
    this.peds = new PedManager(this);
    this.contracts = new Contracts(this, this.saveData?.contracts);
    this.menus = new Menus(this, this.uiRoot);
    this.buildMarkers();

    this.state = 'title';
    this.view = 'city';
    this.acc = 0;
    this.titleCenter = new THREE.Vector3(39, 0, -39);
    this.applySettings(true);

    // pause when pointer lock drops mid-game (Esc) or the window loses focus
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.state === 'play' && this.input.hadLock) this.openPause();
      this.input.hadLock = !!document.pointerLockElement;
    });
    addEventListener('blur', () => this.state === 'play' && this.openPause());
    // audio needs a user gesture
    const unlock = () => this.audio.init();
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);

    this.menus.title();
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
    setTimeout(() => document.getElementById('boot')?.classList.add('gone'), 150);
  }

  get credLevel() {
    return credLevel(this.xp);
  }

  // ------------------------------------------------------------------ settings & save
  applySettings(first = false) {
    const s = this.settings;
    this.r.setQuality(s.quality);
    const q = QUALITY[s.quality];
    this.sky.setShadowQuality(q.shadows, q.shadowSize);
    this.scene.fog.far = q.viewDist;
    this.scene.fog.near = q.viewDist * 0.25;
    this.cam.camera.far = q.viewDist + 1200;
    this.cam.camera.updateProjectionMatrix();
    if (first || this.sky.mode !== s.timeMode) this.sky.setMode(s.timeMode);
    if (first && s.timeMode === 'cycle') this.sky.hour = 18.4;
    this.audio.setVolumes(s.volume, s.music);
    this.input.sensitivity = s.sensitivity;
    this.input.invertY = s.invertY;
    this.peds.max = { low: 5, medium: 8, high: 10, ultra: 14 }[s.quality];
    this.vehicles.trafficTarget = { low: 12, medium: 17, high: 22, ultra: 28 }[s.quality];
    Save.writeSettings(s);
  }

  save() {
    const p = this.player;
    const data = {
      v: 1,
      character: p.model.look,
      cash: this.cash,
      xp: this.xp,
      stats: this.stats,
      garage: this.garage,
      contracts: this.contracts.list,
      tutorial: this.tutorial,
      hour: this.sky.hour,
    };
    // the car you're driving comes with you if it's yours
    if (p.inCar && p.car.owned) data.garage = [...this.garage, { specId: p.car.specId, up: p.car.up, health: p.car.health, hot: p.car.hot }];
    Save.write(data);
    this.saveData = data;
  }

  // ------------------------------------------------------------------ flow
  startNewGame(look) {
    this.cash = 2500;
    this.xp = 0;
    this.stats = { stolen: 0, chopped: 0, exported: 0, contracts: 0 };
    this.garage = [];
    this.tutorial = 0;
    this.contracts = new Contracts(this, []);
    this.player.setLook(look);
    this.spawnPlayerAtHome();
    this.save();
    this.enterPlay();
    this.hud.showBanner('SAN BRAVO', `Welcome to the block, ${look.name}`, '#fff', 3.2);
  }

  continueGame() {
    const d = this.saveData;
    this.cash = d.cash ?? 2500;
    this.xp = d.xp ?? 0;
    this.stats = { stolen: 0, chopped: 0, exported: 0, contracts: 0, ...(d.stats || {}) };
    this.garage = d.garage || [];
    this.tutorial = d.tutorial ?? 3;
    this.contracts = new Contracts(this, d.contracts);
    if (d.hour != null && this.settings.timeMode === 'cycle') this.sky.hour = d.hour;
    this.player.setLook(d.character || defaultCharacter());
    this.spawnPlayerAtHome();
    this.enterPlay();
    this.hud.showBanner('WELCOME BACK', d.character?.name || '', '#fff', 2.4);
  }

  spawnPlayerAtHome() {
    const p = this.player;
    if (p.inCar) p.detachFromCar(0, 0, 0);
    const sp = this.city.spawn;
    p.pos.set(sp.x, 0.15, sp.z);
    p.yaw = sp.yaw;
    p.focus.copy(p.pos);
    p.model.root.visible = true;
    p.model.root.position.copy(p.pos);
    this.cam.snapBehind(p.yaw);
    this.cam.target.set(p.pos.x, p.pos.y + 1.5, p.pos.z);
    this.wanted.clear();
    for (const l of this.city.locations) l.armed = false; // don't auto-open a menu on spawn
  }

  enterPlay() {
    this.menus.clear();
    this.state = 'play';
    this.view = 'city';
    this.hud.show(true);
    this.input.wantLock = true;
    this.input.endFrame();
  }

  openPause() {
    if (this.state !== 'play') return;
    this.state = 'menu';
    this.input.releaseLock();
    this.menus.pause();
  }

  closeMenu() {
    this.menus.clear();
    this.view = 'city';
    if (this.state === 'menu' || this.state === 'garage') this.enterPlay();
  }

  quitToTitle() {
    const p = this.player;
    if (p.inCar) {
      const v = p.car;
      p.detachFromCar(v.pos.x, v.pos.z, 0);
      this.vehicles.remove(v);
    }
    p.model.root.visible = false;
    this.wanted.clear();
    this.state = 'title';
    this.view = 'city';
    this.hud.show(false);
    this.input.wantLock = false;
    this.input.releaseLock();
    this.menus.title();
  }

  enterShowroom() {
    this.view = 'showroom';
    this.hud.show(false);
    this.input.wantLock = false;
    this.input.releaseLock();
  }

  finishWardrobe(look) {
    if (look) {
      if (this.state === 'title') return;
      this.player.setLook(look);
      this.save();
      this.hud.toast('Fresh fit saved');
    }
    this.state = 'garage';
    this.menus.garage();
  }

  // ------------------------------------------------------------------ locations
  buildMarkers() {
    this.markers = [];
    for (const loc of this.city.locations) {
      const g = new THREE.Group();
      g.position.set(loc.x, 0.2, loc.z);
      const col = new THREE.Color(loc.color);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(loc.r, 0.12, 8, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 }));
      const disc = new THREE.Mesh(new THREE.CircleGeometry(loc.r, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12, depthWrite: false }));
      const beamTex = T.radial();
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(loc.r * 0.9, loc.r, 14, 32, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, alphaMap: beamTex }));
      beam.position.y = 7;
      // floating label
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 128;
      const x = c.getContext('2d');
      x.font = 'bold 54px Impact, "Arial Black", sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.lineWidth = 8;
      x.strokeStyle = 'rgba(0,0,0,0.8)';
      x.strokeText(loc.name.split(' (')[0].toUpperCase(), 256, 64);
      x.fillStyle = loc.color;
      x.fillText(loc.name.split(' (')[0].toUpperCase(), 256, 64);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
      label.scale.set(10, 2.5, 1);
      label.position.y = 9;
      g.add(ring, disc, beam, label);
      if (loc.passive) {
        ring.visible = disc.visible = beam.visible = false;
      }
      this.scene.add(g);
      this.markers.push({ loc, g, ring, beam });
      loc.armed = true;
    }
  }

  updateLocations(dt) {
    const p = this.player;
    for (const m of this.markers) {
      m.ring.rotation.y += dt * 0.6;
      m.beam.material.opacity = 0.1 + Math.sin(this.time * 3) * 0.03;
      const loc = m.loc;
      if (loc.passive) continue;
      const d = Math.hypot(p.focus.x - loc.x, p.focus.z - loc.z);
      if (d > loc.r + 2) {
        loc.armed = true;
        continue;
      }
      if (!loc.armed || d > loc.r) continue;
      const slow = p.inCar ? p.car.speed < 3 : true;
      if (!slow) continue;
      loc.armed = false;
      this.triggerLocation(loc);
    }
  }

  triggerLocation(loc) {
    const p = this.player;
    const hot = this.wanted.level > 0;
    if (hot && loc.type !== 'spray') {
      this.hud.toast('Lose the cops first!', '#ff2d55');
      return;
    }
    if (!p.inCar && loc.type !== 'garage') {
      this.hud.toast({ chop: 'Bring a car here to chop it', export: 'Bring a car here to sell it', spray: 'Bring a car here to respray it' }[loc.type], '#ffc94a');
      return;
    }
    if (p.inCar && p.car.health <= 0 && loc.type === 'export') {
      this.hud.toast('Exporters don\'t buy wrecks — try the chop shop', '#ff2d55');
      return;
    }
    this.input.releaseLock();
    if (loc.type === 'garage') {
      this.state = 'garage';
      this.menus.garage();
      return;
    }
    this.state = 'menu';
    if (loc.type === 'chop') this.menus.chop(p.car);
    if (loc.type === 'export') this.menus.export(p.car);
    if (loc.type === 'spray') this.menus.spray(p.car);
  }

  locByType(type) {
    return this.city.locations.find((l) => l.type === type);
  }

  // ------------------------------------------------------------------ economy actions
  chopCar(v, price) {
    const loc = this.locByType('chop');
    this.player.detachFromCar(loc.x - 3, loc.z + 2, loc.exitYaw);
    this.vehicles.remove(v);
    this.cash += price;
    this.stats.chopped++;
    this.addXP(100);
    this.audio.wrench();
    setTimeout(() => this.audio.cash(), 800);
    if (this.tutorial === 1) this.tutorial = 2;
    this.closeMenu();
    this.hud.showBanner('CHOPPED', `+${fmtMoney(price)}`, '#3dff8b');
    this.save();
  }

  exportCar(v, pay, contract) {
    const loc = this.locByType('export');
    this.player.detachFromCar(loc.x - 3, loc.z + 2, loc.exitYaw);
    this.vehicles.remove(v);
    this.cash += pay;
    this.stats.exported++;
    if (contract) {
      this.contracts.complete(contract);
      this.stats.contracts++;
      this.addXP(450);
    } else this.addXP(160);
    this.audio.cash();
    if (this.tutorial >= 1) this.tutorial = 3;
    this.closeMenu();
    this.hud.showBanner(contract ? 'CONTRACT DONE' : 'SHIPPED', `+${fmtMoney(pay)}`, '#3dff8b');
    this.save();
  }

  sprayCar(v, cost) {
    this.cash -= cost;
    v.health = 1;
    v.hot = false;
    v.setUpgrades({ ...v.up, plate: randomPlate() });
    const hadHeat = this.wanted.level > 0;
    this.wanted.clear();
    this.audio.cash();
    this.closeMenu();
    this.hud.showBanner('FRESH COAT', hadHeat ? 'Heat cleared — new plates, new VIN' : 'New plates, new VIN', '#ff55c8');
    this.save();
  }

  storeCurrentCar() {
    const p = this.player;
    const v = p.car;
    if (!v) return;
    this.garage.push({ specId: v.specId, up: { ...v.up }, health: v.health, hot: v.hot });
    const loc = this.locByType('garage');
    p.detachFromCar(loc.x, loc.z + 2, loc.exitYaw);
    this.vehicles.remove(v);
    if (this.tutorial === 1) this.tutorial = 2;
    this.addXP(50);
    this.hud.toast('Stored at The Spot');
    this.save();
  }

  takeOutCar(i) {
    const p = this.player;
    const loc = this.locByType('garage');
    const entry = this.garage.splice(i, 1)[0];
    if (p.inCar) {
      const old = p.car;
      this.garage.splice(i, 0, { specId: old.specId, up: { ...old.up }, health: old.health, hot: old.hot });
      p.detachFromCar(loc.x, loc.z, loc.exitYaw);
      this.vehicles.remove(old);
    }
    const v = this.vehicles.add(entry.specId, { x: loc.x, z: loc.z, yaw: loc.exitYaw, role: 'abandoned', health: entry.health }, entry.up);
    v.owned = true;
    v.stolen = true;
    v.hot = entry.hot;
    v.locked = false;
    v.pos.y = 0.15;
    p.enterCar(v, 'enter');
    this.save();
  }

  leaveGarage() {
    const p = this.player;
    const loc = this.locByType('garage');
    if (p.inCar) {
      const v = p.car;
      v.pos.set(loc.x, 0.15, loc.z);
      v.yaw = loc.exitYaw;
      v.vel.set(0, 0);
      v.angVel = 0;
      v.sync();
      this.cam.snapBehind(v.yaw);
    } else {
      p.pos.set(loc.x, 0.15, loc.z + 1);
      p.yaw = loc.exitYaw;
      this.cam.snapBehind(p.yaw);
    }
    loc.armed = false;
    this.enterPlay();
  }

  busted() {
    const p = this.player;
    const fine = Math.min(this.cash, Math.max(500, Math.round(this.cash * 0.1)));
    this.cash -= fine;
    let lost = null;
    if (p.inCar) {
      const v = p.car;
      lost = `${v.spec.make} ${v.spec.name}${v.owned ? ' (yours — gone)' : ''}`;
      p.detachFromCar(v.pos.x, v.pos.z, 0);
      this.vehicles.remove(v);
    }
    const station = this.locByType('police');
    p.pos.set(station.x, 0.15, station.z + 4);
    p.yaw = 0;
    p.focus.copy(p.pos);
    this.cam.snapBehind(0);
    this.wanted.clear();
    for (const c of this.vehicles.cops) {
      c.pursuit = false;
      c.siren = false;
    }
    this.state = 'menu';
    this.input.releaseLock();
    this.hud.showBanner('BUSTED', '', '#ff2d55', 2);
    this.menus.busted(fine, lost);
    this.save();
  }

  addXP(n) {
    const before = this.credLevel;
    this.xp += n;
    if (this.credLevel > before) {
      this.hud.toast(`Street Cred LV ${this.credLevel} — new upgrades unlocked`, '#ffc94a');
      this.audio.cash();
    }
  }

  // ------------------------------------------------------------------ event hooks
  onBreakIn(v) {
    if (v.spec.police) {
      v.alarm = 6;
      this.audio.alarm(3);
      this.wanted.add(3, 'Stole a police cruiser!');
      return;
    }
    if (Math.random() < 0.35) {
      v.alarm = 5;
      this.audio.alarm(3);
      this.peds.scare(v.pos.x, v.pos.z);
      const copNear = this.vehicles.cops.some((c) => c.pos.distanceTo(v.pos) < 90);
      if (copNear || Math.random() < 0.5) this.wanted.add(1, 'Car alarm — someone called it in');
      else this.hud.toast('Alarm! Get out of here', '#ffc94a');
    }
  }

  onCarjack(v) {
    const [x, z] = v.doorPos();
    this.peds.spawnFleeing(x, z, v.pos);
    this.peds.scare(v.pos.x, v.pos.z);
    v.route = null;
    this.wanted.add(v.spec.police ? 3 : 1, v.spec.police ? 'Jacked a cop!' : 'Carjacking');
    this.addXP(10);
  }

  onSteal(v) {
    if (this.tutorial === 0) this.tutorial = 1;
    if (v.specId === 'hellhound' || v.specId === 'raiden' || v.specId === 'trackhound') this.hud.toast(`Big score: ${v.spec.make} ${v.spec.name}`, '#ffc94a');
  }

  onVehicleImpact(v, speed) {
    if (v === this.player.car) {
      this.audio.impact(Math.min(1.5, speed / 20));
      this.cam.shake = Math.min(0.5, speed / 40);
      const [fx, fz] = v.forward;
      this.fx.sparkBurst(v.pos.x + fx * v.L * 0.5, 0.6, v.pos.z + fz * v.L * 0.5, Math.min(30, Math.round(speed)), 1);
    }
  }

  onCarCrash(A, B, speed) {
    const pc = this.player.car;
    if (!pc || (A !== pc && B !== pc)) return;
    const other = A === pc ? B : A;
    this.onVehicleImpact(pc, speed);
    if (other.role === 'police' && speed > 5 && this.time - (this.lastRam || 0) > 4) {
      this.lastRam = this.time;
      if (this.wanted.level < 5) this.wanted.add(this.wanted.level === 0 ? 2 : 1, 'Rammed a cop car');
    } else if (other.role === 'traffic') other.panic = 6;
    else if (other.role === 'parked' && speed > 8 && !other.alarm && Math.random() < 0.5) {
      other.alarm = 4;
      this.audio.alarm(2);
    }
  }

  onPedHit(ped, v) {
    if (v !== this.player.car) return;
    const witness = this.vehicles.cops.some((c) => c.pos.distanceTo(v.pos) < 70);
    if (witness || Math.random() < 0.35) this.wanted.add(1, 'Hit-and-run');
  }

  onPlayerHit() {
    this.audio.impact(0.6);
  }

  onOwnedCarLost(v) {
    this.garage.push({ specId: v.specId, up: { ...v.up }, health: v.health, hot: v.hot });
    this.hud.toast(`Your ${v.spec.name} was towed back to The Spot`, '#33d6ff');
    this.save();
  }

  // ------------------------------------------------------------------ objective text
  get objective() {
    if (this.wanted.level > 0) return '🚨 Lose the cops — break line of sight, or hit Fresh Coat (S) for a respray';
    const p = this.player;
    if (this.tutorial === 0) return p.inCar ? 'Drive it somewhere' : 'Find a parked car and HOLD E to break in';
    if (this.tutorial === 1) return p.inCar ? 'Take it to EZ Auto Parts (C) to chop it, or The Spot (G) to keep it' : 'Steal another ride';
    if (this.tutorial === 2) return 'Check the Boost List (Esc) — buyers at Port Exports ($) pay big for specific builds';
    return '';
  }

  // ------------------------------------------------------------------ loop
  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.input.poll();
    try {
      this.update(dt);
    } catch (e) {
      console.error(e);
    }
    this.input.endFrame();
  }

  update(dt) {
    const input = this.input;
    if (input.hit('KeyR') && this.state !== 'creator') {
      const on = this.audio.toggleRadio();
      if (this.state === 'play') this.hud.toast(on ? '📻 Radio on — BOOST FM' : 'Radio off', '#33d6ff');
    }

    if (this.view === 'showroom') {
      this.time += dt;
      this.showroom.update(dt, this.time);
      this.r.bloomStrength = 0.45;
      this.r.render(this.showroom.scene, this.showroom.camera);
      this.showroom.camera.aspect = innerWidth / innerHeight;
      this.showroom.camera.updateProjectionMatrix();
      return;
    }

    const simulate = this.state === 'play' || this.state === 'title';
    if (this.state === 'play') {
      if (input.hit('Escape') || input.hit('KeyP')) this.openPause();
      else if (input.hit('KeyM')) {
        this.state = 'menu';
        input.releaseLock();
        this.menus.map(() => this.closeMenu());
      }
    } else if (this.state === 'menu' && (input.hit('Escape') || input.hit('KeyM')) && ['pause', 'map'].includes(this.menus.current)) {
      this.closeMenu();
    }

    if (simulate) {
      this.time += dt;
      if (this.state === 'play') this.player.update(dt, input);
      else this.player.focus.copy(this.titleCenter);
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 5) {
        this.vehicles.step(STEP);
        this.acc -= STEP;
        n++;
      }
      if (n === 5) this.acc = 0;
      this.vehicles.update(dt);
      this.peds.update(dt);
      if (this.state === 'play') {
        this.wanted.update(dt);
        this.updateLocations(dt);
      }
      this.sky.update(dt, this.player.focus);
    }

    const night = this.sky.night;
    this.city.setNight(night);
    const lights = clamp((night - 0.25) / 0.4, 0, 1);
    this.vehicles.updateVisuals(dt, lights);
    this.updateEffects(dt, night);
    this.updateAudio();
    if (this.state === 'play' || this.state === 'menu') {
      if (this.state === 'play') this.cam.update(dt, input);
    } else if (this.state === 'title') this.cam.orbit(this.time + 20, this.titleCenter, 80, 34);
    this.markers.forEach((m) => (m.g.visible = this.state !== 'title'));
    this.hud.update();
    this.r.bloomStrength = 0.25 + night * 0.45;
    this.r.render(this.scene, this.cam.camera);
  }

  updateEffects(dt, night) {
    const v = this.player.car;
    if (v && this.state === 'play') {
      const lx = Math.cos(v.yaw), lz = -Math.sin(v.yaw);
      const [fx, fz] = v.forward;
      const rear = v.model.B.wb[0];
      const on = v.slip > 0.35 && v.speed > 1.5;
      for (const s of [-1, 1]) {
        const tx = v.model.B.W / 2 - v.model.B.tw / 2 - 0.04;
        const x = v.pos.x + fx * rear + lx * tx * s, z = v.pos.z + fz * rear + lz * tx * s;
        this.skids.mark(`${v.id}${s}`, x, v.pos.y, z, lx, lz, on);
        if (on && Math.random() < v.slip * 0.9) this.fx.tireSmoke(x, z, v.slip, night);
      }
      if (v.health < 0.35 && Math.random() < 0.5) {
        const hx = v.pos.x + fx * v.L * 0.35, hz = v.pos.z + fz * v.L * 0.35;
        this.fx.engineSmoke(hx, v.pos.y + 1.1, hz, v.health < 0.15);
      }
    }
    const scale = this.r.renderer.getDrawingBufferSize(new THREE.Vector2()).y * 0.5;
    this.fx.update(dt, scale);
  }

  updateAudio() {
    const a = this.audio;
    if (!a.ctx) return;
    const v = this.player.car;
    if (v && this.state === 'play') {
      a.updateEngine(v.health > 0, v.rpm, v.ctrl.throttle, v.spec.sound, !!v.up.blower, v.nitroActive);
      a.updateTires(v.slip * Math.min(1, v.speed / 6));
    } else {
      a.updateEngine(false, 800, 0, 'v8', false, false);
      a.updateTires(0);
    }
    let nearest = null;
    if (this.state === 'play') {
      for (const c of this.vehicles.cops) {
        if (!c.siren) continue;
        const d = c.pos.distanceTo(this.player.focus);
        if (nearest == null || d < nearest) nearest = d;
      }
    }
    a.updateSiren(nearest);
  }
}

// expose for debugging / automated tests
window.game = new Game();
window.BOOSTED = { THREE, CARS, defaultUpgrades, h };
