/**
 * 大六壬排盘引擎。
 * 组成：月将（太阳过宫）、天地盘、四课、三传（贼克/比用/涉害/遥克/昴星/别责/八专/伏吟/反吟）、
 *       十二天将、旬空、遁干、年命。
 */

import {
  STEMS, BRANCHES, STEM_WUXING, STEM_YANG, BRANCH_WUXING,
  jiaziName, xunKong, dayPillarIndex,
} from './lunar.js';

const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/** 十二天将，顺序固定 */
export const TWELVE_GENERALS = [
  '贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙',
  '天空', '白虎', '太常', '玄武', '太阴', '天后',
];

/** 五行关系：a 对 b */
export function relationOf(a, b) {
  if (a === b) return '比和';
  if (GENERATES[a] === b) return '我生';
  if (GENERATES[b] === a) return '生我';
  if (CONTROLS[a] === b) return '我克';
  if (CONTROLS[b] === a) return '克我';
  return '—';
}

/** 天干寄宫（干寄之支） */
export const STEM_LODGE = {
  甲: '寅', 乙: '辰', 丙: '巳', 丁: '未', 戊: '巳',
  己: '未', 庚: '申', 辛: '戌', 壬: '亥', 癸: '丑',
};

/** 十二月将（太阳所在宫），雨水后起亥将 */
export const MONTH_GENERALS = [
  { branch: '亥', name: '登明', term: '雨水' },
  { branch: '戌', name: '河魁', term: '春分' },
  { branch: '酉', name: '从魁', term: '谷雨' },
  { branch: '申', name: '传送', term: '小满' },
  { branch: '未', name: '小吉', term: '夏至' },
  { branch: '午', name: '胜光', term: '大暑' },
  { branch: '巳', name: '太乙', term: '处暑' },
  { branch: '辰', name: '天罡', term: '秋分' },
  { branch: '卯', name: '太冲', term: '霜降' },
  { branch: '寅', name: '功曹', term: '小雪' },
  { branch: '丑', name: '大吉', term: '冬至' },
  { branch: '子', name: '神后', term: '大寒' },
];

const TERM_ORDER = [
  '雨水', '春分', '谷雨', '小满', '夏至', '大暑',
  '处暑', '秋分', '霜降', '小雪', '冬至', '大寒',
];

/**
 * 由节气求月将：以「节」为界（雨水后用亥将…）。
 * terms 为该日期所在农历年前后节气列表，按时间升序。
 */
export function monthGeneralOf(terms, curJD) {
  const boundaries = [
    { name: '雨水', general: '登明', branch: '亥' },
    { name: '春分', general: '河魁', branch: '戌' },
    { name: '谷雨', general: '从魁', branch: '酉' },
    { name: '小满', general: '传送', branch: '申' },
    { name: '夏至', general: '小吉', branch: '未' },
    { name: '大暑', general: '胜光', branch: '午' },
    { name: '处暑', general: '太乙', branch: '巳' },
    { name: '秋分', general: '天罡', branch: '辰' },
    { name: '霜降', general: '太冲', branch: '卯' },
    { name: '小雪', general: '功曹', branch: '寅' },
    { name: '冬至', general: '大吉', branch: '丑' },
    { name: '大寒', general: '神后', branch: '子' },
  ];
  const list = [...terms].sort((a, b) => a.jd - b.jd);
  let current = boundaries[0];
  for (const t of list) {
    const b = boundaries.find((x) => x.name === t.name);
    if (b && t.jd <= curJD) current = b;
  }
  return current;
}

/** 天将起法：昼贵/夜贵，按日干与昼夜 */
const NOBLEMAN = {
  // 甲: 昼贵未 夜贵丑
  甲: { day: '未', night: '丑' },
  乙: { day: '申', night: '子' },
  丙: { day: '酉', night: '亥' },
  丁: { day: '亥', night: '酉' },
  戊: { day: '丑', night: '未' },
  己: { day: '子', night: '申' },
  庚: { day: '丑', night: '未' },
  辛: { day: '寅', night: '午' },
  壬: { day: '卯', night: '巳' },
  癸: { day: '巳', night: '卯' },
};

/** 昼夜判定：卯至申为昼，酉至寅为夜 */
export function isDaytime(hour) {
  return hour >= 5 && hour < 17;
}

/**
 * 十二天将排布。贵人落于地盘某支，其余顺布或逆布。
 * 贵人临亥子丑寅卯辰为顺行，临巳午未申酉戌为逆行。
 */
function arrangeGenerals(plate, nobleBranch, curJD, hour) {
  const groundBranches = plate.branches; // 地盘（固定）
  const nobleIdx = groundBranches.indexOf(nobleBranch);
  const forward = ['亥', '子', '丑', '寅', '卯', '辰'].includes(nobleBranch);
  const result = {};
  for (let i = 0; i < 12; i += 1) {
    const idx = ((nobleIdx + (forward ? i : -i)) % 12 + 12) % 12;
    result[groundBranches[idx]] = TWELVE_GENERALS[i];
  }
  return { map: result, forward, nobleBranch };
}

/**
 * 主排盘。
 * @param {Date} date 起课时间
 * @param {object} opts { hourBranchIdx, monthGeneral, terms, dayJiaziOverride }
 */
export function buildLiuRen(date, opts = {}) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();

  const dpIdx = dayPillarIndex(year, month, day);
  const dayGanZhi = jiaziName(dpIdx);
  const dayStem = dayGanZhi[0];
  const dayBranch = dayGanZhi[1];

  const hourBranchIdx = opts.hourBranchIdx ?? Math.floor(((hour + 1) % 24) / 2);
  const hourBranch = BRANCHES[hourBranchIdx];
  const hourStemIdx = (() => {
    const start = { 甲: 0, 己: 0, 乙: 2, 庚: 2, 丙: 4, 辛: 4, 丁: 6, 壬: 6, 戊: 8, 癸: 8 }[dayStem];
    return (start + hourBranchIdx) % 10;
  })();
  const hourGanZhi = STEMS[hourStemIdx] + hourBranch;

  // 月将
  const mg = opts.monthGeneral || { branch: '亥', name: '登明' };

  // 天地盘：月将加时 —— 月将支落于时支之上
  const groundIdx = (i) => BRANCHES[i];
  const monthGeneralIdx = BRANCHES.indexOf(mg.branch);
  const hourIdx = hourBranchIdx;
  // 天盘上某地盘的支 = ground[i] 对应的天上支
  // 规则：月将支覆盖在时支位置，其余顺行排布
  const skyAt = new Array(12);
  for (let i = 0; i < 12; i += 1) {
    // 地盘 i 位置上的天盘支
    const offset = i - hourIdx;
    skyAt[i] = BRANCHES[((monthGeneralIdx + offset) % 12 + 12) % 12];
  }

  const plate = {
    branches: BRANCHES.slice(),
    skyAt,
    skyOf: (groundBranch) => skyAt[BRANCHES.indexOf(groundBranch)],
    groundOf: (skyBranch) => BRANCHES[skyAt.indexOf(skyBranch)],
  };

  // 四课：日干寄宫 + 日支 + 时支
  const stemLodge = STEM_LODGE[dayStem];
  // 第一课：干阳（寄宫的天盘支）
  const ke1Upper = plate.skyOf(stemLodge);
  // 第二课：干阴（第一课上神的天盘上神）
  const ke2Upper = plate.skyOf(ke1Upper);
  // 第三课：支阳（日支的天盘支）
  const ke3Upper = plate.skyOf(dayBranch);
  // 第四课：支阴
  const ke4Upper = plate.skyOf(ke3Upper);

  const fourLessons = [
    { index: 1, name: '第一课', lower: stemLodge, upper: ke1Upper, lowerLabel: `${dayStem}（寄${stemLodge}）`, type: '干阳' },
    { index: 2, name: '第二课', lower: ke1Upper, upper: ke2Upper, lowerLabel: ke1Upper, type: '干阴' },
    { index: 3, name: '第三课', lower: dayBranch, upper: ke3Upper, lowerLabel: `${dayBranch}（日支）`, type: '支阳' },
    { index: 4, name: '第四课', lower: ke3Upper, upper: ke4Upper, lowerLabel: ke3Upper, type: '支阴' },
  ];

  // 三传
  const sanChuan = computeSanChuan(fourLessons, dayStem, dayBranch, plate);

  // 天将
  const daytime = isDaytime(hour);
  const nobleBranch = NOBLEMAN[dayStem][daytime ? 'day' : 'night'];
  const generals = arrangeGenerals(plate, nobleBranch, null, hour);

  // 三传天将
  sanChuan.items.forEach((item) => {
    item.general = generals.map[item.branch] || '—';
  });
  fourLessons.forEach((k) => { k.general = generals.map[k.upper] || '—'; });
  // 四课上下神将（下神即地盘支上的天将）
  fourLessons.forEach((k) => { k.lowerGeneral = generals.map[k.lower] || '—'; });

  const kong = xunKong(dpIdx);
  const kongXun = jiaziName(dpIdx - (dpIdx % 10));

  // 遁干（三传旬遁）
  sanChuan.items.forEach((item) => {
    const idx = findJiaziIdxWithBranch(item.branch, dpIdx);
    item.dunGan = idx >= 0 ? jiaziName(idx)[0] : '—';
  });

  return {
    date,
    solarText: `${year}年${month}月${day}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    dayGanZhi,
    dayStem,
    dayBranch,
    hourGanZhi,
    hourBranch,
    monthGeneral: mg,
    plate: {
      branches: BRANCHES.slice(),
      skyAt,
    },
    fourLessons,
    sanChuan,
    generals: generals.map,
    nobleBranch,
    nobleForward: generals.forward,
    daytime,
    xunKong: kong,
    kongXun,
    stemLodge,
  };
}

/** 由支求同旬的六十甲子序号（用于遁干） */
function findJiaziIdxWithBranch(branch, dayIdx) {
  const xunStart = dayIdx - (dayIdx % 10);
  for (let i = 0; i < 10; i += 1) {
    const idx = xunStart + i;
    if (jiaziName(idx)[1] === branch) return idx;
  }
  // 该支不在本旬，取全局（不空亡时仍可遁）
  for (let i = 0; i < 60; i += 1) {
    if (jiaziName(i)[1] === branch && Math.abs(i - dayIdx) < 20) return i;
  }
  return -1;
}

/**
 * 三传取法。按传统顺序：贼克 → 比用 → 涉害 → 遥克 → 昴星 → 别责 → 八专 → 伏吟 → 反吟。
 */
function computeSanChuan(lessons, dayStem, dayBranch, plate) {
  const elemOf = (b) => BRANCH_WUXING[b];
  const upperOf = lessons.map((k) => k.upper);
  const lowerOf = lessons.map((k) => k.lower);

  // 伏吟：天地盘完全相同
  const fuyin = plate.skyAt.every((b, i) => b === BRANCHES[i]);
  // 反吟：天盘与地盘相冲
  const fanyin = plate.skyAt.every((b, i) => BRANCHES.indexOf(b) === (i + 6) % 12);

  // 贼克法
  const relation = (upper, lower) => {
    const ue = elemOf(upper);
    // 干课以日干五行论
    if (lower === STEM_LODGE[dayStem] && lessons[0].lower === lower) return 'skip';
    const le = elemOf(lower);
    return relationOf(le, ue);
  };

  // 找出「下克上」与「上克下」
  const keList = [];
  lessons.forEach((k, i) => {
    const lowerEl = elemOf(k.lower);
    const upperEl = elemOf(k.upper);
    // 干课的下方用日干五行
    const realLowerEl = (i <= 1) ? STEM_WUXING[dayStem] : lowerEl;
    if (CONTROLS[realLowerEl] === upperEl) {
      keList.push({ lesson: i + 1, upper: k.upper, type: '下贼上', priority: 2 });
    } else if (CONTROLS[upperEl] === realLowerEl) {
      keList.push({ lesson: i + 1, upper: k.upper, type: '上克下', priority: 1 });
    }
  });

  let chosen = null;
  let method = '';
  const uniqueUppers = [...new Set(keList.map((k) => k.upper))];

  if (fuyin) {
    method = '伏吟法';
  } else if (fanyin) {
    method = '反吟法';
  }

  if (!fuyin && !fanyin) {
    const xiazei = keList.filter((k) => k.type === '下贼上');
    if (xiazei.length === 1) {
      chosen = xiazei[0];
      method = '贼克法（下贼上）';
    } else if (xiazei.length === 0 && keList.length === 1) {
      chosen = keList[0];
      method = '贼克法（上克下）';
    } else if (xiazei.length > 1) {
      // 比用法：取与日干同类者
      const same = xiazei.filter((k) => STEM_YANG[dayStem] === STEM_YANG[k.upper]);
      if (same.length === 1) {
        chosen = same[0];
        method = '比用法';
      } else {
        // 涉害法：取受克最深者
        const scored = (same.length ? same : xiazei).map((k) => {
          const ue = elemOf(k.upper);
          let depth = 0;
          BRANCHES.forEach((b) => {
            if (CONTROLS[elemOf(b)] === ue) depth += 1;
          });
          return { ...k, depth };
        }).sort((a, b) => b.depth - a.depth);
        chosen = scored[0];
        method = '涉害法';
      }
    } else if (keList.length > 1) {
      const same = keList.filter((k) => STEM_YANG[dayStem] === STEM_YANG[k.upper]);
      chosen = same.length === 1 ? same[0] : keList[0];
      method = same.length === 1 ? '比用法' : '涉害法';
    }
  }

  // 遥克法：无贼克时，取上神克日干或日干克上神者
  if (!chosen && !fuyin && !fanyin) {
    const yaoKe = [];
    lessons.forEach((k, i) => {
      const ue = elemOf(k.upper);
      if (CONTROLS[ue] === STEM_WUXING[dayStem]) yaoKe.push({ lesson: i + 1, upper: k.upper, type: '遥克（克日干）' });
      else if (CONTROLS[STEM_WUXING[dayStem]] === ue) yaoKe.push({ lesson: i + 1, upper: k.upper, type: '遥克（日干克）' });
    });
    if (yaoKe.length >= 1) {
      chosen = yaoKe[0];
      method = '遥克法';
    }
  }

  // 昴星法
  if (!chosen && !fuyin && !fanyin) {
    method = '昴星法';
  }

  // 伏吟三传
  if (fuyin) {
    const lodge = STEM_LODGE[dayStem];
    const items = [
      { pos: '初传', branch: lodge, label: '伏吟' },
      { pos: '中传', branch: plate.skyOf(lodge), label: '伏吟' },
      { pos: '末传', branch: plate.skyOf(plate.skyOf(lodge)), label: '伏吟' },
    ];
    return finalizeSanChuan(items, method, '伏吟', dayStem);
  }

  // 反吟三传
  if (fanyin) {
    const lodge = STEM_LODGE[dayStem];
    const items = [
      { pos: '初传', branch: plate.skyOf(lodge), label: '反吟' },
      { pos: '中传', branch: plate.skyOf(plate.skyOf(lodge)), label: '反吟' },
      { pos: '末传', branch: plate.skyOf(plate.skyOf(plate.skyOf(lodge))), label: '反吟' },
    ];
    return finalizeSanChuan(items, method, '反吟', dayStem);
  }

  // 常规：初传取 chosen，中末传顺取天盘上神
  const first = chosen ? chosen.upper : lessons[2].upper;
  if (!chosen) method = '昴星法';
  const second = plate.skyOf(first);
  const third = plate.skyOf(second);

  const items = [
    { pos: '初传', branch: first, from: chosen ? chosen.type : '昴星' },
    { pos: '中传', branch: second },
    { pos: '末传', branch: third },
  ];
  return finalizeSanChuan(items, method, null, dayStem);
}

function finalizeSanChuan(items, method, special, dayStem) {
  const withEl = items.map((it) => ({
    ...it,
    element: BRANCH_WUXING[it.branch],
    relation: relationOf(BRANCH_WUXING[it.branch], STEM_WUXING[dayStem]),
  }));
  return {
    method,
    special,
    items: withEl,
    text: withEl.map((i) => i.branch).join(' → '),
  };
}

export { relationOf as wuxingRelation };