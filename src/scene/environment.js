import * as THREE from 'three';
import { setNightFactor } from '../utils/materials.js';
import { DEG } from '../utils/helpers.js';

/**
 * Небо, солнце, суточный цикл и карта окружения.
 *
 * Небесный купол — собственный шейдер (toneMapped: false), из него же
 * генерируется PMREM-окружение: стекло и металл получают правдоподобные
 * отражения неба и земли, без чего PBR выглядит пластмассовым.
 */

const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */`
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uSunTint;
  uniform vec3 uSunDisk;
  uniform vec3 uSunDir;
  uniform float uSunUp;
  varying vec3 vDir;

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;

    vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.5));
    col = mix(col, uGround, smoothstep(0.005, -0.16, h));

    float s = max(dot(d, uSunDir), 0.0);
    col += uSunTint * pow(s, 6.0) * 0.35;
    col += uSunTint * pow(s, 30.0) * 0.55;

    float disk = smoothstep(0.99965, 0.99992, s) * uSunUp;
    col = mix(col, uSunDisk, disk);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// Палитра сдержанная: небо не спорит с белыми объёмами макета
const PAL = {
  day: {
    top: new THREE.Color(0x74a8d4), horizon: new THREE.Color(0xe4ebee),
    ground: new THREE.Color(0xc9cbc4), tint: new THREE.Color(0xdfe9f2),
    disk: new THREE.Color(0xfffdf6),
  },
  dusk: {
    top: new THREE.Color(0x6f89ad), horizon: new THREE.Color(0xe7c3a0),
    ground: new THREE.Color(0xa89b8b), tint: new THREE.Color(0xffc894),
    disk: new THREE.Color(0xffe6c0),
  },
  night: {
    top: new THREE.Color(0x080d15), horizon: new THREE.Color(0x1a2735),
    ground: new THREE.Color(0x10151c), tint: new THREE.Color(0x24384f),
    disk: new THREE.Color(0xdfe8ff),
  },
};

const KEYS = [
  ['uTop', 'top'], ['uHorizon', 'horizon'], ['uGround', 'ground'],
  ['uSunTint', 'tint'], ['uSunDisk', 'disk'],
];

export function createEnvironment(scene, renderer) {
  const uniforms = {
    uTop: { value: PAL.day.top.clone() },
    uHorizon: { value: PAL.day.horizon.clone() },
    uGround: { value: PAL.day.ground.clone() },
    uSunTint: { value: PAL.day.tint.clone() },
    uSunDisk: { value: PAL.day.disk.clone() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunUp: { value: 1 },
  };

  const skyMat = new THREE.ShaderMaterial({
    uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
  });

  const sky = new THREE.Mesh(new THREE.SphereGeometry(24000, 40, 24), skyMat);
  sky.name = 'sky';
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  scene.add(sky);

  // Отдельная сцена для генерации карты окружения
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 20), skyMat);
  envScene.add(envSky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  let envRT = null;

  function refreshEnvironment() {
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
  }

  /* ------------------------------ Свет ------------------------------ */
  const sun = new THREE.DirectionalLight(0xfff6ec, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.near = 200;
  sun.shadow.camera.far = 6000;
  const S = 1000;
  sun.shadow.camera.left = -S;
  sun.shadow.camera.right = S;
  sun.shadow.camera.top = S;
  sun.shadow.camera.bottom = -S;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.6;
  sun.shadow.radius = 1.5;
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0xdfeaf2, 0x9a9b90, 0.7);
  scene.add(hemi);

  // Ночная подсветка города
  const cityGlow = new THREE.DirectionalLight(0x8aa6cc, 0);
  cityGlow.position.set(-900, 500, 1100);
  scene.add(cityGlow);

  const stars = makeStars();
  scene.add(stars);

  scene.fog = new THREE.Fog(0xe9edee, 1700, 13000);

  const sunPos = new THREE.Vector3();
  const state = { hour: 13, night: 0, dusk: 0, sunPos };

  function setTimeOfDay(hour) {
    state.hour = ((hour % 24) + 24) % 24;
    const h = state.hour;

    const elevation = 54 * Math.sin(((h - 6) / 12) * Math.PI);
    // азимут от севера: 90° на восходе, 180° в полдень, 270° на закате
    const azimuth = 90 + ((h - 6) / 12) * 180;

    // theta отсчитывается от оси +Z (юг в нашей системе)
    sunPos.setFromSphericalCoords(1, (90 - elevation) * DEG, (azimuth - 180) * DEG);
    uniforms.uSunDir.value.copy(sunPos);
    uniforms.uSunUp.value = elevation > 0 ? 1 : 0;

    const nightF = THREE.MathUtils.clamp((2 - elevation) / 11, 0, 1);
    const duskF = THREE.MathUtils.clamp(1 - Math.abs(elevation - 4) / 12, 0, 1);
    state.night = nightF;
    state.dusk = duskF;

    for (const [uni, key] of KEYS) {
      uniforms[uni].value.copy(PAL.day[key]).lerp(PAL.dusk[key], duskF).lerp(PAL.night[key], nightF);
    }

    sun.position.copy(sunPos).multiplyScalar(3400);
    sun.intensity = THREE.MathUtils.clamp(elevation / 12, 0, 1) * 4.3;
    sun.color.setRGB(1, 0.96 - 0.16 * duskF, 0.9 - 0.32 * duskF);
    sun.visible = elevation > -1;

    hemi.intensity = 0.22 + 0.4 * (1 - nightF);
    hemi.color.copy(uniforms.uHorizon.value);
    hemi.groundColor.copy(uniforms.uGround.value);
    cityGlow.intensity = 0.75 * nightF;

    scene.fog.color.copy(uniforms.uHorizon.value);
    scene.fog.near = 1700 - 800 * nightF;
    scene.fog.far = 13000 - 4500 * nightF;
    scene.environmentIntensity = 1.0 - 0.75 * nightF;

    renderer.toneMappingExposure = 1.0 - 0.26 * nightF - 0.04 * duskF;

    stars.material.opacity = Math.max(0, nightF - 0.3) * 1.45;
    stars.visible = stars.material.opacity > 0.01;

    setNightFactor(Math.pow(nightF, 0.75));
    refreshEnvironment();
    return state;
  }

  setTimeOfDay(13);

  return { sky, sun, hemi, stars, setTimeOfDay, state };
}

function makeStars(count = 2400) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3().setFromSphericalCoords(
      21000, Math.acos(Math.random() * 0.97), Math.random() * Math.PI * 2,
    );
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff, size: 3, sizeAttenuation: false,
    transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false,
  });
  const p = new THREE.Points(geo, mat);
  p.name = 'stars';
  p.frustumCulled = false;
  return p;
}
