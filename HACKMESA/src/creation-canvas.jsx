import { useEffect, useRef } from 'react';
import colleges from '../../app/colleges.json';

/* ── college-name text stream ── */
const COLLEGE_TEXT = colleges.map(c => c.name).join('  ');

/* ── tuning knobs ── */
const CHAR_SIZE  = 10;
const CELL_W     = 7;
const CELL_H     = 13;
const COL_DELAY  = 10;    // ms stagger per column during reveal
const FADE_MS    = 500;   // each character's fade-in duration
const SHIMMER_SPD = 0.0006;
const SHIMMER_WAV = 0.12;

/* ── draw the two hands onto an offscreen canvas using paths ── */
function drawHands(canvas, w, h) {
  const ctx = canvas.getContext('2d');
  canvas.width  = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000';

  const sx = w / 800;
  const sy = h / 400;

  ctx.save();
  ctx.scale(sx, sy);

  // ── Left hand (God's hand, reaching from upper-left) ──
  ctx.beginPath();
  // forearm coming from left
  ctx.moveTo(-10, 160);
  ctx.bezierCurveTo(60, 140, 120, 130, 180, 135);
  // wrist to palm
  ctx.bezierCurveTo(220, 138, 250, 150, 270, 160);
  // palm
  ctx.bezierCurveTo(290, 165, 310, 160, 320, 155);

  // index finger (pointing right, slightly down)
  ctx.bezierCurveTo(330, 150, 350, 145, 375, 150);
  ctx.bezierCurveTo(390, 153, 395, 155, 398, 158);
  // fingertip
  ctx.bezierCurveTo(400, 160, 399, 164, 395, 167);
  // back along index finger underside
  ctx.bezierCurveTo(380, 172, 355, 175, 335, 175);

  // middle finger (slightly above index)
  ctx.moveTo(320, 155);
  ctx.bezierCurveTo(335, 140, 360, 128, 385, 130);
  ctx.bezierCurveTo(395, 131, 400, 136, 400, 142);
  ctx.bezierCurveTo(400, 148, 390, 152, 375, 155);
  ctx.bezierCurveTo(355, 158, 335, 160, 320, 162);

  // ring finger
  ctx.moveTo(310, 150);
  ctx.bezierCurveTo(320, 130, 340, 115, 365, 112);
  ctx.bezierCurveTo(378, 111, 385, 116, 385, 124);
  ctx.bezierCurveTo(385, 132, 370, 140, 350, 145);
  ctx.bezierCurveTo(335, 148, 318, 152, 310, 155);

  // pinky
  ctx.moveTo(300, 148);
  ctx.bezierCurveTo(308, 128, 325, 110, 348, 105);
  ctx.bezierCurveTo(358, 103, 365, 108, 364, 116);
  ctx.bezierCurveTo(363, 124, 348, 133, 332, 138);
  ctx.bezierCurveTo(318, 142, 305, 147, 300, 152);

  // thumb (curling under)
  ctx.moveTo(270, 168);
  ctx.bezierCurveTo(285, 180, 305, 190, 330, 192);
  ctx.bezierCurveTo(340, 193, 345, 188, 342, 182);
  ctx.bezierCurveTo(338, 176, 320, 175, 305, 178);
  ctx.bezierCurveTo(290, 180, 278, 178, 270, 172);

  // underside of palm back to forearm
  ctx.moveTo(270, 172);
  ctx.bezierCurveTo(250, 185, 225, 195, 195, 195);
  ctx.bezierCurveTo(150, 195, 100, 200, 50, 210);
  ctx.lineTo(-10, 225);
  ctx.lineTo(-10, 160);
  ctx.fill();

  // ── Right hand (Adam's hand, reaching from lower-right) ──
  ctx.beginPath();
  // forearm from right
  ctx.moveTo(810, 270);
  ctx.bezierCurveTo(750, 260, 680, 250, 620, 252);
  // wrist to palm
  ctx.bezierCurveTo(580, 255, 550, 245, 530, 238);
  // palm
  ctx.bezierCurveTo(510, 232, 490, 235, 480, 240);

  // index finger (pointing left, slightly up)
  ctx.bezierCurveTo(470, 243, 450, 248, 425, 244);
  ctx.bezierCurveTo(413, 242, 407, 238, 405, 234);
  // fingertip
  ctx.bezierCurveTo(402, 230, 404, 226, 408, 224);
  // back along underside
  ctx.bezierCurveTo(420, 220, 445, 218, 465, 220);

  // middle finger
  ctx.moveTo(480, 235);
  ctx.bezierCurveTo(465, 222, 440, 212, 418, 214);
  ctx.bezierCurveTo(408, 215, 403, 220, 405, 226);
  ctx.bezierCurveTo(407, 232, 420, 235, 438, 234);
  ctx.bezierCurveTo(455, 233, 472, 234, 480, 237);

  // ring finger
  ctx.moveTo(490, 233);
  ctx.bezierCurveTo(478, 218, 458, 205, 435, 204);
  ctx.bezierCurveTo(422, 204, 416, 209, 418, 216);
  ctx.bezierCurveTo(420, 223, 435, 228, 455, 228);
  ctx.bezierCurveTo(470, 228, 484, 231, 490, 235);

  // pinky
  ctx.moveTo(500, 235);
  ctx.bezierCurveTo(493, 218, 478, 203, 455, 200);
  ctx.bezierCurveTo(445, 199, 438, 204, 440, 211);
  ctx.bezierCurveTo(442, 218, 458, 224, 472, 226);
  ctx.bezierCurveTo(484, 228, 496, 233, 500, 237);

  // thumb (curling under, towards viewer)
  ctx.moveTo(530, 248);
  ctx.bezierCurveTo(518, 260, 498, 268, 475, 268);
  ctx.bezierCurveTo(465, 268, 460, 262, 463, 256);
  ctx.bezierCurveTo(466, 250, 483, 250, 498, 252);
  ctx.bezierCurveTo(512, 254, 524, 252, 530, 246);

  // underside of palm back to forearm
  ctx.moveTo(530, 250);
  ctx.bezierCurveTo(555, 268, 585, 280, 620, 282);
  ctx.bezierCurveTo(670, 286, 720, 290, 770, 295);
  ctx.lineTo(810, 305);
  ctx.lineTo(810, 270);
  ctx.fill();

  ctx.restore();
}

/* ── sample brightness from an offscreen canvas ── */
function sampleBrightness(cols, rows) {
  const off = document.createElement('canvas');
  drawHands(off, cols, rows);
  const ctx  = off.getContext('2d');
  const data = ctx.getImageData(0, 0, cols, rows).data;
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 4;
      // alpha channel captures the shape since we drew black on transparent
      row.push(data[i + 3] / 255);
    }
    grid.push(row);
  }
  return grid;
}

export default function CreationOfAdamCanvas() {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const state        = useRef({ grid: null, cols: 0, rows: 0, start: 0, raf: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    let dpr = window.devicePixelRatio || 1;

    function setup() {
      const { width, height } = container.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      canvas.width  = Math.floor(width  * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width  = width  + 'px';
      canvas.style.height = height + 'px';

      const cols = Math.floor(width  / CELL_W);
      const rows = Math.floor(height / CELL_H);
      state.current.cols = cols;
      state.current.rows = rows;
      state.current.grid = sampleBrightness(cols, rows);
    }

    let resizeTimer;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setup, 150);
    });
    observer.observe(container);

    /* wait for JetBrains Mono before first paint */
    document.fonts.ready.then(() => {
      setup();
      state.current.start = performance.now();
      render();
    });

    function render() {
      const { grid, cols, rows, start } = state.current;
      if (!grid || !cols) { state.current.raf = requestAnimationFrame(render); return; }

      const { width, height } = container.getBoundingClientRect();
      const now     = performance.now();
      const elapsed = now - start;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.font         = CHAR_SIZE + 'px "JetBrains Mono", monospace';
      ctx.textBaseline = 'top';

      const revealDone = elapsed > cols * COL_DELAY + FADE_MS + 200;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const brightness = grid[r][c];
          if (brightness < 0.04) continue;

          // reveal wave (left → right)
          const revealT = Math.min(1, Math.max(0, (elapsed - c * COL_DELAY) / FADE_MS));
          // shimmer
          const shimmer = 0.82 + 0.18 * Math.sin(now * SHIMMER_SPD + c * SHIMMER_WAV);

          const alpha = brightness * revealT * shimmer;
          if (alpha < 0.01) continue;

          const idx = (r * cols + c) % COLLEGE_TEXT.length;
          ctx.fillStyle = 'rgba(0,0,0,' + alpha.toFixed(3) + ')';
          ctx.fillText(COLLEGE_TEXT[idx], c * CELL_W, r * CELL_H);
        }
      }

      // after reveal finishes, throttle to ~12fps for shimmer
      if (revealDone) {
        state.current.raf = setTimeout(() => {
          state.current.raf = requestAnimationFrame(render);
        }, 80);
      } else {
        state.current.raf = requestAnimationFrame(render);
      }
    }

    return () => {
      cancelAnimationFrame(state.current.raf);
      clearTimeout(state.current.raf);
      observer.disconnect();
      clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
