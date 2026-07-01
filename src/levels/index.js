// levels/index.js —— 关卡清单 + 呈现层元数据（匾额一字、提示、印章、结局文案）。
// 关卡数据本体是纯 JSON（Sally 直接编辑）；这里只挂"皮"与引导。

import gate from './00_gate.json'
import burden from './01_burden.json'
import lattice from './02_lattice.json'
import perfect from './05_perfect.json'
import water from './07_water.json'

export const LEVELS = [
  {
    data: gate,
    badge: '〇',
    title: '门 · 山脚',
    hint: '拖动朱砂手柄，把山门拱券转正 —— 相机看到「接上」，就是这世界的真实。',
    seal: '始',
    winMsg: '门开',
  },
  {
    data: burden,
    badge: '一',
    title: '负重 · 舍',
    hint: '把身外之物放上朱砂台，替你升起前路 —— 但来时的桥，从此沉没。',
    seal: '舍',
    winMsg: '放下即前进',
  },
  {
    data: lattice,
    badge: '二',
    title: '漏窗 · 有无相生',
    hint: '不要往实处添 —— 抽掉几根棂条，让「空」在眼前接成门洞。当其无，有室之用。',
    seal: '虚',
    winMsg: '空处才是路',
  },
  {
    data: perfect,
    badge: '五',
    title: '大成若缺 · 优绩',
    hint: '越想补得齐整对称，它越锁死。刻意留一道缺口 —— 残缺的环，才连成通路。',
    seal: '缺',
    winMsg: '大成若缺，其用不弊',
  },
  {
    data: water,
    badge: '七',
    title: '水 · 无为',
    hint: '路，一开始就在。手一动，水就乱。有时什么都不做，静置一拍，水自己会找到低处。',
    seal: '静',
    winMsg: '无为而无不为',
  },
]
