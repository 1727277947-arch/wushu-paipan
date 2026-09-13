/** 把页面打成一个自包含的单文件 HTML，供安卓 WebView 以 file:// 加载。
 *  原因：安卓 WebView 与桌面浏览器一样，不允许 file:// 下的 ES 模块加载，
 *  所以必须把 JS 打成一个普通脚本、CSS 内联，做成零外部依赖的单文件。
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'android', 'assets');
fs.mkdirSync(outDir, { recursive: true });

const bundlePath = path.join(outDir, '__bundle.js');
await build({
  entryPoints: [path.join(root, 'src', 'app.js')],
  bundle: true,
  format: 'iife',
  target: ['chrome80'],
  charset: 'utf8',
  legalComments: 'none',
  outfile: bundlePath,
});

const js = fs.readFileSync(bundlePath, 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'style.css'), 'utf8');
fs.unlinkSync(bundlePath);

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// 内联 CSS，去掉外部样式、清单与图标的链接（单文件里不需要）
html = html
  .replace(/<link rel="stylesheet"[^>]*>/, `<style>\n${css}\n</style>`)
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/\s*<link rel="icon"[^>]*>/, '');

// 内联脚本，替换模块引入
html = html.replace(/<script type="module"[^>]*><\/script>/, `<script>\n${js}\n</script>`);

if (html.includes('type="module"') || html.includes('href="./assets/style.css"')) {
  throw new Error('内联不完整，仍存在外部引用');
}

fs.writeFileSync(path.join(outDir, 'app.html'), html, 'utf8');
const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log(`单文件已生成: android/assets/app.html  ${kb} KB  (JS ${(js.length/1024).toFixed(0)}KB + CSS ${(css.length/1024).toFixed(0)}KB)`);