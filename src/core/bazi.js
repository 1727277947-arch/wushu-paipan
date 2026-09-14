/**
 * 八字（四柱）排盘引擎。
 * 输入公历生日与时区，输出年月日时四柱、十神、大运、五行统计等。
 */

import {
  STEMS, STEM_WUXING, STEM_YANG, BRANCH_WUXING, BRANCH_HIDDEN_STEMS,
  BRANCH_ZODIAC, solarTermsOfYear, dayPillarIndex, hourBranchIndex,
  jiaziName, xunKong, nayin, ganzhiOf,
} from './lunar.js';

/** 五行生克关系 */
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

export const WUXING = ['木', '火', '土', '金', '水'];

/** 天干五行阴阳 -> 十神。以日主为我 */
function tenGod(dayStem, otherStem) {
  const me = STEM_WUXING[dayStem];
  const other = STEM_WUXING[otherStem];
  const sameYinYang = STEM_YANG[dayStem] === STEM_YANG[otherStem];

  if (me === other) return sameYinYang ? '比肩' : '劫财';
  if (GENERATES[me] === other) return sameYinYang ? '食神' : '伤官';
  if (CONTROLS[me] === other) return sameYinYang ? '偏财' : '正财';
  if (CONTROLS[other] === me) return sameYinYang ? '偏官' : '正官';
  if (GENERATES[other] === me) return sameYinYang ? '偏印' : '正印';
  return '未知';
}

/** 十神简写映射 */
const TEN_GOD_SHORT = {
  比肩: '比', 劫财: '劫', 食神: '食', 伤官: '伤',
  偏财: '才', 正财: '财', 偏官: '杀', 正官: '官',
  偏印: '枭', 正印: '印',
};

const JIE_NAMES = [
  '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
  '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
];

/** 本地时间转 UTC 儒略日 */
function toJD(year, month, day, hour, minute) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const frac = (hour * 3600 + minute * 60) / 86400;
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1))
    + day + b - 1524.5 + frac - 8 / 24;
}

function jiaziIndexOf(stemIdx, branchIdx) {
  for (let i = 0; i < 60; i += 1) {
    if (i % 10 === stemIdx && i % 12 === branchIdx) return i;
  }
  return 0;
}

/** 全部「节」按时间排序（跨前后三年，保证边界安全） */
function allJie(year) {
  const list = [];
  [year - 1, year, year + 1].forEach((y) => {
    solarTermsOfYear(y).forEach((t) => {
      if (JIE_NAMES.includes(t.name)) list.push(t);
    });
  });
  return list.sort((a, b) => a.jd - b.jd);
}

/** 年柱：以立春为界 */
function yearPillar(year, month, day, curJD) {
  const lichun = solarTermsOfYear(year).find((t) => t.name === '立春');
  let ganzhiYear = year;
  if (curJD < lichun.jd) ganzhiYear = year - 1;
  // 1984 年为甲子年
  const idx = ((ganzhiYear - 1984) % 60 + 60) % 60;
  return { index: idx, name: jiaziName(idx), ganzhiYear };
}

/** 月柱：以十二节为界 */
function monthPillar(curJD, yearStemIdx, year) {
  const jieList = allJie(year);
  const branchOfJie = {
    立春: 2, 惊蛰: 3, 清明: 4, 立夏: 5, 芒种: 6, 小暑: 7,
    立秋: 8, 白露: 9, 寒露: 10, 立冬: 11, 大雪: 0, 小寒: 1,
  };
  let current = jieList[0];
  for (const t of jieList) {
    if (t.jd <= curJD) current = t;
  }
  const branchIdx = branchOfJie[current.name];
  // 五虎遁：甲己之年丙作首
  const startStem = { 甲: 2, 己: 2, 乙: 4, 庚: 4, 丙: 6, 辛: 6, 丁: 8, 壬: 8, 戊: 0, 癸: 0 }[
    STEMS[yearStemIdx]
  ];
  const monthOrder = ((branchIdx - 2) % 12 + 12) % 12;
  const stemIdx = (startStem + monthOrder) % 10;
  const idx = jiaziIndexOf(stemIdx, branchIdx);
  return { index: idx, name: ganzhiOf(stemIdx, branchIdx), term: current.name, termJD: current.jd };
}

/** 日期加减若干天 */
function addDays(year, month, day, n) {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + n);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** 日柱 */
function dayPillar(year, month, day) {
  const idx = dayPillarIndex(year, month, day);
  return { index: idx, name: jiaziName(idx) };
}

/** 时柱：五鼠遁 —— 日干甲己还加甲 */
function hourPillar(dayStem, hour) {
  const branchIdx = hourBranchIndex(hour);
  const startStem = { 甲: 0, 己: 0, 乙: 2, 庚: 2, 丙: 4, 辛: 4, 丁: 6, 壬: 6, 戊: 8, 癸: 8 }[dayStem];
  const stemIdx = (startStem + branchIdx) % 10;
  const idx = jiaziIndexOf(stemIdx, branchIdx);
  return { index: idx, name: ganzhiOf(stemIdx, branchIdx) };
}

/** 大运 */
function computeLuck(gender, curJD, year, yearStem, monthJiaziIdx) {
  const yangYear = STEM_YANG[yearStem];
  const forward = (gender === '男') === yangYear;

  const jieList = [
    ...solarTermsOfYear(year - 1), ...solarTermsOfYear(year), ...solarTermsOfYear(year + 1),
  ].filter((t) => JIE_NAMES.includes(t.name)).sort((a, b) => a.jd - b.jd);

  let target = null;
  if (forward) {
    target = jieList.find((t) => t.jd > curJD);
  } else {
    const past = jieList.filter((t) => t.jd <= curJD);
    target = past[past.length - 1];
  }
  if (!target) return null;

  const diffDays = Math.abs(target.jd - curJD);
  // 3 天折 1 年
  const totalYears = diffDays / 3;
  const startAge = Math.floor(totalYears);
  const remain = totalYears - startAge;
  const startMonths = Math.floor(remain * 12);
  const startDays = Math.round((remain * 12 - startMonths) * 30);

  const pillars = [];
  for (let i = 1; i <= 10; i += 1) {
    const idx = ((monthJiaziIdx + (forward ? i : -i)) % 60 + 60) % 60;
    pillars.push({
      index: idx,
      name: jiaziName(idx),
      startAge: startAge + (i - 1) * 10,
      endAge: startAge + i * 10 - 1,
      startYear: year + startAge + (i - 1) * 10,
    });
  }

  return {
    forward,
    direction: forward ? '顺排' : '逆排',
    startAge,
    startMonths,
    startDays,
    startAgeText: `${startAge}岁${startMonths}个月${startDays}天`,
    refTerm: target.name,
    diffDays: diffDays.toFixed(2),
    pillars,
  };
}

/** 五行力量统计（含藏干加权） */
function wuxingStats(pillars) {
  const stats = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const weights = [0.9, 1.2, 1.4, 1.0];
  pillars.forEach((p, i) => {
    const w = weights[i] ?? 1;
    const stem = p.name[0];
    const branch = p.name[1];
    stats[STEM_WUXING[stem]] += w;
    const hidden = BRANCH_HIDDEN_STEMS[branch];
    const hw = [0.6, 0.3, 0.1];
    hidden.forEach((h, k) => {
      stats[STEM_WUXING[h]] += w * (hw[k] ?? 0.1);
    });
  });
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const percent = {};
  Object.keys(stats).forEach((k) => {
    percent[k] = total > 0 ? (stats[k] / total) * 100 : 0;
  });
  return { raw: stats, percent, total };
}

/** 主入口：排八字 */
export function computeBazi({ year, month, day, hour, minute, gender = '男', lateZiShi = true }) {
  const curJD = toJD(year, month, day, hour, minute);
  const terms = solarTermsOfYear(year);

  const yp = yearPillar(year, month, day, curJD);
  const mp = monthPillar(curJD, yp.index % 10, year);
  // 晚子时（23:00-24:00）按次日日柱论，此为子平主流取法
  const lateZi = lateZiShi && hour === 23;
  const dpDate = lateZi ? addDays(year, month, day, 1) : { year, month, day };
  const dp = dayPillar(dpDate.year, dpDate.month, dpDate.day);
  const dayStem = dp.name[0];
  const hp = hourPillar(dayStem, hour);

  const pillarList = [yp, mp, dp, hp];
  const labels = ['年柱', '月柱', '日柱', '时柱'];
  const palaces = ['祖上宫', '父母宫', '夫妻宫', '子女宫'];

  const detail = pillarList.map((p, i) => {
    const stem = p.name[0];
    const branch = p.name[1];
    const god = tenGod(dayStem, stem);
    return {
      label: labels[i],
      palace: palaces[i],
      name: p.name,
      stem,
      branch,
      jiaziIdx: p.index,
      stemWuxing: STEM_WUXING[stem],
      branchWuxing: BRANCH_WUXING[branch],
      stemYinYang: STEM_YANG[stem] ? '阳' : '阴',
      zodiac: BRANCH_ZODIAC[branch],
      hiddenStems: BRANCH_HIDDEN_STEMS[branch],
      hiddenTenGods: BRANCH_HIDDEN_STEMS[branch].map((h) => {
        const g = tenGod(dayStem, h);
        return { stem: h, god: g, short: TEN_GOD_SHORT[g] };
      }),
      tenGod: i === 2 ? '日主' : god,
      tenGodShort: i === 2 ? '元' : TEN_GOD_SHORT[god],
      nayin: nayin(p.index),
      xunKong: xunKong(p.index),
      term: p.term,
    };
  });

  const luck = computeLuck(gender, curJD, year, yp.name[0], mp.index);
  const wuxing = wuxingStats(pillarList);

  const me = STEM_WUXING[dayStem];
  const supportElements = [me, Object.keys(GENERATES).find((k) => GENERATES[k] === me)];
  let support = 0;
  let drain = 0;
  Object.entries(wuxing.raw).forEach(([el, v]) => {
    if (supportElements.includes(el)) support += v;
    else drain += v;
  });
  const ratio = support / (support + drain);

  let verdict = '中和';
  if (ratio >= 0.55) verdict = '偏旺';
  else if (ratio < 0.45) verdict = '偏弱';

  const favorMap = {
    偏弱: supportElements,
    偏旺: WUXING.filter((e) => !supportElements.includes(e)),
    中和: WUXING.filter((e) => !supportElements.includes(e)).slice(0, 2),
  };

  const dayMaster = {
    stem: dayStem,
    element: me,
    yinYang: STEM_YANG[dayStem] ? '阳' : '阴',
    support,
    drain,
    ratio,
    verdict,
    favor: favorMap[verdict],
    avoid: WUXING.filter((e) => !favorMap[verdict].includes(e)),
    note: verdict === '偏弱'
      ? `日主${dayStem}${me}偏弱，喜${favorMap[verdict].join('、')}生扶。`
      : verdict === '偏旺'
        ? `日主${dayStem}${me}偏旺，喜${favorMap[verdict].join('、')}克泄耗。`
        : `日主${dayStem}${me}中和，${favorMap[verdict].join('、')}为调候之喜。`,
  };

  return {
    input: { year, month, day, hour, minute, gender },
    solarDate: `${year}年${month}月${day}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    pillars: detail,
    dayMaster,
    luck,
    wuxing,
    zodiac: BRANCH_ZODIAC[detail[0].branch],
    xunKong: detail[2].xunKong,        // 日柱旬空，命理常说的「空亡」即指此
    xunKongYear: detail[0].xunKong,    // 年柱旬空，另列备查
    monthTerm: mp.term,
    ganzhiYear: yp.ganzhiYear,
    baziText: detail.map((d) => d.name).join(' '),
  };
}

export { tenGod, TEN_GOD_SHORT, GENERATES, CONTROLS };