/** 解梦结果渲染 */

import { esc, chip, secTitle, tag } from './ui.js';

const WX_CLASS = { 木: 'wx-木', 火: 'wx-火', 土: 'wx-土', 金: 'wx-金', 水: 'wx-水' };
const WX_ORDER = ['木', '火', '土', '金', '水'];

export function renderJiemeng(r) {
  const parts = [];

  // 概览条
  parts.push('<div class="meta-bar">'
    + chip('做梦时间', r.solarText)
    + chip('日柱', r.dayGanZhi)
    + chip('时辰', r.hourGanZhi, true)
    + chip('情绪', r.mood)
    + chip('梦象', r.hits.length ? r.hits.map((h) => h.sym.name).join('、') : '未识别', true)
    + chip('总体', r.level, true)
    + '</div>');

  // 结论卡
  parts.push(secTitle('核心结论'));
  parts.push('<div class="verdict-grid">'
    + '<div class="verdict-card main">'
    + '<div class="vc-label">此梦主</div>'
    + '<div class="vc-value">' + esc(r.level) + '</div>'
    + '<div class="vc-sub">' + esc(verdictSub(r.level)) + '</div>'
    + '<div class="vc-tags">'
    + r.hits.slice(0, 6).map((h) => tag(h.sym.name + '·' + h.sym.wuxing, 'ten')).join('')
    + '</div></div>'
    + '<div class="verdict-card">'
    + '<div class="vc-label">梦里最重</div>'
    + '<div class="vc-value ' + (WX_CLASS[r.wuxing.dominant] || '') + '">' + esc(r.wuxing.dominant) + '</div>'
    + '<div class="vc-sub">' + (r.hits.length ? '此梦的气落在' + esc(r.wuxing.dominant) : '梦象不足') + '</div>'
    + '</div>'
    + '<div class="verdict-card">'
    + '<div class="vc-label">梦应</div>'
    + '<div class="vc-value">' + esc(r.hourBranch) + '时</div>'
    + '<div class="vc-sub">' + esc(omenShort(r.hourBranch)) + '</div>'
    + '</div>'
    + '<div class="verdict-card">'
    + '<div class="vc-label">吉凶分</div>'
    + '<div class="vc-value">' + r.score.toFixed(2) + '</div>'
    + '<div class="vc-sub">正值偏吉，负值偏忧</div>'
    + '</div>'
    + '</div>');

  // 梦象卡片
  if (r.hits.length) {
    parts.push(secTitle('梦象逐条详解'));
    parts.push('<div class="dream-symbols">');
    r.hits.forEach((h) => {
      const lv = h.sym.luck >= 0.6 ? 'lv-great' : h.sym.luck > -0.6 ? 'lv-flat' : 'lv-bad';
      parts.push('<div class="dream-card ' + lv + '">'
        + '<div class="dc-head">'
        + '<span class="dc-name">' + esc(h.sym.name) + '</span>'
        + '<span class="dc-wx ' + (WX_CLASS[h.sym.wuxing] || '') + '">' + esc(h.sym.wuxing) + '</span>'
        + '<span class="dc-key">梦见「' + esc(h.keyword) + '」</span>'
        + '</div>'
        + '<p class="dc-text">' + esc(h.sym.text) + '</p>'
        + '<p class="dc-advice"><b>宜</b>' + esc(h.sym.advice) + '</p>'
        + '</div>');
    });
    parts.push('</div>');
  }

  // 五行气象
  parts.push(secTitle('梦境五行气象'));
  parts.push('<div class="wx-bars">');
  WX_ORDER.forEach((el) => {
    const v = r.wuxing.percent[el] || 0;
    parts.push('<div class="wx-bar">'
      + '<span class="wx-name ' + WX_CLASS[el] + '">' + esc(el) + '</span>'
      + '<span class="track"><span class="fill ' + WX_CLASS[el] + '" style="width:' + v.toFixed(1) + '%;background:currentColor;opacity:.75"></span></span>'
      + '<span class="pct">' + v.toFixed(1) + '%</span>'
      + '</div>');
  });
  parts.push('</div>');

  // 时辰梦应
  parts.push(secTitle('梦做在何时 · 何时应验'));
  parts.push('<div class="lesson-list">');
  parts.push('<div class="lesson">'
    + '<div class="l-name">' + esc(r.dayGanZhi) + '日 ' + esc(r.hourGanZhi) + '时</div>'
    + '<div class="l-upper">' + esc(r.hourBranch) + '时</div>'
    + '<div class="l-lower"><span class="lv ' + (r.levelClass || 'lv-flat') + '">' + esc(r.level) + '</span></div>'
    + '<div class="l-gen">' + esc(r.hourOmen) + '</div>'
    + '</div>');
  parts.push('</div>');

  // 论梦详文
  parts.push(secTitle('解梦详论'));
  parts.push('<div class="narrative">');
  r.narrative.forEach((para) => {
    parts.push('<article class="nar-block">'
      + '<h4 class="nar-title">' + esc(para.title) + '</h4>'
      + '<p class="nar-text">' + esc(para.text) + '</p>'
      + '</article>');
  });
  parts.push('</div>');

  parts.push(secTitle('说明'));
  parts.push('<div class="text-block">解梦依《周公解梦》一脉的象义传统与五行归类推演，'
    + '属传统文化研究与娱乐内容，不构成任何决策建议。梦由心生，醒了就放下，比什么都强。</div>');

  return parts.join('');
}

function verdictSub(level) {
  return {
    大吉: '吉象明显，可放手去做',
    吉: '偏吉，宜顺势而为',
    平: '吉凶相抵，留意即可',
    不佳: '偏忧，是提醒不是定数',
    凶: '多为反梦，宜宽心',
  }[level] || '';
}

function omenShort(branch) {
  return {
    子: '主远事，应期较晚', 丑: '主家宅事', 寅: '主新起之事', 卯: '主门户走动',
    辰: '主文书合同', 巳: '主财帛进项', 午: '主消息喜信', 未: '主人情往来',
    申: '主出行搬迁', 酉: '主暗事旧账', 戌: '主规矩纠纷', 亥: '主身体长辈',
  }[branch] || '';
}

/** 纯文本导出 */
export function jiemengText(r) {
  const lines = [];
  lines.push('════ 解梦 ════');
  lines.push('做梦时间：' + r.solarText + '（' + r.dayGanZhi + '日 ' + r.hourGanZhi + '时）');
  lines.push('梦中情绪：' + r.mood);
  lines.push('梦中所见：' + r.dreamText);
  lines.push('总体论断：' + r.level + '（吉凶分 ' + r.score.toFixed(2) + '）');
  lines.push('');
  lines.push('── 梦象 ──');
  if (r.hits.length) {
    r.hits.forEach((h) => lines.push('  ' + h.sym.name + '（' + h.sym.wuxing + '）：' + h.sym.text));
  } else {
    lines.push('  未能识别确切的梦象');
  }
  lines.push('');
  lines.push('── 五行气象 ──');
  WX_ORDER.forEach((el) => lines.push('  ' + el + '：' + (r.wuxing.percent[el] || 0).toFixed(1) + '%'));
  lines.push('');
  lines.push('── 梦应 ──');
  lines.push('  ' + r.hourOmen);
  lines.push('');
  r.narrative.forEach((para) => {
    lines.push('── ' + para.title + ' ──');
    lines.push(para.text);
    lines.push('');
  });
  return lines.join('\n');
}
