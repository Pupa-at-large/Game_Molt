// render/camera.js —— 正交等距相机。全程不旋转、不透视。
// 经典 2:1 等距：azimuth 45°、俯角 elevation 35.264°。

import * as THREE from 'three'

const DEG = Math.PI / 180

export function makeIsoCamera({ azimuthDeg = 45, elevationDeg = 35.264 } = {}) {
  // frustum 高度（世界单位）；越大看得越广。由 fit() 按内容调整。
  const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, -200, 200)
  cam.userData.azimuthDeg = azimuthDeg
  cam.userData.elevationDeg = elevationDeg
  cam.userData.viewSize = 12
  return cam
}

// 根据方位角/俯角把相机摆到看向 target 的等距位置。
export function placeCamera(cam, target = new THREE.Vector3(0, 0, 0), distance = 60) {
  const az = cam.userData.azimuthDeg * DEG
  const el = cam.userData.elevationDeg * DEG
  const dir = new THREE.Vector3(
    Math.cos(el) * Math.cos(az),
    Math.sin(el),
    Math.cos(el) * Math.sin(az)
  )
  cam.position.copy(target.clone().add(dir.multiplyScalar(distance)))
  cam.up.set(0, 1, 0)
  cam.lookAt(target)
  cam.userData.target = target.clone()
}

// 按视口宽高比更新正交 frustum，保持 viewSize 为竖直半高。
export function updateAspect(cam, width, height) {
  const half = cam.userData.viewSize
  const aspect = width / height
  cam.left = -half * aspect
  cam.right = half * aspect
  cam.top = half
  cam.bottom = -half
  cam.updateProjectionMatrix()
}

// 让相机框住一组世界坐标点（自动定 viewSize + target）。
export function fitCamera(cam, points, width, height, padding = 1.35) {
  if (!points.length) return
  const target = new THREE.Vector3()
  for (const p of points) target.add(p)
  target.multiplyScalar(1 / points.length)

  // 先摆到方向上，再把点投影到相机空间量取包围盒。
  placeCamera(cam, target, 80)
  cam.updateMatrixWorld(true)
  const inv = cam.matrixWorldInverse
  let maxX = 0, maxY = 0
  const v = new THREE.Vector3()
  for (const p of points) {
    v.copy(p).applyMatrix4(inv)
    maxX = Math.max(maxX, Math.abs(v.x))
    maxY = Math.max(maxY, Math.abs(v.y))
  }
  const aspect = width / height
  const needHalfH = Math.max(maxY, maxX / aspect) * padding
  cam.userData.viewSize = Math.max(4, needHalfH)
  updateAspect(cam, width, height)
}
