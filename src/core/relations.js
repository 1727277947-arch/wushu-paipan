/**
 * 地支与天干的刑冲合害。
 *
 * 传统命理里，地支之间的关系（冲、合、刑、害）会改变各五行的实际力量，
 * 有时甚至比「有几个字」更重要。本模块只负责识别关系与给出力量修正，
 * 具体怎么用由 bazi.js / interpret.js 决定。
 *
 * 说明：合化成败是传统命理里争议很大的地方，本模块采用较通行的三个条件：
 *   1) 月令（月支）的五行与化神相同或生助化神
 *   2) 天干透出化神
 *   3) 未被冲散
 * 满足其一即视为「合而能化」，否则按「合而不化」处理（羁绊但不改五行）。
 * 相关的修正系数是用量化近似，非古人原数，已在注释中标明。
 */

import { BRANCH_WUXING, STEM_WUXING } from './lunar.js';

/* ==================== 关系表 ==================== */

/** 地支六冲 */
export const CHONG = [
  ['子', '午'], ['丑', '未'], ['寅', '申'],
  ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
];

/** 地支六合 → 化神 */
export const HE6 = {
  '子丑': '土', '寅亥': '木', '卯戌': '火',
  '辰酉': '金', '巳申': '水', '午未': '土',
};

/** 地支三合局（前两字为半合，缺旺支者为拱合） */
export const SANHE = [
  { branches: ['申', '子', '辰'], element: '水', wang: '子' },
  { branches: ['亥', '卯', '未'], element: '木', wang: '卯' },
  { branches: ['寅', '午', '戌'], element: '火', wang: '午' },
  { branches: ['巳', '酉', '丑'], element: '金', wang: '酉' },
];

/** 地支三会方 */
export const SANHUI = [
  { branches: ['寅', '卯', '辰'], element: '木' },
  { branches: ['巳', '午', '未'], element: '火' },
  { branches: ['申', '酉', '戌'], element: '金' },
  { branches: ['亥', '子', '丑'], element: '水' },
];

/** 地支六害 */
export const HAI6 = [
  ['子', '未'], ['丑', '午'], ['寅', '巳'],
  ['卯', '辰'], ['申', '亥'], ['酉', '戌'],
];

/** 地支三刑 */
export const XING3 = [
  { branches: ['寅', '巳', '申'], name: '无恩之刑' },
  { branches: ['丑', '戌', '未'], name: '恃势之刑' },
  { branches: ['子', '卯'], name: '无礼之刑' },
];

/** 自刑 */
export const ZIXING = ['辰', '午', '酉', '亥'];

/** 天干五合 → 化神 */
export const GAN_HE = {
  '甲己': '土', '乙庚': '金', '丙辛': '水', '丁壬': '木', '戊癸': '火',
};

/** 天干相冲 */
export const GAN_CHONG = [['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸']];

/* ==================== 工具 ==================== */

const norm = (a, b) => [a, b].sort().join('');

export function isChong(a, b) {
  return CHONG.some(([x, y]) => norm(a, b) === norm(x, y));
}
export function he6Of(a, b) {
  // 注意：不能用 sort() 规范化——中文按码点排会把「子丑」排成「丑子」
  return HE6[a + b] || HE6[b + a] || null;
}
export function isHai(a, b) {
  return HAI6.some(([x, y]) => norm(a, b) === norm(x, y));
}
export function ganHeOf(a, b) {
  return GAN_HE[a + b] || GAN_HE[b + a] || null;
}
export function isGanChong(a, b) {
  return GAN_CHONG.some(([x, y]) => norm(a, b) === norm(x, y));
}

/** 三刑：返回命中的刑名，未命中返回 null */
export function xingOf(branches) {
  for (const x of XING3) {
    if (x.branches.length === 2) {
      if (branches.filter((b) => x.branches.includes(b)).length >= 2) return x.name;
    } else if (x.branches.every((b) => branches.includes(b))) {
      return x.name;
    }
  }
  return null;
}

/** 自刑：同一地支出现两次以上，且属于自刑之支 */
export function ziXingOf(branches) {
  return ZIXING.some((z) => branches.filter((b) => b === z).length >= 2);
}
/* ==================== 生克 ==================== */

const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const LABEL = ['年', '月', '日', '时'];

/**
 * 扫描命局，列出全部刑冲合害（只做识别，不改力量）。
 * @returns [{ type, text, note, positions }]
 */
export function findRelations(pillars) {
  const br = pillars.map((p) => p.branch);
  const st = pillars.map((p) => p.stem);
  const out = [];

  for (let i = 0; i < 4; i += 1) {
    for (let j = i + 1; j < 4; j += 1) {
      const where = `${LABEL[i]}支${br[i]}、${LABEL[j]}支${br[j]}`;
      if (isChong(br[i], br[j])) out.push({ type: '冲', positions: [i, j], text: `${where} 相冲`, note: '两支对冲，本气受损，主变动、不稳' });
      const he = he6Of(br[i], br[j]);
      if (he) out.push({ type: '合', positions: [i, j], text: `${where} 六合化${he}`, note: `合则牵绊，能否化${he}要看月令与透干` });
      if (isHai(br[i], br[j])) out.push({ type: '害', positions: [i, j], text: `${where} 相害`, note: '相害主暗中损耗、彼此妨碍' });
      const gh = ganHeOf(st[i], st[j]);
      if (gh) out.push({ type: '干合', positions: [i, j], text: `${LABEL[i]}干${st[i]}、${LABEL[j]}干${st[j]} 五合化${gh}`, note: '天干相合，主人事牵连' });
      if (isGanChong(st[i], st[j])) out.push({ type: '干冲', positions: [i, j], text: `${LABEL[i]}干${st[i]}、${LABEL[j]}干${st[j]} 相冲`, note: '天干相冲，主外显层面的冲突' });
    }
  }

  SANHE.forEach((g) => {
    const have = g.branches.filter((b) => br.includes(b));
    if (have.length === 3) out.push({ type: '三合', text: `${g.branches.join('')} 三合${g.element}局`, note: `化神${g.element}大盛`, positions: g.branches.map((b) => br.indexOf(b)) });
    else if (have.length === 2 && have.includes(g.wang)) out.push({ type: '半合', text: `${have.join('')} 半合${g.element}局`, note: `含旺支${g.wang}，合而有情`, positions: have.map((b) => br.indexOf(b)) });
    else if (have.length === 2) out.push({ type: '拱合', text: `${have.join('')} 拱${g.element}局`, note: '缺旺支，力量较弱', positions: have.map((b) => br.indexOf(b)) });
  });

  SANHUI.forEach((g) => {
    if (g.branches.every((b) => br.includes(b))) {
      out.push({ type: '三会', text: `${g.branches.join('')} 三会${g.element}方`, note: `方位之气聚于${g.element}，力最强`, positions: g.branches.map((b) => br.indexOf(b)) });
    }
  });

  const xn = xingOf(br);
  if (xn) out.push({ type: '刑', text: `命局见${xn}`, note: '相刑主牵制、纠纷、内耗', positions: [] });
  if (ziXingOf(br)) out.push({ type: '自刑', text: '命局见自刑', note: '自刑主自我消耗、反复', positions: [] });

  return out;
}

/**
 * 计算刑冲合害造成的力量修正。
 * 系数为量化近似（非古人原数），用于让「关系」真正影响强弱判断。
 * @returns { branchMult, stemMult, bonus, list }
 */
export function relationEffects(pillars) {
  const br = pillars.map((p) => p.branch);
  const st = pillars.map((p) => p.stem);
  const monthEl = BRANCH_WUXING[br[1]];

  const branchMult = [1, 1, 1, 1];
  const stemMult = [1, 1, 1, 1];
  const bonus = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const list = findRelations(pillars);

  // 哪些地支被冲（合处逢冲，则合而不化）
  const clashedSet = new Set();
  for (let i = 0; i < 4; i += 1) {
    for (let j = i + 1; j < 4; j += 1) {
      if (isChong(br[i], br[j])) { clashedSet.add(i); clashedSet.add(j); }
    }
  }

  // 化神能否成立：月令同化神或生助化神，或天干透出化神
  const stemEls = st.map((s) => STEM_WUXING[s]);
  const canTransform = (el) => monthEl === el || SHENG[monthEl] === el || stemEls.includes(el);

  // ---- 逐对：冲、合、害 ----
  for (let i = 0; i < 4; i += 1) {
    for (let j = i + 1; j < 4; j += 1) {
      const clashed = isChong(br[i], br[j]);
      if (clashed) {
        branchMult[i] *= 0.65;
        branchMult[j] *= 0.65;
      }
      const he = he6Of(br[i], br[j]);
      if (he) {
        if (canTransform(he) && !clashedSet.has(i) && !clashedSet.has(j)) {
          branchMult[i] *= 0.45;
          branchMult[j] *= 0.45;
          bonus[he] += 1.1;
        } else {
          branchMult[i] *= 0.85;
          branchMult[j] *= 0.85;
        }
      }
      if (isHai(br[i], br[j])) {
        branchMult[i] *= 0.9;
        branchMult[j] *= 0.9;
      }
      const gh = ganHeOf(st[i], st[j]);
      if (gh) {
        if (canTransform(gh)) {
          stemMult[i] *= 0.5;
          stemMult[j] *= 0.5;
          bonus[gh] += 0.6;
        } else {
          stemMult[i] *= 0.9;
          stemMult[j] *= 0.9;
        }
      }
      if (isGanChong(st[i], st[j])) {
        stemMult[i] *= 0.9;
        stemMult[j] *= 0.9;
      }
    }
  }

  // ---- 三合 / 半合 / 拱合 ----
  SANHE.forEach((g) => {
    const have = g.branches.filter((b) => br.includes(b));
    const hit = (b) => br.forEach((x, i) => { if (x === b) branchMult[i] *= 1; });
    if (have.length === 3) {
      g.branches.forEach((b) => br.forEach((x, i) => { if (x === b) branchMult[i] *= 0.45; }));
      bonus[g.element] += 1.6;
    } else if (have.length === 2 && have.includes(g.wang)) {
      have.forEach((b) => br.forEach((x, i) => { if (x === b) branchMult[i] *= 0.7; }));
      bonus[g.element] += 0.7;
    } else if (have.length === 2) {
      bonus[g.element] += 0.25;
    }
    void hit;
  });

  // ---- 三会 ----
  SANHUI.forEach((g) => {
    if (g.branches.every((b) => br.includes(b))) {
      g.branches.forEach((b) => br.forEach((x, i) => { if (x === b) branchMult[i] *= 0.4; }));
      bonus[g.element] += 1.8;
    }
  });

  // ---- 三刑 / 自刑 ----
  if (xingOf(br)) {
    XING3.forEach((x) => {
      const hits = x.branches.filter((b) => br.includes(b));
      if (hits.length >= (x.branches.length === 2 ? 2 : 3)) {
        hits.forEach((b) => br.forEach((v, i) => { if (v === b) branchMult[i] *= 0.88; }));
      }
    });
  }
  if (ziXingOf(br)) {
    ZIXING.forEach((z) => {
      if (br.filter((b) => b === z).length >= 2) {
        br.forEach((b, i) => { if (b === z) branchMult[i] *= 0.9; });
      }
    });
  }

  return { branchMult, stemMult, bonus, list };
}
