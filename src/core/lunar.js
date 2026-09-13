/**
 * 历法核心：儒略日、干支、二十四节气、农历换算。
 * 全部算法为纯数学推导，不依赖任何外部数据表（农历朔望数据除外，见 lunar-data.js）。
 */

// ---------- 基础常量 ----------

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const SOLAR_TERMS = [
  '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰',
  '春分', '清明', '谷雨', '立夏', '小满', '芒种',
  '夏至', '小暑', '大暑', '立秋', '处暑', '白露',
  '秋分', '寒露', '霜降', '立冬', '小雪', '大雪',
];

/** 天干五行 */
export const STEM_WUXING = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

/** 天干阴阳：阳为 true */
export const STEM_YANG = {
  甲: true, 乙: false, 丙: true, 丁: false, 戊: true,
  己: false, 庚: true, 辛: false, 壬: true, 癸: false,
};

/** 地支五行 */
export const BRANCH_WUXING = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

/** 地支藏干（本气、中气、余气） */
export const BRANCH_HIDDEN_STEMS = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '庚', '戊'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲'],
};

/** 地支生肖 */
export const BRANCH_ZODIAC = {
  子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇',
  午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪',
};

/** 地支时辰范围（用于反查） */
export const BRANCH_HOUR = {
  子: '23:00-00:59', 丑: '01:00-02:59', 寅: '03:00-04:59', 卯: '05:00-06:59',
  辰: '07:00-08:59', 巳: '09:00-10:59', 午: '11:00-12:59', 未: '13:00-14:59',
  申: '15:00-16:59', 酉: '17:00-18:59', 戌: '19:00-20:59', 亥: '21:00-22:59',
};

/** 八卦 */
export const TRIGRAMS = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];

export const TRIGRAM_INFO = {
  乾: { symbol: '☰', nature: '天', lines: [1, 1, 1], element: '金', direction: '西北' },
  兑: { symbol: '☱', nature: '泽', lines: [1, 1, 0], element: '金', direction: '西' },
  离: { symbol: '☲', nature: '火', lines: [1, 0, 1], element: '火', direction: '南' },
  震: { symbol: '☳', nature: '雷', lines: [1, 0, 0], element: '木', direction: '东' },
  巽: { symbol: '☴', nature: '风', lines: [0, 1, 1], element: '木', direction: '东南' },
  坎: { symbol: '☵', nature: '水', lines: [0, 1, 0], element: '水', direction: '北' },
  艮: { symbol: '☶', nature: '山', lines: [0, 0, 1], element: '土', direction: '东北' },
  坤: { symbol: '☷', nature: '地', lines: [0, 0, 0], element: '土', direction: '西南' },
};

// ---------- 六十甲子 ----------

/** 六十甲子表，索引 0 = 甲子 */
export const JIAZI = (() => {
  const list = [];
  for (let i = 0; i < 60; i += 1) {
    list.push(STEMS[i % 10] + BRANCHES[i % 12]);
  }
  return list;
})();

/** 由天干序号与地支序号求六十甲子序号，无解返回 -1 */
export function jiaziIndex(stemIdx, branchIdx) {
  for (let i = 0; i < 60; i += 1) {
    if (i % 10 === stemIdx && i % 12 === branchIdx) return i;
  }
  return -1;
}

// ---------- 儒略日 ----------

/** 公历转儒略日（含小数日） */
export function gregorianToJD(year, month, day, hour = 0, minute = 0) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const frac = (hour * 3600 + minute * 60) / 86400;
  return (
    Math.floor(365.25 * (y + 4716))
    + Math.floor(30.6001 * (m + 1))
    + day + b - 1524.5 + frac
  );
}

/** 儒略日转公历（返回含小数的日） */
export function jdToGregorian(jd) {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const dayFrac = b - d - Math.floor(30.6001 * e) + f;
  const day = Math.floor(dayFrac);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return { year, month, day, dayFrac };
}

/** 儒略日 -> 星期（0=周日） */
export function jdWeekday(jd) {
  return Math.floor(jd + 0.5 + 1.5) % 7;
}

/** 当日 0 时的儒略日（本地时间近似，用于日柱） */
export function jdAtMidnight(year, month, day) {
  return gregorianToJD(year, month, day, 0, 0);
}

// ---------- 节气 ----------

/**
 * 太阳视黄经（度），Meeus 低精度算法，误差 < 0.01 度。
 */
function solarApparentLongitude(jde) {
  const t = (jde - 2451545) / 36525;
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
  const mRad = (m * Math.PI) / 180;
  const c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(mRad)
    + (0.019993 - 0.000101 * t) * Math.sin(2 * mRad)
    + 0.000289 * Math.sin(3 * mRad);
  const trueLong = l0 + c;
  const omega = 125.04 - 1934.136 * t;
  const apparent = trueLong - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180);
  return ((apparent % 360) + 360) % 360;
}

/** 计算太阳黄经达到 targetDeg 的时刻（儒略日 UTC），hintJD 为搜索起点 */
function solveSolarLongitude(targetDeg, hintJD) {
  let jd = hintJD;
  const norm = (deg) => ((deg + 180) % 360 + 360) % 360 - 180;
  for (let i = 0; i < 24; i += 1) {
    const diff = norm(solarApparentLongitude(jd) - targetDeg);
    if (Math.abs(diff) < 1e-7) break;
    jd -= (diff / 360) * 365.2422;
  }
  return jd;
}

/**
 * 返回指定公历年的二十四节气时刻（按节气顺序，从冬至起）。
 * 以该年 1 月 1 日为基准逐年推算，返回 [{name, jd, year, month, day, hour, minute}]
 */
/**
 * 自指定公历年「冬至」起，连续推算 24 个节气。
 * 返回顺序为 冬至、小寒、大寒、立春…大雪，时间跨度约一年。
 */
export function solarTermsFromWinterSolstice(year) {
  const result = [];
  const winterSolsticeHint = gregorianToJD(year, 12, 22, 0, 0);
  const winterSolstice = solveSolarLongitude(270, winterSolsticeHint);

  for (let i = 0; i < 24; i += 1) {
    const targetDeg = (270 + i * 15) % 360;
    const hint = winterSolstice + i * 15.2184;
    const jd = solveSolarLongitude(targetDeg, hint);
    const g = jdToGregorian(jd + 8 / 24);
    const day = Math.floor(g.dayFrac);
    const frac = g.dayFrac - day;
    result.push({
      name: SOLAR_TERMS[i],
      jd,
      year: g.year,
      month: g.month,
      day,
      hour: Math.floor(frac * 24),
      minute: Math.round(((frac * 24) % 1) * 60),
    });
  }
  return result;
}

/**
 * 指定公历年（1 月 1 日 ~ 12 月 31 日）内的二十四节气，按时间升序。
 * 由前一冬至起算，筛出落在该公历年内的节气。
 */
export function solarTermsOfYear(year) {
  const from = solarTermsFromWinterSolstice(year - 1);
  return from.filter((t) => t.year === year).sort((a, b) => a.jd - b.jd);
}

/**
 * 取某日所属的「节气月」起始节气（立春、惊蛰、清明…共 12 个节）。
 * 用于八字月柱。
 */
export function monthBoundaryTerms(year) {
  return solarTermsOfYear(year).filter((t) => [
    '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
    '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
  ].includes(t.name));
}

// ---------- 干支纪日 ----------

/**
 * 日柱：以 1900-01-01 为甲戌日（序号 10）为锚点推算。
 */
export function dayPillarIndex(year, month, day) {
  const anchorJD = gregorianToJD(1900, 1, 1, 0, 0);
  const targetJD = gregorianToJD(year, month, day, 0, 0);
  const days = Math.round(targetJD - anchorJD);
  // 1900-01-01 是甲戌日，甲戌在六十甲子中序号为 10
  return ((10 + days) % 60 + 60) % 60;
}

/** 时辰地支序号：23:00-00:59 为子时（0） */
export function hourBranchIndex(hour) {
  return Math.floor(((hour + 1) % 24) / 2);
}

export function stemIndex(char) {
  return STEMS.indexOf(char);
}

export function branchIndex(char) {
  return BRANCHES.indexOf(char);
}

/** 由序号取干支 */
export function jiaziName(index) {
  return JIAZI[((index % 60) + 60) % 60];
}

export function ganzhiOf(stemIdx, branchIdx) {
  return STEMS[stemIdx] + BRANCHES[branchIdx];
}

/** 旬空（空亡）：返回两个地支 */
export function xunKong(jiaziIdx) {
  const stem = jiaziIdx % 10;
  const branch = jiaziIdx % 12;
  // 旬首地支
  const xunStart = ((branch - stem) % 12 + 12) % 12;
  const k1 = (xunStart + 10) % 12;
  const k2 = (xunStart + 11) % 12;
  return [BRANCHES[k1], BRANCHES[k2]];
}

/** 纳音五行（六十甲子） */
export const NAYIN = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火',
  '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土',
  '霹雳火', '松柏木', '长流水', '砂中金', '山下火', '平地木',
  '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金',
  '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
];

export function nayin(jiaziIdx) {
  return NAYIN[Math.floor((((jiaziIdx % 60) + 60) % 60) / 2)];
}
