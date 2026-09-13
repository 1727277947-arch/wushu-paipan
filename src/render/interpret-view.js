/** 命理解读渲染 */

import { esc, chip, secTitle, tag } from './ui.js';

const SUB_KEYS = ['财富', '官运', '事业', '婚姻', '健康', '晚运'];

const LEVEL_CLASS = {
  大吉: 'lv-great', 吉: 'lv-good', 平: 'lv-flat', 不佳: 'lv-bad', 凶: 'lv-worst',
};

export function renderInterpretation(r) {
  const parts = [];

  // 概览条
  parts.push(`<div class="meta-bar">
    ${chip('八字', r.baziText, true)}
    ${chip('日主', `${r.dayMaster.stem}${r.dayMaster.element}（${r.dayMaster.verdict}）`)}
    ${chip('命局', r.type.name, true)}
    ${chip('用神', r.dayMaster.favor.join('、'), true)}
    ${chip('忌神', r.dayMaster.avoid.join('、'))}
    ${chip('起运', r.luck.startAgeText)}
  </div>`);

  // 结论卡片
  parts.push(secTitle('核心结论'));
  parts.push(`<div class="verdict-grid">
    <div class="verdict-card main">
      <div class="vc-label">此命属</div>
      <div class="vc-value">${esc(r.type.name)}</div>
      <div class="vc-sub">${esc(r.type.desc)}</div>
      <div class="vc-tags">${r.type.keywords.map((k) => tag(k, 'ten')).join('')}</div>
    </div>
    <div class="verdict-card">
      <div class="vc-label">财运</div>
      <div class="vc-value">${r.sub.财富}<span class="vc-unit">分</span></div>
      <div class="vc-sub">${r.sub.财富 >= 70 ? '财禄丰厚' : r.sub.财富 >= 45 ? '中等财禄' : '财禄偏薄'}${r.type.percent.财 >= 22 ? ' · 财命' : ''}</div>
    </div>
    <div class="verdict-card">
      <div class="vc-label">官运</div>
      <div class="vc-value">${r.sub.官运}<span class="vc-unit">分</span></div>
      <div class="vc-sub">${r.sub.官运 >= 70 ? '有官运' : r.sub.官运 >= 45 ? '官运平平' : '不宜求名位'}</div>
    </div>
    <div class="verdict-card">
      <div class="vc-label">当前大运</div>
      <div class="vc-value">${esc(r.turning.currentLuck.name)}</div>
      <div class="vc-sub"><span class="lv ${LEVEL_CLASS[r.turning.currentLuck.level]}">${esc(r.turning.currentLuck.level)}</span> · ${r.turning.currentLuck.startAge}~${r.turning.currentLuck.startAge + 9}岁</div>
    </div>
  </div>`);

  // 分项指数
  parts.push(secTitle('分项指数'));
  parts.push('<div class="score-bars">');
  SUB_KEYS.forEach((k) => {
    const v = r.sub[k];
    const cls = v >= 70 ? 'sb-high' : v >= 45 ? 'sb-mid' : 'sb-low';
    parts.push(`<div class="score-bar">
      <span class="sb-name">${esc(k)}</span>
      <span class="sb-track"><span class="sb-fill ${cls}" style="width:${v}%"></span></span>
      <span class="sb-val">${v}</span>
    </div>`);
  });
  parts.push('</div>');

  // 十神占比
  parts.push(secTitle('十神力量分布'));
  const godOrder = ['比劫', '食伤', '财', '官杀', '印'];
  parts.push('<div class="wx-bars">');
  godOrder.forEach((g) => {
    const v = r.type.percent[g] || 0;
    parts.push(`<div class="wx-bar">
      <span class="wx-name" style="font-size:13px">${esc(g)}</span>
      <span class="track"><span class="fill god-${esc(g)}" style="width:${v.toFixed(1)}%"></span></span>
      <span class="pct">${v.toFixed(1)}%</span>
    </div>`);
  });
  parts.push('</div>');
  parts.push(`<div style="margin-top:10px;font-size:12.5px;color:var(--ink-faint)">
    十神对照：比劫＝自身与同伴、食伤＝才华与表达、财＝财物与务实、官杀＝名位与压力、印＝学识与庇荫。
  </div>`);

  // 一生运势曲线
  parts.push(secTitle('一生大运走势'));
  parts.push('<div class="luck-timeline">');
  r.luck.pillars.forEach((lp) => {
    const cls = LEVEL_CLASS[lp.level] || 'lv-flat';
    parts.push(`<div class="lt-item ${cls}">
      <div class="lt-age">${lp.startAge}岁</div>
      <div class="lt-gz">${esc(lp.name)}</div>
      <div class="lt-lv">${esc(lp.level)}</div>
      <div class="lt-yr">${lp.startYear}</div>
    </div>`);
  });
  parts.push('</div>');

  // 流年吉凶
  parts.push(secTitle(`未来十年流年（自 ${r.currentYear} 年起）`));
  parts.push('<div class="year-grid">');
  r.turning.yearScores.forEach((y) => {
    const cls = LEVEL_CLASS[y.level] || 'lv-flat';
    parts.push(`<div class="year-cell ${cls}" title="${esc(y.reasons.join('；'))}">
      <div class="yc-year">${y.year}</div>
      <div class="yc-gz">${esc(y.name)}</div>
      <div class="yc-lv">${esc(y.level)}</div>
    </div>`);
  });
  parts.push('</div>');

  // 转运分析
  parts.push(secTitle('转运节点'));
  if (r.turning.points.length) {
    parts.push('<div class="lesson-list">');
    r.turning.points.forEach((p) => {
      parts.push(`<div class="lesson">
        <div class="l-name">${p.year}年 · ${p.age}岁</div>
        <div class="l-upper">${esc(p.pillar)}</div>
        <div class="l-lower"><span class="lv ${LEVEL_CLASS[p.level]}">${esc(p.level)}</span></div>
        <div class="l-gen">${esc(p.note)}</div>
      </div>`);
    });
    parts.push('</div>');
  } else {
    parts.push('<div class="text-block">未来十年内无大运交接，转运须看流年起伏，宜顺势而为。</div>');
  }

  // 命理详论
  parts.push(secTitle('命理详论'));
  parts.push('<div class="narrative">');
  r.narrative.forEach((p) => {
    parts.push(`<article class="nar-block">
      <h4 class="nar-title">${esc(p.title)}</h4>
      <p class="nar-text">${esc(p.text)}</p>
    </article>`);
  });
  parts.push('</div>');

  parts.push(secTitle('免责说明'));
  parts.push('<div class="text-block">以上论断依传统子平命理法则推演，属传统文化研究与娱乐内容，不构成任何投资、职业、婚姻或医疗建议。命由己造，运随心转，此论仅供参考。</div>');

  return parts.join('');
}

/** 纯文本导出 */
export function interpretText(r) {
  const lines = [];
  lines.push('════ 命理解读 ════');
  lines.push(`八字：${r.baziText}`);
  lines.push(`公历：${r.solarDate}`);
  lines.push(`日主：${r.dayMaster.stem}${r.dayMaster.element}（${r.dayMaster.verdict}）`);
  lines.push(`命局：${r.type.name}——${r.type.desc}`);
  lines.push(`喜用：${r.dayMaster.favor.join('、')}　忌神：${r.dayMaster.avoid.join('、')}`);
  lines.push('');
  lines.push('── 分项指数（百分制）──');
  SUB_KEYS.forEach((k) => lines.push(`  ${k}：${r.sub[k]}`));
  lines.push('');
  lines.push('── 十神力量 ──');
  ['比劫', '食伤', '财', '官杀', '印'].forEach((g) => lines.push(`  ${g}：${(r.type.percent[g] || 0).toFixed(1)}%`));
  lines.push('');
  lines.push('── 一生大运 ──');
  r.luck.pillars.forEach((lp) => lines.push(`  ${lp.startAge}~${lp.startAge + 9}岁　${lp.name}　${lp.level}　（${lp.startYear}年起）`));
  lines.push('');
  lines.push(`── 未来十年流年（自 ${r.currentYear} 年）──`);
  r.turning.yearScores.forEach((y) => lines.push(`  ${y.year}　${y.name}　${y.level}`));
  lines.push('');
  lines.push('── 转运节点 ──');
  if (r.turning.points.length) r.turning.points.forEach((p) => lines.push(`  ${p.year}年（${p.age}岁）转入${p.pillar}运，${p.level}`));
  else lines.push('  未来十年无大运交接');
  lines.push('');
  r.narrative.forEach((p) => {
    lines.push(`── ${p.title} ──`);
    lines.push(p.text);
    lines.push('');
  });
  return lines.join('\n');
}