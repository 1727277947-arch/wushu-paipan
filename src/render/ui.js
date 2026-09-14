/** 通用 UI 小工具 */

export const WX_CLASS = { 木: 'wx-木', 火: 'wx-火', 土: 'wx-土', 金: 'wx-金', 水: 'wx-水' };

/** HTML 转义 */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** 干支彩色显示 */
export function ganzhiHtml(gz, cls = '') {
  if (!gz) return '';
  const stem = gz[0] ?? '';
  const branch = gz[1] ?? '';
  return `<span class="ganzhi ${cls}"><span class="st">${esc(stem)}</span><span class="br">${esc(branch)}</span></span>`;
}

/** 五行着色文字 */
export function wxText(el, text) {
  return `<span class="${WX_CLASS[el] || ''}">${esc(text ?? el ?? '')}</span>`;
}

export function chip(label, value, accent = false) {
  return `<span class="chip${accent ? ' accent' : ''}">${esc(label)}<b>${esc(value)}</b></span>`;
}

export function secTitle(text) {
  return `<h3 class="sec-title">${esc(text)}</h3>`;
}

export function tag(text, cls = '') {
  return `<span class="tag ${cls}">${esc(text)}</span>`;
}

/** 六爻爻象图形（自下而上） */
export function yaoSymbol(yang) {
  if (yang) return '<span class="line"><i></i></span>';
  return '<span class="line yin"><i></i><i></i></span>';
}

/** 由六爻（自下而上）画卦象 */
export function hexSymbol(yaos) {
  const lines = yaos.map((y) => yaoSymbol(y.yang ?? y)).join('');
  return `<div class="symbol-lines">${lines}</div>`;
}

/** 白话论断区块（各术数通用） */
export function narrative(paras) {
  const blocks = paras.map((p) => `<article class="nar-block">
      <h4 class="nar-title">${esc(p.title)}</h4>
      <p class="nar-text">${esc(p.text)}</p>
    </article>`).join('');
  return `<div class="narrative">${blocks}</div>`;
}

/** 白话论断的纯文本片段 */
export function narrativeText(paras) {
  const lines = ['── 白话解读 ──'];
  paras.forEach((p) => {
    lines.push(`【${p.title}】`);
    lines.push(p.text);
    lines.push('');
  });
  return lines;
}

/** 十二地支顺时针环形（用于天地盘） */
export const BRANCHES_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 复制到剪贴板 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
}