/** 八字结果渲染 */

import { esc, ganzhiHtml, chip, secTitle, tag, WX_CLASS, narrative, narrativeText } from './ui.js';
import { WUXING } from '../core/bazi.js';
import { readBazi } from '../core/read.js';

export function renderBazi(r) {
  const parts = [];

  // 信息条
  parts.push(`<div class="meta-bar">
    ${chip('公历', r.solarDate)}
    ${chip('八字', r.baziText, true)}
    ${chip('生肖', r.zodiac)}
    ${chip('日主', `${r.dayMaster.stem}${r.dayMaster.element}（${r.dayMaster.verdict}）`, true)}
    ${chip('月令', r.monthTerm)}
    ${chip('日空', r.xunKong.join(''))}
    ${r.xunKongYear ? chip('年空', r.xunKongYear.join('')) : ''}
  </div>`);

  // 四柱大表
  const p = r.pillars;
  parts.push(secTitle('四柱八字'));
  parts.push(`<table class="pillar-table">
    <thead><tr><th></th>${p.map((x) => `<th>${esc(x.label)}</th>`).join('')}</tr></thead>
    <tbody>
      <tr><td class="rowlabel">十神</td>${p.map((x) => `<td><span class="tag ten">${esc(x.tenGodShort)} ${esc(x.tenGod)}</span></td>`).join('')}</tr>
      <tr><td class="rowlabel">天干</td>${p.map((x) => `<td>${ganzhiHtml(x.stem)}</td>`).join('')}</tr>
      <tr><td class="rowlabel">地支</td>${p.map((x) => `<td><span class="ganzhi"><span class="br">${esc(x.branch)}</span></span></td>`).join('')}</tr>
      <tr><td class="rowlabel">五行</td>${p.map((x) => `<td>${wxText(x.stemWuxing)}<span style="color:var(--line-strong)">/</span>${wxText(x.branchWuxing)}</td>`).join('')}</tr>
      <tr><td class="rowlabel">藏干</td>${p.map((x) => `<td>${x.hiddenStems.map((h) => `<span class="${WX_CLASS[wxOf(h)] || ''}">${esc(h)}</span>`).join(' ')}</td>`).join('')}</tr>
      <tr><td class="rowlabel">藏干十神</td>${p.map((x) => `<td>${x.hiddenTenGods.map((h) => `<span class="tag">${esc(h.short)}</span>`).join(' ')}</td>`).join('')}</tr>
      <tr><td class="rowlabel">纳音</td>${p.map((x) => `<td>${esc(x.nayin)}</td>`).join('')}</tr>
      <tr><td class="rowlabel">宫位</td>${p.map((x) => `<td><span style="color:var(--ink-faint);font-size:12px">${esc(x.palace)}</span></td>`).join('')}</tr>
      <tr><td class="rowlabel">空亡</td>${p.map((x) => `<td style="font-size:12.5px;color:var(--ink-faint)">${esc(x.xunKong.join(''))}</td>`).join('')}</tr>
    </tbody>
  </table>`);

  // 日主分析
  parts.push(secTitle('日主与五行喜忌'));
  parts.push(`<div class="text-block">${esc(r.dayMaster.note)}</div>`);
  parts.push(`<div class="meta-bar" style="border-bottom:none;padding-bottom:0">
    ${chip('喜用', r.dayMaster.favor.join('、'), true)}
    ${chip('忌神', r.dayMaster.avoid.join('、'))}
    ${chip('日主力量', `${(r.dayMaster.ratio * 100).toFixed(1)}%`)}
  </div>`);

  // 五行力量
  parts.push(secTitle('五行力量分布'));
  parts.push('<div class="wx-bars">');
  WUXING.forEach((el) => {
    const pct = r.wuxing.percent[el] || 0;
    parts.push(`<div class="wx-bar">
      <span class="wx-name ${WX_CLASS[el]}">${esc(el)}</span>
      <span class="track"><span class="fill fill-${esc(el)}" style="width:${pct.toFixed(1)}%"></span></span>
      <span class="pct">${pct.toFixed(1)}%</span>
    </div>`);
  });
  parts.push('</div>');

  // 大运
  if (r.luck) {
    parts.push(secTitle(`大运 · ${r.luck.direction}`));
    parts.push(`<div class="meta-bar" style="border-bottom:none;padding:0 0 8px">
      ${chip('起运', r.luck.startAgeText)}
      ${chip('参考节气', r.luck.refTerm)}
      ${chip('距节气', `${r.luck.diffDays} 天`)}
    </div>`);
    parts.push('<div class="luck-row">');
    r.luck.pillars.forEach((lp) => {
      parts.push(`<div class="luck-item">
        <div class="age">${lp.startAge}岁</div>
        <div class="gz">${ganzhiHtml(lp.name)}</div>
        <div class="yr">${lp.startYear}年起</div>
      </div>`);
    });
    parts.push('</div>');
  }

  // 说明
  parts.push(secTitle('白话解读'));
  parts.push(narrative(readBazi(r)));

  parts.push(secTitle('排盘说明'));
  parts.push(`<ul class="notes">
    <li><b>年柱</b>以立春为界，非以正月初一，故年初出生者需留意换年。</li>
    <li><b>月柱</b>以十二「节」为界（立春、惊蛰、清明…），非农历月。</li>
    <li><b>五行力量</b>按天干与地支藏干加权统计，月令权重最高。</li>
    <li><b>大运</b>依阳男阴女顺排、阴男阳女逆排，3 天折 1 年。</li>
  </ul>`);

  return parts.join('');
}

/** 由天干取五行（避免循环依赖，内联一份） */
const STEM_WX = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
function wxOf(stem) { return STEM_WX[stem]; }

function wxText(el) {
  return `<span class="${WX_CLASS[el] || ''}">${esc(el)}</span>`;
}

/** 八字纯文本（用于复制） */
export function baziText(r) {
  const lines = [];
  lines.push(`公历：${r.solarDate}`);
  lines.push(`八字：${r.baziText}`);
  lines.push(`生肖：${r.zodiac}　日主：${r.dayMaster.stem}${r.dayMaster.element}（${r.dayMaster.verdict}）`);
  lines.push('');
  const p = r.pillars;
  lines.push(['', ...p.map((x) => x.label)].join('\t'));
  lines.push(['十神', ...p.map((x) => `${x.tenGodShort}${x.tenGod}`)].join('\t'));
  lines.push(['干支', ...p.map((x) => x.name)].join('\t'));
  lines.push(['藏干', ...p.map((x) => x.hiddenStems.join(''))].join('\t'));
  lines.push(['纳音', ...p.map((x) => x.nayin)].join('\t'));
  lines.push(['宫位', ...p.map((x) => x.palace)].join('\t'));
  lines.push('');
  lines.push(`五行：${Object.entries(r.wuxing.percent).map(([k, v]) => `${k}${v.toFixed(1)}%`).join('　')}`);
  lines.push(`喜用：${r.dayMaster.favor.join('、')}　忌神：${r.dayMaster.avoid.join('、')}`);
  if (r.luck) {
    lines.push('');
    lines.push(`大运（${r.luck.direction}，${r.luck.startAgeText}起运）：`);
    lines.push(r.luck.pillars.map((x) => `${x.startAge}岁 ${x.name}`).join('　'));
  }
  lines.push('');
  lines.push(...narrativeText(readBazi(r)));
  return lines.join('\n');
}