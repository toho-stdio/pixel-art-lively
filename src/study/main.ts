import './style.css';
import { createStudyScene } from './scene';
import { createStudyWaterRenderer } from './water';
import { DEFAULT_RESOLUTION, RESOLUTIONS, type ResolutionKey, type StudyScene } from './types';
import { defaultSettings, type Settings, type WaterRenderer } from '../types';
import { advanceTime, toScenePoint } from '../runtime';

const effects = ['depth', 'sky', 'reflections', 'shoreline', 'backBank', 'particles'] as const;
const labels = ['Độ sâu', 'Ánh trời', 'Phản chiếu', 'Ven bờ', 'Bóng bờ', 'Gợn & lá'];
document.querySelector('#study-app')!.innerHTML = `
<div class="study-wrap">
<header class="study-header"><a class="study-brand" href="/">ao làng.</a><nav><a href="/">← Giữ bản hiện tại</a><a href="#study-comparison">Xem đối chiếu ↓</a></nav></header>
<main>
<section class="study-intro"><div><span class="study-eyebrow">ÉTUDE / 002 — MẬT ĐỘ PIXEL</span><h1>Cùng một góc ao.<br/><em>Bốn nhịp của pixel.</em></h1><p>Một lượt thử có giới hạn: vẽ lại trên grid native, giữ cùng tỷ lệ và bố cục. Không coi nhiều pixel hơn là đẹp hơn. Bản chính vẫn nguyên vẹn.</p></div><div class="study-badge"><strong>CHƯA CHỐT ART DIRECTION</strong>640 × 360 là mốc thử, không phải kết luận.<br/>Đối chiếu ở cùng thời điểm 3.25 giây.</div></section>
<section class="study-layout" aria-label="Bản thử mật độ pixel">
<div class="study-art"><div class="study-viewport" id="study-viewport"><canvas id="study-canvas" tabindex="0" role="img" aria-label="Ao làng thử nghiệm mật độ pixel; chạm nước hoặc Enter tạo gợn sóng"></canvas></div><div class="study-art-caption"><span id="study-pixel-label">Native grid</span><span>Preview scale nguyên · màn hình nhỏ có thể cuộn tranh ngang</span></div><p class="study-status" id="study-status" role="status" aria-live="polite"></p></div>
<aside class="study-panel" aria-label="Thông số bản thử"><h2>Nhìn gần hơn.</h2>
<div class="study-control"><label for="study-resolution">GRID NATIVE</label><select id="study-resolution">${RESOLUTIONS.map(r => `<option value="${r.key}" ${r.key === DEFAULT_RESOLUTION ? 'selected' : ''}>${r.width} × ${r.height} — ${r.label}</option>`).join('')}</select><p id="study-resolution-info"></p></div>
<div class="study-control"><label for="study-palette">SẮC NƯỚC</label><select id="study-palette"><option value="jade">Ngọc bích</option><option value="golden">Nắng mật</option><option value="moon">Trăng xanh</option></select></div>
<div class="study-buttons"><button class="study-button" id="study-pause" aria-pressed="false">Tạm dừng</button><button class="study-button" id="study-freeze">Mốc 3.25 s</button></div>
<div class="study-control study-rule"><label for="study-distortion">Lay bóng <output id="study-distortion-value">2 px @ 640</output></label><input class="study-range" id="study-distortion" type="range" min="0" max="3" step="0.5" value="2"/><label for="study-wind">Gió <output id="study-wind-value">0.6</output></label><input class="study-range" id="study-wind" type="range" min="0" max="2" step="0.1" value="0.6"/></div>
<div class="study-control study-rule">${effects.map((key, i) => `<label class="study-row" for="study-${key}"><span>${labels[i]}</span><input id="study-${key}" type="checkbox" checked/></label>`).join('')}</div>
<div class="study-buttons"><button class="study-button primary" id="study-compare">Tạo bộ so sánh</button><button class="study-button" id="study-export">PNG 1080p</button></div>
<div class="study-metric" id="study-metrics"></div>
</aside></section>
<p class="study-note">Camera giữ tỷ lệ đồng nhất: bản 640 × 400 cũ được mở đều hai bên thành khung 16:9, không ép dẹt cây hay mái đình. Ảnh xuất 1080p scale nguyên 6× / 4× / 3× / 2×. Gallery thu nhỏ chỉ để xem tổng thể; tải PNG và xem 100% để đánh giá grid. Chi tiết và màu nước không được pha alpha.</p>
<section class="study-comparison" id="study-comparison" aria-labelledby="comparison-title" hidden><h2 id="comparison-title">Đặt cạnh nhau, rồi mới chọn.</h2><p>Bốn ảnh 1920 × 1080: cùng camera, ánh sáng, thời gian 3.25 s, gió 0.6 và một gợn sóng cùng tuổi. Các ô xem trước có thể bị scale bởi trình duyệt; ảnh tải xuống giữ nguyên từng pixel. Đo render dưới đây là phép lấy mẫu cục bộ, không chứng minh hiệu năng trên điện thoại thật.</p><div class="study-gallery" id="study-gallery"></div><div class="study-downloads" id="study-downloads"></div><div class="study-closeups" id="study-closeups"></div></section>
</main><footer class="study-footer"><span>AO LÀNG / ONE BOUNDED PIXEL STUDY</span><span>Giữ bản cũ nếu cái mới chưa làm mình thích hơn.</span><a href="/">Quay lại ao làng →</a></footer></div>`;

const settings: Settings = { ...defaultSettings, paused: matchMedia('(prefers-reduced-motion: reduce)').matches };
let resolution: ResolutionKey = DEFAULT_RESOLUTION;
let scene: StudyScene;
let water: WaterRenderer;
let time = 3.25;
let dirty = true;
let lastFrame = performance.now();
let lastRender = -Infinity;
let frameId = 0;
let renderCost = 0;
let measuredFPS = 0;
let fpsStart = performance.now();
let fpsFrames = 0;
const canvas = document.querySelector<HTMLCanvasElement>('#study-canvas')!;
const viewport = document.querySelector<HTMLDivElement>('#study-viewport')!;
const status = document.querySelector<HTMLElement>('#study-status')!;
const urls: string[] = [];
let comparisonMetadata: unknown[] = [];

function mode(key = resolution) { return RESOLUTIONS.find(r => r.key === key)!; }
function fitPreview() {
  const r = mode();
  const availableWidth = viewport.clientWidth - 12;
  const availableHeight = viewport.clientHeight - 12;
  const scale = Math.max(1, Math.floor(Math.min(availableWidth / r.width, availableHeight / r.height)));
  canvas.style.width = r.width * scale + 'px';
  canvas.style.height = r.height * scale + 'px';
  document.querySelector('#study-pixel-label')!.textContent = `${r.width} × ${r.height} native · preview ${scale}× · xuất 1080p ${r.scale1080}×`;
}
function updatePause() {
  const button = document.querySelector<HTMLButtonElement>('#study-pause')!;
  button.textContent = settings.paused ? 'Tiếp tục' : 'Tạm dừng';
  button.setAttribute('aria-pressed', String(settings.paused));
}
function setResolution(key: ResolutionKey) {
  if (!RESOLUTIONS.some(r => r.key === key)) throw new Error('Unknown resolution');
  resolution = key;
  const r = mode();
  scene = createStudyScene(r.width, r.height);
  water = createStudyWaterRenderer(scene);
  canvas.width = r.width; canvas.height = r.height;
  document.querySelector<HTMLSelectElement>('#study-resolution')!.value = key;
  document.querySelector('#study-resolution-info')!.textContent = `${r.scale1080} × nguyên → 1920 × 1080. Một art pixel = ${r.scale1080} × ${r.scale1080} output pixels.`;
  fitPreview(); dirty = true;
}
function compose(s: StudyScene, w: WaterRenderer, t: number, options: Settings, target: HTMLCanvasElement) {
  const objects = s.renderObjects(t, options.wind);
  w.render(t, options, objects);
  const ctx = target.getContext('2d', { alpha: false })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(s.ground, 0, 0); ctx.drawImage(w.canvas, 0, 0);
  ctx.drawImage(objects, 0, 0); ctx.drawImage(s.foreground, 0, 0);
}
function render() {
  const start = performance.now(); compose(scene, water, time, settings, canvas);
  renderCost = performance.now() - start;
  dirty = false; fpsFrames++; canvas.dataset.ready = 'true';
}
function frame(now: number) {
  const dt = (now - lastFrame) / 1000; lastFrame = now;
  if (!document.hidden) {
    time = advanceTime(time, dt, settings.speed, settings.paused);
    if (dirty || (!settings.paused && now - lastRender >= 1000 / 60 - 1)) { render(); lastRender = now; }
    if (now - fpsStart >= 1000) {
      measuredFPS = fpsFrames / ((now - fpsStart) / 1000); fpsStart = now; fpsFrames = 0;
      document.querySelector('#study-metrics')!.innerHTML = `<span>${renderCost.toFixed(1)} ms / render · ${settings.paused ? 'paused' : measuredFPS.toFixed(0) + ' FPS observed'}</span><span>Presentation target 60 Hz · CPU Canvas 2D</span><span>60 Hz budget: 16.7 ms · physical mobile chưa đo</span>`;
    }
  }
  frameId = requestAnimationFrame(frame);
}
function makeCanvas(width: number, height: number) {
  const c = document.createElement('canvas'); c.width = width; c.height = height; return c;
}
function upscale1080(native: HTMLCanvasElement) {
  const c = makeCanvas(1920, 1080); const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false; ctx.drawImage(native, 0, 0, c.width, c.height); return c;
}
async function blobURL(c: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => c.toBlob(b => b ? resolve(b) : reject(new Error('PNG encoding failed')), 'image/png'));
  const url = URL.createObjectURL(blob); urls.push(url); return url;
}
async function downloadCanvas(c: HTMLCanvasElement, name: string) {
  const a = document.createElement('a'); a.href = await blobURL(c); a.download = name; a.click();
}
function freezeComparison() {
  time = 3.25; settings.paused = true; updatePause();
  water = createStudyWaterRenderer(scene);
  water.addRipple(Math.round(320 * scene.camera.scale + scene.camera.offsetX), Math.round(270 * scene.camera.scale), 2.9);
  dirty = true; render();
}
const crops = [
  { key: 'banyan', label: 'Cây đa — tán, rễ và thân', x: 25, y: 20, w: 220, h: 205 },
  { key: 'lotus', label: 'Hoa sen — cụm màu và cánh hoa', x: 260, y: 303, w: 120, h: 92 },
  { key: 'brick', label: 'Gạch đỏ, rêu và ven bờ', x: -22, y: 185, w: 84, h: 48 },
  { key: 'stairs', label: 'Bậc cấp — cạnh và khe đá', x: 335, y: 117, w: 90, h: 88 },
  { key: 'reflection', label: 'Phản chiếu — mái đình và mặt nước', x: 402, y: 188, w: 220, h: 77 },
];
async function buildComparison() {
  const button = document.querySelector<HTMLButtonElement>('#study-compare')!;
  if (button.disabled) return;
  button.disabled = true; button.textContent = 'Đang dựng…';
  status.textContent = 'Đang vẽ native bốn grid và xuất ảnh cùng khung hình…';
  await new Promise(requestAnimationFrame);
  try {
    for (const url of urls) URL.revokeObjectURL(url); urls.length = 0;
    const frames: HTMLCanvasElement[] = [];
    const metadata: { key: string; width: number; height: number; scale1080: number; meanRenderMs: number; cameraScale: number; cameraOffsetX: number }[] = [];
    const compareSettings = { ...defaultSettings, paused: true };
    const gallery = document.querySelector('#study-gallery')!; gallery.innerHTML = '';
    const downloads = document.querySelector('#study-downloads')!; downloads.innerHTML = '';
    const closeups = document.querySelector('#study-closeups')!; closeups.innerHTML = '';
    for (const r of RESOLUTIONS) {
      const s = createStudyScene(r.width, r.height); const w = createStudyWaterRenderer(s);
      w.addRipple(Math.round(320 * s.camera.scale + s.camera.offsetX), Math.round(270 * s.camera.scale), 2.9);
      const native = makeCanvas(r.width, r.height);
      compose(s, w, 3.25, compareSettings, native);
      let total = 0;
      for (let i = 0; i < 8; i++) { const start = performance.now(); compose(s, w, 3.25, compareSettings, native); total += performance.now() - start; }
      const output = upscale1080(native); frames.push(output);
      const url = await blobURL(output);
      const mean = total / 8;
      metadata.push({ key: r.key, width: r.width, height: r.height, scale1080: r.scale1080, meanRenderMs: mean, cameraScale: s.camera.scale, cameraOffsetX: s.camera.offsetX });
      const figure = document.createElement('figure');
      figure.innerHTML = `<img src="${url}" alt="Ao làng native ${r.width}×${r.height}, xuất 1080p scale ${r.scale1080} lần"/><figcaption><span>${r.width} × ${r.height} · ${r.scale1080} px / art pixel</span><a id="download-${r.key}" href="${url}" download="ao-lang-${r.key}-1080p.png">PNG 1080p ↗</a></figcaption><small>${mean.toFixed(2)} ms / native render sampled · ${mean <= 16.7 ? 'trong' : 'vượt'} budget 16.7 ms (không phải benchmark thiết bị thật)</small>`;
      gallery.append(figure);
    }
    const sheet = makeCanvas(3840, 2240); const sc = sheet.getContext('2d')!;
    sc.fillStyle = '#f4f3eb'; sc.fillRect(0, 0, sheet.width, sheet.height); sc.font = '20px sans-serif'; sc.imageSmoothingEnabled = false;
    for (let i = 0; i < frames.length; i++) { const x = (i % 2) * 1920, y = Math.floor(i / 2) * 1120; sc.fillStyle = '#304137'; sc.fillText(RESOLUTIONS[i].key.replace('x', ' × ') + ' native · ' + RESOLUTIONS[i].scale1080 + 'px / art pixel · t=3.25s', x + 20, y + 28); sc.drawImage(frames[i], x, y + 40); }
    const sheetURL = await blobURL(sheet);
    downloads.innerHTML = `<a class="study-button primary" id="download-contact" href="${sheetURL}" download="ao-lang-density-contact.png">Tải bảng đối chiếu đầy đủ ↗</a>`;
    for (const crop of crops) {
      const outScale = 1080 / 400, outOffset = (1920 - 640 * outScale) / 2;
      const x = Math.round(crop.x * outScale + outOffset), y = Math.round(crop.y * outScale);
      const width = Math.round(crop.w * outScale), height = Math.round(crop.h * outScale);
      const strip = makeCanvas(width * 4, height + 34); const ctx = strip.getContext('2d')!;
      ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#f4f3eb'; ctx.fillRect(0, 0, strip.width, strip.height); ctx.font = '16px sans-serif'; ctx.fillStyle = '#304137';
      for (let i = 0; i < 4; i++) { ctx.fillText(RESOLUTIONS[i].key.replace('x', ' × '), i * width + 10, 23); ctx.drawImage(frames[i], x, y, width, height, i * width, 34, width, height); }
      const url = await blobURL(strip);
      const figure = document.createElement('figure'); figure.innerHTML = `<figcaption>${crop.label} · <a id="download-crop-${crop.key}" href="${url}" download="ao-lang-crop-${crop.key}.png">Tải ảnh 100% ↗</a></figcaption><img src="${url}" alt="Đối chiếu cận cảnh: ${crop.label}, thứ tự 320, 480, 640, 960"/>`; closeups.append(figure);
    }
    comparisonMetadata = metadata;
    document.querySelector<HTMLElement>('#study-comparison')!.hidden = false;
    status.textContent = 'Đã tạo 4 ảnh 1080p + bảng đối chiếu + 5 cận cảnh. Xem ảnh trước khi chốt hướng.';
    document.querySelector('#study-comparison')!.scrollIntoView({ behavior: 'instant', block: 'start' });
  } catch (error) {
    status.textContent = 'Chưa tạo được bộ so sánh: ' + String(error);
    throw error;
  } finally { button.disabled = false; button.textContent = 'Tạo lại bộ so sánh'; }
}

document.querySelector('#study-resolution')!.addEventListener('change', event => setResolution((event.target as HTMLSelectElement).value as ResolutionKey));
document.querySelector('#study-palette')!.addEventListener('change', event => { settings.palette = (event.target as HTMLSelectElement).value as Settings['palette']; dirty = true; });
document.querySelector('#study-pause')!.addEventListener('click', () => { settings.paused = !settings.paused; updatePause(); dirty = true; });
document.querySelector('#study-freeze')!.addEventListener('click', freezeComparison);
document.querySelector('#study-compare')!.addEventListener('click', () => { void buildComparison().catch(console.error); });
document.querySelector('#study-export')!.addEventListener('click', () => { render(); void downloadCanvas(upscale1080(canvas), `ao-lang-${resolution}-1080p.png`); });
for (const key of effects) document.querySelector('#study-' + key)!.addEventListener('change', event => { settings[key] = (event.target as HTMLInputElement).checked; dirty = true; });
for (const key of ['wind', 'distortion'] as const) document.querySelector('#study-' + key)!.addEventListener('input', event => {
  settings[key] = Number((event.target as HTMLInputElement).value);
  document.querySelector('#study-' + key + '-value')!.textContent = key === 'distortion' ? settings[key] + ' px @ 640' : settings[key].toFixed(1); dirty = true;
});
let dragging = false, lastRipple = -Infinity;
function pointerRipple(event: PointerEvent) {
  if (event.timeStamp - lastRipple < 90) return;
  const point = toScenePoint(event.clientX, event.clientY, canvas.getBoundingClientRect(), canvas.width, canvas.height);
  if (water.addRipple(point.x, point.y, time)) { dirty = true; lastRipple = event.timeStamp; }
}
canvas.addEventListener('pointerdown', event => { if (event.button !== 0) return; dragging = true; canvas.setPointerCapture(event.pointerId); lastRipple = -Infinity; pointerRipple(event); });
canvas.addEventListener('pointermove', event => { if (dragging) pointerRipple(event); });
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointercancel', () => { dragging = false; });
canvas.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); water.addRipple(Math.round(320 * scene.camera.scale + scene.camera.offsetX), Math.round(270 * scene.camera.scale), time); dirty = true; } });
const observer = new ResizeObserver(fitPreview); observer.observe(viewport);
document.addEventListener('visibilitychange', () => { lastFrame = performance.now(); });
window.addEventListener('pagehide', event => { cancelAnimationFrame(frameId); if (!event.persisted) { observer.disconnect(); for (const url of urls) URL.revokeObjectURL(url); } });
window.addEventListener('pageshow', event => { if (event.persisted) { lastFrame = performance.now(); frameId = requestAnimationFrame(frame); } });
Object.defineProperty(window, '__DENSITY_STUDY__', { value: {
  get resolution() { return resolution; }, get time() { return time; }, get settings() { return { ...settings }; },
  get frameCost() { return renderCost; }, get fps() { return measuredFPS; }, get rippleCount() { return water.rippleCount; },
  get comparisonMetadata() { return comparisonMetadata; },
  setResolution, freeze: freezeComparison, buildComparison,
  get layers() { return { scene, water, canvas }; },
}, configurable: true });
setResolution(DEFAULT_RESOLUTION); updatePause(); render(); frameId = requestAnimationFrame(frame);
if (new URLSearchParams(location.search).has('compare')) { freezeComparison(); void buildComparison().catch(console.error); }
