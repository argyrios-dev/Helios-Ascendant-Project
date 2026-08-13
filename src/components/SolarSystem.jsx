import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'

const TAU = Math.PI * 2
const DAY_MS = 86_400_000
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0)
const AU_KM = 149_597_870.7
const SOLAR_MU_KM3_S2 = 132_712_440_018
const VISUAL_AU = 20
const BASE_DAYS_PER_SECOND = 1
const TELEMETRY_INTERVAL_SECONDS = 0.12
const TEXTURE_ORIGIN = 'https://www.solarsystemscope.com/textures/download'
const EARTH_NORMAL_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r185/examples/textures/planets/earth_normal_2048.jpg'

const degrees = (value) => THREE.MathUtils.degToRad(value)

function textureTier() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return '2k'

  const longEdge = Math.max(window.innerWidth, window.innerHeight)
  const deviceMemory = navigator.deviceMemory ?? (longEdge >= 1400 ? 8 : 4)
  const reducedData = navigator.connection?.saveData === true

  return !reducedData && deviceMemory >= 8 && longEdge >= 1400 ? '8k' : '2k'
}

const ACTIVE_TEXTURE_TIER = textureTier()

const PLANETS = [
  {
    name: 'Mercurio',
    texture: 'mercury',
    color: '#aaa39b',
    semiMajorAxisAU: 0.387098,
    eccentricity: 0.20563,
    periodDays: 87.969,
    inclinationDeg: 7.005,
    ascendingNodeDeg: 48.331,
    argumentPeriapsisDeg: 29.124,
    meanAnomalyJ2000Deg: 174.796,
    axialTiltDeg: 0.034,
    rotationPeriodDays: 58.646,
    visualRadius: 0.34,
    roughness: 0.91,
    bumpScale: 0.025,
  },
  {
    name: 'Venus',
    texture: 'venus_surface',
    color: '#d8ae65',
    semiMajorAxisAU: 0.723332,
    eccentricity: 0.006772,
    periodDays: 224.701,
    inclinationDeg: 3.3947,
    ascendingNodeDeg: 76.68,
    argumentPeriapsisDeg: 54.884,
    meanAnomalyJ2000Deg: 50.415,
    axialTiltDeg: 177.36,
    rotationPeriodDays: -243.025,
    visualRadius: 0.62,
    roughness: 0.86,
    bumpScale: 0.012,
  },
  {
    name: 'Tierra',
    texture: 'earth_daymap',
    normalMap: EARTH_NORMAL_URL,
    color: '#4f9fff',
    semiMajorAxisAU: 1,
    eccentricity: 0.0167086,
    periodDays: 365.256,
    inclinationDeg: 0.00005,
    ascendingNodeDeg: -11.26064,
    argumentPeriapsisDeg: 114.20783,
    meanAnomalyJ2000Deg: 357.51716,
    axialTiltDeg: 23.4393,
    rotationPeriodDays: 0.9972697,
    visualRadius: 0.66,
    roughness: 0.68,
    metalness: 0.02,
    bumpScale: 0.028,
    atmosphere: true,
  },
  {
    name: 'Marte',
    texture: 'mars',
    color: '#dc6849',
    semiMajorAxisAU: 1.523679,
    eccentricity: 0.0934,
    periodDays: 686.98,
    inclinationDeg: 1.85,
    ascendingNodeDeg: 49.558,
    argumentPeriapsisDeg: 286.502,
    meanAnomalyJ2000Deg: 19.373,
    axialTiltDeg: 25.19,
    rotationPeriodDays: 1.025957,
    visualRadius: 0.46,
    roughness: 0.9,
    bumpScale: 0.035,
  },
  {
    name: 'Júpiter',
    texture: 'jupiter',
    color: '#e4b98e',
    semiMajorAxisAU: 5.2044,
    eccentricity: 0.0489,
    periodDays: 4332.59,
    inclinationDeg: 1.303,
    ascendingNodeDeg: 100.464,
    argumentPeriapsisDeg: 273.867,
    meanAnomalyJ2000Deg: 20.02,
    axialTiltDeg: 3.13,
    rotationPeriodDays: 0.41354,
    visualRadius: 2.3,
    roughness: 0.79,
    bumpScale: 0.008,
  },
  {
    name: 'Saturno',
    texture: 'saturn',
    color: '#efd39b',
    semiMajorAxisAU: 9.5826,
    eccentricity: 0.0565,
    periodDays: 10759.22,
    inclinationDeg: 2.485,
    ascendingNodeDeg: 113.665,
    argumentPeriapsisDeg: 339.392,
    meanAnomalyJ2000Deg: 316.888,
    axialTiltDeg: 26.73,
    rotationPeriodDays: 0.444,
    visualRadius: 2,
    roughness: 0.8,
    bumpScale: 0.006,
    rings: { inner: 2.45, outer: 4.15, color: '#e7c98e', opacity: 0.72 },
  },
  {
    name: 'Urano',
    texture: 'uranus',
    color: '#a8edf1',
    semiMajorAxisAU: 19.2184,
    eccentricity: 0.046381,
    periodDays: 30688.5,
    inclinationDeg: 0.773,
    ascendingNodeDeg: 74.006,
    argumentPeriapsisDeg: 96.998,
    meanAnomalyJ2000Deg: 142.2386,
    axialTiltDeg: 97.77,
    rotationPeriodDays: -0.71833,
    visualRadius: 1.25,
    roughness: 0.73,
    bumpScale: 0.003,
    rings: { inner: 1.55, outer: 2.15, color: '#9fdde1', opacity: 0.28 },
  },
  {
    name: 'Neptuno',
    texture: 'neptune',
    color: '#416dff',
    semiMajorAxisAU: 30.11,
    eccentricity: 0.009456,
    periodDays: 60182,
    inclinationDeg: 1.77,
    ascendingNodeDeg: 131.784,
    argumentPeriapsisDeg: 273.187,
    meanAnomalyJ2000Deg: 259.908,
    axialTiltDeg: 28.32,
    rotationPeriodDays: 0.67125,
    visualRadius: 1.2,
    roughness: 0.7,
    bumpScale: 0.003,
  },
]

export const BODY_CATALOG = [
  { name: 'Sol', color: '#ffb347', visualRadius: 4.5 },
  ...PLANETS,
]

const BODY_BY_NAME = Object.fromEntries(BODY_CATALOG.map((body) => [body.name, body]))
const ORBIT_BASIS_CACHE = new WeakMap()

function wrapRadians(value) {
  return ((value % TAU) + TAU) % TAU
}

function solveEccentricAnomaly(meanAnomaly, eccentricity) {
  const mean = wrapRadians(meanAnomaly)
  let eccentric = eccentricity < 0.8 ? mean : Math.PI

  for (let index = 0; index < 6; index += 1) {
    const numerator = eccentric - eccentricity * Math.sin(eccentric) - mean
    const denominator = 1 - eccentricity * Math.cos(eccentric)
    eccentric -= numerator / denominator
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
  const standardX = basis.xx * xOrbital + basis.xy * yOrbital
  const standardY = basis.yx * xOrbital + basis.yy * yOrbital
  const standardZ = basis.zx * xOrbital + basis.zy * yOrbital

  target.set(standardX, standardZ, -standardY)

  return {
    radiusAU: Math.hypot(xOrbital, yOrbital) / VISUAL_AU,
    eccentricAnomaly,
  }
}

function orbitalSpeedKms(body, radiusAU) {
  const radiusKm = radiusAU * AU_KM
  const semiMajorKm = body.semiMajorAxisAU * AU_KM
  return Math.sqrt(SOLAR_MU_KM3_S2 * (2 / radiusKm - 1 / semiMajorKm))
}

function makeTextureUrl(textureName) {
  const tier = textureName === 'uranus' || textureName === 'neptune' ? '2k' : ACTIVE_TEXTURE_TIER
  return `${TEXTURE_ORIGIN}/${tier}_${textureName}.jpg`
}

function useManagedTextures(urls) {
  const textures = useTexture(urls)
  const { gl } = useThree()

  useEffect(() => {
    const maxAnisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())

    textures.forEach((texture, index) => {
      texture.anisotropy = maxAnisotropy
      texture.wrapS = THREE.RepeatWrapping
      texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.needsUpdate = true
    })

    return () => {
      textures.forEach((texture) => texture.dispose())
      urls.forEach((url) => useTexture.clear(url))
    }
  }, [gl, textures, urls])

  return textures
}

function OrbitPath({ body }) {
  const geometry = useMemo(() => {
    const points = 320
    const positions = new Float32Array(points * 3)
    const target = new THREE.Vector3()

    for (let index = 0; index < points; index += 1) {
      const eccentricAnomaly = (index / points) * TAU
      const syntheticMs =
        J2000_MS +
        ((eccentricAnomaly - degrees(body.meanAnomalyJ2000Deg)) / (TAU / body.periodDays)) * DAY_MS
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

  useEffect(
    () => () => {
      geometry.dispose()
      materialRef.current?.dispose()
    },
    [geometry],
  )

  return (
    <lineLoop geometry={geometry} frustumCulled>
      <lineBasicMaterial
        ref={materialRef}
        color={body.color}
        transparent
        opacity={0.16}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </lineLoop>
  )
}

function Atmosphere({ radius }) {
  const geometryRef = useRef(null)
  const materialRef = useRef(null)
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#4ba9ff') },
      uStrength: { value: 1.25 },
    }),
    [],
  )

  useEffect(
    () => () => {
      geometryRef.current?.dispose()
      materialRef.current?.dispose()
    },
    [],
  )

  return (
    <mesh scale={radius * 1.105} renderOrder={3}>
      <sphereGeometry ref={geometryRef} args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vViewDirection;

          void main() {
            vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vViewDirection = normalize(-modelViewPosition.xyz);
            gl_Position = projectionMatrix * modelViewPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uStrength;
          varying vec3 vNormal;
          varying vec3 vViewDirection;

          void main() {
            float fresnel = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), 3.15);
            float alpha = fresnel * uStrength;
            gl_FragColor = vec4(uColor * alpha, alpha * 0.72);
          }
        `}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

function PlanetaryRings({ config }) {
  const geometryRef = useRef(null)
  const materialRef = useRef(null)
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(config.color) },
      uOpacity: { value: config.opacity },
    }),
    [config.color, config.opacity],
  )

  useEffect(
    () => () => {
      geometryRef.current?.dispose()
      materialRef.current?.dispose()
    },
    [],
  )

  return (
    <mesh rotation-x={-Math.PI / 2} castShadow receiveShadow>
      <ringGeometry ref={geometryRef} args={[config.inner, config.outer, 192, 1]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;

          void main() {
            float radius = length(vUv - vec2(0.5)) * 2.0;
            float bands = 0.56 + 0.22 * sin(radius * 170.0) + 0.14 * sin(radius * 43.0);
            float cassini = smoothstep(0.020, 0.055, abs(radius - 0.71));
            float edge = smoothstep(0.03, 0.12, radius) * (1.0 - smoothstep(0.88, 0.99, radius));
            float alpha = clamp(bands, 0.12, 0.92) * cassini * edge * uOpacity;
            gl_FragColor = vec4(uColor * (0.55 + bands * 0.55), alpha);
          }
        `}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        alphaTest={0.025}
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
  const textureUrls = useMemo(
    () => [makeTextureUrl(body.texture), ...(body.normalMap ? [body.normalMap] : [])],
    [body],
  )
  const [albedoMap, normalMap] = useManagedTextures(textureUrls)

  useLayoutEffect(() => registerBody(body.name, orbitRef.current), [body.name, registerBody])

  useEffect(
    () => () => {
      registerBody(body.name, null)
      geometryRef.current?.dispose()
      materialRef.current?.dispose()
    },
    [body.name, registerBody],
  )

  useFrame((_, delta) => {
    if (!orbitRef.current || !rotationRef.current) return

    orbitalPosition(body, simulatedTimeRef.current, position)
    orbitRef.current.position.copy(position)

    const simulatedDays = Math.min(delta, 0.05) * BASE_DAYS_PER_SECOND * timeScaleRef.current
    rotationRef.current.rotation.y = wrapRadians(
      rotationRef.current.rotation.y + (simulatedDays / body.rotationPeriodDays) * TAU,
    )
  }, -2)

  const selectBody = (event) => {
    event.stopPropagation()
    setSelected(body.name)
  }

  return (
    <group ref={orbitRef}>
      <group rotation-z={degrees(body.axialTiltDeg)} onClick={selectBody}>
        <mesh ref={rotationRef} castShadow receiveShadow>
          <sphereGeometry ref={geometryRef} args={[body.visualRadius, 64, 64]} />
          <meshStandardMaterial
            ref={materialRef}
            map={albedoMap}
            normalMap={normalMap ?? null}
            normalScale={normalMap ? [body.bumpScale * 10, body.bumpScale * 10] : [1, 1]}
            bumpMap={normalMap ? null : albedoMap}
            bumpScale={body.bumpScale}
            roughness={body.roughness}
            metalness={body.metalness ?? 0}
          />
        </mesh>
        {body.atmosphere && <Atmosphere radius={body.visualRadius} />}
        {body.rings && <PlanetaryRings config={body.rings} />}
      </group>
    </group>
  )
}

function SolarCorona({ radius }) {
  const geometryRef = useRef(null)
  const materialRef = useRef(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#ff7426') },
    }),
    [],
  )

  useFrame((state) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  useEffect(
    () => () => {
      geometryRef.current?.dispose()
      materialRef.current?.dispose()
    },
    [],
  )

  return (
    <mesh scale={radius * 1.17} renderOrder={2}>
      <sphereGeometry ref={geometryRef} args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vViewDirection;
          void main() {
            vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vViewDirection = normalize(-modelViewPosition.xyz);
            gl_Position = projectionMatrix * modelViewPosition;
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColor;
          varying vec3 vNormal;
          varying vec3 vViewDirection;
          void main() {
            float rim = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), 2.25);
            float pulse = 0.88 + 0.12 * sin(uTime * 1.7 + vNormal.y * 8.0);
            float alpha = rim * pulse * 0.62;
            gl_FragColor = vec4(uColor * (1.7 * alpha), alpha);
          }
        `}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

function Sun({ registerBody, setSelected }) {
  const rootRef = useRef(null)
  const geometryRef = useRef(null)
  const materialRef = useRef(null)
  const lightRef = useRef(null)
  const textureUrl = useMemo(() => makeTextureUrl('sun'), [])
  const textureUrls = useMemo(() => [textureUrl], [textureUrl])
  const [surface] = useManagedTextures(textureUrls)

  useLayoutEffect(() => registerBody('Sol', rootRef.current), [registerBody])

  useEffect(
    () => () => {
      registerBody('Sol', null)
      geometryRef.current?.dispose()
      materialRef.current?.dispose()
      lightRef.current?.shadow?.map?.dispose()
    },
    [registerBody],
  )

  return (
    <group ref={rootRef} onClick={(event) => { event.stopPropagation(); setSelected('Sol') }}>
      <mesh>
        <sphereGeometry ref={geometryRef} args={[4.5, 96, 96]} />
        <meshStandardMaterial
          ref={materialRef}
          map={surface}
          emissiveMap={surface}
          emissive="#ff6a16"
          emissiveIntensity={7.5}
          roughness={0.82}
          toneMapped={false}
        />
      </mesh>
      <SolarCorona radius={4.5} />
      <pointLight
        ref={lightRef}
        color="#fff1d2"
        intensity={3_200_000}
        distance={0}
        decay={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={1400}
        shadow-bias={-0.00012}
        shadow-normalBias={0.018}
      />
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

  useEffect(() => {
    initialized.current = false
  }, [selected])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    const targetObject = bodyRefs.current.get(selected)
    if (!controls || !targetObject) return

    targetObject.getWorldPosition(bodyPosition)

    if (!initialized.current) {
      if (selected === 'Tierra' && smoothedTarget.lengthSq() === 0) {
        smoothedTarget.copy(bodyPosition)
      }
      initialized.current = true
    }

    const safeDelta = Math.min(delta, 0.05)
    const targetAlpha = 1 - Math.exp(-safeDelta * 10.5)
    smoothedTarget.lerp(bodyPosition, targetAlpha)

    controls.getPosition(cameraPosition)
    controls.getTarget(controlTarget)
    viewDirection.subVectors(cameraPosition, controlTarget)

    if (viewDirection.lengthSq() < 0.0001) viewDirection.set(1, 0.45, 1)

    const currentDistance = Math.max(viewDirection.length(), 0.1)
    const body = BODY_BY_NAME[selected] ?? BODY_BY_NAME.Tierra
    const wantedDistance = Math.max(5.5, body.visualRadius * 5.4)
    const distance = THREE.MathUtils.damp(currentDistance, wantedDistance, 2.4, safeDelta)

    viewDirection.normalize()
    cameraGoal.copy(smoothedTarget).addScaledVector(viewDirection, distance)
    controls.setLookAt(
      cameraGoal.x,
      cameraGoal.y,
      cameraGoal.z,
      smoothedTarget.x,
      smoothedTarget.y,
      smoothedTarget.z,
      false,
    )
  }, -1)

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minDistance={2.3}
      maxDistance={950}
      dollySpeed={0.55}
      truckSpeed={0}
      smoothTime={0.16}
      draggingSmoothTime={0.08}
      azimuthRotateSpeed={0.68}
      polarRotateSpeed={0.68}
      minPolarAngle={0.05}
      maxPolarAngle={Math.PI - 0.05}
    />
  )
}

function SimulationEngine({ simulatedTimeRef, timeScaleRef, useSolarStore }) {
  const timeScale = useSolarStore((state) => state.timeScale)
  const selected = useSolarStore((state) => state.selected)
  const setTelemetry = useSolarStore((state) => state.setTelemetry)
  const telemetryAccumulator = useRef(TELEMETRY_INTERVAL_SECONDS)
  const lastTelemeteredBody = useRef(null)
  const scratchPosition = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    timeScaleRef.current = timeScale
  }, [timeScale, timeScaleRef])

  useFrame((_, delta) => {
    const stableDelta = Math.min(delta, 0.05)
    simulatedTimeRef.current += stableDelta * BASE_DAYS_PER_SECOND * timeScaleRef.current * DAY_MS
    telemetryAccumulator.current += stableDelta

    if (telemetryAccumulator.current < TELEMETRY_INTERVAL_SECONDS) return
    telemetryAccumulator.current = 0

    if (timeScaleRef.current === 0 && lastTelemeteredBody.current === selected) return
    lastTelemeteredBody.current = selected

    const body = BODY_BY_NAME[selected]
    if (!body || selected === 'Sol') {
      setTelemetry({
        distanceAU: 0,
        velocityKms: 0,
        simulatedDate: new Date(simulatedTimeRef.current).toISOString(),
      })
      return
    }

    const { radiusAU } = orbitalPosition(body, simulatedTimeRef.current, scratchPosition)
    setTelemetry({
      distanceAU: radiusAU,
      velocityKms: orbitalSpeedKms(body, radiusAU),
      simulatedDate: new Date(simulatedTimeRef.current).toISOString(),
    })
  }, -3)

  return null
}

export default function SolarSystem({ useSolarStore }) {
  const setSelected = useSolarStore((state) => state.setSelected)
  const simulatedTimeRef = useRef(new Date().getTime())
  const timeScaleRef = useRef(useSolarStore.getState().timeScale)
  const bodyRefs = useRef(new Map())

  const registerBody = useMemo(
    () => (name, object) => {
      if (object) bodyRefs.current.set(name, object)
      else bodyRefs.current.delete(name)
    },
    [],
  )

  useEffect(
    () => () => {
      bodyRefs.current.clear()
    },
    [],
  )

  return (
    <>
      <Stars radius={1100} depth={680} count={6200} factor={5.2} saturation={0.32} fade speed={0.12} />
      <ambientLight intensity={0.006} color="#5b6b8f" />

      <SimulationEngine
        simulatedTimeRef={simulatedTimeRef}
        timeScaleRef={timeScaleRef}
        useSolarStore={useSolarStore}
      />

      <Sun registerBody={registerBody} setSelected={setSelected} />

      {PLANETS.map((body) => (
        <OrbitPath body={body} key={`${body.name}-orbit`} />
      ))}

      {PLANETS.map((body) => (
        <Planet
          body={body}
          key={body.name}
          simulatedTimeRef={simulatedTimeRef}
          timeScaleRef={timeScaleRef}
          registerBody={registerBody}
          setSelected={setSelected}
        />
      ))}

      <CameraTracker bodyRefs={bodyRefs} useSolarStore={useSolarStore} />
    </>
  )
}
