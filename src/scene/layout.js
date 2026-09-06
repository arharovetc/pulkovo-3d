/**
 * Генеральный план в локальных координатах аэропорта (метры).
 * +X — направление курса 100° (посадочный курс ВПП), -Z — «север» плана.
 * Вся группа аэропорта повёрнута на AIRPORT_ROT, чтобы совпасть с реальными курсами.
 */
import { DEG } from '../utils/helpers.js';

export const RUNWAY_HEADING = 100;              // 10L/28R и 10R/28L
export const AIRPORT_ROT = -(RUNWAY_HEADING - 90) * DEG;

export const RWY1 = {                            // северная, 10L / 28R
  id: '10L/28R',
  cx: -200, cz: -1000,
  length: 3400, width: 60,
  thresholdWest: '10L', thresholdEast: '28R',
};

export const RWY2 = {                            // южная, 10R / 28L
  id: '10R/28L',
  cx: 100, cz: 900,
  length: 3780, width: 60,
  thresholdWest: '10R', thresholdEast: '28L',
};

export const APRON = { cx: 0, cz: -330, w: 1180, d: 420 };

export const TERMINAL = {                        // Пулково-1 (2013)
  cx: 0, cz: 40,
  w: 268, d: 168,
  roofH: 26,
  pierZ: -110,                                   // ось галереи с телетрапами
};

export const OLD_TERMINAL = {                    // исторический Пулково-1 (1973), «пять стаканов»
  cx: -430, cz: 10,
  w: 132, d: 104,
};

export const TERMINAL2 = { cx: -790, cz: 70, w: 120, d: 62 };   // Пулково-2 (историческое здание)

export const TOWER = { cx: 250, cz: -140, h: 62 };

export const FORECOURT = { cx: 0, cz: 300 };     // привокзальная площадь
export const PARKING = { cx: -40, cz: 400, w: 460, d: 200 };
export const HOTEL = { cx: 300, cz: 360 };

/** Стоянки у телетрапов: X-позиции вдоль фронта терминала. */
export const GATES = [
  { id: 'A1', x: -230, type: 'narrow' },
  { id: 'A2', x: -170, type: 'narrow' },
  { id: 'A3', x: -110, type: 'narrow' },
  { id: 'A4', x: -50, type: 'wide' },
  { id: 'A5', x: 25, type: 'wide' },
  { id: 'A6', x: 100, type: 'narrow' },
  { id: 'A7', x: 160, type: 'narrow' },
  { id: 'A8', x: 220, type: 'narrow' },
];

/** Удалённые стоянки на перроне. */
export const REMOTE_STANDS = [
  { id: 'R21', x: -430, z: -420 },
  { id: 'R22', x: -350, z: -420 },
  { id: 'R23', x: -270, z: -420 },
  { id: 'R24', x: 330, z: -420 },
  { id: 'R25', x: 410, z: -420 },
  { id: 'R26', x: 490, z: -420 },
];

/** Рулёжные дорожки: набор отрезков (осевых линий). */
export const TAXIWAYS = [
  // магистральная РД вдоль перрона (север от терминала)
  { id: 'A', pts: [[-620, -540], [640, -540]], w: 40 },
  // выходы на северную ВПП
  { id: 'B1', pts: [[-560, -540], [-560, -1000]], w: 34 },
  { id: 'B2', pts: [[-120, -540], [-120, -1000]], w: 34 },
  { id: 'B3', pts: [[420, -540], [420, -1000]], w: 34 },
  // связь с южной ВПП в обход терминала
  { id: 'C', pts: [[640, -540], [700, -540], [700, 900]], w: 36 },
  { id: 'D', pts: [[-620, -540], [-700, -540], [-700, 620], [-560, 620], [-560, 900]], w: 36 },
  { id: 'E', pts: [[240, 900], [240, 620], [700, 620]], w: 34 },
];
