// Procedural stylized-realistic human with a simple joint rig and procedural animation.
// Built from smooth primitives so it can be fully customised in the creator; the joint layout
// mirrors a standard humanoid skeleton so a rigged glTF model can replace it later.
import * as THREE from 'three';
import { fabricTex } from '../engine/textures.js';
import { clamp, lerp } from '../util.js';

const matCache = new Map();
function mat(key, make) {
  if (!matCache.has(key)) matCache.set(key, make());
  return matCache.get(key);
}

const skinMat = (hex) =>
  mat('skin' + hex, () => {
    const c = new THREE.Color(hex);
    return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.62, sheen: 0.12, sheenRoughness: 0.7, sheenColor: c.clone().offsetHSL(0.0, -0.05, 0.08) });
  });
const lipMat = (hex) => mat('lip' + hex, () => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).offsetHSL(0.98, 0.05, -0.08), roughness: 0.4 }));
const clothMat = (hex, kind = 'plain', alt = '#ffffff', rough = 0.92) =>
  mat(`cloth${hex}${kind}${alt}${rough}`, () => {
    const o = { color: kind === 'plain' ? hex : '#ffffff', roughness: rough };
    if (kind !== 'plain') o.map = fabricTex(kind, hex, alt);
    return new THREE.MeshStandardMaterial(o);
  });
const hairMat = (hex, kind = 'plain') =>
  mat('hair' + hex + kind, () => {
    const o = { color: kind === 'plain' ? hex : '#ffffff', roughness: 0.85 };
    if (kind !== 'plain') o.map = fabricTex(kind, hex);
    return new THREE.MeshStandardMaterial(o);
  });
const GOLD = () => mat('gold', () => new THREE.MeshStandardMaterial({ color: 0xffc94a, metalness: 1, roughness: 0.18 }));
const ICE = () => mat('ice', () => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02 }));
const EYE_W = () => mat('eyew', () => new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.2 }));
const EYE_I = () => mat('eyei', () => new THREE.MeshStandardMaterial({ color: 0x2a1608, roughness: 0.1 }));
const LENS = () => mat('lens', () => new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.05, metalness: 0.6 }));
const SOLE = (hex = '#f4f4f0') => mat('sole' + hex, () => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7 }));

const geoCache = new Map();
function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

function lathe(points, segs = 20) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}
const capsule = (r, len, y = 0) => geo(`cap${r.toFixed(3)}_${len.toFixed(3)}_${y.toFixed(3)}`, () => new THREE.CapsuleGeometry(r, len, 6, 14).translate(0, y, 0));
const sphere = (r, ws = 20, hs = 14) => geo(`sph${r}_${ws}`, () => new THREE.SphereGeometry(r, ws, hs));

const BUILD = {
  slim: { w: 0.9, arm: 0.88, leg: 0.9, belly: 0 },
  average: { w: 1.0, arm: 1.0, leg: 1.0, belly: 0.01 },
  athletic: { w: 1.1, arm: 1.15, leg: 1.08, belly: 0 },
  heavy: { w: 1.22, arm: 1.25, leg: 1.2, belly: 0.06 },
};

export class CharacterModel {
  constructor(look) {
    this.root = new THREE.Group();
    this.phase = 0;
    this.t = Math.random() * 10;
    this.look = null;
    this.build(look);
  }

  mesh(geometry, material, parent, shadow = true) {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    parent.add(m);
    return m;
  }

  joint(parent, x, y, z = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }

  build(look) {
    this.look = { ...look };
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    const L = this.look;
    const B = BUILD[L.build] || BUILD.average;
    const skin = skinMat(L.skin);
    const s = L.height / 1.8;
    const body = (this.body = new THREE.Group());
    body.scale.setScalar(s);
    this.root.add(body);

    // ------------------------------------------------ skeleton
    const J = (this.j = {});
    J.hips = this.joint(body, 0, 0.94);
    J.spine = this.joint(J.hips, 0, 0.1);
    J.chest = this.joint(J.spine, 0, 0.22);
    J.neck = this.joint(J.chest, 0, 0.21);
    J.head = this.joint(J.neck, 0, 0.07);
    const shX = 0.185 * B.w;
    J.shL = this.joint(J.chest, shX, 0.165);
    J.shR = this.joint(J.chest, -shX, 0.165);
    J.elL = this.joint(J.shL, 0, -0.29);
    J.elR = this.joint(J.shR, 0, -0.29);
    J.haL = this.joint(J.elL, 0, -0.255);
    J.haR = this.joint(J.elR, 0, -0.255);
    const hpX = 0.092 * B.w;
    J.hipL = this.joint(J.hips, hpX, -0.04);
    J.hipR = this.joint(J.hips, -hpX, -0.04);
    J.knL = this.joint(J.hipL, 0, -0.42);
    J.knR = this.joint(J.hipR, 0, -0.42);
    J.anL = this.joint(J.knL, 0, -0.41);
    J.anR = this.joint(J.knR, 0, -0.41);
    this.baseHipY = 0.94;

    // ------------------------------------------------ clothing materials
    const top = L.top;
    const topKind = { flannel: 'flannel', jersey: 'jersey', tracksuit: 'track', puffer: 'puffer' }[top] || 'plain';
    const topMat = clothMat(L.topColor, topKind, L.top2, top === 'puffer' ? 0.45 : 0.92);
    const botKind = { jeans: 'denim', camo: 'camo' }[L.bottom] || 'plain';
    const botMat = clothMat(L.bottom === 'camo' ? '#4b5320' : L.bottomColor, botKind, '#ffffff', 0.95);

    // ------------------------------------------------ torso
    const puff = top === 'puffer' ? 0.045 : top === 'hoodie' ? 0.018 : top === 'tee' ? 0.012 : 0.004;
    const bel = B.belly;
    const torsoPts = [
      [0.13 + bel * 0.5, -0.03], [0.137 + bel, 0.04], [0.147 + bel * 1.1, 0.12], [0.162 + bel * 0.6, 0.22], [0.168, 0.3], [0.158, 0.36], [0.128, 0.405], [0.075, 0.435], [0.05, 0.445],
    ].map(([r, y]) => [r + (y < 0.42 ? puff : puff * 0.4), y]);
    const torso = this.mesh(lathe(torsoPts, 24), topMat, J.spine);
    torso.scale.set(B.w, 1, 0.64 + bel * 1.5 + puff * 1.2);
    // shirt hem / jacket bottom overlapping the waist
    if (top !== 'tank' && top !== 'jersey') {
      const hem = this.mesh(lathe([[0.15 + puff + bel, -0.08], [0.155 + puff + bel, 0.0], [0.14 + puff + bel, 0.05]], 24), topMat, J.spine);
      hem.scale.copy(torso.scale);
    }
    // pelvis (in pants)
    const pelvis = this.mesh(lathe([[0.07, -0.14], [0.135, -0.1], [0.152, -0.02], [0.142, 0.07], [0.132, 0.1]], 22), botMat, J.hips);
    pelvis.scale.set(B.w, 1, 0.7 + bel);

    if (top === 'hoodie') {
      // hood bunched behind the neck + front pocket + strings
      const hood = this.mesh(new THREE.TorusGeometry(0.075, 0.035, 10, 20, Math.PI * 1.25), topMat, J.chest);
      hood.rotation.set(Math.PI / 2 + 0.25, 0, Math.PI * 1.375 - Math.PI);
      hood.position.set(0, 0.215, -0.03);
      hood.scale.set(B.w * 1.15, 1.05, 1);
      const pocket = this.mesh(new THREE.BoxGeometry(0.2, 0.09, 0.03), topMat, J.spine);
      pocket.position.set(0, 0.07, (0.14 + puff + bel) * (0.64 + bel * 1.5 + puff * 1.2) + 0.005);
      for (const sx of [-0.03, 0.03]) {
        const str = this.mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.13, 5), clothMat('#f2f2f2'), J.chest, false);
        str.position.set(sx, 0.12, 0.12);
      }
    }
    if (top === 'puffer') {
      const collar = this.mesh(new THREE.TorusGeometry(0.075, 0.03, 8, 20), topMat, J.chest);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.205;
      collar.scale.set(B.w * 1.05, 1, 0.9);
      const zip = this.mesh(new THREE.BoxGeometry(0.008, 0.38, 0.006), clothMat('#222222'), J.spine, false);
      zip.position.set(0, 0.2, (0.168 + puff) * (0.64 + puff * 1.2) + 0.002);
    }
    if (top === 'flannel' || top === 'tracksuit') {
      const collar = this.mesh(new THREE.TorusGeometry(0.068, 0.014, 6, 18), topMat, J.chest);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.21;
    }

    // ------------------------------------------------ neck & head
    this.mesh(geo('neck', () => new THREE.CylinderGeometry(0.05, 0.056, 0.13, 14).translate(0, 0.035, 0)), skin, J.neck);
    const H = J.head;
    const hc = 0.13; // head centre
    const head = this.mesh(sphere(0.112, 32, 24), skin, H);
    head.scale.set(0.9, 1.08, 1.0);
    head.position.y = hc;
    const jaw = this.mesh(sphere(0.08, 20, 14), skin, H);
    jaw.scale.set(0.98 * (L.build === 'heavy' ? 1.12 : 1), 0.78, 1.0);
    jaw.position.set(0, hc - 0.055, 0.022);
    const ears = [-1, 1].map((sx) => {
      const e = this.mesh(sphere(0.03, 12, 10), skin, H, false);
      e.scale.set(0.38, 0.95, 0.68);
      e.position.set(sx * 0.1, hc + 0.0, -0.005);
      return e;
    });
    // eyes
    for (const sx of [-1, 1]) {
      const w = this.mesh(sphere(0.0165, 14, 10), EYE_W(), H, false);
      w.position.set(sx * 0.036, hc + 0.012, 0.087);
      const i = this.mesh(sphere(0.0095, 12, 8), EYE_I(), H, false);
      i.position.set(sx * 0.036, hc + 0.012, 0.1);
      // upper lid / brow ridge in skin tone
      const lid = this.mesh(sphere(0.019, 14, 8), skin, H, false);
      lid.scale.set(1.05, 0.55, 0.9);
      lid.position.set(sx * 0.036, hc + 0.027, 0.088);
      const brow = this.mesh(geo('brow', () => new THREE.CapsuleGeometry(0.0055, 0.03, 3, 6).rotateZ(Math.PI / 2)), hairMat(L.hairColor), H, false);
      brow.position.set(sx * 0.037, hc + 0.042, 0.098);
      brow.rotation.z = sx * -0.12;
    }
    // nose
    const nose = this.mesh(sphere(0.02, 14, 10), skin, H, false);
    nose.scale.set(0.85, 1.25, 1.0);
    nose.position.set(0, hc - 0.012, 0.104);
    const nostrils = this.mesh(sphere(0.02, 14, 10), skin, H, false);
    nostrils.scale.set(1.25, 0.6, 0.75);
    nostrils.position.set(0, hc - 0.032, 0.1);
    // lips
    const lip = lipMat(L.skin);
    const ul = this.mesh(geo('lipU', () => new THREE.CapsuleGeometry(0.0085, 0.03, 4, 8).rotateZ(Math.PI / 2)), lip, H, false);
    ul.position.set(0, hc - 0.056, 0.093);
    ul.scale.set(1, 0.85, 0.8);
    const ll = this.mesh(geo('lipL', () => new THREE.CapsuleGeometry(0.0095, 0.026, 4, 8).rotateZ(Math.PI / 2)), lip, H, false);
    ll.position.set(0, hc - 0.07, 0.09);
    ll.scale.set(1, 0.9, 0.8);

    this.buildHair(H, hc, L);
    this.buildFacialHair(H, hc, L);
    this.buildHeadwear(H, hc, L, ears);

    // ------------------------------------------------ arms
    const longSleeve = ['hoodie', 'puffer', 'flannel', 'tracksuit'].includes(top);
    const shortSleeve = top === 'tee';
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const sh = J['sh' + side], el = J['el' + side], ha = J['ha' + side];
      const ar = 0.046 * B.arm, fr = 0.039 * B.arm;
      // deltoid
      const delt = this.mesh(sphere(0.062 * B.arm, 16, 12), longSleeve || top === 'tee' ? topMat : skin, sh);
      delt.position.set(sx * 0.005, -0.02, 0);
      delt.scale.set(1, 1.05, 0.95);
      if (longSleeve) {
        this.mesh(capsule(ar + puff * 0.7 + 0.008, 0.22, -0.13), topMat, sh);
        this.mesh(capsule(fr + puff * 0.6 + 0.008, 0.19, -0.115), topMat, el);
        const cuff = this.mesh(geo('cuff' + top, () => new THREE.CylinderGeometry(0.047, 0.045, 0.04, 14)), topMat, el);
        cuff.position.y = -0.235;
      } else {
        this.mesh(capsule(ar, 0.22, -0.13), skin, sh);
        this.mesh(capsule(fr, 0.19, -0.115), skin, el);
        if (shortSleeve) {
          const sl = this.mesh(geo('sleeve', () => new THREE.CylinderGeometry(0.068, 0.078, 0.2, 16, 1, true).translate(0, -0.085, 0)), topMat, sh);
          sl.material.side = THREE.DoubleSide;
          sl.scale.setScalar(B.arm);
        }
      }
      const hand = this.mesh(sphere(0.042, 14, 10), skin, ha);
      hand.scale.set(0.75, 1.15, 0.5);
      hand.position.set(0, -0.055, 0.005);
      const thumb = this.mesh(capsule(0.012, 0.03), skin, ha, false);
      thumb.position.set(sx * 0.0, -0.035, 0.03);
      thumb.rotation.x = 0.5;
      if (side === 'L' && L.watch) {
        const w = this.mesh(geo('watch', () => new THREE.TorusGeometry(0.043, 0.008, 6, 16).rotateX(Math.PI / 2)), GOLD(), el, false);
        w.position.y = -0.225;
        const face = this.mesh(geo('watchface', () => new THREE.CylinderGeometry(0.016, 0.016, 0.01, 12)), ICE(), el, false);
        face.position.set(0, -0.225, 0.045);
        face.rotation.x = Math.PI / 2;
      }
    }

    // ------------------------------------------------ legs
    const shorts = L.bottom === 'shorts';
    for (const side of ['L', 'R']) {
      const hp = J['hip' + side], kn = J['kn' + side], an = J['an' + side];
      const tr = 0.074 * B.leg, sr = 0.054 * B.leg;
      const baggy = L.bottom === 'jeans' || L.bottom === 'cargo' || L.bottom === 'camo' ? 0.012 : 0.004;
      if (shorts) {
        this.mesh(capsule(tr + 0.02, 0.3, -0.2), botMat, hp);
        this.mesh(capsule(sr, 0.3, -0.19), skin, kn);
      } else {
        this.mesh(capsule(tr + baggy, 0.3, -0.2), botMat, hp);
        this.mesh(capsule(sr + baggy + 0.008, 0.3, -0.19), botMat, kn);
        if (L.bottom === 'joggers') {
          const c = this.mesh(geo('jcuff', () => new THREE.CylinderGeometry(0.05, 0.05, 0.05, 14)), botMat, kn);
          c.position.y = -0.37;
        } else {
          // stacked denim at the ankle
          const st = this.mesh(geo('stack', () => new THREE.TorusGeometry(0.06, 0.018, 6, 14).rotateX(Math.PI / 2)), botMat, kn);
          st.position.y = -0.36;
        }
        if (L.bottom === 'cargo' || L.bottom === 'camo') {
          const p = this.mesh(new THREE.BoxGeometry(0.03, 0.12, 0.09), botMat, hp);
          p.position.set(side === 'L' ? tr + 0.02 : -tr - 0.02, -0.25, 0);
        }
      }
      this.buildShoe(an, L);
    }
    // ------------------------------------------------ accessories
    if (L.chain) {
      const ch = this.mesh(geo('chain', () => new THREE.TorusGeometry(0.1, 0.0065, 6, 40)), GOLD(), J.chest, false);
      ch.rotation.x = Math.PI / 2 - 0.55;
      ch.position.set(0, 0.17, 0.035);
      ch.scale.set(B.w * 1.02, 1.08, 1);
      const pend = this.mesh(geo('pend', () => new THREE.CylinderGeometry(0.022, 0.022, 0.008, 16).rotateX(Math.PI / 2)), ICE(), J.chest, false);
      pend.position.set(0, 0.105, (0.17 + puff) * (0.64 + bel * 1.5 + puff * 1.2) + 0.01);
    }
    if (L.earrings) {
      for (const e of ears) {
        const st = this.mesh(sphere(0.007, 8, 6), ICE(), H, false);
        st.position.set(e.position.x * 1.04, hc - 0.02, 0.0);
      }
    }
    if (L.shades && L.headwear !== 'skimask') {
      for (const sx of [-1, 1]) {
        const l = this.mesh(geo('lensG', () => new THREE.BoxGeometry(0.046, 0.026, 0.008)), LENS(), H, false);
        l.position.set(sx * 0.038, hc + 0.014, 0.112);
        l.rotation.y = sx * 0.12;
      }
      const br = this.mesh(geo('bridge', () => new THREE.BoxGeometry(0.2, 0.008, 0.008)), LENS(), H, false);
      br.position.set(0, hc + 0.026, 0.108);
    }
    this.root.traverse((o) => (o.userData.character = this));
  }

  buildShoe(an, L) {
    const col = L.shoeColor;
    if (L.shoes === 'boots') {
      const wheat = clothMat('#c69a5a', 'plain', '#fff', 0.85);
      this.mesh(geo('bootU', () => new THREE.CylinderGeometry(0.062, 0.066, 0.14, 14).translate(0, 0.0, 0)), wheat, an);
      const toe = this.mesh(geo('bootT', () => new THREE.CapsuleGeometry(0.06, 0.13, 5, 12).rotateX(Math.PI / 2).scale(1.1, 0.85, 1).translate(0, -0.055, 0.05)), wheat, an);
      void toe;
      const sole = this.mesh(geo('bootS', () => new THREE.BoxGeometry(0.13, 0.035, 0.3).translate(0, -0.1, 0.045)), SOLE('#5a3a22'), an);
      void sole;
      return;
    }
    if (L.shoes === 'slides') {
      const sock = clothMat('#f4f4f4');
      this.mesh(geo('sock', () => new THREE.CapsuleGeometry(0.045, 0.14, 4, 10).rotateX(Math.PI / 2).scale(1, 0.7, 1).translate(0, -0.06, 0.045)), sock, an);
      this.mesh(geo('sockU', () => new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12)), sock, an);
      this.mesh(geo('slideS', () => new THREE.BoxGeometry(0.11, 0.03, 0.28).translate(0, -0.1, 0.045)), SOLE('#111111'), an);
      this.mesh(geo('slideStrap', () => new THREE.BoxGeometry(0.115, 0.04, 0.09).translate(0, -0.07, 0.07)), clothMat(col, 'plain', '#fff', 0.5), an);
      return;
    }
    const upper = clothMat(col, 'plain', '#fff', 0.6);
    this.mesh(geo('snk', () => new THREE.CapsuleGeometry(0.052, 0.15, 5, 12).rotateX(Math.PI / 2).scale(1.05, 0.78, 1).translate(0, -0.055, 0.045)), upper, an);
    this.mesh(geo('snkS', () => new THREE.BoxGeometry(0.112, 0.035, 0.285).translate(0, -0.095, 0.045)), SOLE(), an);
    const swoosh = this.mesh(geo('swoosh', () => new THREE.BoxGeometry(0.116, 0.012, 0.12).translate(0, -0.06, 0.03)), SOLE(col === '#f2f2f2' ? '#111111' : '#f4f4f0'), an, false);
    void swoosh;
    if (L.shoes === 'highs') this.mesh(geo('hiC', () => new THREE.CylinderGeometry(0.06, 0.063, 0.12, 14).translate(0, -0.005, -0.005)), upper, an);
  }

  buildHair(H, hc, L) {
    const hm = hairMat(L.hairColor);
    const covered = ['skimask', 'durag', 'beanie'].includes(L.headwear);
    const capGeo = geo('hcap', () => new THREE.SphereGeometry(0.117, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.56));
    const cap = (m = hm, s = 1) => {
      const c = this.mesh(capGeo, m, H);
      c.scale.set(0.91 * s, 1.09 * s, 1.01 * s);
      c.position.set(0, hc + 0.003, -0.006);
      c.rotation.x = -0.32;
      return c;
    };
    switch (L.hair) {
      case 'buzz':
        cap();
        break;
      case 'waves':
        cap(hairMat(L.hairColor, 'waves'));
        break;
      case 'braids': {
        cap(hairMat(L.hairColor, 'cornrows'));
        if (covered) break;
        for (let i = 0; i < 4; i++) {
          const b = this.mesh(capsule(0.011, 0.16, -0.08), hm, H);
          b.position.set(-0.045 + i * 0.03, hc - 0.03, -0.1);
          b.rotation.x = 0.25;
        }
        break;
      }
      case 'fade': {
        cap();
        if (covered) break;
        const top = this.mesh(geo('hitop', () => new THREE.CylinderGeometry(0.094, 0.1, 0.12, 22)), hm, H);
        top.position.set(0, hc + 0.12, -0.008);
        break;
      }
      case 'afro': {
        cap();
        if (covered) break;
        const af = this.mesh(geo('afro', () => {
          const g = new THREE.IcosahedronGeometry(0.16, 3);
          const p = g.getAttribute('position');
          const v = new THREE.Vector3();
          for (let i = 0; i < p.count; i++) {
            v.fromBufferAttribute(p, i);
            const n = 1 + 0.05 * Math.sin(v.x * 90) * Math.sin(v.y * 80) * Math.sin(v.z * 70);
            v.multiplyScalar(n);
            p.setXYZ(i, v.x, v.y, v.z);
          }
          g.computeVertexNormals();
          return g;
        }), hm, H);
        af.position.set(0, hc + 0.06, -0.025);
        af.scale.set(1, 0.9, 1);
        break;
      }
      case 'twists': {
        cap();
        if (covered) break;
        const g = geo('twist', () => new THREE.ConeGeometry(0.018, 0.09, 6).translate(0, 0.045, 0));
        for (let i = 0; i < 34; i++) {
          const a = (i / 34) * Math.PI * 2 * 2.6;
          const r = 0.03 + (i / 34) * 0.07;
          const t = this.mesh(g, hm, H, false);
          t.position.set(Math.cos(a) * r, hc + 0.1 - r * 0.45, Math.sin(a) * r - 0.01);
          t.rotation.set(Math.sin(a) * r * 6, 0, -Math.cos(a) * r * 6);
        }
        break;
      }
      case 'dreads': {
        cap();
        const g = capsule(0.0125, 0.22, -0.11);
        const n = covered ? 10 : 22;
        for (let i = 0; i < n; i++) {
          const a = Math.PI * 0.12 + (i / (n - 1)) * Math.PI * 1.76; // around the back
          const d = this.mesh(g, hm, H, i % 2 === 0);
          d.position.set(Math.sin(a) * 0.094, hc + (covered ? -0.0 : 0.04), -Math.cos(a) * 0.094 * 1.05);
          d.rotation.set(-Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.3);
        }
        break;
      }
      case 'ponytail': {
        cap();
        const p = this.mesh(capsule(0.032, 0.24, -0.12), hm, H);
        p.position.set(0, hc + 0.04, -0.11);
        p.rotation.x = 0.35;
        break;
      }
      default:
        break;
    }
  }

  buildFacialHair(H, hc, L) {
    if (L.facial === 'none' || L.headwear === 'skimask') return;
    const hm = hairMat(L.hairColor);
    const must = () => {
      const m = this.mesh(geo('must', () => new THREE.CapsuleGeometry(0.008, 0.045, 3, 6).rotateZ(Math.PI / 2)), hm, H, false);
      m.position.set(0, hc - 0.045, 0.099);
    };
    if (L.facial === 'mustache') must();
    if (L.facial === 'goatee') {
      must();
      const g = this.mesh(sphere(0.03, 12, 10), hm, H, false);
      g.scale.set(0.9, 1.1, 0.6);
      g.position.set(0, hc - 0.09, 0.086);
    }
    if (L.facial === 'chinstrap' || L.facial === 'beard') {
      const full = L.facial === 'beard';
      const b = this.mesh(geo('beard' + full, () => new THREE.SphereGeometry(0.118, 24, 12, 0, Math.PI, full ? Math.PI * 0.5 : Math.PI * 0.62, full ? Math.PI * 0.32 : Math.PI * 0.2)), hm, H, false);
      b.scale.set(0.92, 1.06, 1.04);
      b.position.set(0, hc - 0.012, 0.004);
      b.material.side = THREE.DoubleSide;
      const chin = this.mesh(sphere(0.05, 14, 10), hm, H, false);
      chin.scale.set(1.2, full ? 0.9 : 0.6, 0.7);
      chin.position.set(0, hc - 0.095, 0.07);
      if (full) must();
    }
  }

  buildHeadwear(H, hc, L, ears) {
    const hw = L.headwear;
    if (hw === 'none') return;
    const col = L.headwearColor;
    if (hw === 'fitted' || hw === 'backwards') {
      const m = clothMat(col, 'plain', '#fff', 0.8);
      const crown = this.mesh(geo('crown', () => new THREE.SphereGeometry(0.123, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), m, H);
      crown.scale.set(0.94, 0.86, 1.02);
      crown.position.set(0, hc + 0.025, -0.004);
      const brim = this.mesh(geo('brim', () => new THREE.CylinderGeometry(0.115, 0.115, 0.012, 24, 1, false, -Math.PI / 2, Math.PI).scale(0.95, 1, 0.85)), m, H);
      const back = hw === 'backwards';
      brim.position.set(0, hc + 0.03, back ? -0.07 : 0.07);
      brim.rotation.set(back ? -0.12 : 0.12, back ? Math.PI : 0, 0);
      const btn = this.mesh(sphere(0.012, 8, 6), m, H, false);
      btn.position.set(0, hc + 0.13, -0.004);
      return;
    }
    if (hw === 'durag') {
      const m = mat('durag' + col, () => new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.28, sheen: 1, sheenColor: new THREE.Color(col).offsetHSL(0, 0, 0.25), clearcoat: 0.3 }));
      const shell = this.mesh(geo('durag', () => new THREE.SphereGeometry(0.121, 26, 14, 0, Math.PI * 2, 0, Math.PI * 0.6)), m, H);
      shell.scale.set(0.92, 1.08, 1.02);
      shell.position.set(0, hc, -0.006);
      shell.rotation.x = -0.18;
      for (const sx of [-0.025, 0.025]) {
        const tail = this.mesh(geo('dtail', () => new THREE.BoxGeometry(0.05, 0.26, 0.006).translate(0, -0.13, 0)), m, H);
        tail.position.set(sx, hc - 0.02, -0.112);
        tail.rotation.set(0.12, 0, sx * 2);
      }
      return;
    }
    if (hw === 'beanie') {
      const m = clothMat(col, 'plain', '#fff', 0.98);
      const sh = this.mesh(geo('beanie', () => new THREE.SphereGeometry(0.124, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55)), m, H);
      sh.scale.set(0.93, 1.25, 1.03);
      sh.position.set(0, hc + 0.0, -0.004);
      const fold = this.mesh(geo('bfold', () => new THREE.CylinderGeometry(0.122, 0.124, 0.045, 24, 1, true)), m, H);
      fold.scale.set(0.93, 1, 1.03);
      fold.position.set(0, hc + 0.02, -0.004);
      fold.material.side = THREE.DoubleSide;
      return;
    }
    if (hw === 'skimask') {
      const m = clothMat(col, 'plain', '#fff', 1);
      const up = this.mesh(geo('maskU', () => new THREE.SphereGeometry(0.121, 26, 12, 0, Math.PI * 2, 0, Math.PI * 0.43)), m, H);
      const lo = this.mesh(geo('maskL', () => new THREE.SphereGeometry(0.121, 26, 12, 0, Math.PI * 2, Math.PI * 0.53, Math.PI * 0.47)), m, H);
      for (const p of [up, lo]) {
        p.scale.set(0.93, 1.09, 1.0);
        p.position.set(0, hc, 0.004);
      }
      // cover chin/jaw too
      const jaw = this.mesh(sphere(0.087, 18, 12), m, H);
      jaw.scale.set(1.0, 0.8, 1.0);
      jaw.position.set(0, hc - 0.055, 0.022);
      for (const e of ears) e.visible = false;
    }
  }

  /**
   * st: { speed, sprint, air, seated, action: 'pick'|null, wave }
   */
  update(dt, st = {}) {
    const J = this.j;
    if (!J) return;
    this.t += dt;
    const speed = st.speed || 0;
    const run = clamp((speed - 3) / 4, 0, 1);
    const amp = clamp(speed / 3.5, 0, 1);
    // reset rotations each frame (pose is fully procedural)
    for (const k of Object.keys(J)) J[k].rotation.set(0, 0, 0);
    J.hips.position.y = this.baseHipY;
    J.hips.position.z = 0;

    if (st.seated) {
      J.hips.position.y = 0.5;
      J.hips.position.z = -0.05;
      J.hipL.rotation.x = J.hipR.rotation.x = -1.45;
      J.hipL.rotation.z = 0.08;
      J.hipR.rotation.z = -0.08;
      J.knL.rotation.x = J.knR.rotation.x = 1.3;
      J.anL.rotation.x = J.anR.rotation.x = -0.15;
      J.spine.rotation.x = -0.12;
      J.shL.rotation.x = J.shR.rotation.x = -0.95;
      J.shL.rotation.z = 0.12;
      J.shR.rotation.z = -0.12;
      J.elL.rotation.x = J.elR.rotation.x = -0.75;
      const steer = st.steer || 0;
      J.shL.rotation.x += steer * 0.25;
      J.shR.rotation.x -= steer * 0.25;
      J.head.rotation.y = steer * 0.25;
      return;
    }

    // stride: one full gait cycle per ~1.5 m walked
    this.phase += dt * (speed / (1.35 + run * 0.6)) * Math.PI * 2 * (speed > 0.1 ? 1 : 0);
    const ph = this.phase;
    const sin = Math.sin(ph), cos = Math.cos(ph);
    const legA = lerp(0.42, 0.75, run) * amp;
    J.hipL.rotation.x = -sin * legA;
    J.hipR.rotation.x = sin * legA;
    J.knL.rotation.x = (Math.max(0, cos) * lerp(0.6, 1.4, run) + 0.05) * amp + 0.03;
    J.knR.rotation.x = (Math.max(0, -cos) * lerp(0.6, 1.4, run) + 0.05) * amp + 0.03;
    J.anL.rotation.x = -Math.max(0, cos) * 0.3 * amp;
    J.anR.rotation.x = -Math.max(0, -cos) * 0.3 * amp;
    const armA = lerp(0.35, 0.9, run) * amp;
    J.shL.rotation.x = sin * armA;
    J.shR.rotation.x = -sin * armA;
    J.shL.rotation.z = 0.1 + 0.05 * (1 - amp);
    J.shR.rotation.z = -0.1 - 0.05 * (1 - amp);
    J.elL.rotation.x = -0.18 - run * 1.1 - Math.max(0, -sin) * 0.3 * amp;
    J.elR.rotation.x = -0.18 - run * 1.1 - Math.max(0, sin) * 0.3 * amp;
    J.hips.position.y = this.baseHipY - Math.abs(sin) * 0.035 * amp - run * 0.03;
    J.spine.rotation.x = 0.04 + run * 0.18;
    J.chest.rotation.y = sin * 0.12 * amp;
    J.hips.rotation.y = -sin * 0.1 * amp;
    // idle: breathing + slight lean
    const idle = 1 - amp;
    J.chest.rotation.x = Math.sin(this.t * 1.6) * 0.015 * idle;
    J.head.rotation.y = Math.sin(this.t * 0.4) * 0.25 * idle;
    J.shL.rotation.z += Math.sin(this.t * 1.6) * 0.01 * idle;

    if (st.air) {
      J.hipL.rotation.x = -0.7;
      J.hipR.rotation.x = -0.15;
      J.knL.rotation.x = 1.1;
      J.knR.rotation.x = 0.6;
      J.shL.rotation.z = 0.5;
      J.shR.rotation.z = -0.5;
    }
    if (st.action === 'pick') {
      J.shL.rotation.x = J.shR.rotation.x = -1.15;
      J.elL.rotation.x = J.elR.rotation.x = -0.5 + Math.sin(this.t * 22) * 0.06;
      J.spine.rotation.x = 0.15;
      J.head.rotation.x = 0.2;
    }
    if (st.knocked) {
      J.shL.rotation.z = 1.2;
      J.shR.rotation.z = -1.2;
      J.knL.rotation.x = 0.4;
    }
  }
}
