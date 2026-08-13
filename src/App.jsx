import { Component, Suspense, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { create } from 'zustand'
import * as THREE from 'three'
import SolarSystem, { BODY_CATALOG } from './components/SolarSystem.jsx'

export const useSolarStore = create((set) => ({
  selected: 'Tierra',
  timeScale: 1,
  fps: 0,
  telemetry: {
    mode: 'orbit',
    distanceAU: 1,
    velocityKms: 29.78,
    simulatedDate: new Date().toISOString(),
  },
  setSelected: (selected) => set({ selected }),
  setTimeScale: (timeScale) => set({ timeScale }),
  setFps: (fps) => set({ fps }),
  setTelemetry: (telemetry) => set({ telemetry }),
}))

const TIME_SCALES = [0, 1, 10, 100]
const LOCAL_BACKDROP_URL = `${import.meta.env.BASE_URL}assets/deep-space-4k.jpg`
const ICON_URL = `${import.meta.env.BASE_URL}assets/helios-icon-512.png`
const BODY_GROUPS = ['Sistema Solar', 'Espacio profundo', 'Observatorios'].map((category) => ({
  category,
  bodies: BODY_CATALOG.filter((body) => body.category === category),
}))

function supportsWebGL2() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      failIfMajorPerformanceCaveat: false,
    })
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

function RenderFallback({ crashed = false }) {
  return (
    <div className="render-fallback" role="status">
      <strong>{crashed ? 'RENDER INTERRUMPIDO' : 'WEBGL 2 NO DISPONIBLE'}</strong>
      <span>Activa la aceleración gráfica del navegador y vuelve a cargar la página.</span>
    </div>
  )
}

class SceneErrorBoundary extends Component {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  render() {
    return this.state.crashed ? <RenderFallback crashed /> : this.props.children
  }
}

function PerformanceProbe() {
  const setFps = useSolarStore((state) => state.setFps)
  const sample = useMemo(() => ({ elapsed: 0, frames: 0 }), [])

  useFrame((_, delta) => {
    sample.elapsed += delta
    sample.frames += 1

    if (sample.elapsed >= 0.5) {
      setFps(Math.round(sample.frames / sample.elapsed))
      sample.elapsed = 0
      sample.frames = 0
    }
  })

  return null
}

function SceneEffects() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        mipmapBlur
        intensity={1.2}
        luminanceThreshold={1.45}
        luminanceSmoothing={0.12}
      />
      <Vignette eskil={false} offset={0.18} darkness={0.66} />
    </EffectComposer>
  )
}

function formatNumber(value, maximumFractionDigits = 3) {
  if (!Number.isFinite(value)) return '—'

  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  }).format(value)
}

function formatMagnitude(value, maximumFractionDigits = 2) {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 100_000_000) return value.toExponential(maximumFractionDigits).replace('.', ',')
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits }).format(value)
}

function formatSimulationDate(isoDate) {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(date)
}

function Interface() {
  const selected = useSolarStore((state) => state.selected)
  const timeScale = useSolarStore((state) => state.timeScale)
  const fps = useSolarStore((state) => state.fps)
  const telemetry = useSolarStore((state) => state.telemetry)
  const setSelected = useSolarStore((state) => state.setSelected)
  const setTimeScale = useSolarStore((state) => state.setTimeScale)
  const activeBody = BODY_CATALOG.find((body) => body.name === selected)

  return (
    <div className="interface" aria-label="Controles y telemetría del simulador">
      <header className="topbar">
        <div className="brand-block">
          <img className="brand-icon" src={ICON_URL} alt="" aria-hidden="true" />
          <span className="eyebrow">DEEP SPACE / WEBGL-01</span>
          <h1>HELIOS ASCENDANT</h1>
          <span className="edition">PROJECT</span>
        </div>

        <div className="status-cluster" aria-label="Estado del renderizador">
          <span className="status-light" aria-hidden="true" />
          <span>GPU NOMINAL</span>
          <strong>{fps || '—'} FPS</strong>
        </div>
      </header>

      <nav className="body-selector glass-panel" aria-label="Seleccionar cuerpo celeste">
        <span className="panel-kicker">01 / OBJETIVO · {BODY_CATALOG.length} CUERPOS</span>
        <div className="body-list">
          {BODY_GROUPS.map((group) => (
            <div className="body-group" key={group.category}>
              <span className="body-group-title">{group.category}</span>
              {group.bodies.map((body) => {
                const index = BODY_CATALOG.findIndex((catalogBody) => catalogBody.name === body.name)
                return (
                  <button
                    className={body.name === selected ? 'body-button is-active' : 'body-button'}
                    key={body.name}
                    type="button"
                    aria-pressed={body.name === selected}
                    onClick={() => setSelected(body.name)}
                  >
                    <span className="body-index">{String(index).padStart(2, '0')}</span>
                    <span className="body-dot" style={{ '--body-color': body.color }} aria-hidden="true" />
                    <span>{body.name}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </nav>

      <aside className="telemetry glass-panel" aria-live="polite">
        <span className="panel-kicker">02 / TELEMETRÍA</span>
        <div className="telemetry-heading">
          <span className="target-reticle" aria-hidden="true" />
          <div>
            <p>OBJETIVO FIJADO</p>
            <h2>{selected}</h2>
            <span className="body-classification">{activeBody?.classification}</span>
          </div>
        </div>

        {activeBody?.category === 'Espacio profundo' ? (
          <dl className="telemetry-grid">
            <div>
              <dt>Distancia terrestre</dt>
              <dd>{formatMagnitude(telemetry.distanceLightYears, 2)} <small>años luz</small></dd>
            </div>
            <div>
              <dt>Masa estimada</dt>
              <dd>{formatMagnitude(telemetry.massSolar, 3)} <small>M☉</small></dd>
            </div>
            <div>
              <dt>Radio Schwarzschild</dt>
              <dd>{formatMagnitude(telemetry.schwarzschildRadiusKm, 2)} <small>km</small></dd>
            </div>
            <div>
              <dt>Plasma del disco</dt>
              <dd>{formatMagnitude(telemetry.diskTemperatureK, 1)} <small>K</small></dd>
            </div>
          </dl>
        ) : activeBody?.category === 'Observatorios' ? (
          <dl className="telemetry-grid">
            <div>
              <dt>Distancia solar</dt>
              <dd>{formatNumber(telemetry.distanceAU, 3)} <small>UA</small></dd>
            </div>
            <div>
              <dt>Velocidad heliocéntrica</dt>
              <dd>{formatNumber(telemetry.velocityKms, 2)} <small>km/s</small></dd>
            </div>
            <div>
              <dt>Altitud / punto</dt>
              <dd>{formatMagnitude(telemetry.altitudeKm, 1)} <small>km</small></dd>
            </div>
            <div>
              <dt>Lanzamiento</dt>
              <dd>{telemetry.launchYear ?? '—'}</dd>
            </div>
          </dl>
        ) : (
          <dl className="telemetry-grid">
            <div>
              <dt>Distancia solar</dt>
              <dd>{selected === 'Sol' ? '—' : formatNumber(telemetry.distanceAU, 3)} <small>UA</small></dd>
            </div>
            <div>
              <dt>Velocidad orbital</dt>
              <dd>{selected === 'Sol' ? '—' : formatNumber(telemetry.velocityKms, 2)} <small>km/s</small></dd>
            </div>
            <div>
              <dt>Semieje mayor</dt>
              <dd>{activeBody?.semiMajorAxisAU ? formatNumber(activeBody.semiMajorAxisAU, 3) : '—'} <small>UA</small></dd>
            </div>
            <div>
              <dt>Excentricidad</dt>
              <dd>{activeBody?.eccentricity !== undefined ? formatNumber(activeBody.eccentricity, 4) : '—'}</dd>
            </div>
          </dl>
        )}

        <div className="epoch-readout">
          <span>ÉPOCA DINÁMICA / UTC</span>
          <time dateTime={telemetry.simulatedDate}>{formatSimulationDate(telemetry.simulatedDate)}</time>
        </div>

        <p className="scale-warning">Escalas visuales adaptadas; datos físicos y clasificación científica.</p>
      </aside>

      <section className="time-console glass-panel" aria-label="Velocidad de simulación">
        <div className="time-label">
          <span className="panel-kicker">03 / TIEMPO</span>
          <strong>{timeScale === 0 ? 'PAUSA' : `${timeScale}×`}</strong>
        </div>
        <div className="time-buttons">
          {TIME_SCALES.map((scale) => (
            <button
              type="button"
              key={scale}
              className={timeScale === scale ? 'time-button is-active' : 'time-button'}
              aria-pressed={timeScale === scale}
              onClick={() => setTimeScale(scale)}
            >
              {scale === 0 ? 'Ⅱ' : `${scale}×`}
            </button>
          ))}
        </div>
        <span className="time-unit">1× = tiempo físico real · 10× y 100× son multiplicadores exactos</span>
      </section>

      <div className="interaction-hint">
        <span>ARRASTRAR</span> orbitar · <span>RUEDA</span> zoom · <span>CLIC</span> fijar objeto
      </div>

      <span className="local-assets">SHADERS PROCEDURALES · FONDO 4K LOCAL</span>
    </div>
  )
}

export default function App() {
  const [webGLAvailable] = useState(supportsWebGL2)
  const [pixelRatio] = useState(() => Math.min(window.devicePixelRatio || 1, 1.5))

  return (
    <main className="app-shell" style={{ '--space-bg': `url(${LOCAL_BACKDROP_URL})` }}>
      <SceneErrorBoundary>
        {webGLAvailable ? (
          <Canvas
            dpr={pixelRatio}
            frameloop="always"
            shadows
            camera={{ position: [0, 38, 76], fov: 46, near: 0.05, far: 4200 }}
            gl={{
              antialias: false,
              alpha: false,
              depth: true,
              stencil: false,
              powerPreference: 'high-performance',
            }}
            onCreated={({ gl }) => {
              gl.outputColorSpace = THREE.SRGBColorSpace
              gl.toneMapping = THREE.ACESFilmicToneMapping
              gl.toneMappingExposure = 1.06
              gl.shadowMap.enabled = true
              gl.shadowMap.type = THREE.PCFSoftShadowMap
            }}
          >
            <Suspense fallback={null}>
              <SolarSystem useSolarStore={useSolarStore} />
            </Suspense>
            <PerformanceProbe />
            <SceneEffects />
          </Canvas>
        ) : <RenderFallback />}
      </SceneErrorBoundary>

      <Interface />
    </main>
  )
}
