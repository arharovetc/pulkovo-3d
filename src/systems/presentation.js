import * as THREE from 'three';

/**
 * Режим показа: сцена разбита на главы. В каждой главе камера медленно
 * идёт по своей траектории и смотрит в свою точку — картинка живёт
 * сама, пока докладчик говорит. Переход к следующей главе — один клик.
 *
 * Координаты глав задаются в локальной системе аэропорта.
 */

export const CHAPTERS = [
  {
    id: 'overview',
    title: 'Пулково',
    subtitle: 'Международный аэропорт Санкт-Петербурга · LED / ULLI',
    time: 15.5,
    duration: 90,
    loop: 'pingpong',
    path: [[-760, 320, 600], [-150, 290, 700], [540, 320, 580]],
    look: [[-110, 18, -250], [0, 18, -275], [120, 18, -250]],
    labels: ['Терминал Пулково-1', 'ВПП 10L/28R · 3400 м', 'ВПП 10R/28L · 3780 м'],
  },
  {
    id: 'terminal',
    title: 'Терминал Пулково-1',
    subtitle: 'Открыт в декабре 2013 года · около 105 000 м²',
    time: 16,
    duration: 80,
    loop: 'pingpong',
    path: [[-250, 44, -285], [0, 40, -310], [250, 44, -285]],
    look: [[-80, 20, 30], [0, 19, 38], [80, 20, 30]],
    labels: ['Терминал Пулково-1'],
  },
  {
    id: 'roof',
    title: 'Складчатая кровля',
    subtitle: 'Квадратные световые воронки над пассажирским залом',
    time: 16.5,
    duration: 62,
    loop: 'pingpong',
    path: [[-185, 44, -95], [-30, 38, -20], [150, 44, 55]],
    look: [[-70, 24, 15], [0, 23, 32], [90, 24, 50]],
    labels: [],
  },
  {
    id: 'inside',
    title: 'Внутри терминала',
    subtitle: 'Регистрация, зона ожидания, выдача багажа',
    time: 13,
    cutaway: true,
    duration: 70,
    loop: 'pingpong',
    path: [[-95, 11, 62], [0, 10, 56], [95, 11, 62]],
    look: [[-35, 7, -30], [0, 7, -38], [35, 7, -30]],
    labels: [],
  },
  {
    id: 'apron',
    title: 'Перрон',
    subtitle: 'Восемь контактных стоянок · телескопические трапы',
    time: 9.5,
    duration: 74,
    loop: 'pingpong',
    path: [[-265, 9, -232], [-20, 8.5, -240], [250, 9, -232]],
    look: [[-150, 7, -158], [10, 7, -150], [300, 7, -158]],
    labels: ['Перрон'],
  },
  {
    id: 'heritage',
    title: 'Пять стаканов',
    subtitle: 'Аэровокзал 1973 года · архитектор А. В. Жук',
    time: 17,
    duration: 66,
    loop: 'pingpong',
    path: [[-556, 26, 128], [-430, 24, 148], [-306, 26, 126]],
    look: [[-455, 14, 14], [-430, 14, 10], [-405, 14, 14]],
    labels: ['Терминал 1973 · «пять стаканов»'],
  },
  {
    id: 'airfield',
    title: 'Лётное поле',
    subtitle: 'Две полосы: 3400 и 3780 метров · курсы 100° / 280°',
    time: 8.5,
    duration: 78,
    loop: 'pingpong',
    path: [[-1830, 18, -1092], [-1500, 22, -1088], [-1170, 27, -1084]],
    look: [[-1000, 8, -1000], [-300, 10, -1000], [420, 12, -1000]],
    labels: ['ВПП 10L/28R · 3400 м'],
  },
  {
    id: 'plan',
    title: 'Генеральный план',
    subtitle: 'Терминалы расположены между двумя ВПП',
    time: 12.5,
    duration: 96,
    loop: 'pingpong',
    path: [[-420, 3100, 260], [0, 3300, 60], [420, 3100, -140]],
    look: [[-60, 0, -160], [0, 0, -110], [60, 0, -60]],
    labels: ['Терминал Пулково-1', 'Терминал 1973 · «пять стаканов»', 'ВПП 10L/28R · 3400 м',
      'ВПП 10R/28L · 3780 м', 'Перрон', 'КДП'],
  },
  {
    id: 'night',
    title: 'Ночная смена',
    subtitle: 'Аэропорт работает круглосуточно',
    time: 22.5,
    duration: 88,
    loop: 'pingpong',
    path: [[520, 165, 430], [60, 150, 540], [-440, 165, 450]],
    look: [[150, 16, -250], [0, 16, -285], [-150, 16, -250]],
    labels: ['Терминал Пулково-1'],
  },
];

const EASE = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class Presentation {
  constructor({ camera, controls, airport, onChapter }) {
    this.camera = camera;
    this.controls = controls;
    this.airport = airport;
    this.onChapter = onChapter;

    this.index = -1;
    this.chapter = null;
    this.playing = true;
    this.t = 0;                    // положение внутри главы, 0…1
    this.dir = 1;                  // направление для pingpong
    this.transition = null;        // {from, fromT, t, dur}
    this.freeUntil = 0;            // ручное вмешательство приостанавливает камеру
    this.wasFree = false;

    this._p = new THREE.Vector3();
    this._l = new THREE.Vector3();
  }

  toWorldCurve(points) {
    return new THREE.CatmullRomCurve3(
      points.map((p) => this.airport.localToWorld(new THREE.Vector3(p[0], p[1], p[2]))),
      false, 'catmullrom', 0.4,
    );
  }

  go(index, { instant = false } = {}) {
    const i = ((index % CHAPTERS.length) + CHAPTERS.length) % CHAPTERS.length;
    const ch = CHAPTERS[i];
    this.index = i;
    this.chapter = ch;
    this.pathCurve = this.toWorldCurve(ch.path);
    this.lookCurve = this.toWorldCurve(ch.look.length > 1 ? ch.look : [ch.look[0], ch.look[0]]);
    this.t = 0;
    this.dir = 1;
    this.freeUntil = 0;

    if (instant) {
      this.transition = null;
      this.applyAt(0);
    } else {
      this.startTransition(0, 2.2);
    }
    if (this.onChapter) this.onChapter(ch, i);
  }

  startTransition(targetT, dur) {
    this.transition = {
      fromPos: this.camera.position.clone(),
      fromTgt: this.controls.target.clone(),
      targetT, t: 0, dur,
    };
  }

  next() { this.go(this.index + 1); }

  prev() { this.go(this.index - 1); }

  setPlaying(on) { this.playing = on; }

  /** Пользователь взялся за мышь — камера отдаёт управление на несколько секунд. */
  nudge(seconds = 5) {
    this.freeUntil = seconds;
    this.wasFree = true;
  }

  applyAt(t) {
    this.pathCurve.getPointAt(THREE.MathUtils.clamp(t, 0, 1), this._p);
    this.lookCurve.getPointAt(THREE.MathUtils.clamp(t, 0, 1), this._l);
    this.camera.position.copy(this._p);
    this.controls.target.copy(this._l);
  }

  update(dt) {
    if (!this.chapter) return;

    if (this.transition) {
      const tr = this.transition;
      tr.t = Math.min(1, tr.t + dt / tr.dur);
      const e = EASE(tr.t);
      const tt = THREE.MathUtils.clamp(tr.targetT, 0, 1);
      this.pathCurve.getPointAt(tt, this._p);
      this.lookCurve.getPointAt(tt, this._l);
      this.camera.position.lerpVectors(tr.fromPos, this._p, e);
      this.controls.target.lerpVectors(tr.fromTgt, this._l, e);
      if (tr.t >= 1) this.transition = null;
      return;
    }

    if (this.freeUntil > 0) {
      this.freeUntil -= dt;
      return;                                  // камера в руках у пользователя
    }
    if (this.wasFree) {
      // мягко возвращаемся на траекторию главы с того места, где остановились
      this.wasFree = false;
      this.startTransition(this.t, 1.8);
      return;
    }
    if (!this.playing) return;

    const step = dt / this.chapter.duration;
    this.t += step * this.dir;
    if (this.t > 1) {
      if (this.chapter.loop === 'pingpong') { this.t = 1; this.dir = -1; } else this.t = 1;
    } else if (this.t < 0) {
      this.t = 0; this.dir = 1;
    }
    this.applyAt(this.t);
  }

  /** Доля пройденного пути главы — для полосы прогресса. */
  get progress() {
    return this.t;
  }
}
