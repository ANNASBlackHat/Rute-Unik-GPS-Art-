'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, Download } from 'lucide-react';

interface Props {
  routeName: string;
  cityName: string;
  distanceKm: string;
  elevationGain: string;
  thumbnailSvg: string;
  coordinates?: [number, number][];
}

function svgToCanvasPng(svgString: string, width: number, height: number, bg: string | null): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svg = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('no ctx')); return; }
      if (bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
      // draw centered contain
      const scale = Math.min(width / 100, height / 100) * 0.85; // svg is 100x100 viewBox
      const iw = 100 * scale;
      const ih = 100 * scale;
      const dx = (width - iw) / 2;
      const dy = (height - ih) / 2;
      ctx.drawImage(img, dx, dy, iw, ih);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob null'))), 'image/png');
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function DownloadImageButton({ routeName, cityName, distanceKm, elevationGain, thumbnailSvg, coordinates }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const handleCard = async () => {
    setBusy('card');
    try {
      // Build a card-like SVG then rasterize
      const safeName = routeName.replace(/&/g,'&amp;');
      const cardSvg = `
        <svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1350' viewBox='0 0 1080 1350'>
          <rect width='1080' height='1350' rx='24' fill='#EDE8DC'/>
          <rect x='40' y='40' width='1000' height='1000' rx='16' fill='#F7F5EF' stroke='#C9BFA6' stroke-width='2'/>
          <text x='60' y='110' font-family='sans-serif' font-size='20' font-weight='700' fill='#1F2A1E'>${cityName.toUpperCase()}</text>
          <text x='60' y='980' font-family='sans-serif' font-size='48' font-weight='900' fill='#1F2A1E'>${safeName.toUpperCase()}</text>
          <text x='60' y='1020' font-family='monospace' font-size='22' fill='#1F2A1E'>${distanceKm} km  •  ${elevationGain}</text>
          <foreignObject x='140' y='140' width='800' height='800'>
            <div xmlns='http://www.w3.org/1999/xhtml' style='width:800px;height:800px;display:flex;align-items:center;justify-content:center;'>
              ${thumbnailSvg}
            </div>
          </foreignObject>
        </svg>`;
      // For card we can instead just composite via canvas: draw bg then thumbnailSvg centered
      // Simpler: use svgToCanvasPng for thumbnail then overlay text via canvas 2d
      // Use canvas approach:
      const canvas = document.createElement('canvas');
      canvas.width = 1080; canvas.height = 1350;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#EDE8DC'; ctx.fillRect(0,0,1080,1350);
      // card bg
      ctx.fillStyle = '#F7F5EF'; ctx.strokeStyle = '#C9BFA6'; ctx.lineWidth = 2;
      const rr=16;
      ctx.beginPath(); ctx.roundRect(40,40,1000,1000,rr); ctx.fill(); ctx.stroke();
      // draw thumbnail
      const blob = await svgToCanvasPng(thumbnailSvg, 800, 800, null);
      const bmp = await createImageBitmap(blob);
      ctx.drawImage(bmp, 140, 140, 800, 800);
      ctx.fillStyle = '#1F2A1E';
      ctx.font = '700 20px sans-serif'; ctx.fillText(cityName.toUpperCase(), 60, 110);
      ctx.font = '900 48px sans-serif'; ctx.fillText(safeName.toUpperCase().slice(0,28), 60, 1040);
      ctx.font = '600 22px monospace'; ctx.fillText(`${distanceKm} km  •  ${elevationGain}`, 60, 1080);
      ctx.font = '500 18px sans-serif'; ctx.fillStyle = '#5C6E4F'; ctx.fillText('RUTE UNIK • GPS ART', 60, 1290);
      const out = await new Promise<Blob>((res,rej)=> canvas.toBlob(b=> b?res(b):rej(new Error('null')), 'image/png'));
      await downloadBlob(out, `${routeName.replace(/[^a-z0-9]+/gi,'_')}_card.png`);
    } finally { setBusy(null); }
  };

  const handleLineOnly = async () => {
    setBusy('line');
    try {
      // transparent line only, 1080x1080, ink #1F2A1E stroke, thicker for social
      let svg = thumbnailSvg;
      // ensure stroke color and width for social (increase to 4)
      svg = svg.replace(/stroke-width="[^"]*"/g, 'stroke-width="4"').replace(/#1F2A1E/g, '#1F2A1E');
      // wrap with transparent bg viewBox 0 0 100 100 already
      const canvas = document.createElement('canvas');
      canvas.width = 1080; canvas.height = 1080;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0,0,1080,1080);
      const blob = await svgToCanvasPng(svg, 1080,1080, null);
      const bmp = await createImageBitmap(blob);
      ctx.drawImage(bmp, 0,0,1080,1080);
      const out = await new Promise<Blob>((res,rej)=> canvas.toBlob(b=> b?res(b):rej(new Error('null')), 'image/png'));
      await downloadBlob(out, `${routeName.replace(/[^a-z0-9]+/gi,'_')}_line.png`);
    } finally { setBusy(null); }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={handleCard}
        disabled={!!busy}
        className="inline-flex items-center justify-center gap-1.5 font-display text-[11px] uppercase tracking-wider px-3 py-2.5 rounded-[4px] bg-chalk border border-contour-tan text-ink hover:border-ink transition-colors disabled:opacity-50"
      >
        <ImageIcon size={14} strokeWidth={1.5} aria-hidden="true" /> {busy==='card' ? '...' : 'Card PNG'}
      </button>
      <button
        type="button"
        onClick={handleLineOnly}
        disabled={!!busy}
        className="inline-flex items-center justify-center gap-1.5 font-display text-[11px] uppercase tracking-wider px-3 py-2.5 rounded-[4px] bg-ink text-chalk hover:bg-ink/90 border border-ink transition-colors disabled:opacity-50"
      >
        <Sparkles size={14} strokeWidth={1.5} aria-hidden="true" /> {busy==='line' ? '...' : 'Line Only'}
      </button>
    </div>
  );
}
