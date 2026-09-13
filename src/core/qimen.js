/**
 * 奇门遁甲排盘引擎（时家转盘奇门，阳遁阴遁按节气局数）。
 * 组成：定局、地盘三奇六仪、值符值使、天盘九星、八门、八神、旬空、马星、空亡。
 */

import {
  STEMS, BRANCHES, jiaziName, xunKong, dayPillarIndex,
} from './lunar.js';

/** 九宫布局（洛书）：宫号 -> [方位, 地支, 五行] */
export const PALACES = {
  1: { name: '坎一宫', direction: '北', element: '水', trigram: '坎' },
  2: { name: '坤二宫', direction: '西南', element: '土', trigram: '坤' },
  3: { name: '震三宫', direction: '东', element: '木', trigram: '震' },
  4: { name: '巽四宫', direction: '东南', element: '木', trigram: '巽' },
  5: { name: '中五宫', direction: '中', element: '土', trigram: '中' },
  6: { name: '乾六宫', direction: '西北', element: '金', trigram: '乾' },
  7: { name: '兑七宫', direction: '西', element: '金', trigram: '兑' },
  8: { name: '艮八宫', direction: '东北', element: '土', trigram: '艮' },
  9: { name: '离九宫', direction: '南', element: '火', trigram: '离' },
};

/** 洛书轨迹：1→2→3→4→5→6→7→8→9（阳顺）；阴遁逆行 9→8→…→1 */
export const LUOSHU = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const LUOSHU_REVERSE = [9, 8, 7, 6, 5, 4, 3, 2, 1];

/** 九星 */
export const NINE_STARS = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'];
/** 八门 */
export const EIGHT_DOORS = ['休门', '死门', '伤门', '杜门', '中', '开门', '惊门', '生门', '景门'];
/** 八神（阳遁顺布，阴遁逆布） */
export const EIGHT_GODS = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];

/** 节气 -> 上中下元局数表（阳遁/阴遁） */
const JU_TABLE = {
  冬至: { type: '阳', ju: [1, 7, 4] },
  小寒: { type: '阳', ju: [2, 8, 5] },
  大寒: { type: '阳', ju: [3, 9, 6] },
  立春: { type: '阳', ju: [8, 5, 2] },
  雨水: { type: '阳', ju: [9, 6, 3] },
  惊蛰: { type: '阳', ju: [1, 7, 4] },
  春分: { type: '阳', ju: [3, 9, 6] },
  清明: { type: '阳', ju: [4, 1, 7] },
  谷雨: { type: '阳', ju: [5, 2, 8] },
  立夏: { type: '阳', ju: [4, 1, 7] },
  小满: { type: '阳', ju: [5, 2, 8] },
  芒种: { type: '阳', ju: [6, 3, 9] },
  夏至: { type: '阴', ju: [9, 3, 6] },
  小暑: { type: '阴', ju: [8, 2, 5] },
  大暑: { type: '阴', ju: [7, 1, 4] },
  立秋: { type: '阴', ju: [2, 5, 8] },
  处暑: { type: '阴', ju: [1, 4, 7] },
  白露: { type: '阴', ju: [9, 3, 6] },
  秋分: { type: '阴', ju: [7, 1, 4] },
  寒露: { type: '阴', ju: [6, 9, 3] },
  霜降: { type: '阴', ju: [5, 8, 2] },
  立冬: { type: '阴', ju: [6, 9, 3] },
  小雪: { type: '阴', ju: [5, 8, 2] },
  大雪: { type: '阴', ju: [4, 7, 1] },
};

/** 三奇六仪：戊己庚辛壬癸丁丙乙 */
export const YIQI_ORDER = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

/** 六十甲子 -> 六旬旬首 */
const XUN_SHOU = {
  甲子: '戊', 甲戌: '己', 甲申: '庚', 甲午: '辛', 甲辰: '壬', 甲寅: '癸',
};

/** 由节气与日干支取局数（拆补法简化：按上中下元） */
export function juOf(termName, dayJiaziIdx) {
  const info = JU_TABLE[termName] || { type: '阳', ju: [1, 7, 4] };
  const branch = dayJiaziIdx % 12;
  // 子午卯酉为上元，寅申巳亥为中元，辰戌丑未为下元
  let yuanIdx = 0;
  if ([2, 8, 5, 11].includes(branch)) yuanIdx = 1;
  else if ([4, 10, 7, 1].includes(branch)) yuanIdx = 2;
  return { type: info.type, ju: info.ju[yuanIdx], yuan: ['上元', '中元', '下元'][yuanIdx] };
}

/** 时柱干支 */
function hourGanZhi(dayStem, hourIdx) {
  const start = { 甲: 0, 己: 0, 乙: 2, 庚: 2, 丙: 4, 辛: 4, 丁: 6, 壬: 6, 戊: 8, 癸: 8 }[dayStem];
  const stemIdx = (start + hourIdx) % 10;
  const idx = (() => {
    for (let i = 0; i < 60; i += 1) if (i % 10 === stemIdx && i % 12 === hourIdx) return i;
    return 0;
  })();
  return { stem: STEMS[stemIdx], branch: BRANCHES[hourIdx], stemIdx, idx, name: STEMS[stemIdx] + BRANCHES[hourIdx] };
}

/**
 * 主排盘。
 * @param {Date} date 起局时间（节气由外部传入或使用近似）
 * @param {object} opts { termName, dayJiaziIdx }
 */
export function buildQimen(date, opts = {}) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const hourIdx = Math.floor(((hour + 1) % 24) / 2);

  const dpIdx = opts.dayJiaziIdx ?? dayPillarIndex(year, month, day);
  const dayStem = jiaziName(dpIdx)[0];
  const dayBranch = jiaziName(dpIdx)[1];
  const hg = hourGanZhi(dayStem, hourIdx);

  const termName = opts.termName || '冬至';
  const { type, ju, yuan } = juOf(termName, dpIdx);

  // 地盘三奇六仪：阳遁顺布，阴遁逆布，从局数宫起戊
  const earthPlate = {};
  const track = type === '阳' ? LUOSHU : LUOSHU_REVERSE;
  const startPos = track.indexOf(ju);
  YIQI_ORDER.forEach((stem, i) => {
    const pos = track[(startPos + i) % 9];
    earthPlate[pos] = stem;
  });

  // 旬首与值符
  const xunIdx = hg.idx - (hg.idx % 10); // 时柱所在旬首的甲子序号
  const xunShouName = jiaziName(xunIdx);
  const xunShouStem = XUN_SHOU[xunShouName.slice(0, 2)] || '戊';

  // 值符星：旬首（戊等）所在地盘宫对应的九星
  const zhifuPalace = Object.keys(earthPlate).find((k) => earthPlate[k] === xunShouStem);
  const starOfPalace = (p) => NINE_STARS[(p - 1) % 9];
  const zhifuStar = starOfPalace(Number(zhifuPalace));

  // 时干落宫 -> 值符加时干
  const timeStemPos = Object.keys(earthPlate).find((k) => earthPlate[k] === hg.stem);
  const zhifuTarget = timeStemPos ? Number(timeStemPos) : Number(zhifuPalace);

  // 天盘九星：值符加时干宫，其余顺布
  const skyStars = {};
  const starOrder = NINE_STARS;
  const zhifuStarIdx = starOrder.indexOf(zhifuStar);
  const trackF = type === '阳' ? LUOSHU : LUOSHU_REVERSE;
  const basePos = trackF.indexOf(zhifuTarget);
  starOrder.forEach((star, i) => {
    const pos = trackF[(basePos + i - zhifuStarIdx + 9) % 9];
    skyStars[pos] = star;
  });

  // 天盘三奇六仪：随星带干，天盘干 = 值符宫之干加临
  const skyStems = {};
  const zhifuEarthStem = earthPlate[Number(zhifuPalace)];
  Object.entries(skyStars).forEach(([pos, star]) => {
    const earthPosOfStar = ((Number(pos) - 1 - (zhifuTarget - Number(zhifuPalace))) % 9 + 9) % 9 + 1;
    const baseStem = earthPlate[earthPosOfStar];
    skyStems[pos] = baseStem;
  });

  // 值使门：旬首所在宫之门，随时干支
  const zhishiDoor = EIGHT_DOORS[(Number(zhifuPalace) - 1) % 9];
  const doors = {};
  const doorOrder = EIGHT_DOORS;
  const zhishiIdx = doorOrder.indexOf(zhishiDoor);
  const doorBase = trackF.indexOf(Number(zhifuPalace));
  const hourOffset = ((hg.idx - xunIdx) % 10 + 10) % 10;
  doorOrder.forEach((door, i) => {
    const pos = trackF[(doorBase + hourOffset + i - zhishiIdx + 9) % 9];
    doors[pos] = door;
  });

  // 八神：值符落时干宫，阳顺阴逆
  const gods = {};
  const godTrack = type === '阳' ? LUOSHU : LUOSHU_REVERSE;
  const godBase = godTrack.indexOf(zhifuTarget);
  EIGHT_GODS.forEach((g, i) => {
    const pos = godTrack[(godBase + i) % 9];
    gods[pos] = g;
  });

  // 组装九宫
  const palaces = LUOSHU.map((p) => ({
    palace: p,
    name: PALACES[p].name,
    direction: PALACES[p].direction,
    element: PALACES[p].element,
    trigram: PALACES[p].trigram,
    earthStem: earthPlate[p] || '',
    skyStem: skyStems[p] || '',
    star: p === 5 ? '天禽' : (skyStars[p] || starOfPalace(p)),
    door: p === 5 ? '—' : (doors[p] || EIGHT_DOORS[(p - 1) % 9]),
    god: gods[p] || '',
    isZhifu: skyStars[p] === zhifuStar,
    isZhishi: doors[p] === zhishiDoor,
  }));

  const kong = xunKong(dpIdx);

  return {
    date,
    solarText: `${year}年${month}月${day}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    termName,
    dunType: type,
    dunName: type === '阳' ? '阳遁' : '阴遁',
    ju,
    juName: `${type}遁${ju}局`,
    yuan,
    dayGanZhi: jiaziName(dpIdx),
    hourGanZhi: hg.name,
    hourIdx,
    xunShou: xunShouName,
    xunShouStem,
    zhifuStar,
    zhishiDoor,
    palaces,
    xunKong: kong,
    zhifuPalace,
    zhifuTarget,
  };
}

export { hourGanZhi };