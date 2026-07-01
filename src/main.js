// main.js —— 启动、场景、相机、渲染循环、UI 壳、关卡切换。

import * as THREE from 'three'
import { makeIsoCamera, placeCamera, updateAspect, fitCamera } from './render/camera.js'
import { makeLights } from './render/lighting.js'
import { Level } from './engine/Level.js'
import { Interaction } from './engine/Interaction.js'
import { getPalette } from './tokens.js'
import { LEVELS } from './levels/index.js'

// ---------- 场景基础 ----------
const app = document.getElementById('app')
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
app.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = makeIsoCamera({ azimuthDeg: 45, elevationDeg: 35.264 })
placeCamera(camera, new THREE.Vector3(0, 0, 0), 80)

let lights = null
function applyPalette(p) {
  scene.background = new THREE.Color(p.background)
  scene.fog = new THREE.Fog(p.fog, 60, 130)
  if (lights) scene.remove(lights.group)
  lights = makeLights(p)
  scene.add(lights.group)
}
applyPalette(getPalette('ink'))

// ---------- 当前关卡状态 ----------
let level = null
let levelIndex = 0
const clock = new THREE.Clock()

const interaction = new Interaction(renderer, camera, () => level)
interaction.onMechChange = () => {
  if (!level) return
  level.refresh()
  playTone(level.palette)
}
interaction.onMove = (nodeId) => moveCharacterTo(nodeId)

// ---------- UI 元素 ----------
const ui = {
  menu: document.getElementById('menu'),
  levelsBox: document.querySelector('#menu .levels'),
  chapter: document.getElementById('chapter'),
  chapterZi: document.querySelector('#chapter .zi'),
  chapterSub: document.querySelector('#chapter .sub'),
  hint: document.getElementById('hint'),
  back: document.getElementById('back'),
  dbg: document.getElementById('dbg'),
  win: document.getElementById('win'),
  winMsg: document.querySelector('#win .msg'),
  winNext: document.querySelector('#win .next'),
  winSeal: document.querySelector('#win .seal'),
}

// 关卡选择列表（山：由下往上）
LEVELS.forEach((lv, i) => {
  const el = document.createElement('div')
  el.className = 'lvl'
  el.innerHTML = `<span class="n">${lv.data.badge || '·'}</span>${lv.title}`
  el.addEventListener('click', () => loadLevel(i))
  ui.levelsBox.appendChild(el)
})

ui.back.addEventListener('click', showMenu)
ui.dbg.addEventListener('click', () => {
  if (!level) return
  const on = !level.debug.visible
  level.setDebug(on)
  ui.dbg.style.opacity = on ? '0.9' : '0.35'
})
ui.winNext.addEventListener('click', () => {
  if (levelIndex + 1 < LEVELS.length) loadLevel(levelIndex + 1)
  else showMenu()
})

function showMenu() {
  ui.menu.classList.remove('hidden')
  ui.chapter.classList.remove('show')
  ui.hint.classList.remove('show')
  ui.win.classList.remove('show')
  interaction.enabled = false
}

// ---------- 加载关卡 ----------
function loadLevel(i) {
  levelIndex = i
  const def = LEVELS[i]

  if (level) {
    scene.remove(level.root)
    level.dispose()
    level = null
  }

  level = new Level(def.data)
  scene.add(level.root)
  applyPalette(level.palette)

  // 相机框住内容
  fitCamera(camera, level.focusPoints(), window.innerWidth, window.innerHeight)

  // UI：匾额 + 提示
  ui.menu.classList.add('hidden')
  ui.win.classList.remove('show')
  ui.chapterZi.textContent = def.badge || ''
  ui.chapterSub.textContent = def.title || ''
  ui.chapter.classList.add('show')
  if (def.hint) {
    ui.hint.textContent = def.hint
    ui.hint.classList.add('show')
  } else {
    ui.hint.classList.remove('show')
  }
  // 几秒后匾额淡出
  clearTimeout(showMenu._t)
  showMenu._t = setTimeout(() => ui.chapter.classList.remove('show'), 3200)

  interaction.enabled = true
  level.refresh()
}

// ---------- 角色移动 ----------
function moveCharacterTo(nodeId) {
  if (!level || level.character.moving) return
  const states = level.mechStates()
  const fromId = level.character.currentNodeId
  const pathIds = level.nav.findPath(fromId, nodeId, states)
  if (!pathIds || pathIds.length < 2) return

  const segMeta = level.nav.pathSegments(pathIds, states)
  const segs = pathIds.map((id, idx) => ({
    id,
    pos: level.nav.node(id).pos.clone(),
    seam: idx > 0 ? segMeta[idx - 1].seam : false,
  }))

  playStep(level.palette)
  level.character.walk(segs, () => onArrive(nodeId))
}

function onArrive(nodeId) {
  if (!level) return
  // 到站后按当前状态刷新可达高亮。
  level.refresh()

  // 关卡脚本钩子（放下负重、色调推进等）——由关卡 data.onArrive 描述。
  const script = level.data.script
  if (script && script.dropOnNode && script.dropOnNode[nodeId] != null) {
    level.character.dropBurden(script.dropOnNode[nodeId])
  }

  // 胜利：到达 exit。
  if (nodeId === level.nav.exitId) triggerWin()
}

function triggerWin() {
  interaction.enabled = false
  const def = LEVELS[levelIndex]
  ui.winSeal.textContent = def.seal || '安'
  ui.winMsg.textContent = def.winMsg || '轻安'
  ui.win.classList.add('show')
  // 结局关：屏幕退成纸白。
  if (def.data.ending) {
    ui.win.style.background = 'rgba(239,233,220,0.96)'
    ui.win.querySelector('.msg').style.color = '#1b1a1f'
  } else {
    ui.win.style.background = 'rgba(20,19,24,0.6)'
    ui.win.querySelector('.msg').style.color = '#efe9dc'
  }
  playWin(level.palette)
}

// ---------- 极简音效（WebAudio 合成，古琴/磬感的正弦点）----------
let actx = null
function audio() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {}
  }
  return actx
}
function ping(freq, dur = 0.5, gain = 0.12, type = 'sine') {
  const a = audio()
  if (!a) return
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.value = freq
  o.connect(g); g.connect(a.destination)
  const t = a.currentTime
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.start(t); o.stop(t + dur)
}
// 五声音阶（宫商角徵羽）
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0]
function playTone() { ping(PENTA[2 + ((Math.floor(performance.now() / 130)) % 3)], 0.6, 0.1) }
function playStep() { ping(PENTA[0] * 2, 0.18, 0.05, 'triangle') }
function playWin() {
  ping(PENTA[0] * 2, 1.4, 0.12)
  setTimeout(() => ping(PENTA[3] * 2, 1.6, 0.1), 180)
  setTimeout(() => ping(PENTA[4] * 2, 2.0, 0.09), 420)
}

// ---------- 渲染循环 ----------
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05)
  const time = clock.elapsedTime
  if (level) level.update(dt, time)
  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}
tick()

// ---------- 自适应 ----------
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  if (level) fitCamera(camera, level.focusPoints(), window.innerWidth, window.innerHeight)
  else updateAspect(camera, window.innerWidth, window.innerHeight)
})

// 启动在菜单
showMenu()

// 调试/自动化钩子（供 debug 叠层与端到端测试用；不影响正常玩法）。
window.__molt = {
  loadLevel,
  get level() { return level },
  setMech(id, state) {
    if (!level) return
    const m = level.mechanisms.get(id)
    if (m) { m.setState(state, { animate: false }); level.refresh() }
  },
  moveTo: moveCharacterTo,
  isWin: () => ui.win.classList.contains('show'),
}
