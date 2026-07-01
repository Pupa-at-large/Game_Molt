// render/lighting.js —— 方向光 + 环境光 + 半球光。绝不用点光源。
// 理由（真实的坑）：屏幕上相邻的东西在 3D 里并不相邻，点光源会穿帮。
// 厚重感靠方向光的柔和阴影 + 顶面提亮（见 blocks.boxWithTop）来做。

import * as THREE from 'three'

export function makeLights(palette) {
  const group = new THREE.Group()

  const ambient = new THREE.AmbientLight(palette.ambient, palette.ambientIntensity)
  group.add(ambient)

  // 半球光给一点天地色差，柔和。
  const hemi = new THREE.HemisphereLight(palette.key, palette.ambient, 0.35)
  group.add(hemi)

  const key = new THREE.DirectionalLight(palette.key, palette.keyIntensity)
  // 从等距的斜上方打光，方向与相机错开，避免正对造成平板。
  key.position.set(-6, 12, 8)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  const s = 30
  key.shadow.camera.left = -s
  key.shadow.camera.right = s
  key.shadow.camera.top = s
  key.shadow.camera.bottom = -s
  key.shadow.camera.near = -50
  key.shadow.camera.far = 80
  key.shadow.bias = -0.0008
  key.shadow.normalBias = 0.04
  group.add(key)
  group.add(key.target)

  return { group, ambient, hemi, key }
}
