import * as THREE from 'three';
import { createAircraft, TYPES, LIVERIES } from './aircraft.js';
import { apronBus, baggageTrain, fuelTruck } from './vehicles.js';
import { group } from '../utils/helpers.js';
import { GATES, REMOTE_STANDS, TERMINAL, RWY1, RWY2, APRON } from './layout.js';

const REGS = ['RA-73745', 'RA-89108', 'VQ-BCM', 'RA-73412', 'VP-BLR', 'RA-89065',
  'VQ-BQX', 'RA-73024', 'VP-BFF', 'RA-89141', 'VQ-BTV', 'RA-73136'];
const FLIGHTS = ['SU 6001', 'FV 6012', 'DP 407', 'S7 2044', 'U6 251', 'WZ 1188',
  'N4 623', 'A4 512', 'SU 27', 'FV 6408'];

/**
 * Объект, движущийся по кривой с ориентацией по касательной.
 * loop: 'wrap' — по кругу; 'once' — с паузой и скрытием в конце.
 */
class Mover {
  constructor(obj, curve, duration, { loop = 'wrap', pause = 0, delay = 0, bank = 0 } = {}) {
    this.obj = obj;
    this.curve = curve;
    this.duration = duration;
    this.loop = loop;
    this.pause = pause;
    this.bank = bank;
    this.t = -delay / duration;
    this._p = new THREE.Vector3();
    this._d = new THREE.Vector3();
  }

  update(dt) {
    this.t += dt / this.duration;
    if (this.t < 0) { this.obj.visible = false; return; }

    if (this.t > 1) {
      if (this.loop === 'wrap') {
        this.t -= Math.floor(this.t);
      } else {
        this.obj.visible = false;
        if (this.t > 1 + this.pause / this.duration) this.t = 0;
        return;
      }
    }
    this.obj.visible = true;
    this.curve.getPointAt(Math.min(this.t, 1), this._p);
    this.curve.getTangentAt(Math.min(this.t, 0.999), this._d);
    this.obj.position.copy(this._p);
    this.obj.rotation.y = Math.atan2(this._d.x, this._d.z);
    if (this.bank) {
      this.obj.rotation.z = 0;
      this.obj.rotation.x = Math.asin(THREE.MathUtils.clamp(this._d.y, -1, 1)) * 0.9;
    }
  }
}

/** Кривая по точкам [[x, y, z], ...]. */
function curve3(points, closed = false) {
  const c = new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), closed, 'catmullrom', 0.35,
  );
  return c;
}

export function createTraffic() {
  const g = group('Воздушные суда');
  const movers = [];
  const beacons = [];
  const parked = [];

  let regI = 0;
  let flightI = 0;
  const nextReg = () => REGS[regI++ % REGS.length];
  const nextFlight = () => FLIGHTS[flightI++ % FLIGHTS.length];

  const standZ = TERMINAL.pierZ - 60;

  /* ---------- Самолёты у телетрапов ---------- */
  const gateTypes = ['narrow', 'narrowLong', 'regional', 'wideMid', 'wide', 'narrow', 'regional', 'narrowLong'];
  GATES.forEach((gate, i) => {
    if (i === 3) return;                                  // одна стоянка свободна
    const type = gate.type === 'wide' ? (i === 4 ? 'wide' : 'wideMid') : gateTypes[i];
    const ac = createAircraft({
      type, livery: LIVERIES[i % LIVERIES.length], reg: nextReg(), flight: nextFlight(),
    });
    const spec = TYPES[type];
    // нос к терминалу (+Z), передняя стойка на оси заруливания
    ac.position.set(gate.x, 0, standZ - spec.length * 0.05);
    ac.rotation.y = 0;
    g.add(ac);
    parked.push({ ac, gate });
    beacons.push(ac.userData.beacon);
  });

  /* ---------- Самолёты на удалённых стоянках ---------- */
  REMOTE_STANDS.forEach((st, i) => {
    if (i === 4) return;
    const type = i % 2 ? 'regional' : 'narrow';
    const ac = createAircraft({
      type, livery: LIVERIES[(i + 3) % LIVERIES.length], reg: nextReg(), flight: nextFlight(),
    });
    ac.position.set(st.x, 0, st.z);
    ac.rotation.y = Math.PI * (i % 2 ? 1 : 0);
    g.add(ac);
    beacons.push(ac.userData.beacon);
  });

  /* ---------- Руление на исполнительный старт ---------- */
  const taxiAc = createAircraft({
    type: 'narrow', livery: LIVERIES[2], reg: nextReg(), flight: nextFlight(),
  });
  g.add(taxiAc);
  beacons.push(taxiAc.userData.beacon);
  const taxiCurve = curve3([
    [340, 0, standZ - 30],
    [340, 0, -430],
    [420, 0, -540],
    [420, 0, -820],
    [420, 0, -970],
    [RWY1.cx + RWY1.length / 2 - 260, 0, RWY1.cz],
    [RWY1.cx + RWY1.length / 2 - 120, 0, RWY1.cz],
  ]);
  movers.push(new Mover(taxiAc, taxiCurve, 190, { loop: 'once', pause: 60, delay: 4 }));

  /* ---------- Взлёт с ВПП-1 (курс 280°, разбег в -X) ---------- */
  const depAc = createAircraft({
    type: 'narrowLong', livery: LIVERIES[0], reg: nextReg(), flight: nextFlight(),
  });
  g.add(depAc);
  beacons.push(depAc.userData.beacon);
  const x0 = RWY1.cx + RWY1.length / 2 - 100;
  const depCurve = curve3([
    [x0, 0, RWY1.cz],
    [x0 - 400, 0, RWY1.cz],
    [x0 - 900, 0, RWY1.cz],
    [x0 - 1500, 12, RWY1.cz],
    [x0 - 2100, 120, RWY1.cz],
    [x0 - 3000, 350, RWY1.cz],
    [x0 - 4600, 720, RWY1.cz + 60],
    [x0 - 7000, 1250, RWY1.cz + 260],
  ]);
  movers.push(new Mover(depAc, depCurve, 52, { loop: 'once', pause: 30, delay: 10, bank: 1 }));

  /* ---------- Заход и посадка на ВПП-2 (курс 100°, посадка в +X) ---------- */
  const arrAc = createAircraft({
    type: 'wideMid', livery: LIVERIES[6], reg: nextReg(), flight: nextFlight(),
  });
  g.add(arrAc);
  beacons.push(arrAc.userData.beacon);
  const xT = RWY2.cx - RWY2.length / 2;
  const arrCurve = curve3([
    [xT - 6500, 640, RWY2.cz - 220],
    [xT - 4200, 400, RWY2.cz - 90],
    [xT - 2600, 245, RWY2.cz],
    [xT - 1200, 110, RWY2.cz],
    [xT - 300, 26, RWY2.cz],
    [xT + 260, 1.5, RWY2.cz],
    [xT + 1100, 0, RWY2.cz],
    [xT + 2200, 0, RWY2.cz],
    [xT + 3100, 0, RWY2.cz],
    [xT + 3600, 0, RWY2.cz + 30],
  ]);
  movers.push(new Mover(arrAc, arrCurve, 74, { loop: 'once', pause: 26, delay: 2, bank: 1 }));

  /* ---------- Наземная техника в движении ---------- */
  const fleet = group('Движущаяся техника');
  const busRoute = curve3([
    [-560, 0, standZ + 60],
    [-200, 0, standZ + 74],
    [180, 0, standZ + 74],
    [520, 0, standZ + 50],
    [560, 0, -430],
    [200, 0, -470],
    [-260, 0, -470],
    [-580, 0, -420],
  ], true);
  for (let i = 0; i < 4; i++) {
    const b = apronBus();
    fleet.add(b);
    movers.push(new Mover(b, busRoute, 150, { delay: -i * 37 }));
  }

  const bagRoute = curve3([
    [-300, 0, standZ + 40],
    [-40, 0, standZ + 52],
    [240, 0, standZ + 44],
    [300, 0, standZ - 4],
    [40, 0, standZ - 16],
    [-280, 0, standZ - 8],
  ], true);
  for (let i = 0; i < 3; i++) {
    const t = baggageTrain();
    fleet.add(t);
    movers.push(new Mover(t, bagRoute, 120, { delay: -i * 40 }));
  }

  const fuelRoute = curve3([
    [-620, 0, APRON.cz + 130],
    [-200, 0, APRON.cz + 150],
    [300, 0, APRON.cz + 140],
    [600, 0, APRON.cz + 60],
    [600, 0, standZ + 90],
    [0, 0, standZ + 96],
    [-620, 0, standZ + 80],
  ], true);
  for (let i = 0; i < 2; i++) {
    const f = fuelTruck();
    fleet.add(f);
    movers.push(new Mover(f, fuelRoute, 210, { delay: -i * 105 }));
  }

  g.add(fleet);

  return { group: g, movers, beacons, parked };
}

/** Пульсация проблесковых маяков воздушных судов. */
export function updateBeacons(beacons, time) {
  for (let i = 0; i < beacons.length; i++) {
    const b = beacons[i];
    if (!b) continue;
    const phase = (time * 1.1 + i * 0.37) % 1;
    const on = phase < 0.14;
    b.scale.setScalar(on ? 2.0 : 0.5);
  }
}
