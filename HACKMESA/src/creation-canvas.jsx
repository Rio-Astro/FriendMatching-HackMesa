import { useEffect, useRef } from 'react';

import { createAsciiRenderer } from 'landing-effects';

import colleges from '../../app/colleges.json';

const COLLEGE_CHARS = colleges.map((college) => college.name).join(' ');
const CHAR_RAMP = ' ' + [...new Set(COLLEGE_CHARS.replace(/\s/g, ''))].slice(0, 18).join('');

export default function CreationOfAdamCanvas() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return undefined;
    }

    const mountRenderer = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width < 1 || height < 1) {
        return;
      }

      canvas.width = Math.max(1, Math.floor(width));
      canvas.height = Math.max(1, Math.floor(height));

      cleanupRef.current?.();
      cleanupRef.current = createAsciiRenderer({
        canvas,
        imageSrc: '/creationofadamascii.jpg',
        chars: CHAR_RAMP,
        fontSize: width < 900 ? 7 : 8,
        fontFamily: '"JetBrains Mono", monospace',
        brightnessBoost: 1.05,
        posterize: 16,
        parallaxStrength: 6,
        scale: 1.02,
        colorFn: (luminance) => {
          const lightness = 4 + (luminance / 255) * 8;
          return `hsl(222 52% ${lightness}%)`;
        },
      });
    };

    mountRenderer();

    const observer = new ResizeObserver(() => {
      mountRenderer();
    });

    observer.observe(container);

    return () => {
      cleanupRef.current?.();
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <canvas ref={canvasRef} aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
