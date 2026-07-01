// engine/Character.js —— 负重角色：沿路径逐节点走动画 + 瞬移接缝。
//
// 剪影即进度条（D-09）：初始挂满东西、是沉重黑影，卸一件简化一分。
// 移动是节点间的插值动画，不是物理（无重力/碰撞）。
// 允许"瞬移接缝"：两节点在 3D 里不连续、屏幕上连续，角色照走（纪念碑谷做法）。

import * as THREE from 'three'

export class Character {
  constructor(palette) {
    this.group = new THREE.Group()
    const mat = new THREE.MeshStandardMaterial({
      color: palette.character,
      roughness: 0.9,
      metalness: 0.0,
    })
    this.mat = mat

    // 身体：一个略瘦的胶囊感立柱 + 头。
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.5, 4, 12), mat)
    body.position.y = 0.55
    body.castShadow = true
    this.group.add(body)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 14), mat)
    head.position.y = 1.05
    head.castShadow = true
    this.group.add(head)

    // 负重：背上的一摞行囊（剪影进度条）。卸载时逐个隐藏。
    this.burdens = []
    const burdenMat = new THREE.MeshStandardMaterial({ color: palette.character, roughness: 0.95 })
    const offsets = [
      [0, 0.75, -0.28, 0.34],
      [0.1, 1.02, -0.24, 0.22],
      [-0.08, 0.5, -0.3, 0.28],
    ]
    for (const [x, y, z, s] of offsets) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), burdenMat)
      b.position.set(x, y, z)
      b.rotation.set(0.2, 0.4, 0.15)
      b.castShadow = true
      this.group.add(b)
      this.burdens.push(b)
    }

    this.speed = 3.6 // 世界单位/秒
    this._path = null // [{pos, seam}]
    this._seg = 0
    this._t = 0
    this.onArrive = null
    this.moving = false
    this.currentNodeId = null
  }

  setNode(node) {
    this.currentNodeId = node.id
    this.group.position.copy(node.pos)
  }

  // 卸下第 n 件负重（剪影简化）。
  dropBurden(n) {
    if (this.burdens[n]) this.burdens[n].visible = false
  }

  // 沿节点位置序列行走。segs: [{pos:Vector3, seam:bool, id}]
  walk(segs, onArrive) {
    if (!segs || segs.length < 2) {
      if (onArrive) onArrive()
      return
    }
    this._path = segs
    this._seg = 0
    this._t = 0
    this.moving = true
    this.onArrive = onArrive
  }

  update(dt) {
    if (!this.moving || !this._path) return
    const a = this._path[this._seg]
    const b = this._path[this._seg + 1]
    if (!b) {
      this.moving = false
      const cb = this.onArrive
      this.onArrive = null
      if (cb) cb()
      return
    }

    if (b.seam) {
      // 接缝：屏幕上连续、3D 里跳变 —— 瞬移过去，不做飞跃动画。
      this.group.position.copy(b.pos)
      this._advance(b)
      return
    }

    const dist = a.pos.distanceTo(b.pos)
    const step = (this.speed * dt) / Math.max(dist, 0.0001)
    this._t += step
    if (this._t >= 1) {
      this.group.position.copy(b.pos)
      this._advance(b)
    } else {
      this.group.position.lerpVectors(a.pos, b.pos, this._t)
      // 朝向行进方向（仅绕 y）
      const dir = new THREE.Vector3().subVectors(b.pos, a.pos)
      if (dir.x || dir.z) this.group.rotation.y = Math.atan2(dir.x, dir.z)
    }
  }

  _advance(reached) {
    this.currentNodeId = reached.id
    this._seg++
    this._t = 0
    if (this._seg >= this._path.length - 1) {
      this.moving = false
      const cb = this.onArrive
      this.onArrive = null
      if (cb) cb()
    }
  }
}
