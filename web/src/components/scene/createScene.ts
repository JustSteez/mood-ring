import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  EllipseCurve,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const RING_RADIUS = 1.2
const MAX_DPR = 1.75
const FOLLOW = 0.07 // how fast the ring catches up with its scroll target
const NARROW_PX = 860 // matches the mobile breakpoint in app.css
const NARROW_SCALE = 0.62 // smaller ring on phones so it sits under the hero text

/** Ring placement along the page: [scroll progress, x, y, z, tilt]. */
const PATH: [number, number, number, number, number][] = [
  [0.0, 1.75, -0.2, 0.0, 0.3],
  [0.16, -2.1, 0.35, -3.6, 1.1],
  [0.42, 2.0, -0.2, -3.6, 2.0],
  [0.72, -1.7, 0.2, -3.2, 2.8],
  [1.0, 0.0, 0.15, -0.6, 3.5],
]

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const smooth = (t: number) => t * t * (3 - 2 * t)

function pathAt(p: number, narrow: boolean) {
  let i = 0
  while (i < PATH.length - 2 && p > PATH[i + 1][0]) i++
  const [p0, x0, y0, z0, r0] = PATH[i]
  const [p1, x1, y1, z1, r1] = PATH[i + 1]
  const t = smooth(Math.min(1, Math.max(0, (p - p0) / (p1 - p0))))
  const mix = (a: number, b: number) => a + (b - a) * t
  const x = mix(x0, x1)
  const y = mix(y0, y1)
  // On phones the ring is the hero visual above the text, then stays near the centre line.
  return narrow
    ? p < 0.16
      ? { x: mix(0, x1 * 0.3), y: mix(1.35, y1), z: mix(z0 - 1.2, z1 - 3.5), tilt: mix(r0, r1) }
      : { x: x * 0.3, y, z: mix(z0, z1) - 3.5, tilt: mix(r0, r1) }
    : { x, y, z: mix(z0, z1), tilt: mix(r0, r1) }
}

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

function starfield(count: number, inner: number, outer: number, size: number, opacity: number) {
  const pos: number[] = []
  for (let i = 0; i < count; i++) {
    const r = inner + Math.random() * (outer - inner)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    pos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi))
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  const mat = new PointsMaterial({ color: 0xffffff, size, sizeAttenuation: true, transparent: true, opacity, depthWrite: false })
  return new Points(geo, mat)
}

function orbit(radiusX: number, radiusY: number, opacity: number) {
  const pts = new EllipseCurve(0, 0, radiusX, radiusY).getPoints(240)
  const geo = new BufferGeometry().setFromPoints(pts.map((p) => new Vector3(p.x, p.y, 0)))
  return new Line(geo, new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity }))
}

export function createScene(host: HTMLElement, initialColor: string) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR))
  renderer.setClearColor(0x000000, 1)
  host.appendChild(renderer.domElement)

  const scene = new Scene()
  const camera = new PerspectiveCamera(38, 1, 0.1, 200)
  camera.position.set(0, 0, 7.8)

  const pmrem = new PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex

  // ---- the ring
  const ringGroup = new Group()
  const band = new Mesh(
    new TorusGeometry(RING_RADIUS, 0.15, 48, 180),
    new MeshStandardMaterial({ color: 0xdadce1, metalness: 1, roughness: 0.2 }),
  )
  const mood = new Color(initialColor)
  const target = new Color(initialColor)
  const stoneMat = new MeshPhysicalMaterial({
    color: mood,
    emissive: mood,
    emissiveIntensity: 0.55,
    metalness: 0.05,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    flatShading: true,
  })
  const stone = new Mesh(new IcosahedronGeometry(0.4, 1), stoneMat)
  stone.position.set(0, RING_RADIUS + 0.3, 0)
  const glowMat = new SpriteMaterial({
    map: glowTexture(),
    color: mood,
    blending: AdditiveBlending,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  })
  const glow = new Sprite(glowMat)
  glow.scale.setScalar(2.4)
  glow.position.copy(stone.position)
  const stoneLight = new PointLight(mood, 6, 6, 1.6)
  stoneLight.position.set(0, RING_RADIUS + 0.6, 0.6)
  ringGroup.add(band, stone, glow, stoneLight)

  // ---- orbit lines (follow the ring but don't spin with it)
  const orbits = new Group()
  const o1 = orbit(2.5, 2.5, 0.22)
  o1.rotation.set(1.25, 0.15, 0)
  const o2 = orbit(3.1, 3.1, 0.12)
  o2.rotation.set(1.05, -0.5, 0.3)
  orbits.add(o1, o2)

  const holder = new Group()
  holder.add(ringGroup, orbits)
  scene.add(holder)

  const rim = new DirectionalLight(0xffffff, 1.6)
  rim.position.set(-4, 3, 2)
  scene.add(rim)

  const starsNear = starfield(900, 8, 26, 0.05, 0.9)
  const starsFar = starfield(1800, 26, 70, 0.11, 0.55)
  scene.add(starsNear, starsFar)

  // ---- sizing and scroll
  let narrow = false
  function resize() {
    const w = host.clientWidth
    const h = host.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    narrow = w < NARROW_PX
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  const progress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
  }
  const start = pathAt(0, narrow)
  holder.position.set(start.x, start.y, start.z)
  let tilt = start.tilt

  // ---- loop
  const born = performance.now()
  let frame = 0
  let running = true

  function tick(nowMs: number) {
    frame = requestAnimationFrame(tick)
    if (!running) return
    const t = reduced ? 0 : (nowMs - born) / 1000
    const intro = reduced ? 1 : easeOutCubic(Math.min(1, t / 1.8))
    const p = progress()
    const goal = pathAt(p, narrow)

    holder.position.x += (goal.x - holder.position.x) * FOLLOW
    holder.position.y += (goal.y - holder.position.y) * FOLLOW + (reduced ? 0 : Math.sin(t * 0.8) * 0.0015)
    holder.position.z += (goal.z - holder.position.z) * FOLLOW
    tilt += (goal.tilt - tilt) * FOLLOW

    const fit = narrow ? NARROW_SCALE : 1
    ringGroup.scale.setScalar((0.55 + 0.45 * intro) * fit)
    ringGroup.rotation.set(0.35 * Math.sin(tilt), t * 0.35 + p * 7 + (1 - intro) * 2.5, 0.12 * Math.cos(tilt))
    orbits.rotation.z = t * 0.04 + p * 1.4
    orbits.scale.setScalar((0.8 + 0.2 * intro) * fit)

    starsNear.rotation.y = t * 0.012 + p * 0.9
    starsNear.rotation.x = p * 0.3
    starsFar.rotation.y = t * 0.005 + p * 0.35

    mood.lerp(target, 0.05)
    stoneMat.color.copy(mood)
    stoneMat.emissive.copy(mood)
    glowMat.color.copy(mood)
    stoneLight.color.copy(mood)
    glowMat.opacity = 0.7 + (reduced ? 0 : Math.sin(t * 1.6) * 0.15)

    renderer.render(scene, camera)
  }
  frame = requestAnimationFrame(tick)

  const onVisibility = () => {
    running = document.visibilityState === 'visible'
  }
  document.addEventListener('visibilitychange', onVisibility)

  return {
    setColor(c: string) {
      target.set(c)
    },
    dispose() {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      scene.traverse((o) => {
        const m = o as Mesh
        m.geometry?.dispose()
        const mat = m.material as { dispose?: () => void; map?: { dispose: () => void } } | undefined
        mat?.map?.dispose()
        mat?.dispose?.()
      })
      envTex.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
