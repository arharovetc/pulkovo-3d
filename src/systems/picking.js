import * as THREE from 'three';

/**
 * Выбор объектов кликом: подсветка габаритной рамкой + карточка с описанием.
 */
export class Picker {
  constructor(renderer, camera, scene, panel) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;
    this.panel = panel;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.selected = null;

    this.helper = new THREE.Box3Helper(new THREE.Box3(), 0xffcc55);
    this.helper.visible = false;
    this.helper.material.depthTest = false;
    this.helper.material.transparent = true;
    this.helper.material.opacity = 0.9;
    this.helper.renderOrder = 999;
    scene.add(this.helper);

    this._box = new THREE.Box3();
    this._down = { x: 0, y: 0, t: 0 };

    const el = renderer.domElement;
    el.addEventListener('pointerdown', (e) => {
      this._down = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    el.addEventListener('pointerup', (e) => {
      const moved = Math.hypot(e.clientX - this._down.x, e.clientY - this._down.y);
      const dt = performance.now() - this._down.t;
      if (moved < 6 && dt < 600) this.pickAt(e.clientX, e.clientY);
    });

  }

  findHit(cx, cy) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((cx - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((cy - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    for (const h of hits) {
      if (!h.object.visible) continue;
      let o = h.object;
      while (o) {
        if (o.userData && o.userData.info) return o;
        o = o.parent;
      }
    }
    return null;
  }

  pickAt(cx, cy) {
    const target = this.findHit(cx, cy);
    if (!target) { this.clear(); return; }
    this.select(target);
  }

  select(obj) {
    this.selected = obj;
    this._box.setFromObject(obj);
    this.helper.box.copy(this._box);
    this.helper.visible = true;
    this.panel.show(obj.userData.info);
  }

  clear() {
    this.selected = null;
    this.helper.visible = false;
    this.panel.hide();
  }

  /** Рамка следует за движущимися объектами. */
  update() {
    if (!this.selected || !this.helper.visible) return;
    this._box.setFromObject(this.selected);
    this.helper.box.copy(this._box);
  }
}

/** Карточка описания. */
export class InfoPanel {
  constructor() {
    this.el = document.getElementById('info');
    this.title = document.getElementById('info-title');
    this.tag = document.getElementById('info-tag');
    this.text = document.getElementById('info-text');
    this.facts = document.getElementById('info-facts');
    document.getElementById('info-close').addEventListener('click', () => this.hide());
    this.onHide = null;
  }

  show(info) {
    this.title.textContent = info.title || '';
    this.tag.textContent = info.tag || '';
    this.tag.style.display = info.tag ? '' : 'none';
    this.text.textContent = info.text || '';
    this.facts.innerHTML = '';
    for (const [k, v] of info.facts || []) {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      this.facts.append(dt, dd);
    }
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
    if (this.onHide) this.onHide();
  }
}
