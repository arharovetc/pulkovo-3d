import * as THREE from 'three';

/**
 * HTML-подписи, привязанные к точкам сцены.
 * Дешевле CSS2DRenderer и не тянет лишних зависимостей.
 */
export class LabelLayer {
  constructor(container) {
    this.root = document.createElement('div');
    this.root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;overflow:hidden';
    container.appendChild(this.root);
    this.items = [];
    this.enabled = true;
    this._v = new THREE.Vector3();
  }

  add(worldPos, text, { major = false, maxDist = 3200, minDist = 0 } = {}) {
    const el = document.createElement('div');
    el.className = `tag3d${major ? ' major' : ''}`;
    el.textContent = text;
    this.root.appendChild(el);
    this.items.push({ el, pos: worldPos.clone(), maxDist, minDist });
    return el;
  }

  setEnabled(on) {
    this.enabled = on;
    this.root.style.display = on ? '' : 'none';
  }

  update(camera) {
    if (!this.enabled) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const it of this.items) {
      const d = camera.position.distanceTo(it.pos);
      if (d > it.maxDist || d < it.minDist) { it.el.style.display = 'none'; continue; }
      this._v.copy(it.pos).project(camera);
      if (this._v.z > 1) { it.el.style.display = 'none'; continue; }
      const x = (this._v.x * 0.5 + 0.5) * w;
      const y = (-this._v.y * 0.5 + 0.5) * h;
      if (x < -140 || x > w + 140 || y < -40 || y > h + 40) {
        it.el.style.display = 'none';
        continue;
      }
      it.el.style.display = '';
      it.el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      it.el.style.opacity = String(Math.max(0.25, 1 - d / it.maxDist));
    }
  }
}
