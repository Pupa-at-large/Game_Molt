// engine/Mechanism.js —— 机关：有限个"吸附态"、状态间补间旋转、手柄。
//
// 玩家交互只能把机关切到某个吸附态（如旋转 ∈ {0,90,180,270}），不能停在中间。
// 支持两类：
//   rotate  —— 绕 pivot/axis 旋到某角度（states 为角度数组）
//   extract —— 抽棂条：states 为"抽出的棂条索引集合"的离散档位（漏窗用）
//
// 手柄(handle)是玩家点/拖的目标。为稳健，交互层用"点击手柄 → 切到下一吸附态"。

import * as THREE from 'three'
import { buildBlock } from '../blocks/index.js'

const DEG = Math.PI / 180

export class Mechanism {
  constructor(def, materials) {
    this.id = def.id
    this.type = def.type || 'rotate'
    this.states = def.states.slice()
    this.state = def.initial != null ? def.initial : this.states[0]
    this.axis = def.axis || 'y'
    this.pivot = new THREE.Vector3(...(def.pivot || [0, 0, 0]))
    this.def = def

    // 机关自身几何挂在一个绕 pivot 的 group 下。
    this.group = new THREE.Group()
    this.group.position.copy(this.pivot)
    this.inner = new THREE.Group()
    this.group.add(this.inner)
    for (const g of def.geometry || []) {
      const spec = { ...g, pos: [g.pos[0] - this.pivot.x, g.pos[1] - this.pivot.y, g.pos[2] - this.pivot.z] }
      this.inner.add(buildBlock(spec, materials))
    }

    // 手柄：一个小朱砂标记，标示可交互。
    this.handleMesh = null
    if (def.handle) {
      const geo = new THREE.SphereGeometry(0.32, 20, 16)
      const mat = new THREE.MeshStandardMaterial({
        color: materials._accentColor,
        roughness: 0.5,
        emissive: materials._accentColor,
        emissiveIntensity: 0.35,
      })
      this.handleMesh = new THREE.Mesh(geo, mat)
      this.handleMesh.position.set(...def.handle.pos)
      this.handleMesh.userData.mechanism = this
      this.handleMesh.userData.isHandle = true
    }

    this._applyImmediate(this.state)
    this._tween = null
  }

  // 当前离散状态在 states 数组中的下标
  stateIndex() {
    return Math.max(0, this.states.indexOf(this.state))
  }

  // 立即（无动画）应用某状态
  _applyImmediate(state) {
    if (this.type === 'rotate') {
      const rad = state * DEG
      this.inner.rotation.set(0, 0, 0)
      this.inner.rotation[this.axis] = rad
    } else if (this.type === 'extract') {
      // state 是被抽出的棂条索引数组。抽出的棂条移到远处（隐藏）。
      const pulled = new Set(state)
      this.inner.traverse((o) => {
        if (o.userData && o.userData.barIndex != null) {
          o.visible = !pulled.has(o.userData.barIndex)
        }
      })
    }
    this.state = state
  }

  // 切到下一个吸附态（点击手柄时用）。返回新状态。
  cycle() {
    const idx = this.stateIndex()
    const next = this.states[(idx + 1) % this.states.length]
    this.setState(next)
    return next
  }

  // 平滑切到目标状态。
  setState(target, { animate = true } = {}) {
    if (this.type === 'rotate' && animate) {
      const from = this.inner.rotation[this.axis]
      // 就近旋转
      let to = target * DEG
      const twoPi = Math.PI * 2
      while (to - from > Math.PI) to -= twoPi
      while (from - to > Math.PI) to += twoPi
      this._tween = { from, to, t: 0, dur: 0.42, target }
      this.state = target // 逻辑状态立即生效（导航即时重算）
    } else {
      this._applyImmediate(target)
    }
    return this.state
  }

  update(dt) {
    if (!this._tween) return
    const tw = this._tween
    tw.t += dt / tw.dur
    if (tw.t >= 1) {
      this.inner.rotation[this.axis] = tw.to
      this._tween = null
    } else {
      // easeInOutCubic
      const p = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - Math.pow(-2 * tw.t + 2, 3) / 2
      this.inner.rotation[this.axis] = tw.from + (tw.to - tw.from) * p
    }
  }
}
