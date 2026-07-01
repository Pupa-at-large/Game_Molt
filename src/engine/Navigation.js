// engine/Navigation.js —— 节点图 + 依机关状态算激活 edge + 寻路(BFS)。
//
// 这是全项目最容易翻车、也最核心的地方："屏幕相邻 ≠ 空间相邻"。
// 导航【不】从 3D 邻接计算。edge 是【授权的】数据，且可【依赖机关状态】：
// 某条 edge 只有当机关 M 处于状态 S 时才存在（因为只有那时几何在相机视角下才接上）。
// 这就是把"相机空间的邻接"编码成数据，绕开了造通用求解器。

import * as THREE from 'three'

// 状态值可能是数字（旋转角）或数组（抽出的棂条索引集合）。按值比较。
function valuesEqual(a, b) {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    const sa = [...a].sort()
    const sb = [...b].sort()
    return sa.every((v, i) => v === sb[i])
  }
  return false
}

export class Navigation {
  constructor(levelData) {
    this.nodes = new Map()
    for (const n of levelData.nodes) {
      this.nodes.set(n.id, {
        id: n.id,
        pos: new THREE.Vector3(n.pos[0], n.pos[1], n.pos[2]),
      })
    }
    // 归一化 edges：无向。requires = {mechId: state} 全部满足才激活。
    this.edges = levelData.edges.map((e) => ({
      a: e.a,
      b: e.b,
      requires: e.requires || {},
      seam: !!e.seam, // 显式接缝（瞬移）
    }))
    this.startId = levelData.start
    this.exitId = levelData.exit
  }

  node(id) {
    return this.nodes.get(id)
  }

  // 一条 edge 是否在当前机关状态下激活。
  edgeActive(edge, mechStates) {
    for (const [mechId, wantState] of Object.entries(edge.requires)) {
      if (!valuesEqual(mechStates[mechId], wantState)) return false
    }
    return true
  }

  // 当前激活的邻接表：nodeId -> [{to, seam}]
  activeAdjacency(mechStates) {
    const adj = new Map()
    for (const id of this.nodes.keys()) adj.set(id, [])
    for (const e of this.edges) {
      if (!this.edgeActive(e, mechStates)) continue
      adj.get(e.a).push({ to: e.b, seam: e.seam })
      adj.get(e.b).push({ to: e.a, seam: e.seam })
    }
    return adj
  }

  // 从 fromId 出发、当前状态下可达的所有节点集合（用于高亮）。
  reachableFrom(fromId, mechStates) {
    const adj = this.activeAdjacency(mechStates)
    const seen = new Set([fromId])
    const stack = [fromId]
    while (stack.length) {
      const cur = stack.pop()
      for (const { to } of adj.get(cur) || []) {
        if (!seen.has(to)) {
          seen.add(to)
          stack.push(to)
        }
      }
    }
    seen.delete(fromId)
    return seen
  }

  // BFS 最短路：返回节点 id 数组（含起点与终点），无路则 null。
  findPath(fromId, toId, mechStates) {
    if (fromId === toId) return [fromId]
    const adj = this.activeAdjacency(mechStates)
    const prev = new Map()
    const seen = new Set([fromId])
    const q = [fromId]
    while (q.length) {
      const cur = q.shift()
      for (const { to } of adj.get(cur) || []) {
        if (seen.has(to)) continue
        seen.add(to)
        prev.set(to, cur)
        if (to === toId) {
          // 回溯
          const path = [toId]
          let c = toId
          while (c !== fromId) {
            c = prev.get(c)
            path.push(c)
          }
          return path.reverse()
        }
        q.push(to)
      }
    }
    return null
  }

  // 给定路径 id 数组，返回带 seam 标记的段：[{from, to, seam}]
  pathSegments(pathIds, mechStates) {
    const adj = this.activeAdjacency(mechStates)
    const segs = []
    for (let i = 0; i < pathIds.length - 1; i++) {
      const from = pathIds[i]
      const to = pathIds[i + 1]
      const link = (adj.get(from) || []).find((l) => l.to === to)
      segs.push({ from, to, seam: link ? link.seam : false })
    }
    return segs
  }
}
