// engine/Level.js —— 加载关卡数据、建静态几何、建机关、建导航/角色/高亮。
// 关卡是纯数据，运行时是通用的。这里把数据装配成一个可玩的 THREE.Group。

import * as THREE from 'three'
import { buildBlock, makeMaterial } from '../blocks/index.js'
import { getPalette } from '../tokens.js'
import { Navigation } from './Navigation.js'
import { Mechanism } from './Mechanism.js'
import { Character } from './Character.js'
import { Highlight } from './Highlight.js'

export class Level {
  constructor(data) {
    this.data = data
    this.palette = getPalette(data.palette)
    this.root = new THREE.Group()

    // 统一材质表（按 palette）。
    const p = this.palette
    this.materials = {
      stone: makeMaterial(p.stone),
      stoneTop: makeMaterial(p.stoneTop),
      wood: makeMaterial(p.wood),
      woodTop: makeMaterial(p.wood),
      accent: makeMaterial(p.accent),
      accentTop: makeMaterial(p.accent),
      _accentColor: p.accent,
    }

    // 1) 静态几何
    this.staticGroup = new THREE.Group()
    for (const g of data.geometry || []) {
      this.staticGroup.add(buildBlock(g, this.materials))
    }
    this.root.add(this.staticGroup)

    // 2) 机关
    this.mechanisms = new Map()
    this.handleMeshes = []
    this.mechGroup = new THREE.Group()
    for (const def of data.mechanisms || []) {
      const m = new Mechanism(def, this.materials)
      this.mechanisms.set(m.id, m)
      this.mechGroup.add(m.group)
      if (m.handleMesh) {
        this.mechGroup.add(m.handleMesh)
        this.handleMeshes.push(m.handleMesh)
      }
    }
    this.root.add(this.mechGroup)

    // 3) 导航
    this.nav = new Navigation(data)

    // 4) 角色
    this.character = new Character(this.palette)
    this.character.setNode(this.nav.node(data.start))
    this.root.add(this.character.group)

    // 5) 高亮
    this.highlight = new Highlight(this.nav, p.accent)
    this.root.add(this.highlight.group)

    // 6) debug 叠层
    this.debug = this._buildDebug()
    this.debug.visible = false
    this.root.add(this.debug)

    this.solved = false
    this.refresh()
  }

  // 当前所有机关的逻辑状态快照
  mechStates() {
    const s = {}
    for (const [id, m] of this.mechanisms) s[id] = m.state
    return s
  }

  // 机关状态变化后：重算激活 edge → 刷新高亮 + debug。
  refresh() {
    const states = this.mechStates()
    this.highlight.refresh(this.character.currentNodeId, states)
    this._refreshDebug(states)
  }

  // 所有需要相机框住的世界点（节点 + 几何中心估算）。
  focusPoints() {
    const pts = []
    for (const [, n] of this.nav.nodes) pts.push(n.pos.clone())
    for (const g of this.data.geometry || []) {
      pts.push(new THREE.Vector3(...g.pos))
    }
    return pts
  }

  update(dt, time) {
    for (const [, m] of this.mechanisms) m.update(dt)
    this.character.update(dt)
    this.highlight.update(dt, time)
  }

  // --- debug 叠层：显示所有 node、当前激活 edge、机关 state ---
  _buildDebug() {
    const g = new THREE.Group()

    // 节点小球
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x66ccff })
    this._debugNodes = new THREE.Group()
    for (const [, n] of this.nav.nodes) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), nodeMat)
      s.position.copy(n.pos)
      this._debugNodes.add(s)
    }
    g.add(this._debugNodes)

    // 激活 edge 连线（动态重建）
    this._debugEdges = new THREE.Group()
    g.add(this._debugEdges)

    return g
  }

  _refreshDebug(states) {
    if (!this._debugEdges) return
    this._debugEdges.clear()
    const mat = new THREE.LineBasicMaterial({ color: 0xffe066 })
    for (const e of this.nav.edges) {
      if (!this.nav.edgeActive(e, states)) continue
      const a = this.nav.node(e.a).pos
      const b = this.nav.node(e.b).pos
      const geo = new THREE.BufferGeometry().setFromPoints([a, b])
      this._debugEdges.add(new THREE.Line(geo, mat))
    }
  }

  setDebug(on) {
    this.debug.visible = on
  }

  dispose() {
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.()
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach((m) => m.dispose?.())
      }
    })
  }
}
