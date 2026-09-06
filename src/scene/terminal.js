import * as THREE from 'three';
import { MAT, EMIT } from '../utils/materials.js';
import { box, sharpBox, slab, group, describe, textTexture } from '../utils/helpers.js';
import { TERMINAL, GATES } from './layout.js';

/**
 * Пассажирский терминал Пулково-1 (2013).
 *
 * Кровля — объёмная складка-«гармошка»: профиль выдавливается на всю
 * глубину здания, поэтому у неё есть настоящая толщина и торцы,
 * а не бумажная поверхность. В долинах складок — квадратные световые
 * фонари, узнаваемая черта аэровокзала.
 */

const H_PARAPET = 2.6;      // глухой цоколь
const H_FACADE = 19.5;      // верх остекления
const ROOF_T = 1.8;         // толщина плиты кровли
const FOLD_AMP = 6.2;       // высота складки
const FOLDS = 7;            // число складок по фасаду

export function createTerminal() {
  const root = group('Терминал Пулково-1');
  root.position.set(TERMINAL.cx, 0, TERMINAL.cz);

  const W = TERMINAL.w;
  const D = TERMINAL.d;

  const shell = group('shell');        // прячется в режиме разреза
  const interior = group('interior');
  root.add(shell, interior);

  /* ------------------------- стилобат и пол ------------------------- */
  root.add(sharpBox(W + 30, 1.4, D + 26, MAT.concrete, 0, 0, 0));
  interior.add(slab(W - 2, D - 2, MAT.floorInside, 0, 1.45, 0));

  /* ---------------------------- кровля ------------------------------ */
  const roofW = W + 26;
  const roofD = D + 20;
  const roof = foldedRoof(roofW, roofD);
  shell.add(roof);

  /* ---------------------------- фасады ------------------------------ */
  // В режиме разреза снимаются только фасады: кровля остаётся на месте,
  // и зал читается именно так, как его показывают на архитектурных разрезах
  const glazing = facades(W, D);
  shell.add(glazing);

  /* -------------------------- конструктив --------------------------- */
  shell.add(colonnade(W, D));

  /* --------------------------- интерьер ----------------------------- */
  interior.add(interiorFitout(W, D));

  // Ночная подсветка зала: светящиеся плоскости за остеклением —
  // здание читается силуэтом даже в темноте
  for (const [w, x, z, ry] of [[W - 8, 0, D / 2 - 2.5, 0], [W - 8, 0, -D / 2 + 2.5, Math.PI],
    [D - 8, W / 2 - 2.5, 0, Math.PI / 2], [D - 8, -W / 2 + 2.5, 0, -Math.PI / 2]]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, 9), EMIT.windowWarm);
    panel.position.set(x, 7.6, z);
    panel.rotation.y = ry;
    interior.add(panel);
  }

  /* --------------------------- вывеска ------------------------------ */
  const signTex = textTexture('ПУЛКОВО', {
    width: 1024, height: 180, font: '600 118px Inter, Arial', color: '#20262e',
  });
  for (const [x, z, ry] of [[-58, D / 2 + 0.7, 0], [58, -D / 2 - 0.7, Math.PI]]) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(58, 10.2),
      new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false }),
    );
    sign.position.set(x, H_FACADE - 3.4, z);
    sign.rotation.y = ry;
    shell.add(sign);
  }

  /* ------------------- галерея выходов и телетрапы ------------------- */
  const pier = createPier(W);
  root.add(pier.group);

  describe(root, {
    title: 'Терминал Пулково-1',
    tag: 'Пассажирский терминал',
    text: 'Централизованный пассажирский терминал, открытый в декабре 2013 года.',
    facts: [['Площадь', '≈ 105 000 м²'], ['Открытие', 'декабрь 2013']],
  });

  return { root, shell, glazing, interior, jetbridges: pier.jetbridges };
}

/* ------------------------------------------------------------------ */
/*  Складчатая кровля                                                  */
/* ------------------------------------------------------------------ */

function foldedRoof(W, D) {
  const g = group('Кровля');
  const base = H_FACADE;
  const period = W / FOLDS;

  // Профиль складки: снизу ровная плита, сверху «гармошка»
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2, base - ROOF_T);
  shape.lineTo(W / 2, base - ROOF_T);

  const steps = FOLDS * 12;
  for (let i = steps; i >= 0; i--) {
    const x = -W / 2 + (W * i) / steps;
    const t = ((x / period) % 1 + 1) % 1;
    const tri = 1 - Math.abs(t * 2 - 1);
    // сглаженная вершина складки — грань ловит мягкий блик
    const h = base + FOLD_AMP * (0.15 + 0.85 * Math.sin(tri * Math.PI * 0.5) ** 1.4);
    shape.lineTo(x, h);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false, curveSegments: 2 });
  geo.translate(0, 0, -D / 2);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, MAT.roofGold);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'roof';
  g.add(mesh);

  // Тонкий тёмный карниз по периметру — очерчивает объём
  for (const [w, d, x, z] of [[W + 1.2, 0.9, 0, D / 2], [W + 1.2, 0.9, 0, -D / 2]]) {
    g.add(sharpBox(w, 0.7, d, MAT.roofGoldDark, x, base - ROOF_T - 0.7, z));
  }
  for (const x of [-W / 2, W / 2]) {
    g.add(sharpBox(0.9, 0.7, D, MAT.roofGoldDark, x, base - ROOF_T - 0.7, 0));
  }

  // Светлая подшивка потолка — снизу кровля не должна читаться глухой массой
  const ceiling = slab(W - 2, D - 2, MAT.wallLight, 0, base - ROOF_T - 0.05, 0);
  ceiling.rotation.x = Math.PI / 2;   // нормалью вниз, в зал
  g.add(ceiling);

  // Квадратные световые фонари в вершинах складок
  const lanterns = group('Световые фонари');
  const rows = 6;
  for (let ix = 0; ix < FOLDS; ix++) {
    const x = -W / 2 + period * (ix + 0.5);
    const yTop = base + FOLD_AMP;
    for (let iz = 0; iz < rows; iz++) {
      const z = -D / 2 + (D / rows) * (iz + 0.5);

      const frame = sharpBox(7.4, 0.55, 7.4, MAT.mullion, x, yTop - 0.5, z);
      lanterns.add(frame);

      const glass = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), MAT.glassDark);
      glass.rotation.x = -Math.PI / 2;
      glass.position.set(x, yTop + 0.12, z);
      lanterns.add(glass);

      // проём фонаря, видимый из зала
      const well = new THREE.Mesh(
        new THREE.PlaneGeometry(6.2, 6.2),
        new THREE.MeshBasicMaterial({ color: 0xf2f6fa, toneMapped: false }),
      );
      well.rotation.x = Math.PI / 2;
      well.position.set(x, base - ROOF_T - 0.02, z);
      lanterns.add(well);

      // ночью фонарь светится изнутри
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 6.0), EMIT.windowCool);
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(x, yTop - 0.62, z);
      lanterns.add(glow);
    }
  }
  g.add(lanterns);

  return g;
}

/* ------------------------------------------------------------------ */
/*  Фасады                                                             */
/* ------------------------------------------------------------------ */

function facades(W, D) {
  const g = group('Фасады');

  const sides = [
    { w: W, x: 0, z: D / 2, rot: 0 },
    { w: W, x: 0, z: -D / 2, rot: Math.PI },
    { w: D, x: W / 2, z: 0, rot: Math.PI / 2 },
    { w: D, x: -W / 2, z: 0, rot: -Math.PI / 2 },
  ];

  for (const f of sides) {
    const side = new THREE.Group();
    side.position.set(f.x, 0, f.z);
    side.rotation.y = f.rot;

    // глухой цоколь
    side.add(sharpBox(f.w, H_PARAPET, 0.9, MAT.wallLight, 0, 1.4, 0));

    // сплошное остекление
    const glassH = H_FACADE - H_PARAPET - 1.4;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(f.w, glassH), MAT.glassTerminal);
    glass.position.set(0, 1.4 + H_PARAPET + glassH / 2, 0);
    side.add(glass);

    // частая сетка импостов — масштаб здания читается именно по ней
    const n = Math.max(6, Math.round(f.w / 3.6));
    const postGeo = new THREE.BoxGeometry(0.26, glassH, 0.42);
    const posts = new THREE.InstancedMesh(postGeo, MAT.mullion, n + 1);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      p.set(-f.w / 2 + (i * f.w) / n, 1.4 + H_PARAPET + glassH / 2, 0);
      m.compose(p, q, s);
      posts.setMatrixAt(i, m);
    }
    posts.instanceMatrix.needsUpdate = true;
    posts.castShadow = true;
    side.add(posts);

    // горизонтальные ригели
    for (let k = 1; k <= 3; k++) {
      const y = 1.4 + H_PARAPET + (glassH * k) / 4;
      side.add(sharpBox(f.w, 0.3, 0.52, MAT.mullion, 0, y - 0.15, 0));
    }

    // верхний пояс под кровлей
    side.add(sharpBox(f.w, 1.1, 0.8, MAT.wallGrey, 0, H_FACADE - 1.1, 0));

    g.add(side);
  }

  return g;
}

/* ------------------------------------------------------------------ */
/*  Колонны                                                            */
/* ------------------------------------------------------------------ */

function colonnade(W, D) {
  const g = group('Конструктив');
  const period = W / FOLDS;

  for (let i = 0; i <= FOLDS; i++) {
    const x = -W / 2 + period * i;
    for (const z of [-D / 2 - 6, D / 2 + 6]) {
      // V-образная пара наклонных стоек
      for (const lean of [-1, 1]) {
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.62, H_FACADE, 10), MAT.steel,
        );
        col.position.set(x + lean * 2.6, H_FACADE / 2, z);
        col.rotation.z = lean * 0.055;
        col.castShadow = true;
        g.add(col);
      }
    }
  }
  return g;
}

/* ------------------------------------------------------------------ */
/*  Интерьер                                                           */
/* ------------------------------------------------------------------ */

function interiorFitout(W, D) {
  const g = group('Интерьер');

  // антресоль вылета
  g.add(sharpBox(W - 46, 0.9, 40, MAT.wallLight, 0, 8.2, 32));
  for (let x = -(W - 60) / 2; x <= (W - 60) / 2; x += 22) {
    g.add(sharpBox(0.7, 6.8, 0.7, MAT.steel, x, 1.45, 14));
  }

  // стойки регистрации
  for (const zBase of [24, 4]) {
    const island = new THREE.Group();
    island.position.set(-W / 2 + 58, 1.45, zBase);
    island.add(box(92, 1.1, 3.0, MAT.wallLight, 0, 0, 0));
    island.add(sharpBox(92, 0.12, 3.5, MAT.steel, 0, 1.1, 0));
    for (let i = 0; i < 15; i++) {
      island.add(box(0.65, 0.85, 0.1, EMIT.windowCool, -44 + i * 6.2, 1.25, -1.4));
      island.add(box(1.1, 0.85, 1.1, MAT.wallGrey, -44 + i * 6.2, 0, 2.2));
    }
    g.add(island);
  }

  // карусели выдачи багажа
  for (let i = 0; i < 3; i++) {
    const belt = new THREE.Mesh(new THREE.TorusGeometry(10.5, 1.4, 10, 44), MAT.wallGrey);
    belt.scale.set(1, 1, 0.45);
    belt.rotation.x = Math.PI / 2;
    belt.position.set(W / 2 - 48, 2.5, -38 + i * 32);
    belt.castShadow = true;
    g.add(belt);
  }

  // колонны зала
  const colGeo = new THREE.CylinderGeometry(0.85, 1.1, H_FACADE - 2, 14);
  for (let ix = 0; ix < 6; ix++) {
    for (let iz = 0; iz < 3; iz++) {
      const c = new THREE.Mesh(colGeo, MAT.wallLight);
      c.position.set(-W / 2 + 40 + ix * 38, (H_FACADE - 2) / 2, -D / 2 + 42 + iz * 42);
      c.castShadow = true;
      g.add(c);
    }
  }

  // информационные табло
  for (const [x, z, ry] of [[-38, D / 2 - 14, 0], [38, -D / 2 + 14, Math.PI]]) {
    const board = box(20, 4.4, 0.5, EMIT.windowCool, x, 6.2, z);
    board.rotation.y = ry;
    g.add(board);
  }

  // кресла зоны ожидания
  const seatGeo = new THREE.BoxGeometry(1.5, 0.45, 1.5);
  const rows = new THREE.InstancedMesh(seatGeo, MAT.vehicleBlue, 220);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  let i = 0;
  for (let r = 0; r < 8 && i < 220; r++) {
    for (let c = 0; c < 28 && i < 220; c++) {
      p.set(-95 + c * 7, 2.1, -D / 2 + 26 + r * 7);
      m.compose(p, q, s);
      rows.setMatrixAt(i++, m);
    }
  }
  rows.instanceMatrix.needsUpdate = true;
  rows.castShadow = true;
  g.add(rows);

  // торговая галерея — сдержанные объёмы, без цветовой каши
  for (let k = 0; k < 9; k++) {
    const shop = box(15, 5.0, 9, k % 3 === 0 ? MAT.wallGrey : MAT.wallLight,
      -W / 2 + 34 + k * 25, 1.45, -D / 2 + 14);
    g.add(shop);
  }

  return g;
}

/* ------------------------------------------------------------------ */
/*  Галерея выходов и телескопические трапы                            */
/* ------------------------------------------------------------------ */

function createPier(W) {
  const g = group('Галерея выходов');
  const z = TERMINAL.pierZ - TERMINAL.cz;
  const jetbridges = [];
  const len = W + 120;

  // тело галереи
  g.add(sharpBox(len, 8.4, 20, MAT.wallLight, 0, 1.2, z));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(len + 0.5, 4.6, 20.5), MAT.glassDark);
  glass.position.set(0, 11.4, z);
  g.add(glass);
  g.add(sharpBox(len + 5, 0.8, 22.5, MAT.roofGoldDark, 0, 14.2, z));

  // переход к основному зданию
  const bridgeFar = z + 10;
  const bridgeNear = -TERMINAL.d / 2;
  g.add(sharpBox(46, 7.6, bridgeNear - bridgeFar, MAT.wallLight, 0, 1.2, (bridgeFar + bridgeNear) / 2));

  // опоры
  for (let x = -len / 2 + 8; x <= len / 2 - 8; x += 24) {
    g.add(sharpBox(1.2, 1.2, 1.2, MAT.steel, x, 0, z + 8));
    g.add(sharpBox(1.2, 1.2, 1.2, MAT.steel, x, 0, z - 8));
  }

  for (const gate of GATES) {
    const jb = createJetbridge(gate);
    jb.position.set(gate.x - TERMINAL.cx, 0, z - 10);
    g.add(jb);
    jetbridges.push(jb);
  }

  return { group: g, jetbridges };
}

function createJetbridge(gate) {
  const g = new THREE.Group();
  g.name = `Телетрап ${gate.id}`;

  const rot = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 5.4, 14), MAT.jetbridge);
  rot.position.y = 8.2;
  rot.castShadow = true;
  g.add(rot);

  const arm = new THREE.Group();
  arm.position.y = 8.2;
  g.add(arm);
  const len = gate.type === 'wide' ? 32 : 26;

  const tunnel = box(3.9, 4.0, len, MAT.jetbridge, 0, -2.0, -len / 2 - 2.2);
  tunnel.castShadow = true;
  arm.add(tunnel);

  for (const s of [-1, 1]) {
    const win = sharpBox(0.12, 1.3, len - 3, MAT.glassDark, s * 2.0, -1.3, -len / 2 - 2.2);
    arm.add(win);
  }

  const cab = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.2, 4.3, 14), MAT.jetbridge);
  cab.position.set(0, -0.2, -len - 3.2);
  cab.castShadow = true;
  arm.add(cab);

  const legs = new THREE.Group();
  legs.position.set(0, -2.4, -len * 0.6);
  arm.add(legs);
  legs.add(sharpBox(5.2, 0.7, 1.5, MAT.wallGrey, 0, -3.9, 0));
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 5.2, 8), MAT.steel);
    leg.position.set(s * 2.0, -1.3, 0);
    legs.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.65, 12), MAT.tyre);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(s * 2.0, -4.2, 0);
    legs.add(wheel);
  }

  g.userData.arm = arm;
  g.userData.parkedAngle = 0;
  g.userData.stowedAngle = gate.x < 0 ? 0.8 : -0.8;
  arm.rotation.y = g.userData.stowedAngle;

  return g;
}
