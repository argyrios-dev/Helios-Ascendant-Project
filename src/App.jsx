import { Component, Suspense, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { create } from 'zustand'
import * as THREE from 'three'
import SolarSystem, { BODY_CATALOG } from './components/SolarSystem.jsx'

export const useSolarStore = create((set) => ({
  selected: 'Tierra',
  timeScale: 1,
  fps: 0,
  telemetry: {
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
        intensity={1.55}
        luminanceThreshold={1.1}
        luminanceSmoothing={0.18}
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

function formatSimulationDate(isoDate) {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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
          {BODY_CATALOG.map((body, index) => (
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

        <div className="epoch-readout">
          <span>ÉPOCA DINÁMICA / UTC</span>
          <time dateTime={telemetry.simulatedDate}>{formatSimulationDate(telemetry.simulatedDate)}</time>
        </div>

        <p className="scale-warning">Radios visuales ampliados; efemérides y telemetría en unidades físicas.</p>
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
        <span className="time-unit">órbitas: 1 día/s · rotación visual estabilizada</span>
      </section>

      <div className="interaction-hint">
        <span>ARRASTRAR</span> orbitar · <span>RUEDA</span> zoom · <span>CLIC</span> fijar planeta
      </div>

      <span className="local-assets">SHADERS PROCEDURALES · FONDO 4K LOCAL</span>
    </div>
  )
}

export default function App() {
  const [webGLAvailable] = useState(supportsWebGL2)

  return (
    <main className="app-shell" style={{ '--space-bg': `url(${LOCAL_BACKDROP_URL})` }}>
      <SceneErrorBoundary>
        {webGLAvailable ? (
          <Canvas
            dpr={[1, 2]}
            frameloop="always"
            shadows
            camera={{ position: [0, 38, 76], fov: 46, near: 0.05, far: 4200 }}
            gl={{
              antialias: false,
              alpha: true,
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
            <AdaptiveDpr pixelated />
            <PerformanceProbe />
            <SceneEffects />
          </Canvas>
        ) : <RenderFallback />}
      </SceneErrorBoundary>

      <Interface />
    </main>
  )
}
