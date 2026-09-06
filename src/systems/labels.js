import * as THREE from 'three';

/**
 * HTML-подписи, привязанные к точкам сцены.
 * Показываются выборочно — набором имён, заданным текущей главой.
 */
export class LabelLayer {
  constructor(container) {
    this.root = document.createElement('div');
    this.root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;overflow:hidden';
    container.appendChild(this.root);
    this.items = [];
    this.enabled = true;
    this.filter = null;           // null — показывать все
    this._v = new THREE.Vector3();
  }

  add(worldPos, text, { major = false, maxDist = 4200, minDist = 0 } = {}) {
    const el = document.createElement('div');
    el.className = `tag3d${major ? ' major' : ''}`;
    el.textContent = text;
    el.style.opacity = '0';
    this.root.appendChild(el);
    this.items.push({ el, text, pos: worldPos.clone(), maxDist, minDist });
    return el;
  }

  setEnabled(on) {
    this.enabled = on;
    this.root.style.display = on ? '' : 'none';
  }

  /** names: массив подписей главы; пустой массив — не показывать ничего. */
  setFilter(names) {
    this.filter = names ? new Set(names) : null;
  }

  update(camera) {
    if (!this.enabled) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const it of this.items) {
      if (this.filter && !this.filter.has(it.text)) { it.el.style.display = 'none'; continue; }
      const d = camera.position.distanceTo(it.pos);
      if (d > it.maxDist || d < it.minDist) { it.el.style.display = 'none'; continue; }
      this._v.copy(it.pos).project(camera);
      if (this._v.z > 1) { it.el.style.display = 'none'; continue; }
      const x = (this._v.x * 0.5 + 0.5) * w;
      const y = (-this._v.y * 0.5 + 0.5) * h;
      if (x < -160 || x > w + 160 || y < -50 || y > h + 50) {
        it.el.style.display = 'none';
        continue;
      }
      it.el.style.display = '';
      it.el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      it.el.style.opacity = String(Math.max(0.4, 1 - d / it.maxDist));
    }
  }
}
