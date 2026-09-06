import * as THREE from 'three';
import { MAT, EMIT } from '../utils/materials.js';
import { box, group, describe, rand, pick, rnd } from '../utils/helpers.js';
import { GATES, REMOTE_STANDS, TERMINAL, APRON } from './layout.js';

/* --------------------------- фабрики ------------------------------- */

function wheels(g, w, l, r = 0.55) {
  const geo = new THREE.CylinderGeometry(r, r, 0.4, 10);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wh = new THREE.Mesh(geo, MAT.tyre);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(sx * (w / 2 - 0.2), r, sz * (l / 2 - 0.9));
      g.add(wh);
    }
  }
}

/** Перронный автобус. */
export function apronBus() {
  const g = group('Перронный автобус');
  g.add(box(3.0, 2.5, 12, MAT.vehicleWhite, 0, 1.0, 0));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(3.05, 1.1, 11.2), MAT.glassDark);
  glass.position.y = 2.6;
  g.add(glass);
  g.add(box(3.05, 0.45, 11.5, MAT.vehicleBlue, 0, 1.15, 0));
  g.add(box(2.6, 0.2, 11.6, MAT.wallGrey, 0, 3.5, 0));
  wheels(g, 3.0, 12, 0.62);
  const head = box(0.7, 0.4, 0.2, EMIT.windowCool, -0.9, 1.5, 6.05);
  g.add(head, box(0.7, 0.4, 0.2, EMIT.windowCool, 0.9, 1.5, 6.05));
  return describe(g, {
    title: 'Перронный автобус',
    tag: 'Наземное обслуживание',
    text: 'Доставляет пассажиров между терминалом и удалёнными стоянками воздушных судов.',
    facts: [['Вместимость', '≈ 110 чел.'], ['Пол', 'низкий, с двух сторон']],
  });
}

/** Тягач для буксировки ВС. */
export function pushbackTug() {
  const g = group('Буксировщик');
  g.add(box(3.2, 1.1, 6.4, MAT.vehicleYellow, 0, 0.5, 0));
  g.add(box(2.2, 1.5, 2.4, MAT.vehicleYellow, 0, 1.6, -1.4));
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.0, 2.45), MAT.glassDark);
  cab.position.set(0, 2.6, -1.4);
  g.add(cab);
  wheels(g, 3.2, 6.4, 0.62);
  g.add(box(1.4, 0.25, 0.25, EMIT.signYellow, 0, 3.2, -1.4));
  return describe(g, {
    title: 'Буксировщик воздушных судов',
    tag: 'Наземное обслуживание',
    text: 'Низкопрофильный тягач для отталкивания самолёта от телетрапа и буксировки по перрону.',
    facts: [['Тяговое усилие', 'до 30 т'], ['Тип', 'безводильный']],
  });
}

/** Топливозаправщик. */
export function fuelTruck() {
  const g = group('Топливозаправщик');
  g.add(box(2.9, 1.3, 10, MAT.vehicleGrey, 0, 0.6, 0));
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 7.2, 14), MAT.vehicleWhite);
  tank.rotation.x = Math.PI / 2;
  tank.position.set(0, 2.5, -0.8);
  tank.castShadow = true;
  g.add(tank);
  g.add(box(2.6, 2.0, 2.4, MAT.vehicleWhite, 0, 1.3, 4.0));
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.9, 2.0), MAT.glassDark);
  cab.position.set(0, 3.0, 4.1);
  g.add(cab);
  wheels(g, 2.9, 10, 0.7);
  return describe(g, {
    title: 'Топливозаправщик',
    tag: 'Наземное обслуживание',
    text: 'Заправка воздушных судов авиакеросином Jet A-1 на местах стоянки.',
    facts: [['Ёмкость', '30 000 л'], ['Производительность', '2 400 л/мин']],
  });
}

/** Багажный тягач с тележками. */
export function baggageTrain() {
  const g = group('Багажный поезд');
  const tug = box(1.8, 1.3, 3.2, MAT.vehicleWhite, 0, 0.45, 0);
  g.add(tug);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.8, 1.4), MAT.glassDark);
  cab.position.set(0, 1.9, -0.4);
  g.add(cab);
  wheels(g, 1.8, 3.2, 0.42);
  for (let i = 1; i <= 3; i++) {
    const cart = new THREE.Group();
    cart.position.z = -2.4 - i * 4.2;
    cart.add(box(2.2, 0.5, 3.4, MAT.vehicleGrey, 0, 0.5, 0));
    cart.add(box(2.3, 1.6, 0.15, MAT.vehicleWhite, 0, 1.0, -1.7));
    cart.add(box(2.3, 1.6, 0.15, MAT.vehicleWhite, 0, 1.0, 1.7));
    cart.add(box(0.15, 1.6, 3.4, MAT.vehicleWhite, -1.1, 1.0, 0));
    cart.add(box(0.15, 1.6, 3.4, MAT.vehicleWhite, 1.1, 1.0, 0));
    // багаж
    for (let k = 0; k < 4; k++) {
      const bagMat = new THREE.MeshStandardMaterial({
        color: pick([0x2b3a55, 0x8b2f2f, 0x2f6b4a, 0x555555]), roughness: 0.8,
      });
      cart.add(box(0.7, 0.35, 0.5, bagMat, rand(-0.6, 0.6), 1.0, rand(-1.2, 1.2)));
    }
    wheels(cart, 2.2, 3.4, 0.32);
    g.add(cart);
  }
  return describe(g, {
    title: 'Багажный поезд',
    tag: 'Наземное обслуживание',
    text: 'Перевозка багажа между сортировочным центром терминала и бортом воздушного судна.',
    facts: [['Тележек', '3'], ['Скорость на перроне', 'до 25 км/ч']],
  });
}

/** Самоходный трап. */
export function passengerStairs() {
  const g = group('Трап');
  g.add(box(2.6, 1.2, 6.5, MAT.vehicleWhite, 0, 0.5, 0));
  const ramp = box(2.4, 0.4, 9.5, MAT.vehicleWhite, 0, 3.0, -1.5);
  ramp.rotation.x = 0.42;
  g.add(ramp);
  for (const s of [-1, 1]) {
    const rail = box(0.1, 1.1, 9.5, MAT.steel, s * 1.15, 3.6, -1.5);
    rail.rotation.x = 0.42;
    g.add(rail);
  }
  g.add(box(2.8, 0.2, 2.2, MAT.vehicleWhite, 0, 5.1, -6.2));
  wheels(g, 2.6, 6.5, 0.5);
  return describe(g, {
    title: 'Самоходный трап',
    tag: 'Наземное обслуживание',
    text: 'Обеспечивает посадку и высадку пассажиров на удалённых стоянках.',
    facts: [['Высота площадки', '2,5–5,8 м']],
  });
}

/** Источник наземного электропитания / кондиционирования. */
export function gpuUnit() {
  const g = group('Наземное электропитание');
  g.add(box(2.2, 1.8, 3.6, MAT.vehicleYellow, 0, 0.4, 0));
  g.add(box(1.4, 0.4, 0.6, MAT.wallDark, 0, 2.2, 0));
  wheels(g, 2.2, 3.6, 0.4);
  return g;
}

/** Противообледенительная машина. */
export function deicer() {
  const g = group('Деайсер');
  g.add(box(2.9, 1.5, 8.4, MAT.vehicleGrey, 0, 0.6, 0));
  g.add(box(2.6, 1.9, 2.2, MAT.vehicleYellow, 0, 1.5, 3.2));
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 4.4, 12), MAT.vehicleYellow);
  tank.rotation.x = Math.PI / 2;
  tank.position.set(0, 2.4, -1.4);
  g.add(tank);
  const boom = box(0.9, 0.9, 11, MAT.vehicleYellow, 0, 4.4, -3.5);
  boom.rotation.x = -0.55;
  g.add(boom);
  g.add(box(1.8, 1.4, 1.6, MAT.vehicleYellow, 0, 8.4, -8.0));
  wheels(g, 2.9, 8.4, 0.7);
  return describe(g, {
    title: 'Противообледенительная машина',
    tag: 'Наземное обслуживание',
    text: 'Обработка воздушного судна противообледенительной жидкостью перед вылетом — критически важная процедура для петербургской зимы.',
    facts: [['Высота стрелы', 'до 18 м'], ['Жидкость', 'Тип I / Тип IV']],
  });
}

/* --------------------- расстановка по перрону ---------------------- */

export function createGroundFleet() {
  const g = group('Наземная техника');
  const movers = [];

  const standZ = TERMINAL.pierZ - 60;

  // Обслуживание у контактных стоянок
  for (const gate of GATES) {
    const x = gate.x;
    const fleet = [
      { make: baggageTrain, dx: -26, dz: 14, ry: 0.2 },
      { make: gpuUnit, dx: 16, dz: 22, ry: -0.4 },
      { make: fuelTruck, dx: 24, dz: -4, ry: Math.PI / 2 },
    ];
    for (const f of fleet) {
      if (rnd() > 0.75) continue;
      const v = f.make();
      v.position.set(x + f.dx, 0, standZ + f.dz);
      v.rotation.y = f.ry;
      g.add(v);
    }
  }

  // Удалённые стоянки — автобусы и трапы
  for (const st of REMOTE_STANDS) {
    const s = passengerStairs();
    s.position.set(st.x + 16, 0, st.z + 6);
    s.rotation.y = -Math.PI / 2;
    g.add(s);

    const b = apronBus();
    b.position.set(st.x - 22, 0, st.z + 10);
    b.rotation.y = 0.15;
    g.add(b);
  }

  // Стоянка спецтехники у края перрона
  const depot = new THREE.Group();
  depot.position.set(APRON.cx - 520, 0, APRON.cz + 150);
  const row = [deicer(), deicer(), fuelTruck(), pushbackTug(), pushbackTug(), apronBus()];
  row.forEach((v, i) => {
    v.position.set(i * 16, 0, 0);
    v.rotation.y = Math.PI;
    depot.add(v);
  });
  g.add(depot);

  return { group: g, movers };
}
