/**
 * 六爻（纳甲筮法）引擎。
 * 起卦方式：三枚铜钱法（手动/时间起卦）、梅花易数时间起卦。
 * 排盘内容：本卦、变卦、纳甲、六亲、六神、世应、伏神、旬空、旺衰。
 */

import {
  STEMS, BRANCHES, TRIGRAM_INFO, TRIGRAMS, dayPillarIndex,
  jiaziName, xunKong, STEM_WUXING, BRANCH_WUXING, BRANCH_HIDDEN_STEMS,
} from './lunar.js';

/** 八卦纳甲：三爻各配天干地支（内卦/外卦分别纳） */
const NAJIA = {
  乾: { inner: ['甲', '子'], middle: ['甲', '寅'], outer: ['甲', '辰'], outInner: ['壬', '午'], outMiddle: ['壬', '申'], outOuter: ['壬', '戌'] },
  坎: { inner: ['戊', '寅'], middle: ['戊', '辰'], outer: ['戊', '午'], outInner: ['戊', '申'], outMiddle: ['戊', '戌'], outOuter: ['戊', '子'] },
  艮: { inner: ['丙', '辰'], middle: ['丙', '午'], outer: ['丙', '申'], outInner: ['丙', '戌'], outMiddle: ['丙', '子'], outOuter: ['丙', '寅'] },
  震: { inner: ['庚', '子'], middle: ['庚', '寅'], outer: ['庚', '辰'], outInner: ['庚', '午'], outMiddle: ['庚', '申'], outOuter: ['庚', '戌'] },
  巽: { inner: ['辛', '丑'], middle: ['辛', '亥'], outer: ['辛', '酉'], outInner: ['辛', '未'], outMiddle: ['辛', '巳'], outOuter: ['辛', '卯'] },
  离: { inner: ['己', '卯'], middle: ['己', '丑'], outer: ['己', '亥'], outInner: ['己', '酉'], outMiddle: ['己', '未'], outOuter: ['己', '巳'] },
  坤: { inner: ['乙', '未'], middle: ['乙', '巳'], outer: ['乙', '卯'], outInner: ['癸', '丑'], outMiddle: ['癸', '亥'], outOuter: ['癸', '酉'] },
  兑: { inner: ['丁', '巳'], middle: ['丁', '卯'], outer: ['丁', '丑'], outInner: ['丁', '亥'], outMiddle: ['丁', '酉'], outOuter: ['丁', '未'] },
};

/** 八卦 -> 二进制（自下而上，1 阳 0 阴） */
const TRIGRAM_BITS = {};
TRIGRAMS.forEach((name) => { TRIGRAM_BITS[name] = TRIGRAM_INFO[name].lines; });

/** 由三爻（自下而上）求八卦名 */
function bitsToTrigram(bits) {
  const key = bits.join(',');
  for (const name of TRIGRAMS) {
    if (TRIGRAM_INFO[name].lines.join(',') === key) return name;
  }
  return null;
}

/** 六十四卦名：key 为上卦+下卦 */
export const HEXAGRAM_NAMES = {
  '乾乾': '乾为天', '乾兑': '天泽履', '乾离': '天火同人', '乾震': '天雷无妄',
  '乾巽': '天风姤', '乾坎': '天水讼', '乾艮': '天山遁', '乾坤': '天地否',
  '兑乾': '泽天夬', '兑兑': '兑为泽', '兑离': '泽火革', '兑震': '泽雷随',
  '兑巽': '泽风大过', '兑坎': '泽水困', '兑艮': '泽山咸', '兑坤': '泽地萃',
  '离乾': '火天大有', '离兑': '火泽睽', '离离': '离为火', '离震': '火雷噬嗑',
  '离巽': '火风鼎', '离坎': '火水未济', '离艮': '火山旅', '离坤': '火地晋',
  '震乾': '雷天大壮', '震兑': '雷泽归妹', '震离': '雷火丰', '震震': '震为雷',
  '震巽': '雷风恒', '震坎': '雷水解', '震艮': '雷山小过', '震坤': '雷地豫',
  '巽乾': '风天小畜', '巽兑': '风泽中孚', '巽离': '风火家人', '巽震': '风雷益',
  '巽巽': '巽为风', '巽坎': '风水涣', '巽艮': '风山渐', '巽坤': '风地观',
  '坎乾': '水天需', '坎兑': '水泽节', '坎离': '水火既济', '坎震': '水雷屯',
  '坎巽': '水风井', '坎坎': '坎为水', '坎艮': '水山蹇', '坎坤': '水地比',
  '艮乾': '山天大畜', '艮兑': '山泽损', '艮离': '山火贲', '艮震': '山雷颐',
  '艮巽': '山风蛊', '艮坎': '山水蒙', '艮艮': '艮为山', '艮坤': '山地剥',
  '坤乾': '地天泰', '坤兑': '地泽临', '坤离': '地火明夷', '坤震': '地雷复',
  '坤巽': '地风升', '坤坎': '地水师', '坤艮': '地山谦', '坤坤': '坤为地',
};

/** 京房八宫卦序，用于（可选）卦宫归属 */
const PALACE_SEQ = {
  乾: ['乾为天', '天风姤', '天山遁', '天地否', '风地观', '山地剥', '火地晋', '火天大有'],
  坎: ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'],
  艮: ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'],
  震: ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'],
  巽: ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'],
  离: ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天水讼', '天火同人'],
  坤: ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'],
  兑: ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹'],
};

const PALACE_OF = {};
Object.entries(PALACE_SEQ).forEach(([palace, names]) => {
  names.forEach((n, i) => { PALACE_OF[n] = { palace, index: i }; });
});

/** 世应位置：八宫卦第 n 卦的世爻位置 */
const SHI_YAO_TABLE = [6, 1, 2, 3, 4, 5, 4, 3];

/** 五行生克 */
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/** 六亲：以卦宫五行为「我」 */
export function sixRelative(palaceElement, yaoElement) {
  if (palaceElement === yaoElement) return '兄弟';
  if (GENERATES[yaoElement] === palaceElement) return '父母';
  if (GENERATES[palaceElement] === yaoElement) return '子孙';
  if (CONTROLS[palaceElement] === yaoElement) return '妻财';
  if (CONTROLS[yaoElement] === palaceElement) return '官鬼';
  return '—';
}

/** 六神：按日干起，初爻为起点 */
const SIX_GODS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
const SIX_GOD_START = {
  甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5,
};

/** 用神（六亲）对应占问事项 */
export const YONGSHEN_TOPICS = {
  妻财: '求财、生意、妻子、财物',
  官鬼: '功名、官职、疾病、官讼、丈夫',
  父母: '长辈、文书、房屋、车船、学业',
  兄弟: '兄弟、朋友、同辈、竞争、破财',
  子孙: '子女、下属、福神、医药、解忧',
};

/** 三枚铜钱结果 -> 爻 */
function coinToYao(coins) {
  const heads = coins.filter((c) => c === 1).length;
  // 3 背 = 老阳(9,动), 2 背 = 少阴(8), 1 背 = 少阳(7), 0 背 = 老阴(6,动)
  if (heads === 3) return { value: 9, yang: true, moving: true, label: '老阳', mark: '○' };
  if (heads === 2) return { value: 8, yang: false, moving: false, label: '少阴', mark: '' };
  if (heads === 1) return { value: 7, yang: true, moving: false, label: '少阳', mark: '' };
  return { value: 6, yang: false, moving: true, label: '老阴', mark: '×' };
}

/** 摇卦：模拟三枚铜钱六次 */
export function tossCoins() {
  const rounds = [];
  for (let i = 0; i < 6; i += 1) {
    const coins = [0, 0, 0].map(() => (Math.random() < 0.5 ? 1 : 0));
    rounds.push({ coins, yao: coinToYao(coins) });
  }
  return rounds;
}

/** 时间起卦（梅花易数）：年月日时数 */
export function timeCast(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours();
  const branchIdx = Math.floor(((h + 1) % 24) / 2);
  const yearBranchNum = ((y - 1984) % 12 + 12) % 12 + 1;
  const upper = ((yearBranchNum + m + d) % 8) || 8;
  const lower = ((yearBranchNum + m + d + branchIdx + 1) % 8) || 8;
  const moving = ((yearBranchNum + m + d + branchIdx + 1) % 6) || 6;
  // 先天八卦数：乾1兑2离3震4巽5坎6艮7坤8
  const xianTian = { 1: '乾', 2: '兑', 3: '离', 4: '震', 5: '巽', 6: '坎', 7: '艮', 8: '坤' };
  return { upper: xianTian[upper], lower: xianTian[lower], moving };
}

/**
 * 排卦主逻辑。
 * @param {number[]} yaoValues 六爻数值，自下而上，7/8 静，9/6 动
 * @param {Date} date 起卦时间（用于日柱、六神、旬空）
 * @param {string} question 占问事由
 */
export function buildHexagram(yaoValues, date, question = '') {
  const yaoList = yaoValues.map((v, i) => {
    if (v === 9) return { index: i + 1, value: 9, yang: true, moving: true, label: '老阳', mark: '○' };
    if (v === 6) return { index: i + 1, value: 6, yang: false, moving: true, label: '老阴', mark: '×' };
    if (v === 7) return { index: i + 1, value: 7, yang: true, moving: false, label: '少阳', mark: '' };
    return { index: i + 1, value: 8, yang: false, moving: false, label: '少阴', mark: '' };
  });

  const lowerBits = yaoList.slice(0, 3).map((y) => (y.yang ? 1 : 0));
  const upperBits = yaoList.slice(3, 6).map((y) => (y.yang ? 1 : 0));
  const lower = bitsToTrigram(lowerBits);
  const upper = bitsToTrigram(upperBits);

  // 变卦：动爻取反
  const changedBits = yaoList.map((y) => (y.moving ? !y.yang : y.yang));
  const changedLower = bitsToTrigram(changedBits.slice(0, 3).map((b) => (b ? 1 : 0)));
  const changedUpper = bitsToTrigram(changedBits.slice(3, 6).map((b) => (b ? 1 : 0)));

  const name = HEXAGRAM_NAMES[upper + lower] || `${upper}${lower}`;
  const changedName = HEXAGRAM_NAMES[changedUpper + changedLower] || `${changedUpper}${changedLower}`;

  const palaceInfo = PALACE_OF[name] || { palace: upper, index: 0 };
  const palace = palaceInfo.palace;
  const palaceElement = TRIGRAM_INFO[palace].element;

  // 纳甲：下卦（内）取 inner 三爻，上卦（外）取 out 三爻
  const najia = [];
  const innerNajia = NAJIA[lower];
  const outerNajia = NAJIA[upper];
  najia.push(innerNajia.inner, innerNajia.middle, innerNajia.outer);
  najia.push(outerNajia.outInner, outerNajia.outMiddle, outerNajia.outOuter);

  // 世应
  const shiYao = SHI_YAO_TABLE[palaceInfo.index];
  const yingYao = shiYao <= 3 ? shiYao + 3 : shiYao - 3;

  // 六神
  const dpIdx = dayPillarIndex(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const dayStem = jiaziName(dpIdx)[0];
  const godStart = SIX_GOD_START[dayStem];
  const kong = xunKong(dpIdx);

  const yaos = yaoList.map((y, i) => {
    const [stem, branch] = najia[i];
    const branchEl = BRANCH_WUXING[branch];
    const rel = sixRelative(palaceElement, branchEl);
    const isShi = i + 1 === shiYao;
    const isYing = i + 1 === yingYao;
    return {
      ...y,
      pos: i + 1,
      stem,
      branch,
      ganZhi: stem + branch,
      branchElement: branchEl,
      stemElement: STEM_WUXING[stem],
      relative: rel,
      god: SIX_GODS[(godStart + i) % 6],
      isShi,
      isYing,
      role: isShi ? '世' : isYing ? '应' : '',
      kong: kong.includes(branch),
      hiddenStems: BRANCH_HIDDEN_STEMS[branch],
    };
  });

  // 伏神：本卦缺少的六亲，从本宫首卦（八纯卦）对应爻位取
  const present = new Set(yaos.map((y) => y.relative));
  const pureName = `${palace}为${TRIGRAM_INFO[palace].nature}`;
  const fushen = [];
  if (present.size < 5) {
    const pureNajia = [
      ...['inner', 'middle', 'outer'].map((k) => NAJIA[palace][k]),
      ...['outInner', 'outMiddle', 'outOuter'].map((k) => NAJIA[palace][k]),
    ];
    pureNajia.forEach(([stem, branch], i) => {
      const rel = sixRelative(palaceElement, BRANCH_WUXING[branch]);
      if (!present.has(rel)) {
        fushen.push({
          pos: i + 1,
          ganZhi: stem + branch,
          branch,
          branchElement: BRANCH_WUXING[branch],
          relative: rel,
          god: SIX_GODS[(godStart + i) % 6],
        });
      }
    });
  }

  const movingYaos = yaos.filter((y) => y.moving);
  const changedNameClean = changedName === name ? null : changedName;

  return {
    question,
    castDate: date,
    dayGanZhi: jiaziName(dpIdx),
    dayStem,
    xunKong: kong,
    name,
    changedName: changedNameClean,
    upper,
    lower,
    changedUpper,
    changedLower,
    palace,
    palaceElement,
    palaceType: palaceInfo.index === 0 ? '本宫卦（八纯）' : palaceInfo.index === 6 ? '游魂卦' : palaceInfo.index === 7 ? '归魂卦' : `${palaceInfo.index}世卦`,
    shiYao,
    yingYao,
    yaos,
    fushen,
    movingCount: movingYaos.length,
    movingYaos,
    upperTrigram: { name: upper, ...TRIGRAM_INFO[upper] },
    lowerTrigram: { name: lower, ...TRIGRAM_INFO[lower] },
    changedUpperTrigram: changedUpper ? { name: changedUpper, ...TRIGRAM_INFO[changedUpper] } : null,
    changedLowerTrigram: changedLower ? { name: changedLower, ...TRIGRAM_INFO[changedLower] } : null,
    pureName,
  };
}

/**
 * 简易卦辞库（六十四卦象传/彖辞核心句），用于娱乐性解读。
 */
export const HEXAGRAM_TEXTS = {
  乾为天: '元亨利贞。天行健，君子以自强不息。',
  坤为地: '元亨，利牝马之贞。地势坤，君子以厚德载物。',
  水雷屯: '元亨利贞，勿用有攸往，利建侯。云雷屯，君子以经纶。',
  山水蒙: '亨。匪我求童蒙，童蒙求我。山下出泉，蒙。',
  水天需: '有孚，光亨，贞吉，利涉大川。云上于天，需。',
  天水讼: '有孚窒惕，中吉，终凶。利见大人，不利涉大川。',
  地水师: '贞，丈人吉，无咎。地中有水，师。',
  水地比: '吉。原筮元永贞，无咎。地上有水，比。',
  风天小畜: '亨。密云不雨，自我西郊。风行天上，小畜。',
  天泽履: '履虎尾，不咥人，亨。上天下泽，履。',
  地天泰: '小往大来，吉亨。天地交，泰。',
  天地否: '否之匪人，不利君子贞。天地不交，否。',
  天火同人: '同人于野，亨，利涉大川。天与火，同人。',
  火天大有: '元亨。火在天上，大有。',
  地山谦: '亨，君子有终。地中有山，谦。',
  雷地豫: '利建侯行师。雷出地奋，豫。',
  泽雷随: '元亨利贞，无咎。泽中有雷，随。',
  山风蛊: '元亨，利涉大川。山下有风，蛊。',
  地泽临: '元亨利贞。至于八月有凶。泽上有地，临。',
  风地观: '盥而不荐，有孚颙若。风行地上，观。',
  火雷噬嗑: '亨。利用狱。雷电，噬嗑。',
  山火贲: '亨。小利有攸往。山下有火，贲。',
  山地剥: '不利有攸往。山附于地，剥。',
  地雷复: '亨。出入无疾，朋来无咎。雷在地中，复。',
  天雷无妄: '元亨利贞。其匪正有眚。天下雷行，无妄。',
  山天大畜: '利贞，不家食吉，利涉大川。天在山中，大畜。',
  山雷颐: '贞吉。观颐，自求口实。山下有雷，颐。',
  泽风大过: '栋桡。利有攸往，亨。泽灭木，大过。',
  坎为水: '习坎，有孚，维心亨，行有尚。水洊至，习坎。',
  离为火: '利贞，亨。畜牝牛，吉。明两作，离。',
  泽山咸: '亨，利贞，取女吉。山上有泽，咸。',
  雷风恒: '亨，无咎，利贞，利有攸往。雷风，恒。',
  天山遁: '亨，小利贞。天下有山，遁。',
  雷天大壮: '利贞。雷在天上，大壮。',
  火地晋: '康侯用锡马蕃庶，昼日三接。明出地上，晋。',
  地火明夷: '利艰贞。明入地中，明夷。',
  风火家人: '利女贞。风自火出，家人。',
  火泽睽: '小事吉。上火下泽，睽。',
  水山蹇: '利西南，不利东北，利见大人。山上有水，蹇。',
  雷水解: '利西南。雷雨作，解。',
  山泽损: '有孚，元吉，无咎，可贞。山下有泽，损。',
  风雷益: '利有攸往，利涉大川。风雷，益。',
  泽天夬: '扬于王庭，孚号有厉。泽上于天，夬。',
  天风姤: '女壮，勿用取女。天下有风，姤。',
  泽地萃: '亨。王假有庙，利见大人。泽上于地，萃。',
  地风升: '元亨，用见大人，勿恤，南征吉。地中生木，升。',
  泽水困: '亨，贞，大人吉，无咎。泽无水，困。',
  水风井: '改邑不改井，无丧无得。木上有水，井。',
  泽火革: '己日乃孚，元亨利贞，悔亡。泽中有火，革。',
  火风鼎: '元吉，亨。木上有火，鼎。',
  震为雷: '亨。震来虩虩，笑言哑哑。洊雷，震。',
  艮为山: '艮其背，不获其身。兼山，艮。',
  风山渐: '女归吉，利贞。山上有木，渐。',
  雷泽归妹: '征凶，无攸利。泽上有雷，归妹。',
  雷火丰: '亨，王假之，勿忧，宜日中。雷电皆至，丰。',
  火山旅: '小亨，旅贞吉。山上有火，旅。',
  巽为风: '小亨，利有攸往，利见大人。随风，巽。',
  兑为泽: '亨，利贞。丽泽，兑。',
  风水涣: '亨。王假有庙，利涉大川。风行水上，涣。',
  水泽节: '亨。苦节不可贞。泽上有水，节。',
  风泽中孚: '豚鱼吉，利涉大川，利贞。泽上有风，中孚。',
  雷山小过: '亨，利贞。可小事，不可大事。山上有雷，小过。',
  水火既济: '亨小，利贞，初吉终乱。水在火上，既济。',
  火水未济: '亨。小狐汔济，濡其尾。火在水上，未济。',
};

export function hexagramText(name) {
  return HEXAGRAM_TEXTS[name] || '';
}