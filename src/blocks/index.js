// blocks/index.js —— 基础体几何工厂。
// 原型期用基础体拼：cube / stair / arch / ljoint / pillar / slab。
// 每个 block 返回一个 THREE.Group（或 Mesh），已按 size 建好、原点在几何中心的底面参考。
// 材质由 Level 统一按 palette 指定，这里只造形。

import * as THREE from 'three'

// 低多边形柔和光照：MeshStandardMaterial，高 roughness，无金属感。别上 PBR 写实。
export function makeMaterial(color, { top = false } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.95,
    metalness: 0.0,
    flatShading: true,
  })
}

// 给一个 box 加轻微的顶面提亮：用两种材质（侧面 / 顶面）。
function boxWithTop(w, h, d, sideMat, topMat) {
  const geo = new THREE.BoxGeometry(w, h, d)
  // BoxGeometry 材质分组顺序: +x,-x,+y,-y,+z,-z。索引 2 是顶面 (+y)。
  const mats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
  return new THREE.Mesh(geo, mats)
}

// cube：一块立方（可非等边），底面贴 pos。
function cube(size, sideMat, topMat) {
  const [w, h, d] = size
  const m = boxWithTop(w, h, d, sideMat, topMat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

// slab：薄板（平台），等同 cube 但语义清晰。
function slab(size, sideMat, topMat) {
  return cube(size, sideMat, topMat)
}

// pillar：立柱。
function pillar(size, sideMat, topMat) {
  return cube(size, sideMat, topMat)
}

// stair：阶梯，由若干踏步堆叠而成，沿 +x 上升。
function stair(size, sideMat, topMat) {
  const [w, h, d] = size
  const steps = Math.max(2, Math.round(h))
  const g = new THREE.Group()
  const stepH = h / steps
  const stepW = w / steps
  for (let i = 0; i < steps; i++) {
    const sw = w - i * stepW
    const s = boxWithTop(sw, stepH, d, sideMat, topMat)
    s.position.set(-(w / 2) + sw / 2, -(h / 2) + stepH / 2 + i * stepH, 0)
    s.castShadow = true
    s.receiveShadow = true
    g.add(s)
  }
  return g
}

// arch：拱券（门洞）。两根立柱 + 顶梁，中间镂空成门。
function arch(size, sideMat, topMat) {
  const [w, h, d] = size
  const g = new THREE.Group()
  const legW = w * 0.28
  const legH = h * 0.72
  const beamH = h - legH
  // 左右腿
  for (const sx of [-1, 1]) {
    const leg = boxWithTop(legW, legH, d, sideMat, topMat)
    leg.position.set(sx * (w / 2 - legW / 2), -(h / 2) + legH / 2, 0)
    leg.castShadow = true; leg.receiveShadow = true
    g.add(leg)
  }
  // 顶梁
  const beam = boxWithTop(w, beamH, d, sideMat, topMat)
  beam.position.set(0, h / 2 - beamH / 2, 0)
  beam.castShadow = true; beam.receiveShadow = true
  g.add(beam)
  return g
}

// ljoint：L 形折角块（榫卯 / 补角接缝辅助几何用）。
function ljoint(size, sideMat, topMat) {
  const [w, h, d] = size
  const g = new THREE.Group()
  const t = Math.min(w, h) * 0.5
  // 竖臂
  const v = boxWithTop(t, h, d, sideMat, topMat)
  v.position.set(-(w / 2) + t / 2, 0, 0)
  v.castShadow = true; v.receiveShadow = true
  g.add(v)
  // 横臂
  const hor = boxWithTop(w, t, d, sideMat, topMat)
  hor.position.set(0, -(h / 2) + t / 2, 0)
  hor.castShadow = true; hor.receiveShadow = true
  g.add(hor)
  return g
}

// lattice：漏窗棂条框（一排竖棂），供"抽棂条"关卡。bars 数量按 size.w。
function lattice(size, sideMat, topMat, opts = {}) {
  const [w, h, d] = size
  const g = new THREE.Group()
  const count = opts.bars || 5
  const gap = w / count
  const barW = gap * 0.42
  for (let i = 0; i < count; i++) {
    const bar = boxWithTop(barW, h, d, sideMat, topMat)
    bar.position.set(-(w / 2) + gap * (i + 0.5), 0, 0)
    bar.castShadow = true; bar.receiveShadow = true
    bar.userData.barIndex = i
    g.add(bar)
  }
  return g
}

const factories = { cube, slab, pillar, stair, arch, ljoint, lattice }

// 主入口：按 block 描述建几何。
// spec: { block, pos, size, material, rotY?, bars? }
export function buildBlock(spec, materials) {
  const factory = factories[spec.block] || cube
  const sideMat = materials[spec.material] || materials.stone
  const topMat = materials[spec.material + 'Top'] || materials.stoneTop || sideMat
  const obj = factory(spec.size || [1, 1, 1], sideMat, topMat, spec)
  const [x, y, z] = spec.pos || [0, 0, 0]
  // pos 指几何中心
  obj.position.set(x, y, z)
  if (spec.rotY) obj.rotation.y = (spec.rotY * Math.PI) / 180
  obj.userData.spec = spec
  return obj
}
