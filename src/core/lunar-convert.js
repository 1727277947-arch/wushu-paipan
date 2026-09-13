/**
 * 农历（阴历）转换。
 * 采用天文算法：以朔日为月首，冬至所在月为十一月，含闰月处理。
 * 使用简化月相模型（Meeus 平朔 + 主要周期修正），精度约 ±2 分钟，足以定日。
 */

import { gregorianToJD, jdToGregorian, solarTermsOfYear, solarTermsFromWinterSolstice } from './lunar.js';

const RAD = Math.PI / 180;

/** 北京日序：儒略日 -> 北京时区所在日（整数，可比较） */
function bjDay(jd) {
  return Math.floor(jd + 8 / 24 + 0.5);
}

/** 中气 */
const ZHONGQI = ['雨水', '春分', '谷雨', '小满', '夏至', '大暑', '处暑', '秋分', '霜降', '小雪', '冬至', '大寒'];

/** 月球平黄经等参数（Meeus 简化） */
function newMoonJD(k) {
  // k 为自 2000-01-06 起算的朔望月序数
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const dr = Math.PI / 180;

  let jde = 2451550.09766 + 29.530588861 * k
    + 0.00015437 * t2 - 0.000000150 * t3 + 0.00000000073 * t2 * t2;

  const e = 1 - 0.002516 * t - 0.0000074 * t2;
  const m = (2.5534 + 29.10535670 * k - 0.0000014 * t2 - 0.00000011 * t3) * dr;
  const mp = (201.5643 + 385.81693528 * k + 0.0107582 * t2 + 0.00001238 * t3 - 0.000000058 * t2 * t2) * dr;
  const f = (160.7108 + 390.67050284 * k - 0.0016118 * t2 - 0.00000227 * t3 + 0.000000011 * t2 * t2) * dr;
  const omega = (124.7746 - 1.56375588 * k + 0.0020672 * t2 + 0.00000215 * t3) * dr;

  let corr = 0;
  corr += -0.40720 * Math.sin(mp);
  corr += 0.17241 * e * Math.sin(m);
  corr += 0.01608 * Math.sin(2 * mp);
  corr += 0.01039 * Math.sin(2 * f);
  corr += 0.00739 * e * Math.sin(mp - m);
  corr += -0.00514 * e * Math.sin(mp + m);
  corr += 0.00208 * e * e * Math.sin(2 * m);
  corr += -0.00111 * Math.sin(mp - 2 * f);
  corr += -0.00057 * Math.sin(mp + 2 * f);
  corr += 0.00056 * e * Math.sin(2 * mp + m);
  corr += -0.00042 * Math.sin(3 * mp);
  corr += 0.00042 * e * Math.sin(m + 2 * f);
  corr += 0.00038 * e * Math.sin(m - 2 * f);
  corr += -0.00024 * e * Math.sin(2 * mp - m);
  corr += -0.00017 * Math.sin(omega);
  corr += -0.00007 * Math.sin(mp + 2 * m);
  corr += 0.00004 * Math.sin(2 * mp - 2 * f);
  corr += 0.00004 * Math.sin(3 * m);
  corr += 0.00003 * Math.sin(mp + m - 2 * f);
  corr += 0.00003 * Math.sin(2 * mp + 2 * f);
  corr += -0.00003 * Math.sin(mp + m + 2 * f);
  corr += 0.00003 * Math.sin(mp - m + 2 * f);
  corr += -0.00002 * Math.sin(mp - m - 2 * f);
  corr += -0.00002 * Math.sin(3 * mp + m);
  corr += 0.00002 * Math.sin(4 * mp);

  jde += corr;

  // 附加修正
  const a1 = (299.77 + 0.107408 * k - 0.009173 * t2) * dr;
  const a2 = (251.88 + 0.016321 * k) * dr;
  const a3 = (251.83 + 26.651886 * k) * dr;
  const a4 = (349.42 + 36.412478 * k) * dr;
  const a5 = (84.66 + 18.206239 * k) * dr;
  const a6 = (141.74 + 53.303771 * k) * dr;
  const a7 = (207.14 + 2.453732 * k) * dr;
  const a8 = (154.84 + 7.306860 * k) * dr;
  const a9 = (34.52 + 27.261239 * k) * dr;
  const a10 = (207.19 + 0.121824 * k) * dr;
  const a11 = (291.34 + 1.844379 * k) * dr;
  const a12 = (161.72 + 24.198154 * k) * dr;
  const a13 = (239.56 + 25.513099 * k) * dr;
  const a14 = (331.55 + 3.592518 * k) * dr;

  jde += 0.000325 * Math.sin(a1) + 0.000165 * Math.sin(a2) + 0.000164 * Math.sin(a3)
    + 0.000126 * Math.sin(a4) + 0.000110 * Math.sin(a5) + 0.000062 * Math.sin(a6)
    + 0.000060 * Math.sin(a7) + 0.000056 * Math.sin(a8) + 0.000047 * Math.sin(a9)
    + 0.000042 * Math.sin(a10) + 0.000040 * Math.sin(a11) + 0.000037 * Math.sin(a12)
    + 0.000035 * Math.sin(a13) + 0.000023 * Math.sin(a14);

  return jde;
}

/** 由儒略日求自 2000-01-06 起算的朔望月序数 */
function kFromJD(jd) {
  return (jd - 2451550.09766) / 29.530588861;
}

/** 北京时间的朔日（返回该朔日在北京时间 0 时的儒略日对应的日期） */
function newMoonDate(k) {
  const jde = newMoonJD(k);
  // 转为北京时间并取所在日期（儒略日 + 8 小时）
  const g = jdToGregorian(jde + 8 / 24);
  const day = Math.floor(g.dayFrac);
  return { year: g.year, month: g.month, day };
}

/** 冬至所在月的月序判定所需：某年冬至日 */
function winterSolsticeYear(gregYear) {
  // 公历 gregYear 年 12 月的冬至
  const terms = solarTermsOfYear(gregYear);
  const direct = terms.find((x) => x.name === '冬至');
  if (direct) return direct;
  return solarTermsFromWinterSolstice(gregYear - 1).find((x) => x.name === '冬至');
}

/**
 * 农历年结构：确定该农历年的月份，含闰月。
 * 返回 { year, months: [{num, isLeap, startJD, days}], leapMonth }
 */
export function lunarYearStructure(year) {
  // 标准算法：以「冬至所在之月」为十一月（子月），自该月起连续排月，
  // 期间第一个不含中气者为闰月；正月为十一月之后的第二个或第三个（含雨水的月）。
  const startWS = solarTermsFromWinterSolstice(year - 1).find((x) => x.name === '冬至');
  const startJD = startWS.jd + 8 / 24;

  let k0 = Math.floor(kFromJD(startJD));
  while (newMoonJD(k0) + 8 / 24 > startJD) k0 -= 1;
  while (newMoonJD(k0 + 1) + 8 / 24 <= startJD) k0 += 1;

  // 取足够多的朔月（含前一个，确保覆盖）
  const raw = [];
  for (let i = -1; i < 20; i += 1) {
    const kk = k0 + i;
    raw.push({ k: kk, startDay: bjDay(newMoonJD(kk)) });
  }
  for (let i = 0; i < raw.length - 1; i += 1) {
    raw[i].days = raw[i + 1].startDay - raw[i].startDay;
  }

  const ZHONGQI_NAMES = ['雨水', '春分', '谷雨', '小满', '夏至', '大暑', '处暑', '秋分', '霜降', '小雪', '冬至', '大寒'];
  const qiList = [];
  [year - 3, year - 2, year - 1, year, year + 1, year + 2].forEach((y) => {
    solarTermsFromWinterSolstice(y).forEach((term) => {
      if (ZHONGQI_NAMES.includes(term.name)) qiList.push({ d: bjDay(term.jd), name: term.name });
    });
  });
  qiList.sort((a, b) => a.d - b.d);

  // 十一月（冬至月）：包含冬至的那一个朔月
  const wsDay = bjDay(startWS.jd);
  let shiyiIdx = -1;
  for (let i = 0; i < raw.length - 1; i += 1) {
    if (wsDay >= raw[i].startDay && wsDay < raw[i].startDay + raw[i].days) { shiyiIdx = i; break; }
  }
  if (shiyiIdx < 0) shiyiIdx = 0;

  // 每个朔月所含的中气（取该月内第一个中气）
  const qiOf = raw.map((mo) => {
    const end = mo.startDay + (mo.days || 0);
    const hit = qiList.find((q) => q.d >= mo.startDay && q.d < end);
    return hit ? hit.name : null;
  });

  // 自十一月起编号 11,12,1,2,…；第一个不含中气的月为闰月
  const months = [];
  let leapMonth = 0;
  let num = 11;
  let leapUsed = false;
  for (let i = shiyiIdx; i < raw.length - 1; i += 1) {
    const mo = raw[i];
    const n = num > 12 ? num - 12 : num;
    if (!leapUsed && qiOf[i] === null && i > shiyiIdx) {
      const leapNum = months.length ? months[months.length - 1].num : 12;
      leapMonth = leapNum;
      months.push({ ...mo, num: leapNum, isLeap: true, zhongqi: null });
      leapUsed = true;
      continue;
    }
    months.push({ ...mo, num: n, isLeap: false, zhongqi: qiOf[i] });
    num += 1;
    // 已排满 12 个月（含闰月则 13 个）即结束
    const cap = leapUsed ? 13 : 12;
    if (months.length >= cap && n === 12) break;
  }

  // 截取正月（num===1 且非闰）至下一正月之前
  const zIdx = months.findIndex((m) => m.num === 1 && !m.isLeap);
  if (zIdx < 0) return { year, months: [], leapMonth: 0 };
  const out = [];
  for (let i = zIdx; i < months.length; i += 1) {
    if (i > zIdx && months[i].num === 1 && !months[i].isLeap) break;
    out.push(months[i]);
  }

  return { year, months: out, leapMonth, shiyiK: k0 };
}

const yearCache = new Map();
function getYear(year) {
  if (!yearCache.has(year)) yearCache.set(year, lunarYearStructure(year));
  return yearCache.get(year);
}

/**
 * 公历 -> 农历。
 * 返回 { year, month, day, isLeap, monthName }
 */
export function solarToLunar(y, m, d) {
  // 取当日中午的儒略日，再统一换算为北京日序，与月首同法比较
  const dayIdx = bjDay(gregorianToJD(y, m, d, 12, 0));
  // 农历年可能跨公历年，检查前后两年
  for (const yy of [y, y + 1, y - 1]) {
    const st = getYear(yy);
    for (const mo of st.months) {
      if (dayIdx >= mo.startDay && dayIdx < mo.startDay + mo.days) {
        const day = dayIdx - mo.startDay + 1;
        return {
          year: yy,
          month: mo.num,
          day,
          isLeap: mo.isLeap,
          monthName: (mo.isLeap ? '闰' : '') + (['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'][mo.num] || '') + '月',
        };
      }
    }
  }
  return { year: y, month: 1, day: 1, isLeap: false, monthName: '正月' };
}

export { newMoonJD };