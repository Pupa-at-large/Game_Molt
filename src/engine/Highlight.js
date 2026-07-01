// engine/Highlight.js —— 可达节点高亮（朱砂）。
//
// 机关一变，重算激活 edge → 刷新"可达节点"高亮。可达节点亮朱砂色。
// 这套高亮也顺便容错玩家不精准的点触（点附近即选中最近的可达节点）。

import * as THREE from 'three'

export class Highlight {
  constructor(nav, accentColor) {
    this.nav = nav
    this.accent = accentColor
    this.group = new THREE.Group()
    this.markers = new Map() // nodeId -> mesh
    this.reachable = new Set()

    const geo = new THREE.RingGeometry(0.3, 0.44, 28)
    for (const [id, node] of nav.nodes) {
      const mat = new THREE.MeshBasicMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const m = new THREE.Mesh(geo, mat)
      m.rotation.x = -Math.PI / 2
      m.position.copy(node.pos).add(new THREE.Vector3(0, 0.06, 0))
      m.renderOrder = 5
      m.userData.nodeId = id
      m.userData.pulse = Math.random() * Math.PI * 2
      this.group.add(m)
      this.markers.set(id, m)
    }
    // 出口用一个更明显的立柱光标。
    this.exitMarker = null
  }

  // 依当前状态刷新可达集。
  refresh(fromId, mechStates) {
    this.reachable = this.nav.reachableFrom(fromId, mechStates)
  }

  update(dt, time) {
    for (const [id, m] of this.markers) {
      const on = this.reachable.has(id)
      const target = on ? 0.85 : 0.0
      m.material.opacity += (target - m.material.opacity) * Math.min(1, dt * 8)
      if (on) {
        const s = 1 + Math.sin(time * 2.4 + m.userData.pulse) * 0.08
        m.scale.setScalar(s)
      }
    }
  }

  // 找离世界坐标点最近的、当前可达的节点 id（点触容错）。
  pickNearestReachable(worldPoint, maxDist = 1.6) {
    let best = null
    let bestD = maxDist
    for (const id of this.reachable) {
      const node = this.nav.node(id)
      const d = node.pos.distanceTo(worldPoint)
      if (d < bestD) {
        bestD = d
        best = id
      }
    }
    return best
  }
}
