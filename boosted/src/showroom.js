// Studio scene used by the character creator and the garage: turntable, neon strips, glossy floor.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CharacterModel } from './entities/characterModel.js';
import { CarModel } from './entities/carModel.js';
import { damp } from './util.js';

export class Showroom {
  constructor(renderer, canvas) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080b);
    this.scene.fog = new THREE.Fog(0x07080b, 14, 40);
    const pm = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    this.camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.05, 100);

    const key = new THREE.SpotLight(0xfff1e0, 70, 30, 0.6, 0.7, 2);
    key.position.set(3.5, 7, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0002;
    this.scene.add(key, key.target);
    const rimA = new THREE.PointLight(0xa53bff, 30, 14, 2);
    rimA.position.set(-4, 2.5, -3);
    const rimB = new THREE.PointLight(0x2fb8ff, 30, 14, 2);
    rimB.position.set(4, 2.2, -3.5);
    const fill = new THREE.DirectionalLight(0xc8d4ff, 0.6);
    fill.position.set(-4, 3, 6);
    this.scene.add(rimA, rimB, fill, new THREE.HemisphereLight(0x8090b0, 0x101015, 0.5));

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2),
      new THREE.MeshPhysicalMaterial({ color: 0x08090b, roughness: 0.45, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 }),
    );
    floor.receiveShadow = true;
    this.scene.add(floor);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.5, 0.08, 64), new THREE.MeshPhysicalMaterial({ color: 0x16181d, roughness: 0.25, metalness: 0.6, clearcoat: 1 }));
    disc.position.y = 0.04;
    disc.receiveShadow = true;
    this.scene.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.025, 8, 96).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2fb8ff }));
    ring.position.y = 0.08;
    this.scene.add(ring);
    // neon wall strips
    const neon = (color, x, z, ry) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(6, 0.06, 0.06), new THREE.MeshBasicMaterial({ color }));
      m.position.set(x, 3.2, z);
      m.rotation.y = ry;
      this.scene.add(m);
      const m2 = m.clone();
      m2.position.y = 0.9;
      this.scene.add(m2);
    };
    neon(0xa53bff, -6, -6, Math.PI / 4);
    neon(0x2fb8ff, 6, -6, -Math.PI / 4);
    neon(0xff3fb4, 0, -8.5, 0);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 10, 48, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.9, side: THREE.BackSide }));
    wall.position.y = 5;
    this.scene.add(wall);

    this.turn = new THREE.Group();
    this.turn.position.y = 0.08;
    this.scene.add(this.turn);
    this.angle = 0.5;
    this.vel = 0;
    this.mode = 'car';
    this.zoom = 'full';
    this.drag = false;
    this.active = false;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      this.drag = true;
      this.lastX = e.clientX;
    });
    addEventListener('pointerup', () => (this.drag = false));
    addEventListener('pointermove', (e) => {
      if (!this.active || !this.drag) return;
      this.vel = (e.clientX - this.lastX) * 0.01;
      this.angle += this.vel;
      this.lastX = e.clientX;
    });
    this.camPos = new THREE.Vector3(0, 1.4, 6);
    this.camLook = new THREE.Vector3(0, 1, 0);
  }

  clear() {
    if (this.car) this.car.dispose();
    this.car = null;
    this.char = null;
    while (this.turn.children.length) this.turn.remove(this.turn.children[0]);
  }

  showCharacter(look) {
    this.mode = 'char';
    if (this.char) this.char.build(look);
    else {
      this.clear();
      this.char = new CharacterModel(look);
      this.turn.add(this.char.root);
    }
  }

  showCar(specId, up) {
    this.mode = 'car';
    if (this.car && this.car.specId === specId) this.car.build(up);
    else {
      this.clear();
      this.car = new CarModel(specId, up);
      this.turn.add(this.car.root);
    }
  }

  setZoom(z) {
    this.zoom = z;
  }

  update(dt, t) {
    if (!this.drag) {
      this.vel = damp(this.vel, 0, 3, dt);
      this.angle += this.vel + dt * 0.18;
    }
    this.turn.rotation.y = this.angle;
    let pos, look;
    const narrow = innerWidth < 800;
    if (this.mode === 'char') {
      this.char?.update(dt, { speed: 0 });
      const h = this.char ? this.char.look.height : 1.8;
      if (this.zoom === 'face') {
        pos = new THREE.Vector3(narrow ? 0 : -0.25, h - 0.1, 1.25);
        look = new THREE.Vector3(narrow ? 0 : -0.25, h - 0.15, 0);
      } else {
        pos = new THREE.Vector3(narrow ? 0 : -0.7, 1.15, narrow ? 6.2 : 4.6);
        look = new THREE.Vector3(narrow ? 0 : -0.7, 0.95, 0);
      }
    } else {
      this.car?.animate(dt, { lights: 0.6, t });
      pos = new THREE.Vector3(narrow ? 0 : -1.6, 2.1, narrow ? 12 : 9);
      look = new THREE.Vector3(narrow ? 0 : -1.6, 0.6, 0);
    }
    this.camPos.lerp(pos, 1 - Math.exp(-5 * dt));
    this.camLook.lerp(look, 1 - Math.exp(-5 * dt));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }
}
