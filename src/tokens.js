// tokens.js —— 视觉事实来源（占位版，供 Claude Design 迭代时一处替换）。
// 色轴：墨 → 青 → 白（D-08）。朱砂红为全游戏唯一交互信号色（D-09）。
// 别把颜色/字号硬编码散落各处；一律引用这里。

export const CINNABAR = 0xc8442f // 朱砂：可交互 / 该在此放下 / 出口

// 三套调色板，对应"损"的深入与禅宗三境
export const palettes = {
  // 墨：山脚，浓墨重阴影
  ink: {
    background: 0x17161b,
    fog: 0x1d1c22,
    stone: 0x3a3742,
    stoneTop: 0x47434f,
    wood: 0x5a4632,
    accent: CINNABAR,
    character: 0x111015,
    ambient: 0x2a2732,
    key: 0xdfe6ee,
    keyIntensity: 1.35,
    ambientIntensity: 0.85,
  },
  // 青：中段，汝窑天青、眩惑
  celadon: {
    background: 0x33454a,
    fog: 0x415458,
    stone: 0x6d8b86,
    stoneTop: 0x86a49c,
    wood: 0x5f6f68,
    accent: CINNABAR,
    character: 0x20282a,
    ambient: 0x4a625f,
    key: 0xeef4ec,
    keyIntensity: 1.25,
    ambientIntensity: 1.0,
  },
  // 白：顶部，月白素白，大量纸白负空间
  white: {
    background: 0xe9e3d5,
    fog: 0xefe9dc,
    stone: 0xd8d0c0,
    stoneTop: 0xe6ded0,
    wood: 0xc9bfa9,
    accent: CINNABAR,
    character: 0x8a8378,
    ambient: 0xdcd5c6,
    key: 0xfffdf6,
    keyIntensity: 1.1,
    ambientIntensity: 1.15,
  },
}

export function getPalette(name) {
  return palettes[name] || palettes.ink
}

// 字体（供 UI 层引用）
export const fonts = {
  serif: '"Songti SC", "SimSun", "Noto Serif SC", serif',
}
