/**
 * 白话解读：把各术数的盘面翻译成人话。
 *
 * 命理解读与解梦各自有专门的解读引擎，这里补齐另外五个：
 * 八字、六爻、大六壬、紫微斗数、奇门遁甲。
 * 每个函数返回 [{ title, text }]，与命理解读的 narrative 结构一致。
 */

import { godGroupScores, scorePillarForLuck } from './interpret.js';
import {
  BRANCH_WUXING, gregorianToJD, solarTermsOfYear,
} from './lunar.js';
import { GENERATES, CONTROLS } from './bazi.js';
import { HEXAGRAM_TEXTS, YONGSHEN_TOPICS } from './liuyao.js';

/* ==================== 共用通俗对照表 ==================== */

/** 五行 → 性格与做事风格 */
const WX_CHARACTER = {
  木: '为人厚道、有主见，凡事爱往长处打算，认准了就往直里走，不太会拐弯',
  火: '性子热、爱张罗、藏不住话，来得快也去得快，热闹事上最出彩',
  土: '厚道稳当、能容人、不急不躁，缺点是容易拖，事情想太久才动手',
  金: '讲规矩、有决断、说一不二，办事利落，缺点是硬，不太愿意低头',
  水: '脑子活、会周旋、看得懂眼色，缺点是主意变得快，容易拿不定主意',
};

/** 五行 → 该往哪补一句 */
const WX_SUGGEST = {
  木: '多亲近草木、往东边走，做跟成长、文教、生发有关的事',
  火: '多往南边、往亮处走，做需要露脸、需要张罗的事',
  土: '多跟土地房产、稳当长久的行当打交道，往中央、黄色上靠',
  金: '做需要拿主意、讲规矩的行当，往西边、白色、金属器械上靠',
  水: '做需要走动、周旋、跟人打交道的行当，往北边、流动的事上靠',
};

/** 十神五类的通俗说法 */
const GROUP_PLAIN = {
  比劫: { name: '自己人', desc: '兄弟、朋友、同辈、合伙人。这一类重，说明身边帮手多，但也容易被分走东西' },
  食伤: { name: '才华', desc: '手艺、创意、表达、嘴上功夫。这一类重，说明靠本事和嘴吃饭，有本事就不怕没饭吃' },
  财: { name: '钱财', desc: '挣钱的路子、务实的本事。这一类重，说明对钱敏感，看见机会就想动手' },
  官杀: { name: '名位', desc: '名分、职位、规矩、约束。这一类重，说明适合在有层级、有规矩的地方往上走' },
  印: { name: '学问', desc: '知识、名声、贵人、靠山。这一类重，说明靠脑子和人脉吃饭，名声往往比钱来得早' },
};

const GROUP_ORDER = ['比劫', '食伤', '财', '官杀', '印'];

/** 大运吉凶档 → 人话 */
const LV_WORD = { 大吉: '最好', 吉: '不错', 平: '一般', 不佳: '偏弱', 凶: '较差' };

/** 六神 → 人话（六爻） */
const GOD_SIX = {
  青龙: '青龙主喜庆、财喜、贵人，是六神里最讨喜的',
  朱雀: '朱雀主口舌、文书、消息，好事是消息到，坏事是拌嘴',
  勾陈: '勾陈主田土、拖延、纠缠，事情容易卡在半路',
  螣蛇: '螣蛇主惊忧、虚惊、反复，多半是自己吓自己',
  白虎: '白虎主凶险、伤损、急事，是六神里最需提防的',
  玄武: '玄武主暗昧、盗失、隐情，事情不太摆得上台面',
};

/** 天将 → 吉凶（大六壬） */
const GENERAL_LUCK = {
  贵人: 1.2, 青龙: 1.0, 六合: 0.9, 太常: 0.7, 天后: 0.6, 太阴: 0.5,
  天空: -0.6, 勾陈: -0.7, 螣蛇: -0.8, 玄武: -0.9, 白虎: -1.1, 朱雀: -0.5,
};

/** 紫微十四主星 → 性格一句话 */
const STAR_CHARACTER = {
  紫微: '紫微是帝星，主尊贵、要强、爱面子，天生有当头的架子，喜欢别人围着转',
  天机: '天机主谋略、机变，脑子转得快，善出主意，缺点是心思重、想太多',
  太阳: '太阳主光明、热心、爱张罗，对外人比对家人还上心，是照亮别人的命',
  武曲: '武曲主财、主刚，性子硬、执行强、认钱认事不认人，适合跟钱打交道',
  天同: '天同主福气、随和，一生少操心，会享福，缺点是容易懒散、缺股狠劲',
  廉贞: '廉贞主纪律、也主桃花，规矩感强、眼里揉不得沙子，感情上容易起波澜',
  天府: '天府是财库，主稳重、会打算、善守成，是攒得住钱的命，不太爱冒险',
  太阴: '太阴主细腻、内敛、重感情，心细如发，适合做需要耐心和审美的事',
  贪狼: '贪狼主欲望、才艺、交际，兴趣广、会来事，什么都想沾一点',
  巨门: '巨门主口才、主是非，靠嘴吃饭，说得好是本事，说得不好惹麻烦',
  天相: '天相是印星，主辅佐、讲情面、会做人，适合当二把手、做协调',
  天梁: '天梁主庇荫、主老成，有长者之风，逢难有人帮，适合做把关的事',
  七杀: '七杀主魄力、主开创，敢闯敢拼、说干就干，缺点是太冲、容易得罪人',
  破军: '破军主变革、主破旧立新，一生起伏大，闲不住，适合开疆拓土',
};

/** 八门 → 吉凶（奇门） */
const DOOR_LUCK = {
  开门: 1.2, 休门: 1.0, 生门: 1.1,
  景门: 0.2, 杜门: 0.1, 平门: 0, 中门: 0,
  惊门: -0.8, 伤门: -0.9, 死门: -1.2,
};
const DOOR_GOOD = ['开门', '休门', '生门'];
const DOOR_BAD = ['死门', '惊门', '伤门'];

/** 九星 → 通俗说明 */
const STAR_QI = {
  天蓬: '天蓬主盗、主险，宜守不宜进',
  天任: '天任主厚实、稳当，适合置产、长线的事',
  天冲: '天冲主快、主急，办事利落但容易毛躁',
  天辅: '天辅主文教、贵人，适合求学问、找帮手',
  天英: '天英主火、主名，适合出风头、做宣传',
  天芮: '天芮主病、主损耗，宜养生、宜守',
  天柱: '天柱主口舌、主阻，话要少说、事要慢办',
  天心: '天心主谋略、主医，适合定计、看病、找高人',
  天禽: '天禽居中，主调和，百事皆宜但都不算出挑',
};

/** 十二时辰吉凶倾向的通俗说法，用于六壬三传 */
const REL_WORD = {
  克我: '受制于人，事情有压力',
  我克: '由你掌控，事情能推动',
  比和: '势均力敌，顺其自然',
  生我: '有人帮扶，事情得势',
  我生: '你在付出，事情耗力',
};

/* ==================== 方法说明 ==================== */

/** 各术数白话解读共用的一句方法说明，避免把简化模型当成定论。 */
export const METHOD_NOTE =
  '以上解读由本工具按公开的传统术数规则推演，其中吉凶轻重为简化量化，'
  + '并非传统命理的完整判断（如八字未含从格、调候、冲合刑害等环节）。'
  + '同一张盘不同流派看法常有出入，内容仅供研究与娱乐参考。';

/* ==================== 八字 ==================== */

export function readBazi(b) {
  const dm = b.dayMaster;
  const weak = dm.verdict === '偏弱';
  const strong = dm.verdict === '偏旺';
  const out = [];

  // 一、你是怎样一个人
  out.push({
    title: '一、你是怎样一个人',
    text:
      `你的日主是${dm.stem}${dm.element}。日主就是「你本人」，`
      + `说白了：${WX_CHARACTER[dm.element]}。`
      + (weak
        ? '你这行的力气偏弱——不是说身体差，是说命里帮衬的少、消耗的多。这类人单打独斗吃亏，靠平台、靠伙伴、靠借力才走得远，自己硬扛事倍功半。'
        : strong
          ? '你这行的力气偏旺——能扛事、有主意、遇事不慌。缺点是容易一条道走到黑，听不进劝。给自己找个出口，把劲头用在正事上，别用在跟人较劲上。'
          : '你这行的力气不偏不倚，这是好底子。进退有分寸、遇事稳得住，属于能长跑的人。')
      + `你生在${b.monthTerm}前后——月令是八字的「气候」，它对日主的影响已经算进强弱里了。`,
  });

  // 二、五行分布
  const sorted = Object.entries(b.wuxing.percent).sort((x, y) => y[1] - x[1]);
  const most = sorted[0];
  const least = sorted[sorted.length - 1];
  out.push({
    title: '二、五行里哪样多、哪样少',
    text:
      `把八个字里的五行过一遍秤：${sorted.map(([k, v]) => `${k} ${v.toFixed(0)}%`).join('，')}。`
      + `最旺的是${most[0]}（${most[1].toFixed(0)}%），最弱的是${least[0]}（${least[1].toFixed(0)}%）。`
      + `最旺那行是你天生的长处，也是容易过头的地方；最弱那行，往往就是这辈子要补的功课。`
      + `这张盘的喜用是${dm.favor.join('、')}，忌${dm.avoid.join('、')}。`
      + `说白了：${dm.favor.map((f) => WX_SUGGEST[f]).join('；')}。`
      + `反过来，${dm.avoid.join('、')}这些方向少碰，硬顶费劲。`,
  });

  // 三、十神
  const scores = godGroupScores(b.pillars, dm.element);
  const total = Object.values(scores).reduce((x, y) => x + y, 0) || 1;
  const ranked = GROUP_ORDER.map((k) => [k, (scores[k] / total) * 100]).sort((x, y) => y[1] - x[1]);
  const top3 = ranked.slice(0, 3);
  out.push({
    title: '三、命里哪几样占得多',
    text:
      `十神归成五类看：${ranked.map(([k, v]) => `${GROUP_PLAIN[k].name} ${v.toFixed(0)}%`).join('，')}。`
      + `占得最多的是${top3.map(([k, v]) => `${GROUP_PLAIN[k].name}（${v.toFixed(0)}%）`).join('、')}。`
      + top3.map(([k]) => `所谓${GROUP_PLAIN[k].name}，指${GROUP_PLAIN[k].desc}。`).join('')
      + `占得最少的是${GROUP_PLAIN[ranked[ranked.length - 1][0]].name}，是你不太倚重的一面，知道就好。`,
  });

  // 四、大运
  const scored = b.luck.pillars.map((lp) => ({ ...lp, level: scorePillarForLuck(lp, dm, scores, b.pillars).level }));
  const good = scored.filter((x) => x.level === '大吉' || x.level === '吉');
  const poor = scored.filter((x) => x.level === '凶' || x.level === '不佳');
  out.push({
    title: '四、哪十年最得劲',
    text:
      `大运是${b.luck.direction}的，${b.luck.startAgeText}起运——也就是说从 ${b.luck.startAge} 岁起，每十年换一步、一步管十年。`
      + (good.length
        ? `这十步里最得劲的是 ${good.map((x) => `${x.startAge}到${x.startAge + 9}岁（${x.name}运）`).join('、')}，该出手就出手，买房、成家、立业都往这几段里安排。`
        : '这十步里没有特别旺的，属于稳扎稳打型：不容易大起大落，但也难一步登天，把节奏放稳反而走得远。')
      + (poor.length
        ? `相对卡壳的是 ${poor.map((x) => `${x.startAge}到${x.startAge + 9}岁`).join('、')}，这几段别冒进、别做大额投入、别做重大决定。`
        : '十步里也没有特别凶的段落，一路算平顺。')
      + '上面那条时间轴就是这十步，颜色越绿越顺、越红越涩。',
  });

  // 刑冲合害
  const rels = b.relations || [];
  out.push({
    title: '五、命里的刑冲合害',
    text: (rels.length
      ? '八字不只看有几个字，还要看字跟字之间的关系。你这张盘有这几处：'
        + rels.map((x) => `${x.text}——${x.note}。`).join('')
        + '这些关系会改变五行的实际力量。上面那个「五行分布」是原始清点，'
        + '而这个工具判强弱喜忌、算大运吉凶时，用的是计入这些关系之后的力量——'
        + '所以同一张大运，有没有这层关系，结论可能差很远。'
      : '你这张盘地支之间没有明显的刑冲合害，八个字各安其位，属于结构比较清爽的盘。')
      + '要提醒的是：合化成不成、冲是凶是吉，传统上各家看法不一，这里是按较通行的取法处理。',
  });

  // 六、几个细节
  const dayNayin = b.pillars[2].nayin;
  out.push({
    title: '六、几个小细节',
    text:
      `你属${b.zodiac}。日柱纳音是「${dayNayin}」——纳音是古人另一套叫法，看着玩就行，不必当真。`
      + `日柱这一旬的空亡在${b.xunKong.join('、')}（年柱的空亡另在${(b.xunKongYear || []).join('、')}）。空亡的意思是这两个字的力量打了折，`
      + `落在哪一柱，那一柱代表的关系就松一些，不是坏事，是提醒你别在那上面较真。`
      + `最后说句实在话：八字看的是「底子」，底子只决定你起手的牌，怎么打还得看你自己。`
      + '想听人生走向、财运官运、什么时候转运，去「命理解读」那一栏看，那是专门讲这个的。',
  });

  return out;
}
/* ==================== 六爻 ==================== */

/** 占问事由 → 用神六亲 */
const TOPIC_RULES = [
  { rel: '妻财', words: ['财', '钱', '生意', '买卖', '投资', '收入', '工资', '赚', '盈利', '债', '妻', '老婆', '女友', '女朋友', '对象'] },
  { rel: '官鬼', words: ['工作', '事业', '官职', '升职', '调动', '考试', '考编', '官司', '诉讼', '疾病', '生病', '丈夫', '老公', '男友', '男朋友'] },
  { rel: '父母', words: ['房', '屋', '文书', '合同', '证件', '车', '船', '学业', '读书', '长辈', '父母', '手续', '批复'] },
  { rel: '兄弟', words: ['朋友', '兄弟', '姐妹', '同辈', '合伙', '竞争', '借钱'] },
  { rel: '子孙', words: ['子女', '孩子', '儿', '女儿', '儿子', '下属', '医药', '健康', '解忧', '平安', '生育', '怀孕'] },
];

const JIE_TO_BRANCH = {
  立春: '寅', 惊蛰: '卯', 清明: '辰', 立夏: '巳', 芒种: '午', 小暑: '未',
  立秋: '申', 白露: '酉', 寒露: '戌', 立冬: '亥', 大雪: '子', 小寒: '丑',
};

/** 取做梦/起卦那天所属的月建地支（以节气为界） */
function monthBranchOf(date) {
  const y = date.getFullYear();
  const list = [
    ...solarTermsOfYear(y - 1), ...solarTermsOfYear(y), ...solarTermsOfYear(y + 1),
  ].filter((t) => JIE_TO_BRANCH[t.name]).sort((a, b) => a.jd - b.jd);
  const jd = gregorianToJD(
    date.getFullYear(), date.getMonth() + 1, date.getDate(),
    date.getHours(), date.getMinutes(),
  ) - 8 / 24;
  let cur = list[0];
  for (const t of list) { if (t.jd <= jd) cur = t; }
  return JIE_TO_BRANCH[cur.name];
}

/** 某五行在月建/日辰下的旺衰：1 得势，0 平，-1 受制 */
function strength(el, refEl) {
  if (refEl === el) return 1;
  if (GENERATES[refEl] === el) return 1;
  if (GENERATES[el] === refEl) return -1;
  if (CONTROLS[refEl] === el) return -1;
  return 0;
}

function pickYongshen(question) {
  const q = String(question || '');
  for (const rule of TOPIC_RULES) {
    if (rule.words.some((w) => q.includes(w))) return rule.rel;
  }
  return null;
}

export function readLiuyao(h) {
  const out = [];
  const dayBranch = h.dayGanZhi[1];
  const dayEl = BRANCH_WUXING[dayBranch];
  const monthBranch = monthBranchOf(new Date(h.castDate));
  const monthEl = BRANCH_WUXING[monthBranch];

  const shiYao = h.yaos.find((y) => y.isShi);
  const yingYao = h.yaos.find((y) => y.isYing);
  const moving = h.yaos.filter((y) => y.moving);

  // 一、这一卦的来头
  const guaCi = HEXAGRAM_TEXTS[h.name];
  out.push({
    title: '一、这一卦的来头',
    text:
      `你摇出的是【${h.name}】，${h.lower}在下、${h.upper}在上，归${h.palace}宫，属${h.palaceElement}。`
      + (guaCi ? `古辞说「${guaCi}」，讲的是这一卦的性子。` : '')
      + (h.palaceType ? `这个卦是${h.palaceType}。` : '')
      + (shiYao ? `代表你自己的是第 ${shiYao.pos} 爻（世爻），代表对方或所问之事的是第 ${yingYao ? yingYao.pos : h.yingYao} 爻（应爻）。` : '')
      + `起卦这一天是${h.dayGanZhi}日，${monthBranch}月，所以月建是${monthBranch}（${monthEl}）、日辰是${dayBranch}（${dayEl}）——`
      + '断卦主要就看这两样对卦里各爻的生克。',
  });

  // 二、动爻
  out.push({
    title: '二、哪里在动',
    text: (moving.length
      ? `这一卦有 ${moving.length} 个动爻，说明事情在变：`
        + moving.map((y) => `第 ${y.pos} 爻（${y.relative}${y.ganZhi}）是${y.label}，${GOD_SIX[y.god] || y.god}。`).join('')
        + `动了就会变，本卦${h.name}会变成【${h.changedName}】——`
        + '本卦说的是现在的情形，变卦说的是往后会走到哪儿，两卦合起来看才全。'
      : '这一卦六个爻都不动，叫「静卦」。静卦的意思是：事情眼下就是这个样子，'
        + '没有大的变数，按现在这个势头走。这时候重点看世应两爻的强弱。')
      + (h.xunKong && h.xunKong.length ? `另外，${h.xunKong.join('、')}这两个字这一旬是空亡——落在哪个六亲上，那件事的力量就打折。` : ''),
  });

  // 三、用神
  const rel = pickYongshen(h.question);
  if (rel) {
    const found = h.yaos.filter((y) => y.relative === rel);
    const hidden = (h.fushen || []).find((f) => f.relative === rel);
    let text = `你问的是「${h.question}」，按六爻的规矩，这类事看${rel}（${YONGSHEN_TOPICS[rel]}）。`;
    if (found.length) {
      const y = found[0];
      const st = strength(y.branchElement, monthEl) + strength(y.branchElement, dayEl);
      text += `卦里${rel}落在第 ${y.pos} 爻（${y.ganZhi}，${y.branchElement}）`
        + (y.moving ? '，而且是个动爻，说明这件事正在起变化' : '，是个静爻，说明眼下没大动静') + '。';
      text += st >= 1
        ? `拿月建${monthBranch}和日辰${dayBranch}一量，${rel}是得势的——这件事有底气，办得成。`
        : st <= -1
          ? `拿月建${monthBranch}和日辰${dayBranch}一量，${rel}是受制的——这件事眼下不占上风，急不得，等时机。`
          : `拿月建${monthBranch}和日辰${dayBranch}一量，${rel}不旺不弱——事情成不成，看你怎么使力。`;
      if (y.kong) text += `还有一点要留意：${rel}这一爻逢空亡，传统上叫「落空」，意思是看着有、实际未必到手，别把话说死。`;
      if (y.isShi) text += '它正好临世爻，说明这件事跟你自己关系最直接，你自己就是关键。';
      if (y.isYing) text += '它落在应爻上，说明主动权更多在对方那边。';
    } else if (hidden) {
      text += `这里有个要紧处：${rel}在卦里没露面，是藏在伏神里的（${hidden.ganZhi}）。`
        + '用神不上卦，传统叫「伏而不现」——意思是这件事眼下还没浮到台面上，'
        + '或者你还没真正够着它，得先把露出来的那部分理顺，伏的才出得来。';
    } else {
      text += `${rel}在卦里既没露面也没伏神，说明你问的这件事目前还没成形，先别急。`;
    }
    out.push({ title: '三、你问的这件事怎么样', text });
  } else {
    out.push({
      title: '三、你问的这件事怎么样',
      text: '你没写占问什么事，那这一卦就以世爻为主来看：'
        + (shiYao
          ? `世爻在第 ${shiYao.pos} 爻（${shiYao.ganZhi}，${shiYao.relative}），`
            + `${shiYao.kong ? '逢空亡，说明你自己心里还没底；' : ''}`
            + `${shiYao.moving ? '又是动爻，说明你正处在变动里；' : ''}`
            + `月建${monthBranch}、日辰${dayBranch}来量，它${strength(shiYao.branchElement, monthEl) + strength(shiYao.branchElement, dayEl) >= 0 ? '站得住' : '偏弱，宜守不宜进'}。`
          : '')
        + '想看得准，下次把要问的事写一句，比如「本月财运」「这份工作要不要接」。',
    });
  }

  // 四、结论
  const movingRel = moving.map((y) => y.relative);
  const badGods = moving.filter((y) => ['白虎', '玄武'].includes(y.god));
  out.push({
    title: '四、给个总的说法',
    text:
      `这一卦总体是：${moving.length ? '事情有变数，得看动静' : '事情平稳，按现状走'}。`
      + (moving.length && movingRel.length ? `动的是${[...new Set(movingRel)].join('、')}这几块，你要留意的地方就在这里。` : '')
      + (badGods.length ? `其中${badGods.map((y) => `第${y.pos}爻带${y.god}`).join('、')}，${GOD_SIX[badGods[0].god]}——这一块要多加小心。` : '动爻上没带特别凶的六神，没有明显的坑。')
      + '六爻看的是眼前这一件事的走向，事办完了这一卦也就过去了，'
      + '不像八字那样管一辈子。所以该拿主意就拿主意，别把卦当枷锁。',
  });

  return out;
}
/* ==================== 大六壬 ==================== */

const GENERAL_PLAIN = {
  贵人: '贵人是吉神之首，主有人搭救、有靠山',
  青龙: '青龙主财喜、升迁，是好事将近',
  六合: '六合主和合、成事，中间有人撮合',
  太常: '太常主平稳、衣食，日子过得去',
  天后: '天后主柔情、暗助，多与女性长辈有关',
  太阴: '太阴主暗中相助，事情办得不声不响',
  天空: '天空主虚耗、落空，说好的事容易变卦',
  勾陈: '勾陈主拖延、纠缠，事情卡在半路',
  螣蛇: '螣蛇主虚惊、反覆，多半是自己吓自己',
  朱雀: '朱雀主文书、口舌，消息来也伴着嘴仗',
  玄武: '玄武主暗昧、盗失，有说不清的事',
  白虎: '白虎主凶险、伤损，是最该提防的一个',
};

/** 三传某一步的吉凶分 */
function stepLuck(item) {
  const g = GENERAL_LUCK[item.general] ?? 0;
  const r = item.relation === '克我' ? -0.4 : item.relation === '我克' ? 0.3
    : item.relation === '生我' ? 0.5 : item.relation === '我生' ? -0.2 : 0;
  return g + r;
}

export function readLiuren(c) {
  const out = [];
  const items = c.sanChuan.items;

  // 一、起课
  out.push({
    title: '一、这一课是怎么起的',
    text:
      `你占的是${c.solarText}，${c.dayGanZhi}日${c.hourGanZhi}时。`
      + `六壬的起法叫「月将加时」：先把当月的月将${c.monthGeneral.name}（${c.monthGeneral.branch}）压在时辰${c.hourBranch}上，`
      + '再一圈一圈排下去，就得到天地盘；天地盘上取四课，四课里再取三传。'
      + `这一课用的是「${c.sanChuan.method}」取的传。`
      + (c.sanChuan.special ? `这一课有个特别之处：${c.sanChuan.special}。` : '')
      + `贵人落在${c.nobleBranch}（${c.daytime ? '昼' : '夜'}贵），旬空在${(c.xunKong || []).join('、') || '无'}。`,
  });

  // 二、三传
  out.push({
    title: '二、三传是事情的三步',
    text:
      '六壬断事，全看三传——初传管起因和眼下，中传管中间过程，末传管最后结果。'
      + `你这一课的三传是 ${c.sanChuan.text}。`
      + items.map((it) => `${it.pos}是${it.branch}（${it.element}），${REL_WORD[it.relation] || ''}${it.general ? `，配${it.general}——${GENERAL_PLAIN[it.general] || ''}` : ''}。`).join(''),
  });

  // 三、吉凶
  const scores = items.map(stepLuck);
  const sum = scores.reduce((a, b) => a + b, 0);
  const first = scores[0];
  const last = scores[scores.length - 1];
  out.push({
    title: '三、三传连起来看',
    text:
      `初传${first >= 0.4 ? '是顺的，事情起步不费劲' : first <= -0.4 ? '偏涩，一开始就有点顶牛' : '平平，起步不好不坏'}；`
      + `末传${last >= 0.4 ? '收得好，结局对你有交代' : last <= -0.4 ? '收得不好，结局要打个折扣' : '收得平，不算出彩但也不难看'}。`
      + (sum >= 1 ? '三传连起来，整体是往好的方向走的，可以放手去做。'
        : sum <= -1 ? '三传连起来，整体是往下走的多，宜守不宜进，等这一阵过去再说。'
          : '三传吉凶相抵，属于普普通通的一课——做成做不成，更多看你自己使多大劲。')
      + '古话说「三传吉则百事顺，三传凶则百事乖」，说的就是这个道理。',
  });

  // 四、结论
  out.push({
    title: '四、给个总的说法',
    text:
      '六壬和六爻一样，问的是一件事，不是一辈子。这一课说完了，事情该怎么推还是怎么推。'
      + '而且六壬的强项是细节——老手还会细看四课里每一课的上下神、天将的顺逆、空亡落在哪一传。'
      + '这里只把三传的主线讲清楚，够你判断大方向了。'
      + '真到要做决定的时候，还是那句话：卦是参谋，不是司令。',
  });

  return out;
}

/* ==================== 紫微斗数 ==================== */

function palaceName(n) {
  return n.endsWith('宫') ? n : n + '宫';
}

const PALACE_PLAIN = {
  命宫: '你这个人本身的性情', 兄弟: '兄弟姐妹与同辈', 夫妻: '配偶与感情',
  子女: '子女与晚辈', 财帛: '赚钱的方式与理财', 疾厄: '身体健康',
  迁移: '在外的发展与走动', 交友: '朋友、同事与人脉', 官禄: '事业与工作',
  田宅: '房产家业', 福德: '心境、嗜好与福气', 父母: '父母与长辈',
};

export function readZiwei(z) {
  const out = [];
  const find = (n) => z.palaces.find((p) => p.name === n);
  const ming = find('命宫');
  const shen = z.palaces.find((p) => p.isShen);
  const starText = (p) => (p && p.mainStars && p.mainStars.length
    ? p.mainStars.join('、')
    : null);

  // 一、命宫身宫
  const mingStars = starText(ming);
  out.push({
    title: '一、你是个什么性子',
    text:
      `你在${z.lunarText.replace(/^农历/, '')}出生，${z.yearGanZhi}年，属${z.juName}。`
      + `命宫落在${z.mingBranch}宫${mingStars ? `，主星是${mingStars}` : '，命宫没有主星（叫「命无正曜」，要看对宫来定）'}。`
      + (mingStars
        ? mingStars.split('、').map((s) => STAR_CHARACTER[s] ? `先说${s}：${STAR_CHARACTER[s]}。` : '').join('')
        : '命宫空着的时候，性子多随环境走，看旁边对宫的星来定。')
      + (shen ? (shen.name === '命宫' ? '身宫与命宫同宫——这种人一生自己拿主意，不太靠别人，性子也比一般人执拗。' : `身宫落在${palaceName(shen.name)}（${shen.branch}），身宫管后半生和你真正用力最多的地方。`) : ''),
  });

  // 二、事业与财帛
  const guan = find('官禄');
  const cai = find('财帛');
  out.push({
    title: '二、事业和钱',
    text:
      `官禄宫在${guan.branch}，${starText(guan) ? `主星是${starText(guan)}——官禄宫看的是你这辈子干什么最顺手。` : '没有主星，事业上属于自己摸索型。'}`
      + (starText(guan) ? starText(guan).split('、').map((s) => STAR_CHARACTER[s] ? `${s}：${STAR_CHARACTER[s]}。` : '').join('') : '')
      + `财帛宫在${cai.branch}，${starText(cai) ? `主星是${starText(cai)}——财帛宫看的是你怎么来钱、怎么花钱，不是看你有多少钱。` : '没有主星，钱财上起伏不大。'}`
      + (starText(cai) ? starText(cai).split('、').map((s) => STAR_CHARACTER[s] ? `${s}：${STAR_CHARACTER[s]}。` : '').join('') : ''),
  });

  // 三、夫妻宫
  const qi = find('夫妻');
  out.push({
    title: '三、感情与婚姻',
    text:
      `${qi.name}宫在${qi.branch}，${starText(qi) ? `主星是${starText(qi)}。` : '没有主星，感情上受对方影响比较大。'}`
      + (starText(qi) ? starText(qi).split('、').map((s) => STAR_CHARACTER[s] ? `${s}：${STAR_CHARACTER[s]}。` : '').join('') : '')
      + '紫微看感情，不只看夫妻宫，还要拉上它的三方四正一起看，这里说个大概。'
      + '真要看婚期、看对方什么样，得把大限和小限一起排进来。',
  });

  // 四、四化
  const sihua = z.sihua || [];
  out.push({
    title: '四、四化落在哪',
    text:
      '四化是紫微里最要紧的一环：化禄是好处、化权是权力、化科是名声、化忌是麻烦。'
      + sihua.map((s) => `${s.star}${s.type}落在${palaceName(s.palace)}（${PALACE_PLAIN[s.palace] || s.palace}）`).join('；') + '。'
      + (sihua.some((s) => s.type === '化忌')
        ? `其中化忌落在${palaceName(sihua.find((s) => s.type === '化忌').palace)}——这块是你这辈子要花力气磨的地方，绕不过去，但磨过了就是本事。`
        : '')
      + (sihua.some((s) => s.type === '化禄')
        ? `化禄落在${palaceName(sihua.find((s) => s.type === '化禄').palace)}，这一块是你的顺风口，好事往往从这儿来。`
        : ''),
  });

  // 五、大限
  const withDaxian = z.palaces.filter((p) => p.daxian).slice(0, 12);
  out.push({
    title: '五、什么时候走运',
    text:
      `紫微把一生按十年一段分，叫「大限」，${z.daxianForward ? '顺行' : '逆行'}。`
      + `命宫这一段是${ming.daxian}。`
      + `往后依次是：${withDaxian.map((p) => `${p.daxian}在${p.name}`).join('、')}。`
      + '大限走到哪一宫，那一宫的事就是你那十年的主题——比如走到官禄宫那十年，事业上的事就多。'
      + '哪一段好不好，还要看那一段的星曜组合，图上十二宫的颜色只是底色。',
  });

  return out;
}
/* ==================== 奇门遁甲 ==================== */

const SANQI = { 乙: '日奇', 丙: '月奇', 丁: '星奇' };

export function readQimen(q) {
  const out = [];
  const palaces = q.palaces || [];
  const byDoor = (list) => palaces.filter((p) => list.includes(p.door));

  // 一、定局
  out.push({
    title: '一、这一局怎么定的',
    text:
      `你排的是${q.solarText}，${q.dayGanZhi}日${q.hourGanZhi}时。`
      + `奇门第一步是定局：看这个时辰落在哪个节气、是上元中元还是下元，`
      + `于是定出【${q.juName}】（${q.termName}·${q.yuan}，${q.dunType}）。`
      + `旬首是${q.xunShou}（${q.xunShouStem}），旬空在${(q.xunKong || []).join('、') || '无'}。`
      + '局数定下来，地盘的三奇六仪按戊己庚辛壬癸丁丙乙的顺序摆好，'
      + (q.dunType === '阳遁' ? '阳遁顺着排' : '阴遁倒着排') + '，这是一切的基础。',
  });

  // 二、值符值使
  out.push({
    title: '二、这一局谁说了算',
    text:
      `奇门里，一个时辰有一个「值符」和一个「值使」，相当于这一局的当家人。`
      + `你这一局的值符是${q.zhifuStar}，值使是${q.zhishiDoor}。`
      + `值符${q.zhifuStar}——${STAR_QI[q.zhifuStar] || ''}。`
      + `值使${q.zhishiDoor}——这一局的行事主调就在这道门上。`
      + '办事的时候先看它们落在哪一宫，那一宫就是这一局的枢纽。',
  });

  // 三、吉门方位
  const good = byDoor(DOOR_GOOD);
  const bad = byDoor(DOOR_BAD);
  out.push({
    title: '三、哪个方位好、哪个方位避',
    text:
      (good.length
        ? `这一局里吉门有三处：${good.map((p) => `${p.name}（${p.direction}）是${p.door}，配${p.star}`).join('；')}。`
          + `要办正事、要谈事、要出门，往这几个方位走，或者把座位、门口朝那个方向。`
          + `其中${good[0].door}在${good[0].name}最好——${good[0].door === '开门' ? '开门主开创新局、求职办事都利' : good[0].door === '休门' ? '休门主休整、和缓，谈事顺、求人易' : '生门主生财、生机，求财置业最宜'}。`
        : '这一局没排出明显的吉门，办事以稳为主。')
      + (bad.length
        ? `要避开的是${bad.map((p) => `${p.name}的${p.door}`).join('、')}——`
          + `${bad[0].door === '死门' ? '死门主死气、停滞，凡事不宜' : bad[0].door === '惊门' ? '惊门主惊恐、口舌，容易生是非' : '伤门主伤损、争斗，容易起冲突'}，`
          + '这些方位就别去了。'
        : '这一局也没有特别凶的门。'),
  });

  // 四、三奇
  const qi = palaces
    .filter((p) => p.skyStem && SANQI[p.skyStem])
    .map((p) => `${p.skyStem}（${SANQI[p.skyStem]}）在${p.name}${p.direction}`);
  out.push({
    title: '四、三奇落在哪',
    text: (qi.length
      ? `三奇是乙、丙、丁，奇门里看作最灵的三样，走到哪儿哪儿就带贵气。这一局：${qi.join('；')}。`
        + '要办大事、要找人帮忙，往三奇所在的方位去，比别处顺。'
      : '这一局三奇不显，属于平常之局，按常规来就行。')
      + '另外九星也各管一路：' + [...new Set(palaces.map((p) => p.star))].slice(0, 9)
        .map((s) => STAR_QI[s] ? `${s}${STAR_QI[s]}` : '').filter(Boolean).slice(0, 4).join('；') + '。',
  });

  // 五、结论
  out.push({
    title: '五、给个总的说法',
    text:
      `这一局是${q.juName}，值符${q.zhifuStar}、值使${q.zhishiDoor}。`
      + (good.length
        ? `要用事，挑${good[0].door}所在的${good[0].direction}方位，${good[0].god ? `那个宫还配着${good[0].god}，` : ''}是这一局最顺的地方。`
        : '')
      + '奇门跟别的术数不一样：它不主要用来「算」，主要是用来「用」——'
      + '同一个时辰，方位选对了就顺，选错了就顶。所以叫择时择方。'
      + '真要拿它办事，还得细看用神落宫、门星神的组合，这里给的是大方向。',
  });

  return out;
}