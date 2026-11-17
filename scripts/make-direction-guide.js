(async () => {
  const { createStudyScene } = await import('/src/study/scene.ts');
  const scene = createStudyScene(640, 360);
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scene.ground, 0, 0);
  const pixels = ctx.getImageData(0, 0, 640, 360);
  for (let i = 0; i < scene.mask.length; i++) if (scene.mask[i]) {
    const q = i * 4; pixels.data[q] = 255; pixels.data[q + 1] = 0; pixels.data[q + 2] = 255; pixels.data[q + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0); ctx.drawImage(scene.renderObjects(3.25, 0), 0, 0); ctx.drawImage(scene.foreground, 0, 0);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const link = document.createElement('a'); link.id = 'direction-guide-download'; link.href = URL.createObjectURL(blob); link.download = 'direction-guide.png'; link.textContent = 'Download direction source guide'; document.body.prepend(link);
  return { width: canvas.width, height: canvas.height, flatWaterRGB: [255, 0, 255] };
})()
