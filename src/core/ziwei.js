/**
 * 紫微斗数排盘引擎。
 * 流程：定命宫身宫 → 安十二宫 → 定五行局 → 安紫微诸星 → 安辅星 → 安四化 → 起大限。
 */

import {
  STEMS, BRANCHES, STEM_WUXING, STEM_YANG, BRANCH_WUXING,
  jiaziName, dayPillarIndex,
} from './lunar.js';

/** 农历月 -> 宫位推算用常数 */
export const PALACE_NAMES = [
  '命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄',
  '迁移', '交友', '官禄', '田宅', '福德', '父母',
];

/** 五行局 */
export const WUXING_JU = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };

/** 地支时辰序号（子=0） */
function hourBranchIdx(hour) {
  return Math.floor(((hour + 1) % 24) / 2);
}

/**
 * 命宫：以寅宫起正月，顺数至生月，再逆数至生时。
 * 身宫：以寅宫起正月，顺数至生月，再顺数至生时。
 */
export function mingShenPalace(lunarMonth, hourIdx) {
  // 宫位用「地支序号」表示，寅=2
  const monthPos = (2 + (lunarMonth - 1)) % 12;
  const ming = ((monthPos - hourIdx) % 12 + 12) % 12;
  const shen = ((monthPos + hourIdx) % 12 + 12) % 12;
  return { ming, shen };
}

/**
 * 五行局：由命宫干支的纳音五行决定。
 * 命宫天干用「五虎遁」由年干推出。
 */
export function wuxingJu(mingBranchIdx, yearStemIdx) {
  const startStem = { 甲: 2, 己: 2, 乙: 4, 庚: 4, 丙: 6, 辛: 6, 丁: 8, 壬: 8, 戊: 0, 癸: 0 }[
    STEMS[yearStemIdx]
  ];
  const monthOrder = ((mingBranchIdx - 2) % 12 + 12) % 12;
  const stemIdx = (startStem + monthOrder) % 10;
  const stem = STEMS[stemIdx];
  const branch = BRANCHES[mingBranchIdx];
  const idx = (() => {
    for (let i = 0; i < 60; i += 1) {
      if (i % 10 === stemIdx && i % 12 === mingBranchIdx) return i;
    }
    return 0;
  })();
  // 纳音五行 -> 局数
  const nayinElement = NAYIN_ELEMENT[idx];
  const ju = { 水: 2, 木: 3, 金: 4, 土: 5, 火: 6 }[nayinElement];
  return { ju, juName: WUXING_JU[ju], stem, branch, ganZhi: stem + branch, nayinElement };
}

/** 六十甲子纳音五行元素 */
const NAYIN_ELEMENT = (() => {
  const arr = new Array(60);
  const seq = [
    '金', '火', '木', '土', '金', '火', '水', '土', '金', '木',
    '水', '土', '火', '木', '水', '金', '火', '木', '土', '金',
    '火', '水', '土', '金', '木', '水', '土', '火', '木', '水',
  ];
  for (let i = 0; i < 30; i += 1) {
    arr[i * 2] = seq[i];
    arr[i * 2 + 1] = seq[i];
  }
  return arr;
})();

/** 紫微星定位表：由五行局与农历日推紫微所在支 */
export function ziweiPos(ju, lunarDay) {
  // 传统算法：以局数除生日，得商与余数
  const quotient = Math.floor(lunarDay / ju);
  const remainder = lunarDay % ju;
  let offset;
  if (remainder === 0) {
    offset = quotient;
  } else {
    // 需借数补足，借数为 (ju - remainder)
    const borrow = ju - remainder;
    // 商+1 行，再看借数奇偶决定进退
    offset = borrow % 2 === 0 ? quotient + 1 + borrow : quotient + 1 - borrow;
  }
  // 紫微自寅宫起
  return ((2 + offset - 1) % 12 + 12) % 12;
}

/** 十四主星相对紫微的位置偏移（支序，正为顺行） */
const MAIN_STAR_OFFSETS = {
  紫微: 0,
  天机: -1,
  太阳: -3,
  武曲: -4,
  天同: -5,
  廉贞: -8,
  天府: null, // 由紫微推
  太阴: null,
  贪狼: null,
  巨门: null,
  天相: null,
  天梁: null,
  七杀: null,
  破军: null,
};

/** 天府与紫微的对应关系：紫微在寅，天府在寅；紫微在卯，天府在丑… */
export function tianfuPos(ziweiIdx) {
  // 紫微与天府以寅申为轴对称
  const z = ((ziweiIdx - 2) % 12 + 12) % 12; // 相对寅的偏移
  const t = (12 - z) % 12;
  return (2 + t) % 12;
}

/** 十四主星排布 */
export function mainStars(ziweiIdx) {
  const stars = {};
  const put = (name, offset) => { stars[name] = ((ziweiIdx + offset) % 12 + 12) % 12; };
  put('紫微', 0);
  put('天机', -1);
  put('太阳', -3);
  put('武曲', -4);
  put('天同', -5);
  put('廉贞', -8);
  const tf = tianfuPos(ziweiIdx);
  stars['天府'] = tf;
  const tfPut = (name, offset) => { stars[name] = ((tf + offset) % 12 + 12) % 12; };
  tfPut('太阴', 1);
  tfPut('贪狼', 2);
  tfPut('巨门', 3);
  tfPut('天相', 4);
  tfPut('天梁', 5);
  tfPut('七杀', 6);
  tfPut('破军', 10);
  return stars;
}

/** 年干起四化：化禄、化权、化科、化忌 */
const SIHUA = {
  甲: { 禄: '廉贞', 权: '破军', 科: '武曲', 忌: '太阳' },
  乙: { 禄: '天机', 权: '天梁', 科: '紫微', 忌: '太阴' },
  丙: { 禄: '天同', 权: '天机', 科: '文昌', 忌: '廉贞' },
  丁: { 禄: '太阴', 权: '天同', 科: '天机', 忌: '巨门' },
  戊: { 禄: '贪狼', 权: '太阴', 科: '右弼', 忌: '天机' },
  己: { 禄: '武曲', 权: '贪狼', 科: '天梁', 忌: '文曲' },
  庚: { 禄: '太阳', 权: '武曲', 科: '太阴', 忌: '天同' },
  辛: { 禄: '巨门', 权: '太阳', 科: '文曲', 忌: '文昌' },
  壬: { 禄: '天梁', 权: '紫微', 科: '左辅', 忌: '武曲' },
  癸: { 禄: '破军', 权: '巨门', 科: '太阴', 忌: '贪狼' },
};

/** 十二长生 */
const CHANGSHENG = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];

/** 五行局 -> 长生起点支 */
const CHANGSHENG_START = { 水: '申', 木: '亥', 金: '巳', 土: '申', 火: '寅', 2: '申', 3: '亥', 4: '巳', 5: '申', 6: '寅' };

/** 安辅星 */
function auxStars(yearStemIdx, yearBranchIdx, lunarMonth, hourIdx, mingIdx) {
  const yearStem = STEMS[yearStemIdx];
  const yearBranch = BRANCHES[yearBranchIdx];
  const stars = {};

  // 左辅右弼：由生月起
  stars['左辅'] = ((2 + (lunarMonth - 1) - 1) % 12 + 12) % 12;
  stars['右弼'] = ((2 + (lunarMonth - 1) + 1) % 12 + 12) % 12;

  // 文昌文曲：由生时起
  stars['文昌'] = ((10 - hourIdx) % 12 + 12) % 12;
  stars['文曲'] = ((4 + hourIdx) % 12 + 12) % 12;

  // 天魁天钺：年干起
  const kuiYue = {
    甲: ['丑', '未'], 乙: ['子', '申'], 丙: ['亥', '酉'], 丁: ['亥', '酉'],
    戊: ['丑', '未'], 己: ['子', '申'], 庚: ['丑', '未'], 辛: ['午', '寅'],
    壬: ['卯', '巳'], 癸: ['卯', '巳'],
  }[yearStem];
  stars['天魁'] = BRANCHES.indexOf(kuiYue[0]);
  stars['天钺'] = BRANCHES.indexOf(kuiYue[1]);

  // 禄存、擎羊、陀罗：年干起
  const lucun = {
    甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳',
    己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
  }[yearStem];
  const luIdx = BRANCHES.indexOf(lucun);
  stars['禄存'] = luIdx;
  stars['擎羊'] = (luIdx + 1) % 12;
  stars['陀罗'] = (luIdx + 11) % 12;

  // 火星铃星：年支 + 生时
  const fireStart = { 寅: 2, 午: 2, 戌: 2, 申: 8, 子: 8, 辰: 8, 巳: 3, 酉: 3, 丑: 3, 亥: 9, 卯: 9, 未: 9 }[yearBranch];
  const bellStart = { 寅: 3, 午: 3, 戌: 3, 申: 9, 子: 9, 辰: 9, 巳: 2, 酉: 2, 丑: 2, 亥: 8, 卯: 8, 未: 8 }[yearBranch];
  stars['火星'] = ((fireStart + hourIdx) % 12 + 12) % 12;
  stars['铃星'] = ((bellStart + hourIdx) % 12 + 12) % 12;

  // 天马：年支三合
  const tianma = { 寅: '申', 午: '申', 戌: '申', 申: '寅', 子: '寅', 辰: '寅', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' }[yearBranch];
  stars['天马'] = BRANCHES.indexOf(tianma);

  // 地空、地劫：生时起
  stars['地空'] = ((10 + hourIdx) % 12 + 12) % 12;
  stars['地劫'] = ((10 - hourIdx) % 12 + 12) % 12;

  return stars;
}

/**
 * 主排盘。
 * @param {object} p { lunarYear, lunarMonth, lunarDay, hour, gender, yearGanZhiIdx }
 */
export function buildZiwei(p) {
  const { lunarMonth, lunarDay, hour, gender, yearGanZhiIdx } = p;
  const yearStemIdx = yearGanZhiIdx % 10;
  const yearBranchIdx = yearGanZhiIdx % 12;
  const yearStem = STEMS[yearStemIdx];
  const hourIdx = p.hourIdx ?? hourBranchIdx(hour);

  const { ming, shen } = mingShenPalace(lunarMonth, hourIdx);
  const juInfo = wuxingJu(ming, yearStemIdx);
  const zwIdx = ziweiPos(juInfo.ju, lunarDay);
  const main = mainStars(zwIdx);
  const aux = auxStars(yearStemIdx, yearBranchIdx, lunarMonth, hourIdx, ming);

  // 十二宫：命宫起，逆时针排
  const palaces = [];
  for (let i = 0; i < 12; i += 1) {
    const branchIdx = ((ming - i) % 12 + 12) % 12;
    // 宫干：五虎遁
    const startStem = { 甲: 2, 己: 2, 乙: 4, 庚: 4, 丙: 6, 辛: 6, 丁: 8, 壬: 8, 戊: 0, 癸: 0 }[yearStem];
    const monthOrder = ((branchIdx - 2) % 12 + 12) % 12;
    const stemIdx = (startStem + monthOrder) % 10;
    palaces.push({
      index: i,
      name: PALACE_NAMES[i],
      branch: BRANCHES[branchIdx],
      branchIdx,
      stem: STEMS[stemIdx],
      ganZhi: STEMS[stemIdx] + BRANCHES[branchIdx],
      isMing: branchIdx === ming,
      isShen: branchIdx === shen,
      mainStars: [],
      auxStars: [],
      sihua: [],
      daxian: `${juInfo.ju * i + juInfo.ju} - ${juInfo.ju * (i + 1)}`,
    });
  }

  // 安主星
  const starByBranch = {};
  Object.entries(main).forEach(([name, idx]) => {
    const pal = palaces.find((x) => x.branchIdx === idx);
    if (pal) pal.mainStars.push(name);
    (starByBranch[idx] = starByBranch[idx] || []).push(name);
  });
  Object.entries(aux).forEach(([name, idx]) => {
    const pal = palaces.find((x) => x.branchIdx === idx);
    if (pal) pal.auxStars.push(name);
  });

  // 四化
  const hua = SIHUA[yearStem];
  const huaList = [];
  Object.entries(hua).forEach(([type, star]) => {
    const idx = main[star] ?? aux[star];
    if (idx === undefined) return;
    const pal = palaces.find((x) => x.branchIdx === idx);
    if (pal) pal.sihua.push(`化${type}`);
    huaList.push({ type: `化${type}`, star, palace: pal ? pal.name : '', branch: pal ? pal.branch : '' });
  });

  // 长生十二神
  const csElement = juInfo.nayinElement;
  const csStart = BRANCHES.indexOf(CHANGSHENG_START[csElement]);
  const yang = STEM_YANG[yearStem];
  palaces.forEach((pal) => {
    const offset = ((pal.branchIdx - csStart) % 12 + 12) % 12;
    const pos = yang ? offset : (12 - offset) % 12;
    pal.changsheng = CHANGSHENG[pos];
  });

  // 大限
  const forward = STEM_YANG[yearStem] === (gender === '男');
  palaces.forEach((pal, i) => {
    const span = 10;
    const start = juInfo.ju + i * span;
    pal.daxian = `${start}-${start + span - 1}岁`;
    pal.daxianForward = forward;
  });

  return {
    input: p,
    yearStem,
    yearBranch: BRANCHES[yearBranchIdx],
    yearGanZhi: jiaziName(yearGanZhiIdx),
    lunarText: `农历${lunarMonth}月${lunarDay}日 ${BRANCHES[hourIdx]}时`,
    mingBranch: BRANCHES[ming],
    shenBranch: BRANCHES[shen],
    juInfo,
    ju: juInfo.ju,
    juName: juInfo.juName,
    ziweiBranch: BRANCHES[zwIdx],
    ziweiIdx: zwIdx,
    tianfuBranch: BRANCHES[tianfuPos(zwIdx)],
    palaces,
    mainStars: main,
    auxStars: aux,
    sihua: huaList,
    gender,
    daxianForward: forward,
    daxianStart: juInfo.ju,
    baziText: `${jiaziName(yearGanZhiIdx)}年`,
  };
}

export { hourBranchIdx, SIHUA };