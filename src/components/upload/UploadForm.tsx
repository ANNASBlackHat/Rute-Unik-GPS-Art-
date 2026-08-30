'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { parseGpx, ParsedGpx } from '@/lib/gpx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface City {
  id: string;
  name: string;
}

interface UploadFormProps {
  cities: City[];
  locale: string;
}

export function UploadForm({ cities, locale }: UploadFormProps) {
  const t = useTranslations('upload');
  const router = useRouter();

  const [name, setName] = useState('');
  const [cityId, setCityId] = useState(cities[0]?.id || '');
  const [gpxRaw, setGpxRaw] = useState<string>('');
  const [parsed, setParsed] = useState<ParsedGpx | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File) => {
    setErrorMsg(null);
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      setErrorMsg(t('invalidGpxError'));
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setGpxRaw(content);

      try {
        const result = parseGpx(content);
        setParsed(result);
        if (!name) {
          // Suggest name from file or gpx trk name
          const nameMatch = /<name>([\s\S]*?)<\/name>/i.exec(content);
          if (nameMatch && nameMatch[1].trim()) {
            setName(nameMatch[1].trim().toUpperCase());
          } else {
            setName(file.name.replace(/\.gpx$/i, '').replace(/[-_]/g, ' ').toUpperCase());
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('invalidGpxError');
        setErrorMsg(message);
        setParsed(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed || !gpxRaw) {
      setErrorMsg(t('missingFileError'));
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          city_id: cityId,
          gpx_raw: gpxRaw,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload route');
      }

      // Success -> navigate to /me
      router.push(`/${locale}/me`);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl text-ink uppercase tracking-tight">
          {t('uploadTitle')}
        </h1>
        <p className="font-body text-xs text-ink/70">
          {t('uploadSubtitle')}
        </p>
      </div>

      {errorMsg && (
        <div
          id="upload-error-banner"
          className="p-3 bg-[#9B2C2C] text-chalk border border-white/20 rounded-[4px] font-body text-xs"
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Drag and Drop GPX Area */}
      <div
        id="gpx-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-6 sm:p-8 rounded-[8px] border-2 border-dashed transition-colors cursor-pointer text-center space-y-3 ${
          isDragging
            ? 'border-trail-orange bg-trail-orange/5'
            : 'border-contour-tan bg-chalk hover:border-ink/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="gpx-file-input"
          accept=".gpx"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileProcess(e.target.files[0]);
            }
          }}
        />

        <div className="w-12 h-12 mx-auto rounded-[4px] bg-paper border border-contour-tan flex items-center justify-center text-xl">
          🗺️
        </div>

        <div className="space-y-1">
          <p className="font-display text-sm uppercase text-ink">
            {fileName ? fileName : t('dropzonePrompt')}
          </p>
          <span className="font-data text-[11px] text-ink/60 block">
            {t('dropzoneHint')}
          </span>
        </div>
      </div>

      {/* Shape Preview & Stats Card (appears upon GPX selection) */}
      {parsed && (
        <Card
          id="gpx-preview-card"
          data-testid="gpx-preview-card"
          className="p-4 sm:p-6 space-y-4 bg-chalk animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between border-b border-contour-tan pb-2">
            <span className="font-display text-xs uppercase text-ink tracking-wider">
              {t('shapePreviewTitle')}
            </span>
            <span className="font-data text-[11px] text-moss font-semibold">
              ✓ {parsed.coordinates.length} {t('pointsDetected')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* Square SVG Preview Thumbnail */}
            <div className="aspect-square bg-paper border border-contour-tan rounded-[6px] p-3 flex items-center justify-center overflow-hidden">
              <div
                id="svg-preview-container"
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: parsed.thumbnailSvg }}
              />
            </div>

            {/* Calculated Stats */}
            <div className="space-y-3 font-data text-xs">
              <div className="p-3 bg-paper border border-contour-tan rounded-[4px] space-y-1">
                <span className="text-[10px] text-ink/60 uppercase block">
                  {t('calculatedDistance')}
                </span>
                <span className="font-display text-lg text-ink">
                  {(parsed.distanceMeters / 1000).toFixed(2)} km
                </span>
              </div>

              <div className="p-3 bg-paper border border-contour-tan rounded-[4px] space-y-1">
                <span className="text-[10px] text-ink/60 uppercase block">
                  {t('calculatedElevation')}
                </span>
                <span className="font-display text-lg text-ink">
                  {parsed.elevationGainMeters !== null
                    ? `+${Math.round(parsed.elevationGainMeters)} m`
                    : '—'}
                </span>
              </div>

              <p className="text-[11px] text-ink/60 font-body">
                {t('aspectRatioNotice')}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Form Fields */}
      <Card className="p-6 space-y-4 bg-chalk">
        <div className="space-y-1 font-data text-xs">
          <label className="block uppercase text-ink/70 font-semibold text-[11px]">
            {t('routeNameLabel')} *
          </label>
          <input
            type="text"
            id="input-route-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.G. KUCING DAGO"
            className="w-full px-3 py-2.5 bg-paper border border-contour-tan rounded-[4px] font-display text-sm uppercase text-ink focus:outline-none focus:border-ink"
          />
        </div>

        <div className="space-y-1 font-data text-xs">
          <label className="block uppercase text-ink/70 font-semibold text-[11px]">
            {t('citySelectLabel')} *
          </label>
          <select
            id="select-route-city"
            required
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="w-full px-3 py-2.5 bg-paper border border-contour-tan rounded-[4px] font-data text-xs text-ink focus:outline-none focus:border-ink cursor-pointer"
          >
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-3 border-t border-contour-tan flex items-center justify-end">
          <Button
            type="submit"
            id="btn-submit-route"
            variant="primary"
            disabled={loading || !parsed}
            className="w-full sm:w-auto px-6 py-2.5"
          >
            {loading ? t('uploading') : t('submitButton')}
          </Button>
        </div>
      </Card>
    </form>
  );
}
