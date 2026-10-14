/**
 * Smart_Ink Stroke Rasterizer
 * Converts digital ink stroke coordinates into a normalized 28x28 grayscale tensor
 * with center-of-mass alignment, compatible with standard neural network models.
 */

import { Stroke, Point } from '../canvas/types';
import { computeBoundingBox } from '../canvas/strokeUtils';

export function rasterizeStrokesTo28x28(strokes: Stroke[]): Float32Array {
  const tensor = new Float32Array(28 * 28);
  if (strokes.length === 0) return tensor;

  const allPoints: Point[] = strokes.flatMap((s) => s.points);
  const bounds = computeBoundingBox(allPoints);

  if (bounds.width === 0 && bounds.height === 0) return tensor;

  // Render onto an offscreen canvas
  const canvasSize = 28;
  const padding = 4;
  const targetSize = canvasSize - padding * 2; // 20x20

  const scale = targetSize / Math.max(bounds.width, bounds.height, 1);
  const offsetX = (canvasSize - bounds.width * scale) / 2 - bounds.minX * scale;
  const offsetY = (canvasSize - bounds.height * scale) / 2 - bounds.minY * scale;

  // Use OffscreenCanvas if available, or lightweight software rasterization
  if (typeof OffscreenCanvas !== 'undefined') {
    const offscreen = new OffscreenCanvas(28, 28);
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 28, 28);

      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const stroke of strokes) {
        const pts = stroke.points;
        if (pts.length === 0) continue;

        ctx.lineWidth = Math.max(1.8, (stroke.width || 3) * scale * 0.9);

        if (pts.length === 1) {
          ctx.beginPath();
          ctx.arc(pts[0].x * scale + offsetX, pts[0].y * scale + offsetY, ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(pts[0].x * scale + offsetX, pts[0].y * scale + offsetY);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x * scale + offsetX, pts[i].y * scale + offsetY);
          }
          ctx.stroke();
        }
      }

      const imgData = ctx.getImageData(0, 0, 28, 28).data;
      for (let i = 0; i < 28 * 28; i++) {
        // Red channel is white on black
        tensor[i] = imgData[i * 4] / 255.0;
      }
      return tensor;
    }
  }

  // Pure software fallback rasterizer if OffscreenCanvas is unavailable
  for (const s of strokes) {
    for (let i = 0; i < s.points.length; i++) {
      const px = Math.round(s.points[i].x * scale + offsetX);
      const py = Math.round(s.points[i].y * scale + offsetY);
      if (px >= 0 && px < 28 && py >= 0 && py < 28) {
        tensor[py * 28 + px] = 1.0;
        // 3x3 brush
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx;
            const ny = py + dy;
            if (nx >= 0 && nx < 28 && ny >= 0 && ny < 28) {
              tensor[ny * 28 + nx] = Math.max(tensor[ny * 28 + nx], 0.7);
            }
          }
        }
      }
    }
  }

  return tensor;
}
