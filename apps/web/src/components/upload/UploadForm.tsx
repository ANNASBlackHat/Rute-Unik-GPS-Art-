'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { parseGpx, ParsedGpx } from '@/lib/gpx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Loader2, MapPinned, Lock } from 'lucide-react';
import { findNearestCity, centroidOfCoordinates, CityWithCenter } from '@/lib/city';

interface City {
  id: string;
  name: string;
  lon: number | null;
  lat: number | null;
}

type PropsCity = CityWithCenter;

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
  const [autoDetected, setAutoDetected] = useState<{ city: CityWithCenter; distanceMeters: number } | null>(null);
  const [autoDetectFailed, setAutoDetectFailed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const handleFileProcess = (file: File) => {
    setErrorMsg(null);
    setAutoDetected(null);
    setAutoDetectFailed(false);
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

        // Auto-detect city from GPX centroid
        const centroid = centroidOfCoordinates(result.coordinates);
        if (centroid) {
          const nearest = findNearestCity(centroid, cities as CityWithCenter[]);
          if (nearest) {
            setCityId(nearest.city.id);
            setAutoDetected(nearest);
            setAutoDetectFailed(false);
          } else {
            setAutoDetected(null);
            setAutoDetectFailed(true);
          }
        }

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
        setAutoDetected(null);
        setAutoDetectFailed(false);
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

  useEffect(() => {
    if (errorMsg && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, [errorMsg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed || !gpxRaw) {
      setErrorMsg(t('missingFileError'));
      return;
    }
    if (!name.trim()) {
      setErrorMsg(t('missingNameError') || 'Route name is required');
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
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
          aria-labelledby="upload-error-title"
          className="p-3 bg-error text-error-on border border-white/20 rounded-[4px] font-body text-xs space-y-2"
        >
          <p id="upload-error-title" className="font-bold flex items-center gap-2">
            <AlertTriangle size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0" /> {t('errorTitle') || 'There is a problem'}
          </p>
          <p>{errorMsg}</p>
          <ul className="list-disc pl-5 space-y-1">
            {!parsed && (
              <li>
                <a href="#gpx-dropzone" className="underline hover:no-underline">
                  {t('missingFileError')}
                </a>
              </li>
            )}
            {!name.trim() && parsed && (
              <li>
                <a href="#input-route-name" className="underline hover:no-underline">
                  {t('routeNameLabel')} — {t('required') || 'required'}
                </a>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Drag and Drop GPX Area */}
      <div
        id="gpx-dropzone"
        role="button"
        tabIndex={0}
        aria-label={t('dropzonePrompt')}
        aria-describedby="gpx-dropzone-hint"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`relative p-6 sm:p-8 rounded-[8px] border-2 border-dashed transition-colors cursor-pointer text-center space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
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
          tabIndex={-1}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileProcess(e.target.files[0]);
              // Reset so same file can be selected again
              e.target.value = '';
            }
          }}
        />

        <div className="w-12 h-12 mx-auto rounded-[4px] bg-paper border border-contour-tan flex items-center justify-center">
          <MapPinned size={20} strokeWidth={1.5} className="text-ink" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <p className="font-display text-sm uppercase text-ink">
            {fileName ? fileName : t('dropzonePrompt')}
          </p>
          <span id="gpx-dropzone-hint" className="font-data text-xs text-ink/70 block">
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
                <span className="text-[11px] text-ink/70 uppercase block">
                  {t('calculatedDistance')}
                </span>
                <span className="font-display text-lg text-ink">
                  {(parsed.distanceMeters / 1000).toFixed(2)} km
                </span>
              </div>

              <div className="p-3 bg-paper border border-contour-tan rounded-[4px] space-y-1">
                <span className="text-[11px] text-ink/70 uppercase block">
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
          <label htmlFor="input-route-name" className="block uppercase text-ink/70 font-semibold text-[11px]">
            {t('routeNameLabel')} <span aria-hidden="true">*</span>
          </label>
          <input
            type="text"
            id="input-route-name"
            required
            aria-required="true"
            aria-invalid={!!errorMsg && !name.trim() ? 'true' : undefined}
            aria-describedby={errorMsg && !name.trim() ? 'upload-error-banner' : undefined}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.G. KUCING DAGO"
            className="w-full px-3 py-2.5 bg-paper border border-contour-tan rounded-[4px] font-display text-sm uppercase text-ink focus:outline-none focus:border-ink"
            autoComplete="off"
          />
        </div>

        <div className="space-y-1 font-data text-xs">
          <label htmlFor="select-route-city" className="block uppercase text-ink/70 font-semibold text-[11px] flex items-center gap-1.5">
            {t('citySelectLabel')} <span aria-hidden="true">*</span>
            {autoDetected && <span className="inline-flex items-center gap-1 text-moss font-bold text-[10px]"><Lock size={12} /> AUTO</span>}
          </label>
          {!parsed ? (
            <div className="w-full px-3 py-2.5 bg-paper/60 border border-dashed border-contour-tan rounded-[4px] text-ink/50 flex items-center gap-2">
              <Lock size={14} className="shrink-0" />
              <span>{locale === 'id' ? 'Unggah GPX untuk deteksi otomatis kota' : 'Upload GPX to auto-detect city'}</span>
            </div>
          ) : autoDetected ? (
            <>
              <div className="w-full px-3 py-2.5 bg-moss/10 border border-moss/30 rounded-[4px] flex items-center justify-between">
                <span className="font-display text-sm uppercase text-ink flex items-center gap-2">
                  <MapPinned size={16} className="text-moss" />
                  {autoDetected.city.name}
                </span>
                <span className="text-[11px] text-ink/60">
                  {(autoDetected.distanceMeters / 1000).toFixed(1)} km {locale === 'id' ? 'dari pusat kota' : 'from center'}
                </span>
              </div>
              <p className="text-[11px] text-moss flex items-center gap-1">
                <Lock size={12} /> {locale === 'id' ? 'Kota terkunci otomatis dari GPX' : 'City locked from GPX'}
              </p>
              {/* Keep hidden select for form consistency but locked */}
              <select id="select-route-city" value={cityId} onChange={() => {}} disabled className="hidden">
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </>
          ) : autoDetectFailed ? (
            <>
              <div className="p-2 bg-error/10 border border-error/30 rounded-[4px] text-error text-[11px] flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  {locale === 'id'
                    ? 'GPX jauh dari semua kota (>100km). Pilih manual.'
                    : 'GPX far from all cities (>100km). Please select manually.'}
                </span>
              </div>
              <select
                id="select-route-city"
                required
                aria-required="true"
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
            </>
          ) : (
            <select
              id="select-route-city"
              required
              aria-required="true"
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
          )}
        </div>

        <div className="pt-3 border-t border-contour-tan flex items-center justify-end">
          <Button
            type="submit"
            id="btn-submit-route"
            variant="primary"
            disabled={loading || !parsed}
            aria-busy={loading}
            className="w-full sm:w-auto px-6 py-2.5 inline-flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} strokeWidth={1.5} aria-hidden="true" className="animate-spin" />}
            {loading ? t('uploading') : t('submitButton')}
          </Button>
        </div>
      </Card>
    </form>
  );
}
