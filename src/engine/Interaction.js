// engine/Interaction.js —— 射线拾取：点手柄切机关 / 点可达节点走过去。
//
// 交互设计（越少越好）：
//   · 点击机关手柄（朱砂球）→ 机关切到下一吸附态 → 世界重组、高亮刷新。
//   · 点击（或点附近）一个当前可达节点 → 角色寻路走过去。
// 拖拽也支持：在手柄上按下并拖动，松手时按拖动方向切换吸附态（更接近纪念碑谷手感）。

import * as THREE from 'three'

export class Interaction {
  constructor(renderer, camera, getLevel) {
    this.renderer = renderer
    this.camera = camera
    this.getLevel = getLevel
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.enabled = true

    this._down = null // {mesh, x, y, mechanism}
    this._dragged = false
    this.onMechChange = null // (mechanism) => void
    this.onMove = null // (nodeId) => void

    const el = renderer.domElement
    el.addEventListener('pointerdown', (e) => this._onDown(e))
    el.addEventListener('pointermove', (e) => this._onMove(e))
    el.addEventListener('pointerup', (e) => this._onUp(e))
    el.addEventListener('pointerleave', () => (this._down = null))
  }

  _setPointer(e) {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
    this.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1
  }

  _onDown(e) {
    if (!this.enabled) return
    this._setPointer(e)
    this._dragged = false
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const level = this.getLevel()
    if (!level) return
    const hits = this.raycaster.intersectObjects(level.handleMeshes, false)
    if (hits.length) {
      this._down = { mechanism: hits[0].object.userData.mechanism, x: e.clientX, y: e.clientY }
    } else {
      this._down = null
    }
  }

  _onMove(e) {
    if (this._down) {
      const dx = e.clientX - this._down.x
      const dy = e.clientY - this._down.y
      if (Math.hypot(dx, dy) > 8) this._dragged = true
    }
  }

  _onUp(e) {
    if (!this.enabled) return
    const level = this.getLevel()
    if (!level) return

    // 情况 A：在手柄上按下 —— 切换机关吸附态。
    if (this._down) {
      const mech = this._down.mechanism
      if (mech.type === 'rotate') {
        // 拖拽方向决定切上一/下一态；纯点击则下一态。
        if (this._dragged) {
          const dx = e.clientX - this._down.x
          mech.setState(this._nextByDir(mech, dx >= 0 ? 1 : -1))
        } else {
          mech.cycle()
        }
      } else {
        mech.cycle()
      }
      this._down = null
      if (this.onMechChange) this.onMechChange(mech)
      return
    }
    if (this._dragged) return // 拖拽空白，忽略

    // 情况 B：点击节点 —— 走过去。
    this._setPointer(e)
    this.raycaster.setFromCamera(this.pointer, this.camera)

    // 先尝试直接命中高亮环 / 几何，取交点世界坐标，再找最近可达节点（容错）。
    const marks = [...level.highlight.markers.values()]
    let worldPoint = null
    const hitMarks = this.raycaster.intersectObjects(marks, false)
    if (hitMarks.length) {
      worldPoint = hitMarks[0].point
    } else {
      const hitGeo = this.raycaster.intersectObject(level.root, true)
      if (hitGeo.length) worldPoint = hitGeo[0].point
    }
    if (!worldPoint) return

    const nodeId = level.highlight.pickNearestReachable(worldPoint)
    if (nodeId && this.onMove) this.onMove(nodeId)
  }

  _nextByDir(mech, dir) {
    const idx = mech.stateIndex()
    const n = mech.states.length
    return mech.states[(idx + dir + n) % n]
  }
}
