import './style.css';
import { createScene } from './scene';
import { createWaterRenderer } from './water';
import { WIDTH, HEIGHT, defaultSettings, type Settings, type PaletteName } from './types';
import { advanceTime, toScenePoint } from './runtime';

const icons = {
 lotus: '<path d="M12 20c-6 0-9-4-9-9 5 0 8 2 9 6 1-4 4-6 9-6 0 5-3 9-9 9Z"/><path d="M12 17c-4-4-4-8 0-13 4 5 4 9 0 13Z"/>',
 pause: '<path d="M8 5v14M16 5v14"/>',
 play: '<path d="m8 5 11 7-11 7Z"/>',
 camera: '<path d="M3 7h5l2-3h4l2 3h5v13H3Z"/><circle cx="12" cy="13" r="4"/>',
 expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 wind: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3"/>',
 drop: '<path d="M12 3C9 8 5 11 5 15a7 7 0 0 0 14 0c0-4-4-7-7-12Z"/>',
 reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
 arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
 close: '<path d="m6 6 12 12M6 18 18 6"/>'
};
function icon(name: keyof typeof icons) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + '</svg>'; }
const effects: [keyof Settings, string, string][] = [
 ['depth', 'Độ sâu', 'Distance field'], ['sky', 'Ánh trời', 'Sky illumination'],
 ['reflections', 'Phản chiếu', 'Live reflections'], ['shoreline', 'Ven bờ', 'Shore interaction'],
 ['backBank', 'Bóng bờ', 'Back-bank reflection'],
 ['particles', 'Gợn & lá', 'Water particles']
];
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<header class="site-header">
 <a class="brand" href="./" aria-label="Ao Làng trang chủ"><span class="brand-mark">${icon('lotus')}</span><span>ao làng<span class="brand-dot">.</span></span></a>
 <div class="header-note"><span class="status-dot"></span> A LIVING PIXEL STUDY <span class="edition">/ № 001</span></div>
 <button class="text-button" id="about-open">Về góc ao này <span>↗</span></button>
</header>
<main id="main">
 <section class="intro" aria-labelledby="title">
  <div><div class="eyebrow"><span>ĐỒNG BẰNG BẮC BỘ, VIỆT NAM</span><span class="small-line"></span> 20°58′ N · 106°00′ E</div>
   <h1 id="title">Một thoáng <em>ao làng.</em></h1>
   <p>Nơi bóng đa chạm nước, và thời gian trôi chậm hơn một chút.</p>
  </div>
  <div class="intro-aside">Không cần đi xa.<br/>Chỉ cần ngồi lại bên bờ.</div>
 </section>
 <section class="workspace" aria-label="Tranh pixel tương tác và bảng điều khiển">
  <div class="art-column">
   <div class="art-frame" id="art-frame">
    <canvas id="pond" width="640" height="400" tabindex="0" role="img" aria-label="Ao làng pixel art động: cây đa, đình làng, hoa sen và phản chiếu. Bấm hoặc chạm mặt nước để tạo gợn sóng; Enter tạo sóng giữa ao."></canvas>
    <div class="scene-label"><span class="status-dot"></span><span id="scene-caption">BUỔI CHIỀU ÊM</span></div>
    <div class="canvas-toolbar">
     <button id="pause" class="canvas-button" aria-label="Tạm dừng chuyển động" aria-pressed="false" title="Tạm dừng · Space">${icon('pause')}</button>
     <span class="toolbar-rule"></span>
     <button id="save" class="canvas-button" aria-label="Lưu ảnh pixel art PNG" title="Lưu ảnh PNG">${icon('camera')}</button>
     <button id="fullscreen" class="canvas-button" aria-label="Xem toàn màn hình" title="Toàn màn hình · F">${icon('expand')}</button>
    </div>
   </div>
   <div class="art-caption"><span><span class="pointer-mark">◎</span> Chạm mặt nước, để một gợn sóng đi xa.</span><span class="resolution">640 × 400 <span>·</span> VẼ BẰNG CODE</span></div>
  </div>
  <aside class="inspector" aria-label="Điều chỉnh mặt nước">
   <div class="inspector-heading"><div><span class="eyebrow">GÓC THỬ NGHIỆM</span><h2>Nhịp của nước</h2></div><span class="inspector-icon">${icon('drop')}</span></div>
   <fieldset class="palette-field"><legend>SẮC NƯỚC</legend><div class="palette-options">
    <button class="palette-option selected" data-palette="jade" aria-pressed="true"><span class="palette-preview jade"><i></i><i></i><i></i></span><span>Ngọc bích</span></button>
    <button class="palette-option" data-palette="golden" aria-pressed="false"><span class="palette-preview golden"><i></i><i></i><i></i></span><span>Nắng mật</span></button>
    <button class="palette-option" data-palette="moon" aria-pressed="false"><span class="palette-preview moon"><i></i><i></i><i></i></span><span>Trăng xanh</span></button>
   </div></fieldset>
   <div class="control-group">
    <div class="range-heading"><label for="distortion">Độ lay bóng</label><output id="distortion-value" for="distortion">2 px</output></div>
    <input id="distortion" type="range" min="0" max="6" value="2" step="0.5"/>
    <div class="range-heading"><label for="speed">Nhịp thời gian</label><output id="speed-value" for="speed">1.0×</output></div>
    <input id="speed" type="range" min="0.25" max="2" value="1" step="0.25"/>
    <div class="range-heading"><label for="wind">Gió qua tán đa</label><output id="wind-value" for="wind">Nhè nhẹ</output></div>
    <input id="wind" type="range" min="0" max="2" value="0.6" step="0.1"/>
   </div>
   <fieldset class="effects-field"><legend>TỪNG LỚP CHUYỂN ĐỘNG</legend>
    ${effects.map(([key, label, description]) => `<label class="effect-row" title="${description}"><span>${label}</span><input type="checkbox" id="effect-${key}" checked/><span class="switch" aria-hidden="true"></span></label>`).join('')}
   </fieldset>
   <div class="rain-control"><div class="range-heading"><label for="rain">${icon('drop')} Một cơn mưa</label><output id="rain-value" for="rain">Tạnh ráo</output></div><input id="rain" type="range" min="0" max="1" value="0" step="0.1"/></div>
   <button id="reset" class="reset-button">${icon('reset')} Trở về bình yên</button>
  </aside>
 </section>
 <section class="footnotes" aria-label="Về kỹ thuật">
  <div class="footnote"><span class="footnote-index">01 /</span><div><h3>Một chút quê nhà</h3><p>Cây đa, bến nước, mái đình. Chất liệu từ những ngôi làng cổ Bắc Bộ.</p></div></div>
  <div class="footnote"><span class="footnote-index">02 /</span><div><h3>Từng pixel đang sống</h3><p>10 sắc nước. Phản chiếu thời gian thực. Không một khung hình nước dựng sẵn.</p></div></div>
  <a class="source-link" href="https://www.spritecook.ai/blog/pixel-art-pond-water-reflections-ripples" target="_blank" rel="noreferrer">Cảm hứng kỹ thuật<br/><strong>SpriteCook ${icon('arrow')}</strong></a>
 </section>
</main>
<footer><span>AO LÀNG <span class="footer-separator">/</span> THE VILLAGE POND</span><span>Một khoảng lặng, làm từ những ô vuông.</span><span id="render-status">CANVAS 2D · LIVE</span></footer>
<dialog id="about-dialog" aria-labelledby="about-title"><button class="dialog-close" id="about-close" aria-label="Đóng giới thiệu">${icon('close')}</button><span class="eyebrow">GHI CHÉP BÊN AO</span><h2 id="about-title">Quê nhà, qua từng pixel.</h2><p>Một nghiên cứu tương tác lấy chất liệu từ ao làng Bắc Bộ: rễ đa buông xuống, mái đình ngói cũ, bậc đá rêu và những cành sen vươn khỏi mặt nước.</p><p>Cảnh được vẽ nguyên bản bằng code theo bốn bảng ảnh tham khảo bạn cung cấp. Nước chạy bằng bộ đệm 10 màu: độ sâu từ khoảng cách tới bờ, ánh trời theo dải, phản chiếu lật dọc và biến dạng từng hàng, vệt sáng ven bờ cùng các vòng gợn động.</p><p>Ba bảng màu chỉ đổi sắc nước, không giả lập đầy đủ chiếu sáng ngày/đêm cho toàn cảnh. Lấy cảm hứng kỹ thuật từ SpriteCook; không dùng lại asset của họ.</p><div class="dialog-note">CHẠM / KÉO TRÊN NƯỚC → GỢN SÓNG<br/>SPACE → TẠM DỪNG · F → TOÀN MÀN HÌNH<br/>ENTER KHI CHỌN TRANH → GỢN GIỮA AO</div></dialog>
<div id="toast" role="status" aria-live="polite"></div>
`;

const settings: Settings = { ...defaultSettings };
settings.paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = createScene();
const water = createWaterRenderer(scene);
const canvas = document.querySelector<HTMLCanvasElement>('#pond')!;
const ctx = canvas.getContext('2d', { alpha: false })!;
ctx.imageSmoothingEnabled = false;
let time = 0;
let lastFrame = performance.now();
let lastRender = -Infinity;
let dirty = true;
let frameCost = 0;
let renders = 0;
let lastStatus = 0;
let frameId = 0;
let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) {
 const el = document.querySelector<HTMLDivElement>('#toast')!;
 el.textContent = message; el.classList.add('visible');
 clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 2600);
}
function updatePause() {
 const button = document.querySelector<HTMLButtonElement>('#pause')!;
 button.innerHTML = icon(settings.paused ? 'play' : 'pause');
 button.setAttribute('aria-label', settings.paused ? 'Tiếp tục chuyển động' : 'Tạm dừng chuyển động');
 button.setAttribute('aria-pressed', String(settings.paused));
 document.querySelector('#scene-caption')!.textContent = settings.paused ? 'MỘT KHOẢNG LẶNG' : 'BUỔI CHIỀU ÊM';
}
function render() {
 const start = performance.now();
 const objects = scene.renderObjects(time, settings.wind);
 water.render(time, settings, objects);
 ctx.drawImage(scene.ground, 0, 0);
 ctx.drawImage(water.canvas, 0, 0);
 ctx.drawImage(objects, 0, 0);
 ctx.drawImage(scene.foreground, 0, 0);
 frameCost = performance.now() - start; renders++; dirty = false;
 canvas.dataset.ready = 'true';
}
function frame(now: number) {
 const delta = (now - lastFrame) / 1000;
 lastFrame = now;
 if (!document.hidden) {
  time = advanceTime(time, delta, settings.speed, settings.paused);
  if (dirty || (!settings.paused && now - lastRender >= 1000 / 30)) {
   render(); lastRender = now;
  }
  if (now - lastStatus > 1500) {
   document.querySelector('#render-status')!.textContent = settings.paused ? 'CANVAS 2D · PAUSED' : 'CANVAS 2D · LIVE';
   lastStatus = now;
  }
 }
 frameId = requestAnimationFrame(frame);
}
const rangeFormats = {
 distortion: (v: number) => v + ' px', speed: (v: number) => v.toFixed(1) + '×',
 wind: (v: number) => v === 0 ? 'Lặng gió' : v < 0.8 ? 'Nhè nhẹ' : v < 1.5 ? 'Lộng gió' : 'Gió mạnh',
 rain: (v: number) => v === 0 ? 'Tạnh ráo' : v < .4 ? 'Mưa bụi' : v < .8 ? 'Mưa rào' : 'Mưa nặng hạt'
};
function updateControls() {
 for (const key of ['distortion', 'speed', 'wind', 'rain'] as const) {
  document.querySelector<HTMLInputElement>('#' + key)!.value = String(settings[key]);
  document.querySelector<HTMLOutputElement>('#' + key + '-value')!.value = rangeFormats[key](settings[key]);
 }
 for (const [key] of effects) document.querySelector<HTMLInputElement>('#effect-' + key)!.checked = Boolean(settings[key]);
 document.querySelectorAll<HTMLButtonElement>('[data-palette]').forEach(button => {
  const selected = button.dataset.palette === settings.palette;
  button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
 });
 updatePause();
}
for (const key of ['distortion', 'speed', 'wind', 'rain'] as const) {
 document.querySelector<HTMLInputElement>('#' + key)!.addEventListener('input', event => {
  settings[key] = Number((event.target as HTMLInputElement).value);
  document.querySelector<HTMLOutputElement>('#' + key + '-value')!.value = rangeFormats[key](settings[key]); dirty = true;
 });
}
for (const [key] of effects) {
 document.querySelector<HTMLInputElement>('#effect-' + key)!.addEventListener('change', event => {
  (settings[key] as boolean) = (event.target as HTMLInputElement).checked; dirty = true;
 });
}
document.querySelectorAll<HTMLButtonElement>('[data-palette]').forEach(button => button.addEventListener('click', () => {
 settings.palette = button.dataset.palette as PaletteName; updateControls(); dirty = true;
}));
document.querySelector('#pause')!.addEventListener('click', () => { settings.paused = !settings.paused; updatePause(); dirty = true; });
document.querySelector('#reset')!.addEventListener('click', () => {
 Object.assign(settings, defaultSettings, { paused: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
 updateControls(); dirty = true; toast('Gió nhẹ, nước êm. Về lại bên ao.');
});
let dragging = false;
let lastRippleAt = -Infinity;
function makeRipple(event: PointerEvent, force = false) {
 if (!force && event.timeStamp - lastRippleAt < 85) return;
 const point = toScenePoint(event.clientX, event.clientY, canvas.getBoundingClientRect(), WIDTH, HEIGHT);
 if (water.addRipple(point.x, point.y, time, force ? 1 : .55)) { dirty = true; lastRippleAt = event.timeStamp; }
}
canvas.addEventListener('pointerdown', event => {
 if (event.button !== 0) return;
 dragging = true; canvas.setPointerCapture(event.pointerId); makeRipple(event, true);
});
canvas.addEventListener('pointermove', event => { if (dragging) makeRipple(event); });
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointercancel', () => { dragging = false; });
canvas.addEventListener('keydown', event => {
 if (event.key === 'Enter') { event.preventDefault(); water.addRipple(320, 270, time); dirty = true; }
});
document.querySelector('#save')!.addEventListener('click', () => {
 render();
 const output = document.createElement('canvas'); output.width = WIDTH * 3; output.height = HEIGHT * 3;
 const out = output.getContext('2d')!; out.imageSmoothingEnabled = false; out.drawImage(canvas, 0, 0, output.width, output.height);
 output.toBlob(blob => {
  if (!blob) { toast('Chưa lưu được ảnh. Thử lại nhé.'); return; }
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = 'ao-lang-' + settings.palette + '.png'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000); toast('Đã lưu một thoáng ao làng · 1920 × 1200 PNG');
 }, 'image/png');
});
async function toggleFullscreen() {
 try {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.querySelector('#art-frame')!.requestFullscreen();
 } catch { toast('Trình duyệt chưa hỗ trợ toàn màn hình.'); }
}
document.querySelector('#fullscreen')!.addEventListener('click', toggleFullscreen);
const dialog = document.querySelector<HTMLDialogElement>('#about-dialog')!;
document.querySelector('#about-open')!.addEventListener('click', () => dialog.showModal());
document.querySelector('#about-close')!.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
document.addEventListener('keydown', event => {
 if (dialog.open || (event.target instanceof HTMLElement && event.target.closest('input, button, select, textarea, a'))) return;
 if (event.code === 'Space') { event.preventDefault(); settings.paused = !settings.paused; updatePause(); dirty = true; }
 if (event.key.toLowerCase() === 'f') { event.preventDefault(); void toggleFullscreen(); }
});
document.addEventListener('visibilitychange', () => { lastFrame = performance.now(); });
window.addEventListener('pagehide', () => { cancelAnimationFrame(frameId); clearTimeout(toastTimer); });
window.addEventListener('pageshow', event => { if (event.persisted) { lastFrame = performance.now(); dirty = true; frameId = requestAnimationFrame(frame); } });
Object.defineProperty(window, '__AO_LANG__', { value: {
 get settings() { return { ...settings }; }, get time() { return time; }, get rippleCount() { return water.rippleCount; },
 get frameCost() { return frameCost; }, get renders() { return renders; },
 isWater(x: number, y: number) { return Boolean(scene.mask[Math.floor(y) * WIDTH + Math.floor(x)]); }
}, configurable: true });
updateControls(); render(); frameId = requestAnimationFrame(frame);
