// Keyboard + mouse + gamepad, merged into one action state.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered this frame
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.dragging = false;
    this.locked = false;
    this.sensitivity = 1;
    this.invertY = false;
    this.enabled = true;
    this.pad = null;
    this.padPrev = {};

    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      this.dragging = true;
      if (this.wantLock && !this.locked) this.requestLock();
      if (e.button === 0) this.pressed.add('Mouse0');
    });
    addEventListener('mouseup', () => (this.dragging = false));
    addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.locked || this.dragging) {
        this.mouseDX += e.movementX || 0;
        this.mouseDY += e.movementY || 0;
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    addEventListener('gamepadconnected', (e) => (this.pad = e.gamepad.index));
  }

  requestLock() {
    try {
      const p = this.canvas.requestPointerLock?.();
      if (p && p.catch) p.catch(() => {});
    } catch {
      /* sandboxed iframes may refuse pointer lock — drag-to-look still works */
    }
  }

  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** Call once per frame before reading. */
  poll() {
    this.gp = null;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = (this.pad != null && pads[this.pad]) || [...pads].find((p) => p);
    if (gp) {
      const b = (i) => !!gp.buttons[i]?.pressed;
      const v = (i) => gp.buttons[i]?.value || 0;
      const dz = (a) => (Math.abs(a) < 0.15 ? 0 : a);
      this.gp = {
        lx: dz(gp.axes[0] || 0), ly: dz(gp.axes[1] || 0), rx: dz(gp.axes[2] || 0), ry: dz(gp.axes[3] || 0),
        rt: v(7), lt: v(6), a: b(0), b: b(1), x: b(2), y: b(3), lb: b(4), rb: b(5), start: b(9), select: b(8), up: b(12),
      };
      // map gamepad buttons to edge presses
      const edges = { y: 'KeyE', start: 'Escape', select: 'KeyM', lb: 'KeyR', up: 'KeyC', x: 'KeyH' };
      for (const [k, code] of Object.entries(edges)) {
        if (this.gp[k] && !this.padPrev[k]) this.pressed.add(code);
        this.padPrev[k] = this.gp[k];
      }
    }
  }

  down(code) {
    return this.enabled && this.keys.has(code);
  }

  hit(code) {
    return this.enabled && this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  // ---- high level axes
  get moveX() {
    let x = (this.down('KeyD') || this.down('ArrowRight') ? 1 : 0) - (this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0);
    if (this.gp && this.gp.lx) x = this.gp.lx;
    return x;
  }
  get moveY() {
    let y = (this.down('KeyW') || this.down('ArrowUp') ? 1 : 0) - (this.down('KeyS') || this.down('ArrowDown') ? 1 : 0);
    if (this.gp && this.gp.ly) y = -this.gp.ly;
    return y;
  }
  get throttle() {
    if (this.gp && this.gp.rt > 0.05) return this.gp.rt;
    return this.down('KeyW') || this.down('ArrowUp') ? 1 : 0;
  }
  get brake() {
    if (this.gp && this.gp.lt > 0.05) return this.gp.lt;
    return this.down('KeyS') || this.down('ArrowDown') ? 1 : 0;
  }
  get steer() {
    return this.moveX;
  }
  get sprint() {
    return this.down('ShiftLeft') || this.down('ShiftRight') || !!(this.gp && this.gp.b);
  }
  get jump() {
    return this.down('Space') || !!(this.gp && this.gp.a);
  }
  get handbrake() {
    return this.down('Space') || !!(this.gp && this.gp.a);
  }
  get interactHeld() {
    return this.down('KeyE') || this.down('KeyF') || !!(this.gp && this.gp.y);
  }
  get interactHit() {
    return this.hit('KeyE') || this.hit('KeyF');
  }
  lookDelta() {
    let dx = this.mouseDX * 0.0025 * this.sensitivity;
    let dy = this.mouseDY * 0.0025 * this.sensitivity;
    if (this.gp) {
      dx += this.gp.rx * 0.045 * this.sensitivity;
      dy += this.gp.ry * 0.035 * this.sensitivity;
    }
    if (this.invertY) dy = -dy;
    return [dx, dy];
  }
}
