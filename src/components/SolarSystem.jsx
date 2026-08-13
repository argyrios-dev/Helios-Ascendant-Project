import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'

const TAU = Math.PI * 2
const DAY_SECONDS = 86_400
const DAY_MS = 86_400_000
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0)
const AU_KM = 149_597_870.7
const SOLAR_MU_KM3_S2 = 132_712_440_018
const VISUAL_AU = 20
const TELEMETRY_INTERVAL_SECONDS = 0.12
const BACKDROP_URL = `${import.meta.env.BASE_URL}assets/deep-space-4k.jpg`

const degrees = (value) => THREE.MathUtils.degToRad(value)

const PLANETS = [
  {
    name: 'Mercurio', classification: 'Planeta rocoso', color: '#aaa39b',
    semiMajorAxisAU: 0.387098, eccentricity: 0.20563, periodDays: 87.969,
    inclinationDeg: 7.005, ascendingNodeDeg: 48.331, argumentPeriapsisDeg: 29.124,
    meanAnomalyJ2000Deg: 174.796, axialTiltDeg: 0.034, rotationPeriodDays: 58.646,
    visualRadius: 0.34, surfaceType: 0, seed: 1.31, relief: 0.004,
    colors: ['#242321', '#77736c', '#c5beb2'],
  },
  {
    name: 'Venus', classification: 'Planeta rocoso', color: '#d8ae65',
    semiMajorAxisAU: 0.723332, eccentricity: 0.006772, periodDays: 224.701,
    inclinationDeg: 3.3947, ascendingNodeDeg: 76.68, argumentPeriapsisDeg: 54.884,
    meanAnomalyJ2000Deg: 50.415, axialTiltDeg: 177.36, rotationPeriodDays: -243.025,
    visualRadius: 0.62, surfaceType: 6, seed: 2.17,
    colors: ['#5b3518', '#d4943e', '#ffe1a0'], atmosphere: '#e8a94b',
  },
  {
    name: 'Tierra', classification: 'Planeta oceánico', color: '#4f9fff',
    semiMajorAxisAU: 1, eccentricity: 0.0167086, periodDays: 365.256,
    inclinationDeg: 0.00005, ascendingNodeDeg: -11.26064, argumentPeriapsisDeg: 114.20783,
    meanAnomalyJ2000Deg: 357.51716, axialTiltDeg: 23.4393, rotationPeriodDays: 0.9972697,
    visualRadius: 0.66, surfaceType: 1, seed: 3.73, relief: 0.0014, shape: [1, 0.99665, 1],
    colors: ['#011944', '#0876b9', '#69a84f'], atmosphere: '#4ba9ff',
  },
  {
    name: 'Marte', classification: 'Planeta rocoso', color: '#dc6849',
    semiMajorAxisAU: 1.523679, eccentricity: 0.0934, periodDays: 686.98,
    inclinationDeg: 1.85, ascendingNodeDeg: 49.558, argumentPeriapsisDeg: 286.502,
    meanAnomalyJ2000Deg: 19.373, axialTiltDeg: 25.19, rotationPeriodDays: 1.025957,
    visualRadius: 0.46, surfaceType: 0, seed: 4.49, relief: 0.006,
    colors: ['#35130d', '#9a3f25', '#e58a53'], atmosphere: '#b84f31',
  },
  {
    name: 'Júpiter', classification: 'Gigante gaseoso', color: '#e4b98e',
    semiMajorAxisAU: 5.2044, eccentricity: 0.0489, periodDays: 4332.59,
    inclinationDeg: 1.303, ascendingNodeDeg: 100.464, argumentPeriapsisDeg: 273.867,
    meanAnomalyJ2000Deg: 20.02, axialTiltDeg: 3.13, rotationPeriodDays: 0.41354,
    visualRadius: 2.3, surfaceType: 2, seed: 5.91, shape: [1, 0.9351, 1],
    colors: ['#5b3225', '#d5a777', '#f2dcc0'],
  },
  {
    name: 'Saturno', classification: 'Gigante gaseoso', color: '#efd39b',
    semiMajorAxisAU: 9.5826, eccentricity: 0.0565, periodDays: 10759.22,
    inclinationDeg: 2.485, ascendingNodeDeg: 113.665, argumentPeriapsisDeg: 339.392,
    meanAnomalyJ2000Deg: 316.888, axialTiltDeg: 26.73, rotationPeriodDays: 0.444,
    visualRadius: 2, surfaceType: 3, seed: 6.67, shape: [1, 0.9024, 1],
    colors: ['#766044', '#d8bc83', '#fff0c2'],
    rings: { inner: 2.45, outer: 4.2, color: '#e7c98e', opacity: 0.78 },
  },
  {
    name: 'Urano', classification: 'Gigante de hielo', color: '#a8edf1',
    semiMajorAxisAU: 19.2184, eccentricity: 0.046381, periodDays: 30688.5,
    inclinationDeg: 0.773, ascendingNodeDeg: 74.006, argumentPeriapsisDeg: 96.998,
    meanAnomalyJ2000Deg: 142.2386, axialTiltDeg: 97.77, rotationPeriodDays: -0.71833,
    visualRadius: 1.25, surfaceType: 4, seed: 7.23, shape: [1, 0.9772, 1],
    colors: ['#245b65', '#79d4dc', '#d3ffff'], atmosphere: '#79e8f0',
    rings: { inner: 1.55, outer: 2.18, color: '#9fdde1', opacity: 0.3 },
  },
  {
    name: 'Neptuno', classification: 'Gigante de hielo', color: '#416dff',
    semiMajorAxisAU: 30.11, eccentricity: 0.009456, periodDays: 60182,
    inclinationDeg: 1.77, ascendingNodeDeg: 131.784, argumentPeriapsisDeg: 273.187,
    meanAnomalyJ2000Deg: 259.908, axialTiltDeg: 28.32, rotationPeriodDays: 0.67125,
    visualRadius: 1.2, surfaceType: 4, seed: 8.11, shape: [1, 0.9829, 1],
    colors: ['#071e65', '#174fc4', '#69a6ff'], atmosphere: '#3979ff',
  },
  {
    name: 'Ceres', classification: 'Planeta enano', color: '#b9afa1',
    semiMajorAxisAU: 2.7675, eccentricity: 0.0758, periodDays: 1680.5,
    inclinationDeg: 10.593, ascendingNodeDeg: 80.305, argumentPeriapsisDeg: 73.597,
    meanAnomalyJ2000Deg: 77.37, axialTiltDeg: 4, rotationPeriodDays: 0.3781,
    visualRadius: 0.25, surfaceType: 5, seed: 9.37, relief: 0.012, shape: [1, 0.923, 0.997],
    colors: ['#292725', '#716d67', '#d0c9bc'],
  },
  {
    name: 'Plutón', classification: 'Planeta enano', color: '#d9b99b',
    semiMajorAxisAU: 39.482, eccentricity: 0.2488, periodDays: 90560,
    inclinationDeg: 17.16, ascendingNodeDeg: 110.299, argumentPeriapsisDeg: 113.834,
    meanAnomalyJ2000Deg: 14.53, axialTiltDeg: 119.59, rotationPeriodDays: -6.387,
    visualRadius: 0.3, surfaceType: 5, seed: 10.41, relief: 0.004, shape: [1, 0.998, 1],
    colors: ['#3b2c25', '#a77c5d', '#f1dac0'],
  },
  {
    name: 'Haumea', classification: 'Planeta enano', color: '#e7e4dc',
    semiMajorAxisAU: 43.218, eccentricity: 0.191, periodDays: 103774,
    inclinationDeg: 28.2, ascendingNodeDeg: 121.9, argumentPeriapsisDeg: 240.6,
    meanAnomalyJ2000Deg: 209.1, axialTiltDeg: 126, rotationPeriodDays: 0.1631,
    visualRadius: 0.27, surfaceType: 5, seed: 11.83, relief: 0.006, shape: [1.363, 1, 0.668],
    colors: ['#77736e', '#d8d4cb', '#ffffff'],
  },
  {
    name: 'Makemake', classification: 'Planeta enano', color: '#bd7d55',
    semiMajorAxisAU: 45.715, eccentricity: 0.159, periodDays: 111845,
    inclinationDeg: 29.0, ascendingNodeDeg: 79.62, argumentPeriapsisDeg: 294.8,
    meanAnomalyJ2000Deg: 165.5, axialTiltDeg: 29, rotationPeriodDays: 0.951,
    visualRadius: 0.28, surfaceType: 5, seed: 12.57, relief: 0.004, shape: [1, 0.97, 1],
    colors: ['#3d2118', '#9e5336', '#e4b184'],
  },
  {
    name: 'Eris', classification: 'Planeta enano', color: '#e4e2d9',
    semiMajorAxisAU: 67.781, eccentricity: 0.44, periodDays: 203830,
    inclinationDeg: 44.04, ascendingNodeDeg: 35.95, argumentPeriapsisDeg: 151.6,
    meanAnomalyJ2000Deg: 204.2, axialTiltDeg: 78, rotationPeriodDays: 15.79,
    visualRadius: 0.3, surfaceType: 5, seed: 13.19, relief: 0.003, shape: [1, 0.995, 1],
    colors: ['#64615d', '#bbb8ae', '#fffdf2'],
  },
]

const BLACK_HOLES = [
  {
    name: 'Sagittarius A*',
    classification: 'Agujero negro supermasivo',
    category: 'Espacio profundo',
    color: '#ff8a35',
    visualRadius: 3.2,
    displayPosition: [0, 360, -980],
    massSolar: 4_154_000,
    distanceLightYears: 26_673,
    schwarzschildRadiusKm: 12_270_000,
    diskColor: '#ff7a1a',
    diskTemperatureK: 10_000_000,
    seed: 21.7,
  },
  {
    name: 'M87*',
    classification: 'Agujero negro supermasivo',
    category: 'Espacio profundo',
    color: '#ffb05a',
    visualRadius: 4.6,
    displayPosition: [1120, -180, -1480],
    massSolar: 6_500_000_000,
    distanceLightYears: 53_500_000,
    schwarzschildRadiusKm: 19_200_000_000,
    diskColor: '#ffad42',
    diskTemperatureK: 6_000_000,
    seed: 29.4,
  },
]

const OBSERVATORIES = [
  {
    name: 'Hubble',
    classification: 'Telescopio espacial',
    category: 'Observatorios',
    color: '#b7d8ef',
    visualRadius: 0.72,
    model: 'hubble',
    host: 'Tierra',
    altitudeKm: 540,
    orbitPeriodMinutes: 95.4,
    launchYear: 1990,
    displayOffset: 2.2,
    phase: 0.3,
  },
  {
    name: 'James Webb',
    classification: 'Observatorio infrarrojo',
    category: 'Observatorios',
    color: '#e6b95d',
    visualRadius: 1.05,
    model: 'webb',
    host: 'Tierra',
    altitudeKm: 1_500_000,
    orbitPeriodMinutes: 180 * 24 * 60,
    launchYear: 2021,
    displayOffset: 4.6,
    phase: 2.1,
  },
  {
    name: 'Euclid',
    classification: 'Observatorio cosmológico',
    category: 'Observatorios',
    color: '#dce7ed',
    visualRadius: 0.82,
    model: 'euclid',
    host: 'Tierra',
    altitudeKm: 1_500_000,
    orbitPeriodMinutes: 180 * 24 * 60,
    launchYear: 2023,
    displayOffset: 6.4,
    phase: 4.4,
  },
]

export const BODY_CATALOG = [
  { name: 'Sol', classification: 'Estrella G2V', category: 'Sistema Solar', color: '#ffb347', visualRadius: 4.5 },
  ...PLANETS.map((body) => ({ ...body, category: 'Sistema Solar' })),
  ...BLACK_HOLES,
  ...OBSERVATORIES,
]

const BODY_BY_NAME = Object.fromEntries(BODY_CATALOG.map((body) => [body.name, body]))
const ORBIT_BASIS_CACHE = new WeakMap()

function wrapRadians(value) {
  return ((value % TAU) + TAU) % TAU
}

function solveEccentricAnomaly(meanAnomaly, eccentricity) {
  const mean = wrapRadians(meanAnomaly)
  let eccentric = eccentricity < 0.8 ? mean : Math.PI
  for (let index = 0; index < 7; index += 1) {
    eccentric -= (eccentric - eccentricity * Math.sin(eccentric) - mean) /
      (1 - eccentricity * Math.cos(eccentric))
  }
  return eccentric
}

function orbitalBasis(body) {
  const cached = ORBIT_BASIS_CACHE.get(body)
  if (cached) return cached
  const omega = degrees(body.argumentPeriapsisDeg)
  const node = degrees(body.ascendingNodeDeg)
  const inclination = degrees(body.inclinationDeg)
  const cosNode = Math.cos(node)
  const sinNode = Math.sin(node)
  const cosOmega = Math.cos(omega)
  const sinOmega = Math.sin(omega)
  const cosInclination = Math.cos(inclination)
  const sinInclination = Math.sin(inclination)
  const basis = {
    xx: cosNode * cosOmega - sinNode * sinOmega * cosInclination,
    xy: -cosNode * sinOmega - sinNode * cosOmega * cosInclination,
    yx: sinNode * cosOmega + cosNode * sinOmega * cosInclination,
    yy: -sinNode * sinOmega + cosNode * cosOmega * cosInclination,
    zx: sinOmega * sinInclination,
    zy: cosOmega * sinInclination,
  }
  ORBIT_BASIS_CACHE.set(body, basis)
  return basis
}

function orbitalPosition(body, simulatedUnixMs, target) {
  const elapsedDaysFromJ2000 = (simulatedUnixMs - J2000_MS) / DAY_MS
  const meanMotion = TAU / body.periodDays
  const meanAnomaly = degrees(body.meanAnomalyJ2000Deg) + meanMotion * elapsedDaysFromJ2000
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, body.eccentricity)
  const semiMajor = body.semiMajorAxisAU * VISUAL_AU
  const xOrbital = semiMajor * (Math.cos(eccentricAnomaly) - body.eccentricity)
  const yOrbital = semiMajor * Math.sqrt(1 - body.eccentricity ** 2) * Math.sin(eccentricAnomaly)
  const basis = orbitalBasis(body)
  target.set(
    basis.xx * xOrbital + basis.xy * yOrbital,
    basis.zx * xOrbital + basis.zy * yOrbital,
    -(basis.yx * xOrbital + basis.yy * yOrbital),
  )
  return { radiusAU: Math.hypot(xOrbital, yOrbital) / VISUAL_AU }
}

function orbitalSpeedKms(body, radiusAU) {
  const radiusKm = radiusAU * AU_KM
  const semiMajorKm = body.semiMajorAxisAU * AU_KM
  return Math.sqrt(SOLAR_MU_KM3_S2 * (2 / radiusKm - 1 / semiMajorKm))
}

function visualSpinRadiansPerSecond(body, timeScale) {
  return timeScale === 0 ? 0 : (TAU * timeScale) / (body.rotationPeriodDays * DAY_SECONDS)
}

function SceneBackground() {
  const texture = useTexture(BACKDROP_URL)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    const previousBackground = scene.background
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 2
    texture.needsUpdate = true
    scene.background = texture

    return () => {
      scene.background = previousBackground
      texture.dispose()
      useTexture.clear(BACKDROP_URL)
    }
  }, [scene, texture])

  return null
}

const planetVertexShader = `
  uniform float uSurfaceType;
  uniform float uSeed;
  uniform float uRelief;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  float vertexHash(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  float vertexNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(vertexHash(i), vertexHash(i + vec3(1,0,0)), f.x), mix(vertexHash(i + vec3(0,1,0)), vertexHash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(vertexHash(i + vec3(0,0,1)), vertexHash(i + vec3(1,0,1)), f.x), mix(vertexHash(i + vec3(0,1,1)), vertexHash(i + vec3(1,1,1)), f.x), f.y), f.z
    );
  }

  float vertexFbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.56;
    for (int octave = 0; octave < 4; octave++) {
      value += amplitude * vertexNoise(p);
      p = p * 2.06 + 7.31;
      amplitude *= 0.48;
    }
    return value;
  }

  void main() {
    vec3 direction = normalize(position);
    vec3 samplePosition = direction * 3.4 + vec3(uSeed * 1.71, uSeed * 0.63, uSeed * 2.13);
    float broadRelief = vertexFbm(samplePosition) - 0.5;
    float fineRelief = vertexNoise(samplePosition * 5.1) - 0.5;
    float displacement = (broadRelief * 1.35 + fineRelief * 0.24) * uRelief;
    vec3 displacedPosition = position * (1.0 + displacement);

    vLocalPosition = direction;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const planetFragmentShader = `
  precision highp float;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uSurfaceType;
  uniform float uSeed;
  uniform float uTime;
  uniform float uRelief;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x), mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x), mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z
    );
  }
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.52;
    mat3 rotation = mat3(0.00,0.80,0.60,-0.80,0.36,-0.48,-0.60,-0.48,0.64);
    for (int octave = 0; octave < 6; octave++) {
      value += amplitude * noise3(p);
      p = rotation * p * 2.03 + 8.17;
      amplitude *= 0.5;
    }
    return value;
  }
  float craterField(vec3 p) {
    vec3 cell = p * 9.0;
    vec3 id = floor(cell);
    vec3 local = fract(cell) - 0.5;
    vec3 offset = vec3(hash31(id), hash31(id + 11.7), hash31(id + 29.3)) - 0.5;
    float radius = length(local - offset * 0.52);
    float rim = smoothstep(0.28, 0.22, abs(radius - 0.205));
    float bowl = smoothstep(0.22, 0.02, radius);
    return rim * 0.75 - bowl * 0.48;
  }
  vec3 surfaceColor(vec3 p) {
    vec3 q = p + vec3(uSeed * 2.71, uSeed * 0.93, uSeed * 1.47);
    float macroNoise = fbm(q * 2.25);
    float fineNoise = fbm(q * 9.5);
    if (uSurfaceType < 0.5) {
      float rock = clamp(macroNoise * 0.78 + fineNoise * 0.32 + craterField(q) * 0.18, 0.0, 1.0);
      vec3 base = mix(uColorA, uColorB, smoothstep(0.24, 0.68, rock));
      return mix(base, uColorC, smoothstep(0.72, 0.98, fineNoise));
    }
    if (uSurfaceType < 1.5) {
      float continent = fbm(q * 1.72 + vec3(0.0,1.2,0.0)) + 0.20 * fbm(q * 5.7);
      float landMask = smoothstep(0.57, 0.64, continent);
      float elevation = smoothstep(0.55, 0.91, fineNoise);
      vec3 ocean = mix(uColorA, uColorB, 0.25 + 0.65 * macroNoise);
      vec3 land = mix(uColorC * 0.58, vec3(0.48,0.34,0.18), elevation);
      vec3 color = mix(ocean, land, landMask);
      float polar = smoothstep(0.72, 0.96, abs(p.y) + fineNoise * 0.08);
      color = mix(color, vec3(0.88,0.96,1.0), polar);
      float clouds = smoothstep(0.70, 0.81, fbm(q * 5.2 + vec3(uTime * 0.008,0.0,0.0)));
      return mix(color, vec3(0.92,0.97,1.0), clouds * 0.72);
    }
    if (uSurfaceType < 3.5) {
      float latitude = asin(clamp(p.y,-1.0,1.0));
      float turbulence = fbm(vec3(p.x*3.0,p.y*12.0,p.z*3.0)+uSeed);
      float frequency = uSurfaceType < 2.5 ? 28.0 : 38.0;
      float bands = smoothstep(0.12,0.92,0.5+0.5*sin(latitude*frequency+turbulence*6.0));
      vec3 gas = mix(uColorA,uColorB,bands);
      gas = mix(gas,uColorC,smoothstep(0.62,0.96,turbulence)*0.58);
      if (uSurfaceType < 2.5) {
        float longitude = atan(p.z,p.x);
        float spotDistance = length(vec2((longitude+0.72)*0.68,(p.y+0.24)*2.8));
        float spot = smoothstep(0.36,0.12,spotDistance);
        gas = mix(gas,vec3(0.66,0.19,0.09),spot*(0.58+turbulence*0.32));
      }
      return gas;
    }
    if (uSurfaceType < 4.5) {
      float latitude = asin(clamp(p.y,-1.0,1.0));
      float wisps = fbm(vec3(p.x*2.2,p.y*18.0,p.z*2.2)+uSeed);
      float bands = 0.5+0.5*sin(latitude*24.0+wisps*3.8);
      return mix(mix(uColorA,uColorB,0.38+bands*0.35),uColorC,wisps*0.26);
    }
    if (uSurfaceType < 5.5) {
      float ice = clamp(macroNoise*0.58+fineNoise*0.42+craterField(q)*0.12,0.0,1.0);
      return mix(mix(uColorA,uColorB,smoothstep(0.24,0.72,ice)),uColorC,smoothstep(0.77,0.96,fineNoise));
    }
    float cloudBands = fbm(vec3(p.x*2.3,p.y*8.0,p.z*2.3)+vec3(uTime*0.004,uSeed,0.0));
    float swirl = 0.5+0.5*sin(p.y*34.0+cloudBands*9.0);
    return mix(mix(uColorA,uColorB,cloudBands),uColorC,smoothstep(0.58,0.94,swirl)*0.72);
  }
  void main() {
    vec3 derivativeNormal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    if (dot(derivativeNormal, vWorldNormal) < 0.0) derivativeNormal *= -1.0;
    float reliefNormalStrength = clamp(uRelief * 11.0, 0.0, 0.68);
    vec3 normal = normalize(mix(vWorldNormal, derivativeNormal, reliefNormalStrength));
    vec3 lightDirection = normalize(-vWorldPosition);
    vec3 viewDirection = normalize(cameraPosition-vWorldPosition);
    float diffuse = max(dot(normal,lightDirection),0.0);
    float halfLambert = diffuse*0.82+diffuse*diffuse*0.28;
    float rim = pow(1.0-max(dot(normal,viewDirection),0.0),3.2);
    vec3 albedo = surfaceColor(normalize(vLocalPosition));
    vec3 night = albedo*vec3(0.012,0.018,0.04);
    vec3 lit = albedo*(0.045+halfLambert*1.16);
    vec3 color = mix(night,lit,smoothstep(-0.04,0.11,diffuse));
    color += rim*albedo*0.10;
    gl_FragColor = vec4(color,1.0);
  }
`

function OrbitPath({ body }) {
  const geometry = useMemo(() => {
    const points = body.classification === 'Planeta enano' ? 240 : 360
    const positions = new Float32Array(points * 3)
    const target = new THREE.Vector3()
    for (let index = 0; index < points; index += 1) {
      const eccentricAnomaly = (index / points) * TAU
      const syntheticMs = J2000_MS + ((eccentricAnomaly - degrees(body.meanAnomalyJ2000Deg)) / (TAU / body.periodDays)) * DAY_MS
      orbitalPosition(body, syntheticMs, target)
      positions[index * 3] = target.x
      positions[index * 3 + 1] = target.y
      positions[index * 3 + 2] = target.z
    }
    const buffer = new THREE.BufferGeometry()
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    buffer.computeBoundingSphere()
    return buffer
  }, [body])
  const materialRef = useRef(null)
  useEffect(() => () => { geometry.dispose(); materialRef.current?.dispose() }, [geometry])
  return (
    <lineLoop geometry={geometry} frustumCulled>
      <lineBasicMaterial ref={materialRef} color={body.color} transparent opacity={body.classification === 'Planeta enano' ? 0.075 : 0.15} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </lineLoop>
  )
}

function Atmosphere({ radius, color }) {
  const geometryRef = useRef(null)
  const materialRef = useRef(null)
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
    uStrength: { value: color === '#4ba9ff' ? 1.42 : 0.78 },
  }), [color])
  useEffect(() => () => { geometryRef.current?.dispose(); materialRef.current?.dispose() }, [])
  return (
    <mesh scale={radius * 1.085} renderOrder={4}>
      <sphereGeometry ref={geometryRef} args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`varying vec3 vNormal; varying vec3 vViewDirection; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vViewDirection=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`}
        fragmentShader={`uniform vec3 uColor;uniform float uStrength;varying vec3 vNormal;varying vec3 vViewDirection;void main(){float f=pow(1.0-max(dot(vNormal,vViewDirection),0.0),3.0);float a=f*uStrength;gl_FragColor=vec4(uColor*(0.72+a),a*0.64);}`}
        transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}
      />
    </mesh>
  )
}

function PlanetaryRings({ config }) {
  const geometryRef = useRef(null)
  const materialRef = useRef(null)
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(config.color) }, uOpacity: { value: config.opacity },
  }), [config.color, config.opacity])
  useEffect(() => () => { geometryRef.current?.dispose(); materialRef.current?.dispose() }, [])
  return (
    <mesh rotation-x={-Math.PI / 2} castShadow>
      <ringGeometry ref={geometryRef} args={[config.inner, config.outer, 256, 1]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
        fragmentShader={`uniform vec3 uColor;uniform float uOpacity;varying vec2 vUv;void main(){float r=length(vUv-vec2(.5))*2.0;float b=.48+.24*sin(r*230.0)+.13*sin(r*71.0)+.08*sin(r*417.0);float c=smoothstep(.018,.052,abs(r-.69));float e=smoothstep(.025,.11,r)*(1.0-smoothstep(.88,.99,r));float a=clamp(b,.08,.95)*c*e*uOpacity;gl_FragColor=vec4(uColor*(.48+b*.72),a);}`}
        transparent side={THREE.DoubleSide} depthWrite={false} alphaTest={0.02}
      />
    </mesh>
  )
}

function Planet({ body, simulatedTimeRef, timeScaleRef, registerBody, setSelected }) {
  const orbitRef = useRef(null)
  const rotationRef = useRef(null)
  const geometryRef = useRef(null)
  const materialRef = useRef(null)
  const position = useMemo(() => new THREE.Vector3(), [])
  const uniforms = useMemo(() => ({
    uColorA: { value: new THREE.Color(body.colors[0]) },
    uColorB: { value: new THREE.Color(body.colors[1]) },
    uColorC: { value: new THREE.Color(body.colors[2]) },
    uSurfaceType: { value: body.surfaceType },
    uSeed: { value: body.seed },
    uTime: { value: 0 },
    uRelief: { value: body.relief ?? 0 },
  }), [body])
  useLayoutEffect(() => registerBody(body.name, orbitRef.current), [body.name, registerBody])
  useEffect(() => () => {
    registerBody(body.name, null)
    geometryRef.current?.dispose()
    materialRef.current?.dispose()
  }, [body.name, registerBody])
  useFrame((state, delta) => {
    if (!orbitRef.current || !rotationRef.current) return
    orbitalPosition(body, simulatedTimeRef.current, position)
    orbitRef.current.position.copy(position)
    const safeDelta = Math.min(delta, 0.05)
    const spinVelocity = visualSpinRadiansPerSecond(body, timeScaleRef.current)
    rotationRef.current.rotation.y = wrapRadians(rotationRef.current.rotation.y + safeDelta * spinVelocity)
    if (materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
  }, -2)
  return (
    <group ref={orbitRef}>
      <group rotation-z={degrees(body.axialTiltDeg)} scale={body.shape ?? [1, 1, 1]} onClick={(event) => { event.stopPropagation(); setSelected(body.name) }}>
        <mesh ref={rotationRef} castShadow>
          <sphereGeometry ref={geometryRef} args={[body.visualRadius, body.classification === 'Planeta enano' ? 64 : 96, body.classification === 'Planeta enano' ? 48 : 72]} />
          <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={planetVertexShader} fragmentShader={planetFragmentShader} />
        </mesh>
        {body.atmosphere && <Atmosphere radius={body.visualRadius} color={body.atmosphere} />}
        {body.rings && <PlanetaryRings config={body.rings} />}
      </group>
    </group>
  )
}

const blackHoleDiskVertexShader = `
  varying vec2 vLocal;
  varying vec3 vWorldPosition;
  void main() {
    vLocal = position.xy;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const blackHoleDiskFragmentShader = `
  precision highp float;
  uniform float uTime;
  uniform float uInner;
  uniform float uOuter;
  uniform float uSeed;
  uniform vec3 uDiskColor;
  varying vec2 vLocal;
  varying vec3 vWorldPosition;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1,0)), f.x), mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x), f.y);
  }

  void main() {
    float radius = length(vLocal);
    float normalizedRadius = (radius - uInner) / max(uOuter - uInner, 0.001);
    float angle = atan(vLocal.y, vLocal.x);
    float spiral = noise2(vec2(angle * 8.0 - uTime * 1.4, normalizedRadius * 34.0 + uSeed));
    float filaments = 0.52 + 0.48 * sin(angle * 31.0 - normalizedRadius * 86.0 - uTime * 3.1 + spiral * 5.0);
    float innerHeat = pow(1.0 - clamp(normalizedRadius, 0.0, 1.0), 2.25);
    float edge = smoothstep(0.0, 0.055, normalizedRadius) * (1.0 - smoothstep(0.82, 1.0, normalizedRadius));
    float doppler = 0.56 + 0.44 * clamp(0.5 + 0.5 * cos(angle - 0.45), 0.0, 1.0);
    float density = edge * (0.22 + spiral * 0.55 + filaments * 0.28) * doppler;
    vec3 cold = uDiskColor * vec3(1.0, 0.19, 0.025);
    vec3 hot = vec3(1.0, 0.94, 0.68);
    vec3 color = mix(cold, hot, innerHeat * 0.9 + filaments * 0.12);
    gl_FragColor = vec4(color * (1.4 + innerHeat * 4.6), density);
  }
`

function BlackHole({ body, selected, registerBody, setSelected }) {
  const rootRef = useRef(null)
  const diskRef = useRef(null)
  const photonRingRef = useRef(null)
  const resourcesRef = useRef(null)
  const innerRadius = body.visualRadius * 1.45
  const outerRadius = body.visualRadius * 5.2
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uInner: { value: innerRadius },
    uOuter: { value: outerRadius },
    uSeed: { value: body.seed },
    uDiskColor: { value: new THREE.Color(body.diskColor) },
  }), [body, innerRadius, outerRadius])

  useLayoutEffect(() => registerBody(body.name, rootRef.current), [body.name, registerBody])
  useFrame((state, delta) => {
    if (diskRef.current) {
      diskRef.current.rotation.z += Math.min(delta, 0.05) * 0.075
      diskRef.current.material.uniforms.uTime.value = state.clock.elapsedTime
    }
    if (photonRingRef.current) photonRingRef.current.rotation.z -= Math.min(delta, 0.05) * 0.11
  })

  useEffect(() => () => {
    registerBody(body.name, null)
    resourcesRef.current?.traverse((object) => {
      object.geometry?.dispose()
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose())
      else object.material?.dispose()
    })
  }, [body.name, registerBody])

  return (
    <group
      ref={(node) => { rootRef.current = node; resourcesRef.current = node }}
      visible={selected === body.name}
      position={body.displayPosition}
      rotation={[0.36, -0.24, 0.22]}
      onClick={(event) => { event.stopPropagation(); setSelected(body.name) }}
    >
      <mesh renderOrder={8}>
        <sphereGeometry args={[body.visualRadius, 96, 72]} />
        <meshBasicMaterial color="#000000" toneMapped={false} />
      </mesh>

      <mesh ref={photonRingRef} renderOrder={9}>
        <torusGeometry args={[body.visualRadius * 1.13, body.visualRadius * 0.075, 24, 192]} />
        <meshBasicMaterial color="#fff2c2" toneMapped={false} />
      </mesh>

      <mesh ref={diskRef} renderOrder={7}>
        <ringGeometry args={[innerRadius, outerRadius, 384, 1]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={blackHoleDiskVertexShader}
          fragmentShader={blackHoleDiskFragmentShader}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <mesh scale={body.visualRadius * 1.9} renderOrder={6}>
        <sphereGeometry args={[1, 64, 48]} />
        <shaderMaterial
          vertexShader={`varying vec3 vN;varying vec3 vV;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`}
          fragmentShader={`varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.0-max(dot(vN,vV),0.0),4.5);gl_FragColor=vec4(vec3(1.0,.25,.025)*f*2.4,f*.42);}`}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {body.name === 'M87*' && (
        <>
          <mesh position-y={body.visualRadius * 8.5}>
            <coneGeometry args={[body.visualRadius * 0.55, body.visualRadius * 17, 32, 1, true]} />
            <meshBasicMaterial color="#74bdff" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
          <mesh position-y={-body.visualRadius * 8.5} rotation-z={Math.PI}>
            <coneGeometry args={[body.visualRadius * 0.55, body.visualRadius * 17, 32, 1, true]} />
            <meshBasicMaterial color="#74bdff" transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  )
}

function HexMirror({ x, y, scale = 1 }) {
  return (
    <mesh position={[x, y, 0]} scale={scale}>
      <circleGeometry args={[0.195, 6]} />
      <meshStandardMaterial color="#d9a929" metalness={0.92} roughness={0.18} emissive="#6f4005" emissiveIntensity={0.3} side={THREE.DoubleSide} />
    </mesh>
  )
}

function HubbleModel() {
  return (
    <group rotation={[0.1, -0.4, 0.2]}>
      <mesh rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.3, 0.36, 1.55, 32]} />
        <meshStandardMaterial color="#c7d3d9" metalness={0.83} roughness={0.24} />
      </mesh>
      <mesh position={[-0.85, 0, 0]} rotation-y={Math.PI / 2}>
        <cylinderGeometry args={[0.38, 0.3, 0.22, 32]} />
        <meshStandardMaterial color="#10151b" metalness={0.75} roughness={0.2} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, side * 0.92, 0]}>
          <mesh>
            <boxGeometry args={[1.7, 0.55, 0.035]} />
            <meshStandardMaterial color="#132f62" metalness={0.32} roughness={0.34} emissive="#07142d" emissiveIntensity={0.8} />
          </mesh>
          {[0, 1, 2, 3].map((line) => (
            <mesh key={line} position={[-0.64 + line * 0.43, 0, 0.022]}>
              <boxGeometry args={[0.018, 0.53, 0.006]} />
              <meshBasicMaterial color="#6c8bc5" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function WebbModel() {
  const rows = [3, 4, 5, 4, 3]
  const mirrors = []
  rows.forEach((count, row) => {
    for (let index = 0; index < count; index += 1) {
      mirrors.push({ x: (index - (count - 1) / 2) * 0.34, y: (2 - row) * 0.29 })
    }
  })
  return (
    <group rotation={[0.22, -0.48, 0]}>
      <group position={[0, 0.32, 0.18]} rotation-x={-0.08}>
        {mirrors.map((mirror, index) => <HexMirror key={index} x={mirror.x} y={mirror.y} />)}
      </group>
      {[0, 1, 2, 3, 4].map((layer) => (
        <mesh key={layer} position={[0, -0.62 - layer * 0.018, 0.03]} rotation-x={Math.PI / 2} scale={[1 - layer * 0.045, 1 - layer * 0.045, 1]}>
          <cylinderGeometry args={[1.25, 1.25, 0.012, 6]} />
          <meshStandardMaterial color={layer % 2 ? '#d9bf83' : '#dfe8ec'} metalness={0.72} roughness={0.22} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.92, 16]} />
        <meshStandardMaterial color="#9ba7ad" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

function EuclidModel() {
  return (
    <group rotation={[0.15, 0.55, -0.1]}>
      <mesh rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.42, 0.55, 1.3, 32]} />
        <meshStandardMaterial color="#dde7ea" metalness={0.68} roughness={0.28} />
      </mesh>
      <mesh position={[-0.72, 0, 0]} rotation-y={Math.PI / 2}>
        <cylinderGeometry args={[0.46, 0.42, 0.18, 32]} />
        <meshStandardMaterial color="#11181d" metalness={0.82} roughness={0.18} />
      </mesh>
      <mesh position={[0.55, -0.58, 0]} rotation-z={-0.28}>
        <boxGeometry args={[1.35, 0.72, 0.045]} />
        <meshStandardMaterial color="#163a72" metalness={0.3} roughness={0.3} emissive="#081a3e" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.68, 0, 0]} rotation-y={Math.PI / 2}>
        <cylinderGeometry args={[0.68, 0.68, 0.05, 48]} />
        <meshStandardMaterial color="#d7b957" metalness={0.84} roughness={0.22} />
      </mesh>
    </group>
  )
}

function SpaceObservatory({ body, selected, simulatedTimeRef, timeScaleRef, registerBody, setSelected }) {
  const rootRef = useRef(null)
  const modelRef = useRef(null)
  const earthPosition = useMemo(() => new THREE.Vector3(), [])
  const radial = useMemo(() => new THREE.Vector3(), [])
  const localOffset = useMemo(() => new THREE.Vector3(), [])
  const orbitPhase = useRef(body.phase)

  useLayoutEffect(() => registerBody(body.name, rootRef.current), [body.name, registerBody])
  useFrame((_, delta) => {
    if (!rootRef.current || !modelRef.current) return
    orbitalPosition(PLANETS[2], simulatedTimeRef.current, earthPosition)
    const safeDelta = Math.min(delta, 0.05)
    const timeBoost = timeScaleRef.current === 0 ? 0 : Math.pow(timeScaleRef.current, 0.22)
    const visualPeriod = body.model === 'hubble' ? 24 : 72
    orbitPhase.current = wrapRadians(orbitPhase.current + safeDelta * TAU * timeBoost / visualPeriod)
    const angle = orbitPhase.current

    if (body.model === 'hubble') {
      localOffset.set(
        Math.cos(angle) * body.displayOffset,
        Math.sin(angle) * body.displayOffset * 0.46,
        Math.sin(angle) * body.displayOffset,
      )
      rootRef.current.position.copy(earthPosition).add(localOffset)
    } else {
      radial.copy(earthPosition).normalize()
      rootRef.current.position.copy(earthPosition).addScaledVector(radial, body.displayOffset)
      rootRef.current.position.y += Math.sin(angle) * 0.75
      rootRef.current.position.z += Math.cos(angle) * 0.75
    }
    modelRef.current.rotation.y += safeDelta * 0.075
  }, -2)

  useEffect(() => () => {
    registerBody(body.name, null)
    modelRef.current?.traverse((object) => {
      object.geometry?.dispose()
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose())
      else object.material?.dispose()
    })
  }, [body.name, registerBody])

  return (
    <group ref={rootRef} visible={selected === body.name} onClick={(event) => { event.stopPropagation(); setSelected(body.name) }}>
      <group ref={modelRef} scale={body.visualRadius}>
        {body.model === 'hubble' && <HubbleModel />}
        {body.model === 'webb' && <WebbModel />}
        {body.model === 'euclid' && <EuclidModel />}
      </group>
    </group>
  )
}

function Sun({ registerBody, setSelected }) {
  const rootRef = useRef(null)
  const geometryRef = useRef(null)
  const materialRef = useRef(null)
  const lightRef = useRef(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useLayoutEffect(() => registerBody('Sol', rootRef.current), [registerBody])
  useFrame((state) => { if (materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime })
  useEffect(() => () => {
    registerBody('Sol', null)
    geometryRef.current?.dispose()
    materialRef.current?.dispose()
    lightRef.current?.shadow?.map?.dispose()
  }, [registerBody])
  return (
    <group ref={rootRef} onClick={(event) => { event.stopPropagation(); setSelected('Sol') }}>
      <mesh>
        <sphereGeometry ref={geometryRef} args={[4.5, 96, 72]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={`varying vec3 vPosition;void main(){vPosition=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
          fragmentShader={`precision highp float;uniform float uTime;varying vec3 vPosition;float h(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}float f(vec3 p){float v=0.0,a=.55;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.07+7.13;a*=.5;}return v;}void main(){float p=f(vPosition*5.2+vec3(uTime*.035,0.0,uTime*.018));float c=f(vPosition*19.0-vec3(0.0,uTime*.022,0.0));float x=smoothstep(.68,.96,p*.72+c*.38);vec3 color=mix(vec3(1.0,.16,.015),vec3(1.0,.78,.18),p);color=mix(color,vec3(1.0,.97,.68),x);gl_FragColor=vec4(color*(2.5+x*2.8),1.0);}`}
          toneMapped={false}
        />
      </mesh>
      <Atmosphere radius={4.78} color="#ff6a16" />
      <pointLight ref={lightRef} color="#fff1d2" intensity={24_000} distance={260} decay={2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-near={0.1} shadow-camera-far={260} shadow-bias={-0.00012} shadow-normalBias={0.018} />
    </group>
  )
}

function CameraTracker({ bodyRefs, useSolarStore }) {
  const controlsRef = useRef(null)
  const selected = useSolarStore((state) => state.selected)
  const smoothedTarget = useMemo(() => new THREE.Vector3(), [])
  const bodyPosition = useMemo(() => new THREE.Vector3(), [])
  const cameraPosition = useMemo(() => new THREE.Vector3(), [])
  const controlTarget = useMemo(() => new THREE.Vector3(), [])
  const viewDirection = useMemo(() => new THREE.Vector3(), [])
  const cameraGoal = useMemo(() => new THREE.Vector3(), [])
  const initialized = useRef(false)
  useEffect(() => { initialized.current = false }, [selected])
  useFrame((_, delta) => {
    const controls = controlsRef.current
    const targetObject = bodyRefs.current.get(selected)
    if (!controls || !targetObject) return
    targetObject.getWorldPosition(bodyPosition)
    if (!initialized.current) {
      if (selected === 'Tierra' && smoothedTarget.lengthSq() === 0) smoothedTarget.copy(bodyPosition)
      initialized.current = true
    }
    const safeDelta = Math.min(delta, 0.05)
    smoothedTarget.lerp(bodyPosition, 1 - Math.exp(-safeDelta * 10.5))
    controls.getPosition(cameraPosition)
    controls.getTarget(controlTarget)
    viewDirection.subVectors(cameraPosition, controlTarget)
    if (viewDirection.lengthSq() < 0.0001) viewDirection.set(1, 0.45, 1)
    const body = BODY_BY_NAME[selected] ?? BODY_BY_NAME.Tierra
    const framingMultiplier = body.category === 'Espacio profundo' ? 9.4 : 5.4
    const distance = THREE.MathUtils.damp(Math.max(viewDirection.length(), 0.1), Math.max(4.4, body.visualRadius * framingMultiplier), 2.4, safeDelta)
    viewDirection.normalize()
    cameraGoal.copy(smoothedTarget).addScaledVector(viewDirection, distance)
    controls.setLookAt(cameraGoal.x, cameraGoal.y, cameraGoal.z, smoothedTarget.x, smoothedTarget.y, smoothedTarget.z, false)
  }, -1)
  return <CameraControls ref={controlsRef} makeDefault minDistance={1.2} maxDistance={2600} dollySpeed={0.55} truckSpeed={0} smoothTime={0.16} draggingSmoothTime={0.08} azimuthRotateSpeed={0.68} polarRotateSpeed={0.68} minPolarAngle={0.05} maxPolarAngle={Math.PI - 0.05} />
}

function SimulationEngine({ simulatedTimeRef, timeScaleRef, useSolarStore }) {
  const timeScale = useSolarStore((state) => state.timeScale)
  const selected = useSolarStore((state) => state.selected)
  const setTelemetry = useSolarStore((state) => state.setTelemetry)
  const telemetryAccumulator = useRef(TELEMETRY_INTERVAL_SECONDS)
  const lastTelemeteredBody = useRef(null)
  const scratchPosition = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => { timeScaleRef.current = timeScale }, [timeScale, timeScaleRef])
  useFrame((_, delta) => {
    const stableDelta = Math.min(delta, 0.05)
    simulatedTimeRef.current += stableDelta * timeScaleRef.current * 1000
    telemetryAccumulator.current += stableDelta
    if (telemetryAccumulator.current < TELEMETRY_INTERVAL_SECONDS) return
    telemetryAccumulator.current = 0
    if (timeScaleRef.current === 0 && lastTelemeteredBody.current === selected) return
    lastTelemeteredBody.current = selected
    const body = BODY_BY_NAME[selected]

    if (body?.category === 'Espacio profundo') {
      setTelemetry({
        mode: 'blackHole',
        massSolar: body.massSolar,
        distanceLightYears: body.distanceLightYears,
        schwarzschildRadiusKm: body.schwarzschildRadiusKm,
        diskTemperatureK: body.diskTemperatureK,
        simulatedDate: new Date(simulatedTimeRef.current).toISOString(),
      })
      return
    }

    if (body?.category === 'Observatorios') {
      const earth = PLANETS[2]
      const { radiusAU } = orbitalPosition(earth, simulatedTimeRef.current, scratchPosition)
      setTelemetry({
        mode: 'observatory',
        distanceAU: radiusAU,
        velocityKms: orbitalSpeedKms(earth, radiusAU),
        altitudeKm: body.altitudeKm,
        orbitPeriodMinutes: body.orbitPeriodMinutes,
        launchYear: body.launchYear,
        simulatedDate: new Date(simulatedTimeRef.current).toISOString(),
      })
      return
    }

    if (!body || selected === 'Sol') {
      setTelemetry({ mode: 'solar', distanceAU: 0, velocityKms: 0, simulatedDate: new Date(simulatedTimeRef.current).toISOString() })
      return
    }
    const { radiusAU } = orbitalPosition(body, simulatedTimeRef.current, scratchPosition)
    setTelemetry({ mode: 'orbit', distanceAU: radiusAU, velocityKms: orbitalSpeedKms(body, radiusAU), simulatedDate: new Date(simulatedTimeRef.current).toISOString() })
  }, -3)
  return null
}

export default function SolarSystem({ useSolarStore }) {
  const setSelected = useSolarStore((state) => state.setSelected)
  const selected = useSolarStore((state) => state.selected)
  const simulatedTimeRef = useRef(Date.now())
  const timeScaleRef = useRef(useSolarStore.getState().timeScale)
  const bodyRefs = useRef(new Map())
  const registerBody = useMemo(() => (name, object) => {
    if (object) bodyRefs.current.set(name, object)
    else bodyRefs.current.delete(name)
  }, [])
  useEffect(() => () => bodyRefs.current.clear(), [])
  return (
    <>
      <SceneBackground />
      <Stars radius={1250} depth={920} count={4200} factor={2.15} saturation={0.35} fade speed={0.05} />
      <ambientLight intensity={0.065} color="#8194b8" />
      <SimulationEngine simulatedTimeRef={simulatedTimeRef} timeScaleRef={timeScaleRef} useSolarStore={useSolarStore} />
      <Sun registerBody={registerBody} setSelected={setSelected} />
      {PLANETS.map((body) => <OrbitPath body={body} key={`${body.name}-orbit`} />)}
      {PLANETS.map((body) => (
        <Planet body={body} key={body.name} simulatedTimeRef={simulatedTimeRef} timeScaleRef={timeScaleRef} registerBody={registerBody} setSelected={setSelected} />
      ))}
      {BLACK_HOLES.map((body) => (
        <BlackHole body={body} selected={selected} key={body.name} registerBody={registerBody} setSelected={setSelected} />
      ))}
      {OBSERVATORIES.map((body) => (
        <SpaceObservatory body={body} selected={selected} key={body.name} simulatedTimeRef={simulatedTimeRef} timeScaleRef={timeScaleRef} registerBody={registerBody} setSelected={setSelected} />
      ))}
      <CameraTracker bodyRefs={bodyRefs} useSolarStore={useSolarStore} />
    </>
  )
}
