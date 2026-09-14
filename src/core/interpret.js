/**
 * 命理解读引擎：把八字盘翻译成对人生走向的论断。
 *
 * 覆盖：
 *  1. 命局类型判定（财命 / 禄命 / 官命 / 印命 / 食伤命 / 比劫命）
 *  2. 格局与日主强弱、用神喜忌
 *  3. 财富、官运、事业、婚姻、健康的分项评分与论据
 *  4. 一生运势曲线（大运逐步吉凶）
 *  5. 转运时机：何时起运、当前大运、下一个转运点的具体年份
 */

import { STEMS, BRANCHES, STEM_WUXING, STEM_YANG, BRANCH_WUXING, BRANCH_HIDDEN_STEMS } from './lunar.js';
import { isChong, he6Of, isHai, SANHE } from './relations.js';

const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/** 十神分类（把细分十神归为五类） */
const GOD_GROUP = {
  比肩: '比劫', 劫财: '比劫',
  食神: '食伤', 伤官: '食伤',
  偏财: '财', 正财: '财',
  偏官: '官杀', 正官: '官杀',
  偏印: '印', 正印: '印',
};

/** 日主与十神的生克关系，用于判定某十神对日主是「扶」还是「耗」 */
function relationToDayMaster(dayElement, element) {
  if (dayElement === element) return '同类';
  if (GENERATES[element] === dayElement) return '生我';
  if (GENERATES[dayElement] === element) return '我生';
  if (CONTROLS[element] === dayElement) return '克我';
  if (CONTROLS[dayElement] === element) return '我克';
  return '—';
}

/** 干支五行力量（含藏干），返回各十神类别的加权值 */
function godGroupScores(pillars, dayElement) {
  const scores = { 比劫: 0, 食伤: 0, 财: 0, 官杀: 0, 印: 0 };
  const weights = [0.9, 1.2, 1.4, 1.0]; // 年 月 日 时
  const hiddenWeights = [0.6, 0.3, 0.1];

  pillars.forEach((p, i) => {
    const w = weights[i] ?? 1;
    const stemWx = STEM_WUXING[p.stem];
    const rel = relationToDayMaster(dayElement, stemWx);
    const group = REL_TO_GROUP[rel];
    if (group) scores[group] += w;

    BRANCH_HIDDEN_STEMS[p.branch].forEach((h, k) => {
      const hRel = relationToDayMaster(dayElement, STEM_WUXING[h]);
      const hGroup = REL_TO_GROUP[hRel];
      if (hGroup) scores[hGroup] += w * (hiddenWeights[k] ?? 0.1);
    });
  });
  return scores;
}

/** 十神的短标签（用于句中，避免句子过长） */
const GOD_SHORT = {
  比劫: '自己人',
  食伤: '才华',
  财: '钱财',
  官杀: '名位',
  印: '学问',
};

/** 十神的通俗说法，用于白话表述 */
const GOD_PLAIN = {
  比劫: '自己人和同辈（兄弟、朋友、合伙人）',
  食伤: '才华和嘴巴（手艺、创意、表达）',
  财: '钱财和实务（挣钱的路子、管事的本事）',
  官杀: '位置和压力（名分、职位、约束、责任）',
  印: '学问和靠山（知识、名声、贵人、长辈）',
};

const SHENG_WX = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const LABEL4 = ['年', '月', '日', '时'];

const REL_TO_GROUP = {
  同类: '比劫',
  我生: '食伤',
  我克: '财',
  克我: '官杀',
  生我: '印',
};

/** 命局类型判定 */
const TYPE_INFO = {
  财: {
    name: '财命',
    short: '财',
    desc: '以财星为用，一生与钱财缘分深',
    keywords: ['重实利', '善经营', '得财有道'],
  },
  官杀: {
    name: '官命',
    short: '官',
    desc: '以官杀为用，宜走体制、管理、名位之路',
    keywords: ['有威权', '守规矩', '宜掌权'],
  },
  印: {
    name: '印命',
    short: '印',
    desc: '以印星为用，靠学识、文书、名望、贵人立身',
    keywords: ['近文教', '得庇荫', '名声先于财'],
  },
  食伤: {
    name: '食伤命',
    short: '食伤',
    desc: '以食伤为用，靠才艺、技术、口才、创造取利',
    keywords: ['有才艺', '善表达', '以技生财'],
  },
  比劫: {
    name: '禄命',
    short: '禄',
    desc: '以比劫为用，自立自强，人脉即资源',
    keywords: ['自力更生', '重朋友', '宜合伙'],
  },
};

/**
 * 判定命局类型。
 * 规则：取「用神」所属的十神类别为主命局；若用神五行对应多个类别，
 * 取命局中力量最强、且位置最靠近日主者。
 */
function judgeLifeType(pillars, dayMaster, scores) {
  const favor = dayMaster.favor || [];
  // 用神五行 -> 十神类别
  const dayEl = dayMaster.element;
  const candidates = {};
  favor.forEach((el) => {
    const rel = relationToDayMaster(dayEl, el);
    const g = REL_TO_GROUP[rel];
    if (g) candidates[g] = (candidates[g] || 0) + (scores[g] || 0);
  });

  // 命中最强的一类（反映客观格局）
  const strongest = Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0];
  // 用神指向的类别（反映人生着力方向）
  let mainGroup = Object.keys(candidates).sort((a, b) => candidates[b] - candidates[a])[0];
  if (!mainGroup) mainGroup = strongest;
  // 若用神类别力量极弱（占比不足 8%）而另有类别极强（超过 30%），
  // 则以强神定「格局主体」，并在结论中同时标出用神，避免论断与盘面脱节。
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  const weakestFavorShare = (scores[mainGroup] || 0) / totalScore;
  const strongestShare = (scores[strongest] || 0) / totalScore;
  // 强神明显压制（占比 > 32% 且为用神类别的 1.6 倍以上）时，以强神定格局主体
  const byStrongest = strongestShare > 0.32
    && (scores[strongest] || 0) > (scores[mainGroup] || 0) * 1.6;
  if (byStrongest) mainGroup = strongest;

  const info = TYPE_INFO[mainGroup];
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;

  return {
    group: mainGroup,
    favorGroup: Object.keys(candidates).sort((a, b) => candidates[b] - candidates[a])[0] || mainGroup,
    byStrongest,
    strongest,
    name: info.name,
    short: info.short,
    desc: info.desc,
    keywords: info.keywords,
    scores,
    percent: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, (v / total) * 100])),
  };
}

/** 单柱（大运或流年）对命局的吉凶评分 */
function scorePillarForLuck(pillar, dayMaster, scores, natalPillars) {
  // 兼容 {name:'甲子'} 与 {stem:'甲',branch:'子'} 两种传参
  const stem = pillar.stem ?? (pillar.name ? pillar.name[0] : '');
  const branch = pillar.branch ?? (pillar.name ? pillar.name[1] : '');
  const dayEl = dayMaster.element;
  const favorable = new Set(dayMaster.favor || []);
  const unfavorable = new Set(dayMaster.avoid || []);

  const stemEl = STEM_WUXING[stem];
  const branchEl = BRANCH_WUXING[branch];
  const hidden = BRANCH_HIDDEN_STEMS[branch].map((h) => STEM_WUXING[h]);

  let score = 0;
  const reasons = [];
  const stemW = 0.8;   // 天干主外显，权重稍轻
  const branchW = 1.0; // 地支主根气，权重稍重

  if (favorable.has(stemEl)) { score += stemW; reasons.push(`天干${stem}${stemEl}为喜`); }
  if (unfavorable.has(stemEl)) { score -= stemW; reasons.push(`天干${stem}${stemEl}为忌`); }
  if (favorable.has(branchEl)) { score += branchW; reasons.push(`地支${branch}${branchEl}为喜`); }
  if (unfavorable.has(branchEl)) { score -= branchW; reasons.push(`地支${branch}${branchEl}为忌`); }

  // 藏干辅助（本气较重、余气较轻）
  const hiddenScore = hidden.reduce((a, el, i) => {
    const w = [0.3, 0.15, 0.08][i] ?? 0.08;
    if (favorable.has(el)) return a + w;
    if (unfavorable.has(el)) return a - w;
    return a;
  }, 0);
  score += hiddenScore;

  // ── 与命局地支的刑冲合害 ──
  // 大运/流年这一个字，落进命局后会被合、被冲，它本身的力量和性质都会变。
  // 例如「乙巳」的巳若与命局申六合、与丑半合，火会被合去化金，未必还是帮身之火。
  if (natalPillars && natalPillars.length === 4) {
    const natalBranches = natalPillars.map((x) => x.branch);
    const monthEl = BRANCH_WUXING[natalBranches[1]];
    const natalEls = natalPillars.map((x) => STEM_WUXING[x.stem]);
    const canTransform = (el) => monthEl === el || SHENG_WX[monthEl] === el || natalEls.includes(el);

    natalBranches.forEach((nb, i) => {
      if (isChong(branch, nb)) {
        score -= 0.45;
        reasons.push(`${branch}冲命局${LABEL4[i]}支${nb}（主变动）`);
      }
      const he = he6Of(branch, nb);
      if (he) {
        if (canTransform(he)) {
          if (favorable.has(he)) { score += 0.6; reasons.push(`${branch}与${LABEL4[i]}支${nb}合化${he}（喜）`); }
          else if (unfavorable.has(he)) { score -= 0.55; reasons.push(`${branch}与${LABEL4[i]}支${nb}合化${he}（忌）`); }
        } else {
          score -= 0.15;
          reasons.push(`${branch}与${LABEL4[i]}支${nb}相合（牵绊）`);
        }
      }
      if (isHai(branch, nb)) {
        score -= 0.15;
        reasons.push(`${branch}与${LABEL4[i]}支${nb}相害`);
      }
    });

    SANHE.forEach((g) => {
      if (!g.branches.includes(branch)) return;
      const all = new Set([...natalBranches, branch]);
      const have = g.branches.filter((b) => all.has(b));
      const full = have.length === 3;
      const half = have.length === 2 && have.includes(g.wang);
      if (!full && !half) return;
      const w = full ? 0.8 : 0.5;
      if (favorable.has(g.element)) { score += w; reasons.push(`${have.join('')}${full ? '三合' : '半合'}${g.element}局（喜）`); }
      else if (unfavorable.has(g.element)) { score -= w; reasons.push(`${have.join('')}${full ? '三合' : '半合'}${g.element}局（忌）`); }
    });
  }

  // 十神倾向加成
  const godOf = (el) => REL_TO_GROUP[relationToDayMaster(dayEl, el)];
  const stemGod = godOf(stemEl);
  const branchGod = godOf(branchEl);

  return {
    score,
    stemGod,
    branchGod,
    reasons,
    // 分档阈值：喜神两类、忌神三类，若不把「平」的区间放宽，
    // 结果会系统性偏悲观（多数大运被打成凶），与「大多数十年本就平常」的
    // 传统看法不符。此处按 吉:平:凶 ≈ 2:5:3 校准，属量化近似。
    level: score >= 1.5 ? '大吉' : score >= 0.75 ? '吉' : score > -0.9 ? '平' : score > -1.9 ? '不佳' : '凶',
  };
}

/** 逐年扫描未来若干年，找转运点 */
function findTurningPoints(analysis, currentYear, horizons = 10) {
  const { dayMaster, luck } = analysis;
  const points = [];

  luck.pillars.forEach((lp) => {
    const s = scorePillarForLuck(lp, dayMaster, analysis.type.scores, analysis.pillars);
    lp.score = s.score;
    lp.level = s.level;
    lp.reasons = s.reasons;
    lp.godGroup = s.stemGod;
  });

  // 找当前所处大运
  const ageAt = (year) => year - analysis.input.year;
  const curLuck = luck.pillars.find((lp) => ageAt(currentYear) >= lp.startAge && ageAt(currentYear) < lp.startAge + 10)
    || luck.pillars[luck.pillars.length - 1];

  // 未来 10 年内的大运切换点
  luck.pillars.forEach((lp, i) => {
    if (lp.startYear > currentYear && lp.startYear <= currentYear + horizons) {
      points.push({
        year: lp.startYear,
        age: lp.startAge,
        pillar: lp.name,
        type: '大运交接',
        level: lp.level,
        score: lp.score,
        note: `进入${lp.name}运，${lp.level}之运`,
      });
    }
  });

  // 流年：找未来十年中吉神最强的年份
  const yearScores = [];
  for (let y = currentYear; y <= currentYear + horizons; y += 1) {
    const gzIdx = ((y - 1984) % 60 + 60) % 60;
    const stem = STEMS[gzIdx % 10];
    const branch = BRANCHES[gzIdx % 12];
    const s = scorePillarForLuck({ stem, branch }, dayMaster, analysis.type.scores, analysis.pillars);
    yearScores.push({ year: y, stem, branch, name: stem + branch, ...s });
  }
  const ranked = yearScores.slice().sort((a, b) => b.score - a.score);
  // 取前若干名，但保证是未来 10 年内且分数确实偏吉者
  const best = ranked.filter((y) => y.score > 0.5).slice(0, 3);
  const worst = ranked.slice().reverse().filter((y) => y.score < -0.5).slice(0, 2);

  return {
    currentLuck: curLuck,
    points,
    best: best.length ? best : ranked.slice(0, 1),
    worst,
    yearScores: yearScores.slice().sort((a, b) => a.year - b.year),
  };
}

/** 分项评分：财富、官运、事业、婚姻、健康、寿元 */
function subScores(type, scores, dayMaster, pillars) {
  const pct = type.percent;
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  const strong = dayMaster.verdict !== '偏弱';
  const balanced = dayMaster.verdict === '中和';

  const clamp = (v) => Math.max(5, Math.min(98, Math.round(v)));

  // 财富：财星力量 + 日主能否担财 + 食伤生财
  const wealthRaw = (pct.财 * 1.5) + (pct.食伤 * 0.55) + (strong ? 12 : 0) + (balanced ? 6 : -4);
  const 财富 = clamp(wealthRaw);

  // 官运：官杀力量 + 日主能否任官 + 印星护官
  const powerRaw = (pct.官杀 * 1.6) + (pct.印 * 0.5) + (strong ? 10 : -3) + (balanced ? 5 : -3);
  const 官运 = clamp(powerRaw);

  // 事业：看格局纯度与用神得力
  const careerRaw = 42 + (pct[type.group] * 0.6) + (strong ? 8 : 0) + (balanced ? 6 : 0);
  const 事业 = clamp(careerRaw);

  // 婚姻：夫妻宫（日支）受冲克与否
  const dayBranch = pillars[2].branch;
  const spouseEl = BRANCH_WUXING[dayBranch];
  const spouseRel = relationToDayMaster(dayMaster.element, spouseEl);
  const marriageBonus = ['我克', '生我', '同类'].includes(spouseRel) ? 14 : -6;
  const 婚姻 = clamp(50 + marriageBonus + (pct.印 * 0.3) - (pct.比劫 * 0.25));

  // 健康：五行偏枯程度
  const vals = Object.values(pct);
  const spread = Math.max(...vals) - Math.min(...vals);
  const 健康 = clamp(88 - spread * 0.9 - (strong ? 0 : 6));

  // 晚运：时柱（子女宫、晚年）吉凶
  const hourEl = STEM_WUXING[pillars[3].stem];
  const hourFavor = (dayMaster.favor || []).includes(hourEl);
  const 晚运 = clamp(48 + (hourFavor ? 16 : -8) + (pct.印 * 0.35));

  return { 财富, 官运, 事业, 婚姻, 健康, 晚运 };
}

/**
 * 生成对命主的自然语言论断。
 * 语气：白话、当面口述、短句为先，尽量少用术语；必需的术语随讲随解释。
 */
function narrate(analysis) {
  const { type, dayMaster, pillars, luck, sub, turning, input } = analysis;
  const weak = dayMaster.verdict === '偏弱';
  const strong = dayMaster.verdict === '偏旺';
  const favor = dayMaster.favor.join('、');
  const avoid = dayMaster.avoid.join('、');

  // 五行通俗对应，便于说人话
  const WX_WORDS = {
    木: '木——东方、青色、草木、文教、成长类的事',
    火: '火——南方、红色、光明、能源、传播类的事',
    土: '土——中央、黄色、土地房产、稳扎稳打的行业',
    金: '金——西方、白色、金属、金融、器械、纪律性的行当',
    水: '水——北方、黑色、流动、贸易、智慧、交流类的事',
  };

  const paras = [];

  // ── 一、开门见山 ──
  paras.push({
    title: '一、先说你是个什么命',
    text:
      `你出生在${analysis.solarDate}，八字是 ${analysis.baziText}。`
      + `你的日主是${dayMaster.stem}${dayMaster.element}，生在${analysis.monthTerm}这个月。`
      + `简单说，你是一块「${dayMaster.element}」，而这股${dayMaster.element}的力气${weak ? '不太够，得靠外面帮衬' : strong ? '很足，劲头大、主意正' : '不多不少，刚刚好，进退都有分寸'}。`
      + `整体格局我把它定成【${type.name}】。`
      + (type.group === '财' ? '说白了，你这辈子跟「钱」这件事缘分最深，看见机会就想动手，是个奔实利的人。'
        : type.group === '官杀' ? '说白了，你跟「名分、位子、规矩」缘分最深，适合在有层级、有规矩的地方往上走。'
        : type.group === '印' ? '说白了，你跟「学问、名声、贵人」缘分最深，靠脑子和人脉吃饭，名声往往比钱来得早。'
        : type.group === '食伤' ? '说白了，你跟「手艺、才华、表达」缘分最深，靠本事和嘴吃饭，有本事就不怕没饭吃。'
        : '说白了，你是个自立自强的人，靠自己和朋友打天下，人脉就是你的本钱。')
      + `你的用神是${favor}——这就是你的顺风口，凡事往这个方向靠，省力；反过来，${avoid}是你的顶风，别硬顶。`,
  });

  // ── 二、性格与格局 ──
  const topThree = Object.entries(type.percent).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const sameAsFavor = !type.strongest || type.strongest === type.favorGroup;

  paras.push({
    title: '二、你的性格，和你的本钱',
    text:
      `你命里占得最多的三样，是${topThree.map(([k, v]) => `${GOD_SHORT[k] || k}（${v.toFixed(0)}%）`).join('、')}。`
      + (sameAsFavor
        ? '这三样跟你该走的路是一码事，说明你天生就适合干这一行——格局清爽，认准方向往前走就行，不用来回纠结。'
        : `这里有个关键，你得听明白：你命里最强的是${GOD_SHORT[type.strongest] || type.strongest}，这是你天生的本钱；可你该走的路（用神）在${GOD_SHORT[type.favorGroup] || type.favorGroup}。`
          + '本钱是你顺手就会做的事，该走的路才是你越走越顺的方向。这俩不是一回事，别混了。'
          + '很多人吃亏就吃在这儿——一辈子拿着本钱在错的方向上使劲，越使劲越累。')
      + (weak
        ? '还有一点得跟你说清楚：你力气偏弱。意思是，你不是那种单枪匹马能横扫千军的人。你的本事要靠借力——找对平台、跟对人、抱好大腿，成事的速度会快得多；自己硬扛，事倍功半。'
        : strong
          ? '你力气偏旺，好处是能扛事、精力足、有主见；坏处是容易一意孤行、听不进话。所以你得给自己找个出口——把劲头用在做事上、用在专业上，别用在跟人较劲上。'
          : '你力气不偏不倚，这是好底子。进退有度、遇事稳得住，不容易走极端，属于能长跑的命。')
      + `顺便说一句这几样各指什么：${topThree.map(([k]) => `${GOD_SHORT[k]}——${GOD_PLAIN[k]}`).join('；')}。`,
  });

  // ── 三、钱 ──
  paras.push({
    title: '三、你这辈子能挣多少钱',
    text:
      `先给结论：${sub.财富 >= 70 ? '钱这条路，你走得通' : sub.财富 >= 45 ? '钱这条路，走稳当点没问题' : '钱这条路，得靠手艺慢慢攒'}。财富打分 ${sub.财富} 分（100 分制，50 分算中等）。`
      + `你命里财星占 ${type.percent.财.toFixed(0)}%，${type.percent.财 >= 25 ? '财星挺旺，说明一辈子不缺赚钱的机会——愁的不是没路子，是怎么留住' : type.percent.财 >= 13 ? '财星不多不少，属于正财的命：钱从正路来，上班也好做生意也好，别指望横财' : '财星偏轻，说明光靠「机会」发财不现实，得靠一门手艺或一份稳当的工作慢慢积累'}。`
      + (weak && type.percent.财 >= 20
        ? '但有件事要提醒你：你力气弱、财星重，这叫「财多身弱」。翻译过来就是——机会一大把，可你接不住。看着眼馋，真上手了反而容易被拖垮。对策就两个字：借力。要么找人合作，要么借平台的势，千万别一个人去扛大摊子。'
        : strong
          ? '好在你力气足，担得起财。机会来了敢下手，也扛得住，这是能攒下家底的结构。'
          : '你自身的力气和财星比较匹配，属于能挣也能守的类型。')
      + (type.percent.比劫 >= 25
        ? '另外还得提一句：你命里「兄弟朋友」这股力量偏重。好处是人缘旺、帮手多；坏处是钱容易被身边人分走。所以给人作保、借钱出去、跟朋友合伙做没章程的生意——这三件事尽量别碰。'
        : '你命里比劫不重，钱不容易被别人分掉，挣到手的能留住。')
      + (type.group === '比劫'
        ? '至于你是哪种命——你是「禄命」。禄命的意思是不靠祖上、不靠横财，靠自己一双手挣饭吃。这种人早年辛苦，但一旦立住脚就稳当，一辈子不愁衣食。'
        : type.group === '财'
          ? '至于你是哪种命——你是「财命」。财命的人对钱有天生的嗅觉，适合自己张罗事。但记住：财命不等于大富，得看你担不担得起，也得看运来没来。'
          : `至于你是哪种命——你是「${type.name}」。这类命的特点是钱不是主线，${type.group === '官杀' ? '名分和位子才是主线，钱往往跟着位子来' : type.group === '印' ? '名声和学问才是主线，钱往往跟着名声来' : '才华和本事才是主线，钱跟着手艺来'}。`),
  });

  // ── 四、官运 ──
  paras.push({
    title: '四、你有没有当官的运',
    text:
      `直接回答：${sub.官运 >= 70 ? '有，而且是实打实的官运' : sub.官运 >= 55 ? '有一点，但不算旺，得看走什么运' : sub.官运 >= 42 ? '平平，不必强求' : '不太有，这条路你走起来会别扭'}。官运打分 ${sub.官运} 分。`
      + `你命里官星占 ${type.percent.官杀.toFixed(0)}%，印星占 ${type.percent.印.toFixed(0)}%。`
      + (sub.官运 >= 70
        ? '官星有力、又有印来护着，这是标准的「有官运」结构。适合考编、进体制、进大公司走管理线，名和位能一起拿。'
        : sub.官运 >= 55
          ? '官星不算弱也算不上强，属于「有缘但不算大」的级别。守住眼前的位置没问题，想往上冲得看运气配合。'
          : sub.官运 >= 42
            ? '官星不多不少，属于干好本职没问题、往上走比较费劲的类型。与其挤破头求升迁，不如把专业做深。'
            : '官星偏轻，跟编制、职位这类事缘分浅。你更适合靠手艺、靠生意、靠专业吃饭；硬往体制里挤，反而憋屈。')
      + (type.percent.官杀 >= 28 && weak
        ? '这里有个坑要提醒你：你官星重、身子弱，这叫「官杀攻身」。直白讲就是——规矩多、领导压、压力大，你容易被人管得喘不上气。化解的办法不是硬顶，是「化」：多学东西、多结贵人，让你的能力和人脉替你分担。'
        : '')
      + (type.percent.伤官 >= 18 && type.percent.官杀 >= 15
        ? '还有个特点：你命里「嘴上不饶人」和「规矩」这两股力量撞上了，老话叫「伤官见官」。意思是性子直、看不得不合理的事，容易跟领导或规矩起冲突。这不是坏事，但你得挑环境——去宽松点的地方，或者靠专业说话，比在死板的单位里熬要舒坦得多。'
        : ''),
  });

  // ── 五、一生走势 ──
  const good = luck.pillars.filter((lp) => ['大吉', '吉'].includes(lp.level));
  const poor = luck.pillars.filter((lp) => ['凶', '不佳'].includes(lp.level));
  const lvWord = (lv) => (lv === '大吉' ? '最好' : lv === '吉' ? '不错' : lv === '平' ? '一般' : lv === '不佳' ? '偏弱' : '较差');

  paras.push({
    title: '五、这辈子哪几段最顺',
    text:
      `你的大运是${luck.direction}的，${luck.startAgeText}开始起运。大运就是人生的十年一段，我把你十段都算出来了：`
      + luck.pillars.map((lp) => `${lp.startAge}到${lp.startAge + 9}岁行${lp.name}运，${lvWord(lp.level)}`).join('；')
      + '。'
      + (good.length
        ? `其中 ${good.map((lp) => `${lp.startAge}到${lp.startAge + 9}岁（${lp.name}运）`).join('、')} 是你这辈子最得劲的阶段，该出手的时候千万别缩着——事业、房子、成家，都往这几段里安排。`
        : '说句实话，你这一生没有特别旺的大运，属于稳扎稳打的类型。好处是不容易大起大落，坏处是想一步登天很难。把节奏放稳，反而走得远。')
      + (poor.length
        ? `而 ${poor.map((lp) => `${lp.startAge}到${lp.startAge + 9}岁`).join('、')} 这几段，是运程卡壳的时候。不是说你倒霉，是提醒你：这几段别冒进、别大额投入、别做重大决定。守着、学着、养着，等运过去。`
        : '而且你一生大运里没有特别凶的段落，这是好事，说明一路走得比较平顺。'),
  });

  // ── 六、转运（核心） ──
  const cur = turning.currentLuck;
  const ageNow = analysis.currentYear - input.year;
  const curGood = cur.level === '大吉' || cur.level === '吉';
  const curFlat = cur.level === '平';
  const nextPoint = turning.points.find((pt) => pt.level === '大吉' || pt.level === '吉');

  paras.push({
    title: '六、能不能转运，什么时候转',
    text:
      '能转，但得按运来走，急不来。'
      + `你现在 ${ageNow} 岁，正走【${cur.name}】运（${cur.startAge}到${cur.startAge + 9}岁），这一段${cur.level === '大吉' ? '是你最好的时候' : cur.level === '吉' ? '还不错' : cur.level === '平' ? '不好不坏，普普通通' : cur.level === '不佳' ? '偏弱，属于蛰伏期' : '比较难，是低谷'}。`
      + (curGood
        ? '现在正是发力的时候！别等、别观望，该出手就出手。这种运气不是天天有，抓住三五年，能顶平常十年。'
        : curFlat
          ? '现在这个阶段，建议你「守」字当头：把手里的事做扎实，别乱投资、别乱跳槽、别想着一夜翻身。这段时间是攒本钱、长本事的，不是出成绩的。'
          : '现在这段确实不顺，我实话实说。但这不算完，这叫蛰伏期——古话讲「运去金成铁，时来铁似金」，人总有低谷。这段日子里最忌讳两件事：一是不甘心、硬要翻本；二是大额投入、签长约。忍一忍，把身体和本事养好，等运来。')
      + (turning.points.length
        ? `下一个转折点在 ${turning.points.map((pt) => `${pt.year}年（你${pt.age}岁），转进${pt.pillar}运，这一段${lvWord(pt.level)}`).join('；')}。`
        : '未来十年没有大运交接，那就看流年的起伏。')
      + (nextPoint
        ? `${nextPoint.year} 年这次交接是往好的方向转，你要提前布局——最好前一年就开始准备，别等运到了才动手。`
        : '')
      + `再说具体年份。未来十年里，${turning.best.map((b) => `${b.year}年（${b.name}）`).join('、')} 是你最有劲的年份，办大事、买房子、定终身，挑这几年。`
      + (turning.worst.length
        ? `反过来，${turning.worst.map((w) => `${w.year}年（${w.name}）`).join('、')} 要走稳一点——别签大合同、别出远门冒险、别乱花钱。`
        : '其他年份都还算平稳，没有特别要避开的大坑。')
      + '最后讲个道理，你记住就行：大运管十年的大势，流年管一年的吉凶。大运不好但流年好，那一年照样能成事；大运好但流年差，那一年也得收着点。'
      + `至于怎么「转」——不用求神拜佛，就四个字：往顺风口站。你是${favor}的命，那就往这两样上做文章：${favor.split('、').map((f) => WX_WORDS[f]).join('；')}。方位、行业、颜色，甚至办事挑的日子，都往这个方向靠，自然顺当。`
      ,
  });

  // ── 七、分项 ──
  paras.push({
    title: '七、六项打分，一目了然',
    text:
      `财富 ${sub.财富} 分，官运 ${sub.官运} 分，事业 ${sub.事业} 分，婚姻 ${sub.婚姻} 分，健康 ${sub.健康} 分，晚运 ${sub.晚运} 分。都是 100 分制，50 分算及格线。挑几句要紧的说。`
      + (sub.婚姻 >= 65
        ? `婚姻 ${sub.婚姻} 分，你夫妻宫得位，将来能得另一半的助力，是家和万事兴那种。遇到合适的别犹豫。`
        : sub.婚姻 >= 45
          ? `婚姻 ${sub.婚姻} 分，不好不坏，属于平平淡淡过日子的类型。别把标准吊太高，顺其自然就好。`
          : `婚姻 ${sub.婚姻} 分，说直白点，你夫妻宫受了点制，感情路上容易有波折、有反复。建议晚点结婚，成家后多包容、少计较，把重心往事业上放一放，反而容易和顺。`)
      + (sub.健康 >= 65
        ? `健康 ${sub.健康} 分，你五行比较流通，身子底子不错，注意作息就行。`
        : `健康 ${sub.健康} 分，你命里五行有点偏，哪一行过旺或过弱，对应的身体部位就要多留心——定期检查，别硬熬。`)
      + (sub.晚运 >= 65
        ? `晚运 ${sub.晚运} 分，这是好事：时柱得用，说明后半生安稳，子女有出息，老了能享福。`
        : sub.晚运 >= 45
          ? `晚运 ${sub.晚运} 分，后半生平平，安分守常就是福气。`
          : `晚运 ${sub.晚运} 分，得提醒你一句：时柱受制，晚年要靠早年打算。趁现在多攒点、把保障做好，别到老了才着急。`),
  });

  return paras;
}

/** 主入口 */
export function interpretBazi(bazi, options = {}) {
  const { dayMaster, pillars, luck, input } = bazi;
  const currentYear = options.currentYear || new Date().getFullYear();

  const scores = godGroupScores(pillars, dayMaster.element);
  const type = judgeLifeType(pillars, dayMaster, scores);
  const sub = subScores(type, scores, dayMaster, pillars);

  const analysis = {
    input,
    solarDate: bazi.solarDate,
    baziText: bazi.baziText,
    monthTerm: bazi.monthTerm,
    dayMaster,
    pillars,
    luck,
    type,
    sub,
    scores,
    currentYear,
  };

  analysis.turning = findTurningPoints(
    { ...analysis, dayMaster, luck, type, input },
    currentYear,
  );
  analysis.narrative = narrate(analysis);
  return analysis;
}

export { judgeLifeType, scorePillarForLuck, godGroupScores, TYPE_INFO, REL_TO_GROUP };