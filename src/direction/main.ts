import './style.css';
import { createDirectionScene, type DirectionScene } from './scene';
import { createDirectionWaterRenderer } from './water';
import { defaultSettings, type Settings, type WaterRenderer } from '../types';
type ResolutionKey = '640x360' | '960x540';

const resolutions: Record<ResolutionKey, { width: number; height: number; scale: number }> = {
  '640x360': { width: 640, height: 360, scale: 3 },
  '960x540': { width: 960, height: 540, scale: 2 },
};
const effects = [
  { key: 'depth', label: 'Độ sâu' }, { key: 'sky', label: 'Ánh trời' },
  { key: 'reflections', label: 'Phản chiếu' }, { key: 'shoreline', label: 'Ven bờ' },
  { key: 'backBank', label: 'Bóng bờ' }, { key: 'particles', label: 'Gợn & lá' },
] as const;

document.querySelector<HTMLDivElement>('#direction-app')!.innerHTML = `
<div class="direction-shell">
  <header class="direction-header"><a class="direction-brand" href="/">ao làng<span>.</span></a><nav class="direction-nav" aria-label="Điều hướng"><a href="/">← Bản chính</a><a href="/study.html">Bản study</a></nav></header>
  <main>
    <section class="direction-intro"><div><div class="direction-kicker">LIVE ART DIRECTION · AO LÀNG</div><h1>Mặt ao, đang thở.</h1><p>Một lượt xem trực tiếp cho hướng mỹ thuật đã duyệt: mặt nước và phản chiếu chuyển động; tán cây, rễ và một vài phần hoa sen lay rất nhẹ. Đình, gạch và bờ đá vẫn neo yên.</p></div><aside class="direction-note"><strong>BẢN THỬ · CHƯA CHỐT GRID</strong>640 × 360 là mốc xem tạm. 960 × 540 là đối chiếu cùng khung hình, không phải lựa chọn cuối.</aside></section>
    <section class="direction-layout" aria-label="Art direction đang chuyển động">
      <div class="direction-art"><div class="art-frame" id="art-frame"><canvas id="direction-canvas" tabindex="0" role="img" aria-label="Ao làng đang chuyển động. Nhấn Enter để tạo gợn an toàn trên mặt nước."></canvas></div><div class="art-caption"><span id="pixel-label">Đang nạp lưới native…</span><span>Preview nearest-neighbor · không phải phán xét pixel native</span></div><p class="direction-status" id="direction-status" role="status" aria-live="polite">Đang nạp bản vẽ và lớp nước…</p></div>
      <aside class="direction-panel" aria-label="Điều khiển chuyển động và khung hình"><h2>Ngắm mặt nước.</h2>
        <div class="control-block full"><div class="control-heading"><label>HÌNH ẢNH</label><span id="mode-description">Nước &amp; cây lay nhẹ</span></div><div class="mode-switch" role="group" aria-label="Chọn hình ảnh"><button id="mode-static" type="button" aria-pressed="false">Art tĩnh</button><button id="mode-live" type="button" aria-pressed="true">Lively</button></div></div>
        <div class="control-block full"><div class="control-heading"><label for="resolution">GRID SO SÁNH</label><span>16:9</span></div><select class="direction-select" id="resolution"><option value="640x360" selected>640 × 360 · provisional</option><option value="960x540">960 × 540 · comparison</option></select></div>
        <div class="control-block full"><div class="control-heading"><label for="palette">SẮC NƯỚC</label><span>chỉ đổi nước</span></div><select class="direction-select" id="palette" aria-label="Chọn bảng màu nước"><option value="jade">Ngọc bích</option><option value="golden">Nắng mật</option><option value="moon">Trăng xanh</option></select><p class="palette-note">Bảng màu chỉ đổi nước, không chiếu sáng lại toàn cảnh.</p></div>
        <div class="control-block full"><div class="direction-buttons control-buttons"><button class="direction-button primary" id="pause" type="button" aria-pressed="false">Tạm dừng</button><button class="direction-button" id="fullscreen" type="button">Toàn màn hình</button></div></div>
        <div class="control-block"><div class="control-heading"><label for="wind">Gió</label><output id="wind-value">0.6</output></div><input class="direction-range" id="wind" type="range" min="0" max="1.5" step="0.1" value="0.6"><div class="range-subline"><span>lặng</span><span>nhẹ</span><span>1.5</span></div></div>
        <div class="control-block"><div class="control-heading"><label for="distortion">Lay phản chiếu</label><output id="distortion-value">1.0 px</output></div><input class="direction-range" id="distortion" type="range" min="0" max="4" step="0.1" value="1"><div class="range-subline"><span>tĩnh</span><span>4 px</span></div></div>
        <div class="control-block"><div class="control-heading"><label for="speed">Tốc độ</label><output id="speed-value">1.0×</output></div><input class="direction-range" id="speed" type="range" min="0.25" max="2" step="0.05" value="1"><div class="range-subline"><span>chậm</span><span>nhanh</span></div></div>
        <div class="control-block"><div class="control-heading"><label for="rain">Mưa nhẹ</label><output id="rain-value">Tắt</output></div><input class="direction-range" id="rain" type="range" min="0" max="1.5" step="0.1" value="0"><div class="range-subline"><span>tắt</span><span>nhẹ</span></div></div>
        <div class="control-block full"><h3 class="detail-heading">Chi tiết nước</h3><div class="effect-list">${effects.map(({ key, label }) => `<label class="effect-row" for="effect-${key}"><input id="effect-${key}" type="checkbox" checked><span>${label}</span></label>`).join('')}</div></div>
        <div class="control-block full"><div class="direction-buttons"><button class="direction-button primary" id="export" type="button">Tải PNG 1080p</button><a class="direction-button" id="download-link" hidden>PNG đã sẵn sàng ↗</a></div><p class="export-note" id="export-note">Native pixel nguyên ×3 / ×2 · 1920 × 1080</p></div>
        <div class="direction-metrics full" id="metrics">Canvas 2D · đang khởi tạo…</div>
      </aside>
    </section>
    <div class="direction-bottom"><p>Chạm hoặc kéo trên mặt nước để tạo gợn. Chạm bờ/lan can sẽ không tạo gợn; nhấn Enter khi canvas được chọn để tạo gợn tại điểm an toàn. Art tĩnh dùng cùng khung và cùng lưới để so với bản lively.</p><a href="/">← Trở về bản gốc, không thay đổi</a></div>
  </main>
  <footer class="direction-footer"><span>AO LÀNG / LIVE DIRECTION REVIEW</span><span>Art đã duyệt · chuyển động và lưới vẫn đang được xem xét</span></footer>
</div>`;

const canvas = document.querySelector<HTMLCanvasElement>('#direction-canvas')!;
const viewport = document.querySelector<HTMLDivElement>('#art-frame')!;
const status = document.querySelector<HTMLElement>('#direction-status')!;
const selector = document.querySelector<HTMLSelectElement>('#resolution')!;
const settings: Settings = { ...defaultSettings, distortion: 1, paused: matchMedia('(prefers-reduced-motion: reduce)').matches };
let scene: DirectionScene | undefined;
let water: WaterRenderer | undefined;
let resolution: ResolutionKey = '640x360';
let simulationTime = 0;
let lastFrame = performance.now();
let lastRender = -Infinity;
let dirty = true;
let frameId = 0;
let renderCost = 0;
let observedFrames = 0;
let fpsSince = performance.now();
let fps = 0;
let staticMode = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let pointerDown = false;
let lastRippleAt = -Infinity;
let disposed = false;
let loadGeneration = 0;
let downloadUrl: string | undefined;

function say(message: string, kind = '') {
  status.textContent = message;
  status.dataset.kind = kind;
}
function fitPreview() {
  const dims = resolutions[resolution];
  const inset = 12;
  const availableW = Math.max(1, viewport.clientWidth - inset);
  const availableH = Math.max(1, viewport.clientHeight - inset);
  const integerScale = Math.floor(Math.min(availableW / dims.width, availableH / dims.height));
  // Keep whole native pixels on large displays. On narrow viewports, fit responsively
  // with nearest-neighbour sampling; label this explicitly rather than implying native review.
  const scale = integerScale >= 1 ? integerScale : Math.min(availableW / dims.width, availableH / dims.height);
  canvas.style.width = `${Math.max(1, Math.floor(dims.width * scale))}px`;
  canvas.style.height = `${Math.max(1, Math.floor(dims.height * scale))}px`;
  const preview = scale >= 1 ? `${scale}× integer preview` : 'responsive preview (not native pixel judgment)';
  document.querySelector('#pixel-label')!.textContent = `${dims.width} × ${dims.height} native · ${preview} · 1080p ×${dims.scale}`;
}
function updateMode() {
  document.querySelector<HTMLButtonElement>('#mode-static')!.setAttribute('aria-pressed', String(staticMode));
  document.querySelector<HTMLButtonElement>('#mode-live')!.setAttribute('aria-pressed', String(!staticMode));
  document.querySelector('#mode-description')!.textContent = staticMode ? 'Bản gốc tĩnh · cùng lưới' : 'Nước & cây lay nhẹ';
  canvas.setAttribute('aria-label', staticMode
    ? 'Art tĩnh cùng lưới; ảnh gốc đã duyệt.'
    : 'Mặt nước, tán cây, rễ và một vài phần hoa sen chuyển động nhẹ. Nhấn Enter để tạo gợn an toàn trên mặt nước.');
}
function updatePause() {
  const button = document.querySelector<HTMLButtonElement>('#pause')!;
  button.textContent = settings.paused ? 'Tiếp tục' : 'Tạm dừng';
  button.setAttribute('aria-pressed', String(settings.paused));
}
function paint(target: HTMLCanvasElement, time: number) {
  if (!scene || !water) throw new Error('Direction scene is not ready');
  const ctx = target.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  ctx.imageSmoothingEnabled = false;
  if (staticMode) {
    ctx.drawImage(scene.original, 0, 0);
  } else {
    const objects = scene.renderObjects(time, settings.wind);
    water.render(time, settings, objects);
    ctx.drawImage(scene.ground, 0, 0);
    ctx.drawImage(water.canvas, 0, 0);
    ctx.drawImage(objects, 0, 0);
    ctx.drawImage(scene.foreground, 0, 0);
  }
}
function render() {
  if (!scene || !water) return;
  const start = performance.now();
  try {
    paint(canvas, simulationTime);
    renderCost = performance.now() - start;
    dirty = false;
    observedFrames++;
    canvas.dataset.ready = 'true';
  } catch (error) {
    say(`Không thể vẽ cảnh sống: ${String(error)}`, 'error');
    settings.paused = true;
    updatePause();
  }
}
function frame(now: number) {
  if (disposed) return;
  const dt = Math.max(0, Math.min(0.1, (now - lastFrame) / 1000));
  lastFrame = now;
  if (!document.hidden && !settings.paused && !reducedMotion.matches && !staticMode) simulationTime += dt * settings.speed;
  if (!document.hidden && (dirty || (!settings.paused && !reducedMotion.matches && !staticMode && now - lastRender >= 1000 / 60 - 1))) {
    render(); lastRender = now;
  }
  if (now - fpsSince >= 1000) {
    fps = observedFrames / ((now - fpsSince) / 1000); fpsSince = now; observedFrames = 0;
    const rippleCount = water?.rippleCount ?? 0;
    document.querySelector('#metrics')!.textContent = `${renderCost.toFixed(1)} ms / render · ${settings.paused || staticMode ? 'đang giữ khung' : `${fps.toFixed(0)} FPS quan sát`} · ${rippleCount} gợn · mục tiêu trình bày 60 Hz`;
  }
  frameId = requestAnimationFrame(frame);
}
async function changeResolution(key: string) {
  if (key !== '640x360' && key !== '960x540') return;
  const nextKey = key as ResolutionKey;
  const generation = ++loadGeneration;
  selector.disabled = true;
  say(`Đang nạp grid ${key}…`);
  try {
    const nextScene = await createDirectionScene(resolutions[nextKey].width, resolutions[nextKey].height);
    if (generation !== loadGeneration || disposed) { nextScene.dispose(); return; }
    const nextWater = createDirectionWaterRenderer(nextScene);
    const previous = scene;
    scene = nextScene; water = nextWater; resolution = nextKey;
    canvas.width = resolutions[key].width; canvas.height = resolutions[key].height;
    fitPreview(); dirty = true;
    previous?.dispose();
    say(`Grid ${key} sẵn sàng. Mặt nước đang sống${settings.paused ? ' · đã tạm dừng' : ''}.`);
  } catch (error) {
    if (generation === loadGeneration) {
      selector.value = resolution;
      say(`Không nạp được art direction (${key}): ${String(error)}`, 'error');
    }
  } finally { if (generation === loadGeneration) selector.disabled = false; }
}
function safePondPoint() {
  if (!scene) return { x: 0, y: 0 };
  const { width, height } = scene.camera;
  const tx = Math.round(width * 0.5), ty = Math.round(height * 0.73);
  let bestX = tx, bestY = ty, bestScore = -Infinity;
  for (let radius = 0; radius <= Math.max(width, height); radius += 2) {
    let found = false;
    const y0 = Math.max(0, ty - radius), y1 = Math.min(height - 1, ty + radius);
    const x0 = Math.max(0, tx - radius), x1 = Math.min(width - 1, tx + radius);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (Math.max(Math.abs(x - tx), Math.abs(y - ty)) !== radius || !scene.mask[y * width + x]) continue;
      const score = -Math.abs(x - tx) - Math.abs(y - ty) * 0.8;
      if (score > bestScore) { bestScore = score; bestX = x; bestY = y; found = true; }
    }
    if (found) return { x: bestX, y: bestY };
  }
  return { x: bestX, y: bestY };
}
function updateSettingsLabel(key: 'wind' | 'distortion' | 'speed' | 'rain') {
  const value = settings[key];
  const label = key === 'wind' ? value.toFixed(1) : key === 'distortion' ? `${value.toFixed(1)} px` : key === 'speed' ? `${value.toFixed(2).replace(/0$/, '')}×` : value === 0 ? 'Tắt' : value.toFixed(1);
  document.querySelector(`#${key}-value`)!.textContent = label;
}
function makeCanvas(width: number, height: number) {
  const result = document.createElement('canvas'); result.width = width; result.height = height; return result;
}
async function exportPng() {
  const button = document.querySelector<HTMLButtonElement>('#export')!;
  button.disabled = true; button.textContent = 'Đang xuất PNG…';
  try {
    if (!scene || !water) throw new Error('Cảnh chưa sẵn sàng');
    const { width, height, scale } = resolutions[resolution];
    const native = makeCanvas(width, height);
    paint(native, simulationTime);
    const output = makeCanvas(width * scale, height * scale);
    const context = output.getContext('2d', { alpha: false });
    if (!context) throw new Error('Không thể tạo canvas xuất');
    context.imageSmoothingEnabled = false;
    context.drawImage(native, 0, 0, output.width, output.height);
    const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
    const url = URL.createObjectURL(blob);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = url;
    const link = document.querySelector<HTMLAnchorElement>('#download-link')!;
    link.href = url; link.download = `ao-lang-live-${resolution}-1080p.png`; link.hidden = false;
    link.textContent = `PNG 1920 × 1080 đã sẵn sàng · tải ↗`;
    link.click();
    document.querySelector('#export-note')!.textContent = `Đã tạo PNG ${output.width} × ${output.height} · scale nguyên ${scale}× · liên kết tải vẫn sẵn.`;
    say(`Đã mã hóa PNG ${output.width} × ${output.height}; liên kết tải vẫn sẵn bên cạnh nút.`);
  } catch (error) {
    say(`Xuất PNG thất bại: ${String(error)}`, 'error');
    document.querySelector('#export-note')!.textContent = 'Chưa có tệp tải xuống; thử lại sau khi cảnh sẵn sàng.';
  } finally { button.disabled = false; button.textContent = 'Tải PNG 1080p'; }
}

selector.addEventListener('change', event => { void changeResolution((event.currentTarget as HTMLSelectElement).value); });
document.querySelector('#pause')!.addEventListener('click', () => {
  if (reducedMotion.matches) { settings.paused = true; updatePause(); say('Tôn trọng cài đặt giảm chuyển động của thiết bị.', 'warning'); return; }
  settings.paused = !settings.paused; updatePause(); dirty = true; say(settings.paused ? 'Đã giữ nguyên thời gian mô phỏng.' : 'Đã tiếp tục chuyển động.');
});
reducedMotion.addEventListener('change', event => {
  if (event.matches) { settings.paused = true; updatePause(); dirty = true; say('Đã bật giảm chuyển động: mô phỏng được giữ nguyên.', 'warning'); }
});
document.querySelector('#mode-static')!.addEventListener('click', () => { staticMode = true; updateMode(); dirty = true; say('Đang xem bản gốc tĩnh trên cùng grid.'); });
document.querySelector('#mode-live')!.addEventListener('click', () => { staticMode = false; updateMode(); dirty = true; say('Đang xem cảnh nước sống.'); });
document.querySelector('#fullscreen')!.addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await viewport.requestFullscreen(); }
  catch (error) { say(`Toàn màn hình không được phép: ${String(error)}`, 'warning'); }
});
document.querySelector('#export')!.addEventListener('click', () => { void exportPng(); });
document.querySelector<HTMLSelectElement>('#palette')!.value = settings.palette;
document.querySelector<HTMLSelectElement>('#palette')!.addEventListener('change', event => {
  settings.palette = (event.currentTarget as HTMLSelectElement).value as Settings['palette']; dirty = true;
});
for (const key of ['wind', 'distortion', 'speed', 'rain'] as const) {
  document.querySelector<HTMLInputElement>(`#${key}`)!.addEventListener('input', event => {
    settings[key] = Number((event.currentTarget as HTMLInputElement).value);
    updateSettingsLabel(key); dirty = true;
  });
}
for (const { key } of effects) {
  document.querySelector<HTMLInputElement>(`#effect-${key}`)!.addEventListener('change', event => {
    settings[key] = (event.currentTarget as HTMLInputElement).checked; dirty = true;
  });
}
canvas.addEventListener('pointerdown', event => {
  if (staticMode || event.button !== 0 || !water) return;
  pointerDown = true; canvas.setPointerCapture(event.pointerId); lastRippleAt = -Infinity;
  const point = pointerToNative(event);
  const added = water.addRipple(point.x, point.y, simulationTime);
  dirty = true; lastRippleAt = event.timeStamp;
  if (!added) say('Đây là phần đất liền — gợn chỉ xuất hiện trên mặt nước.', 'warning');
  else say('Một gợn nhỏ lan trên mặt nước.');
});
function pointerToNative(event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return { x: Math.floor((event.clientX - rect.left) * canvas.width / rect.width), y: Math.floor((event.clientY - rect.top) * canvas.height / rect.height) };
}
canvas.addEventListener('pointermove', event => {
  if (!pointerDown || !water || event.timeStamp - lastRippleAt < 90) return;
  const point = pointerToNative(event);
  if (water.addRipple(point.x, point.y, simulationTime)) { dirty = true; lastRippleAt = event.timeStamp; }
});
canvas.addEventListener('pointerup', () => { pointerDown = false; });
canvas.addEventListener('pointercancel', () => { pointerDown = false; });
canvas.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || staticMode || !water) return;
  event.preventDefault(); const point = safePondPoint();
  if (water.addRipple(point.x, point.y, simulationTime)) { dirty = true; say('Gợn được tạo ở vùng nước an toàn.'); }
  else say('Chưa tìm thấy vùng nước an toàn để tạo gợn.', 'warning');
});
const resizeObserver = new ResizeObserver(fitPreview); resizeObserver.observe(viewport);
document.addEventListener('visibilitychange', () => { lastFrame = performance.now(); if (!document.hidden) dirty = true; });
window.addEventListener('pagehide', event => {
  disposed = true; cancelAnimationFrame(frameId); resizeObserver.disconnect();
  if (!event.persisted) {
    scene?.dispose();
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  }
});
window.addEventListener('pageshow', event => { if (event.persisted) { disposed = false; resizeObserver.observe(viewport); lastFrame = performance.now(); frameId = requestAnimationFrame(frame); } });

async function init() {
  try {
    await changeResolution('640x360');
    if (!scene || !water) return;
    updatePause(); updateMode();
    say(reducedMotion.matches ? 'Đã bật giảm chuyển động: cảnh bắt đầu ở trạng thái tạm dừng.' : 'Cảnh sống đã sẵn sàng.');
    dirty = true; render(); frameId = requestAnimationFrame(frame);
    Object.defineProperty(window, '__LIVE_ART__', { configurable: true, value: {
      get layers() { return { scene, water, canvas }; },
      get time() { return simulationTime; },
      get settings() { return { ...settings }; },
      get resolution() { return resolution; },
      get width() { return scene?.camera.width ?? 0; }, get height() { return scene?.camera.height ?? 0; },
      get frameCost() { return renderCost; }, get rippleCount() { return water?.rippleCount ?? 0; },
      render() { dirty = true; render(); },
      freeze(t = 3.25) {
        staticMode = false; simulationTime = t;
        // Prime the renderer at the requested simulation time before pausing it; water
        // renderers intentionally retain their last time once `paused` is true.
        settings.paused = false; updateMode(); dirty = true; render();
        settings.paused = true; updatePause(); dirty = true; render();
      },
      async setResolution(key: ResolutionKey) { selector.value = key; await changeResolution(key); },
    } });
  } catch (error) {
    say(`Không thể khởi tạo bản xem sống: ${String(error)}`, 'error');
    document.querySelector('#metrics')!.textContent = 'Scene/assets chưa sẵn sàng · xem lỗi phía trên';
  }
}
void init();
