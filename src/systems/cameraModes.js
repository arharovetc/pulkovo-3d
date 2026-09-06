import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** Ракурсы задаются в локальных координатах аэропорта и переводятся в мировые. */
export const VIEWS = [
  { key: '1', name: 'Обзор', pos: [-120, 620, 1250], target: [0, 20, -180] },
  { key: '2', name: 'Терминал', pos: [-40, 90, -420], target: [0, 24, 20] },
  { key: '3', name: 'Перрон', pos: [-150, 14, -300], target: [120, 12, -230] },
  { key: '4', name: 'ВПП 10L', pos: [-1780, 30, -1120], target: [-600, 8, -1000] },
  { key: '5', name: '«Стаканы»', pos: [-430, 42, 210], target: [-430, 16, 10] },
  { key: '6', name: 'Вышка', pos: [250, 68, -140], target: [-100, 10, -420] },
  { key: '7', name: 'План сверху', pos: [0, 3400, 60], target: [0, 0, -110] },
  { key: '8', name: 'Площадь', pos: [0, 26, 330], target: [0, 26, 60] },
];

export function createCameraRig(camera, renderer, airportGroup) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI * 0.495;   // не уходим под землю
  controls.minDistance = 12;
  controls.maxDistance = 6000;
  controls.screenSpacePanning = false;
  controls.autoRotateSpeed = 0.35;

  const anim = { active: false, t: 0, dur: 1.4 };
  const fromPos = new THREE.Vector3();
  const toPos = new THREE.Vector3();
  const fromTgt = new THREE.Vector3();
  const toTgt = new THREE.Vector3();

  const toWorld = (p) => airportGroup.localToWorld(new THREE.Vector3(p[0], p[1], p[2]));

  function goTo(view, instant = false) {
    toPos.copy(toWorld(view.pos));
    toTgt.copy(toWorld(view.target));
    if (instant) {
      camera.position.copy(toPos);
      controls.target.copy(toTgt);
      controls.update();
      return;
    }
    fromPos.copy(camera.position);
    fromTgt.copy(controls.target);
    anim.active = true;
    anim.t = 0;
  }

  function updateAnim(dt) {
    if (!anim.active) return;
    anim.t = Math.min(1, anim.t + dt / anim.dur);
    const e = anim.t < 0.5
      ? 4 * anim.t ** 3
      : 1 - (-2 * anim.t + 2) ** 3 / 2;                 // easeInOutCubic
    camera.position.lerpVectors(fromPos, toPos, e);
    controls.target.lerpVectors(fromTgt, toTgt, e);
    if (anim.t >= 1) anim.active = false;
  }

  return { controls, goTo, updateAnim, isAnimating: () => anim.active };
}

/* ------------------------------------------------------------------ */
/*  Режим свободного полёта                                            */
/* ------------------------------------------------------------------ */

export class FlyMode {
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;
    this.enabled = false;
    this.keys = new Set();
    this.speed = 60;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.dragging = false;
    this.last = { x: 0, y: 0 };
    this._dir = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);

    this._onDown = (e) => {
      if (!this.enabled) return;
      this.dragging = true;
      this.last = { x: e.clientX, y: e.clientY };
    };
    this._onMove = (e) => {
      if (!this.enabled || !this.dragging) return;
      const dx = e.clientX - this.last.x;
      const dy = e.clientY - this.last.y;
      this.last = { x: e.clientX, y: e.clientY };
      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= dx * 0.0026;
      this.euler.x = THREE.MathUtils.clamp(this.euler.x - dy * 0.0026, -1.45, 1.45);
      this.camera.quaternion.setFromEuler(this.euler);
    };
    this._onUp = () => { this.dragging = false; };

    domElement.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (this.enabled && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  setEnabled(on) {
    this.enabled = on;
    this.dom.style.cursor = on ? 'crosshair' : '';
    if (on) {
      this.euler.setFromQuaternion(this.camera.quaternion);
    }
  }

  update(dt) {
    if (!this.enabled) return;
    const k = this.keys;
    const boost = k.has('ShiftLeft') || k.has('ShiftRight') ? 5 : 1;
    const slow = k.has('AltLeft') ? 0.25 : 1;
    const v = this.speed * boost * slow * dt;

    this.camera.getWorldDirection(this._dir);
    this._right.crossVectors(this._dir, this._up).normalize();

    if (k.has('KeyW') || k.has('ArrowUp')) this.camera.position.addScaledVector(this._dir, v);
    if (k.has('KeyS') || k.has('ArrowDown')) this.camera.position.addScaledVector(this._dir, -v);
    if (k.has('KeyD') || k.has('ArrowRight')) this.camera.position.addScaledVector(this._right, v);
    if (k.has('KeyA') || k.has('ArrowLeft')) this.camera.position.addScaledVector(this._right, -v);
    if (k.has('KeyE') || k.has('Space')) this.camera.position.y += v;
    if (k.has('KeyQ') || k.has('ControlLeft')) this.camera.position.y -= v;

    if (this.camera.position.y < 2) this.camera.position.y = 2;
  }
}
