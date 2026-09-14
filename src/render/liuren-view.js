/** 大六壬结果渲染 */

import { esc, chip, secTitle, tag, BRANCHES_ORDER, ganzhiHtml, narrative, narrativeText } from './ui.js';
import { readLiuren } from '../core/read.js';

export function renderLiuren(r) {
  const parts = [];

  parts.push(`<div class="meta-bar">
    ${chip('时间', r.solarText)}
    ${chip('日课', `${r.dayGanZhi}日 ${r.hourGanZhi}时`, true)}
    ${chip('月将', `${r.monthGeneral.name}（${r.monthGeneral.branch}）`, true)}
    ${chip('贵人', `${r.nobleBranch}（${r.nobleForward ? '顺布' : '逆布'}·${r.daytime ? '昼' : '夜'}）`)}
    ${chip('旬空', r.xunKong.join(''))}
    ${chip('三传', r.sanChuan.text, true)}
  </div>`);

  // 天地盘
  parts.push(secTitle(`天地盘 · 月将${r.monthGeneral.branch}加${r.hourBranch}时`));
  const ground = BRANCHES_ORDER;
  const skyAt = r.plate.skyAt;
  parts.push('<div class="plate-wrap"><div class="plate">');
  parts.push('<div class="p-label">天将</div>');
  ground.forEach((b) => parts.push(`<div class="p-cell p-gen">${esc(r.generals[b] || '—')}</div>`));
  parts.push('<div class="p-label">天盘</div>');
  ground.forEach((b, i) => parts.push(`<div class="p-cell p-sky">${esc(skyAt[i])}</div>`));
  parts.push('<div class="p-label">地盘</div>');
  ground.forEach((b) => parts.push(`<div class="p-cell p-ground">${esc(b)}</div>`));
  parts.push('</div></div>');

  // 四课
  parts.push(secTitle('四课'));
  parts.push(`<div class="lesson-list">${r.fourLessons.map((k) => `
    <div class="lesson">
      <div class="l-name">${esc(k.name)} · ${esc(k.type)}</div>
      <div class="l-upper">${esc(k.upper)}</div>
      <div class="l-lower">${esc(k.lowerLabel)}</div>
      <div class="l-gen">${esc(k.general)}</div>
    </div>`).join('')}</div>`);

  // 三传
  parts.push(secTitle(`三传 · ${r.sanChuan.method}`));
  parts.push(`<div class="sc-list">${r.sanChuan.items.map((it, i) => `
    <div class="sc-item ${i === 0 ? 'is-first' : ''}">
      <div class="s-pos">${esc(it.pos)}</div>
      <div class="s-br">${esc(it.branch)}</div>
      <div class="s-gen">${esc(it.element)} · ${esc(it.relation)}</div>
      <div class="s-tags">
        ${tag(it.general, 'ten')}
        ${it.dunGan && it.dunGan !== '—' ? tag(`遁${it.dunGan}`, 'dun') : ''}
        ${r.xunKong.includes(it.branch) ? tag('空', 'kong') : ''}
      </div>
    </div>`).join('')}</div>`);

  parts.push(secTitle('白话解读'));
  parts.push(narrative(readLiuren(r)));

  parts.push(secTitle('排盘说明'));
  parts.push(`<ul class="notes">
    <li><b>月将</b>为太阳所躔之宫，雨水后用亥将，依次逆推。</li>
    <li><b>天地盘</b>：月将加于占时之上，天盘盘面随时辰转动。</li>
    <li><b>四课</b>由日干寄宫与日支分别取上下神，一二课属干，三四课属支。</li>
    <li><b>三传</b>取法依次为贼克、比用、涉害、遥克、昴星、别责、八专，另有伏吟反吟特例。本次用时：${esc(r.sanChuan.method)}。</li>
    <li><b>十二天将</b>以贵人起，贵人临亥子丑寅卯辰顺布，临巳午未申酉戌逆布。</li>
  </ul>`);

  return parts.join('');
}

/** 纯文本导出 */
export function liurenText(r) {
  const lines = [];
  lines.push(`时间：${r.solarText}`);
  lines.push(`日课：${r.dayGanZhi}日 ${r.hourGanZhi}时`);
  lines.push(`月将：${r.monthGeneral.name}（${r.monthGeneral.branch}）`);
  lines.push(`贵人：${r.nobleBranch}（${r.nobleForward ? '顺布' : '逆布'}·${r.daytime ? '昼贵' : '夜贵'}）`);
  lines.push(`旬空：${r.xunKong.join('')}`);
  lines.push('');
  lines.push('天地盘：');
  lines.push('  天将\t' + BRANCHES_ORDER.map((b) => r.generals[b] || '—').join('\t'));
  lines.push('  天盘\t' + r.plate.skyAt.join('\t'));
  lines.push('  地盘\t' + BRANCHES_ORDER.join('\t'));
  lines.push('');
  lines.push('四课：');
  r.fourLessons.forEach((k) => lines.push(`  ${k.name}　${k.upper}\n  　　　　${k.lowerLabel}　（${k.general}）`));
  lines.push('');
  lines.push(`三传（${r.sanChuan.method}）：`);
  r.sanChuan.items.forEach((it) => {
    lines.push(`  ${it.pos}　${it.branch}　${it.element}${it.relation}　${it.general}${it.dunGan && it.dunGan !== '—' ? '　遁' + it.dunGan : ''}`);
  });
  lines.push('');
  lines.push(...narrativeText(readLiuren(r)));
  return lines.join('\n');
}