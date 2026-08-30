'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

export interface AdminCityItem {
  id: string;
  name: string;
  country: string;
  center_lat: number;
  center_lon: number;
  routes_count: number;
}

export function CityManager({ initialCities }: { initialCities: AdminCityItem[] }) {
  const t = useTranslations('admin');
  const [cities, setCities] = useState<AdminCityItem[]>(initialCities);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('Indonesia');
  const [lat, setLat] = useState<string>('-7.2575');
  const [lon, setLon] = useState<string>('112.7521');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          country,
          center_lat: parseFloat(lat) || -7.2575,
          center_lon: parseFloat(lon) || 112.7521,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add city');

      setCities((prev) => [
        ...prev,
        {
          id: data.city.id,
          name: data.city.name,
          country: data.city.country,
          center_lat: parseFloat(lat) || -7.2575,
          center_lon: parseFloat(lon) || 112.7521,
          routes_count: 0,
        },
      ]);

      setName('');
      setFeedback(t('cityAddedSuccess'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add city';
      setFeedback(`${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          id="city-feedback-banner"
          className="p-3 bg-paper border border-contour-tan rounded-[4px] font-body text-xs text-ink flex items-center justify-between"
        >
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-ink/60 hover:text-ink font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add City Form */}
      <Card className="p-6 space-y-4">
        <h2 className="font-display text-sm uppercase text-ink tracking-wider border-b border-contour-tan pb-2">
          {t('addNewCityTitle')}
        </h2>

        <form onSubmit={handleAddCity} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end font-data text-xs">
          <div className="space-y-1">
            <label className="block uppercase text-ink/70 font-semibold text-[11px]">
              {t('cityNameLabel')} *
            </label>
            <input
              id="input-city-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Surabaya"
              className="w-full px-3 py-2 bg-paper border border-contour-tan rounded-[4px] text-ink focus:outline-none focus:border-ink"
            />
          </div>

          <div className="space-y-1">
            <label className="block uppercase text-ink/70 font-semibold text-[11px]">
              {t('countryLabel')}
            </label>
            <input
              id="input-city-country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Indonesia"
              className="w-full px-3 py-2 bg-paper border border-contour-tan rounded-[4px] text-ink focus:outline-none focus:border-ink"
            />
          </div>

          <div className="space-y-1">
            <label className="block uppercase text-ink/70 font-semibold text-[11px]">
              {t('coordinatesLabel')} (Lat, Lon)
            </label>
            <div className="flex gap-2">
              <input
                id="input-city-lat"
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="-7.2575"
                className="w-1/2 px-2 py-2 bg-paper border border-contour-tan rounded-[4px] text-ink focus:outline-none focus:border-ink text-[11px]"
              />
              <input
                id="input-city-lon"
                type="text"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                placeholder="112.7521"
                className="w-1/2 px-2 py-2 bg-paper border border-contour-tan rounded-[4px] text-ink focus:outline-none focus:border-ink text-[11px]"
              />
            </div>
          </div>

          <div>
            <Button
              id="btn-add-city"
              type="submit"
              variant="primary"
              disabled={loading || !name}
              className="w-full justify-center"
            >
              {loading ? t('savingCity') : t('addCityBtn')}
            </Button>
          </div>
        </form>
      </Card>

      {/* Cities Table */}
      <Card className="p-6 space-y-4">
        <h2 className="font-display text-sm uppercase text-ink tracking-wider border-b border-contour-tan pb-2">
          {t('activeCitiesTitle')} ({cities.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-data text-xs border-collapse">
            <thead>
              <tr className="border-b border-contour-tan text-ink/60 uppercase text-[10px]">
                <th className="py-2.5 px-3">Kota</th>
                <th className="py-2.5 px-3">Negara</th>
                <th className="py-2.5 px-3">Koordinat Pusat</th>
                <th className="py-2.5 px-3 text-right">Jumlah Rute</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-contour-tan/50">
              {cities.map((city) => (
                <tr
                  key={city.id}
                  data-testid="admin-city-row"
                  className="hover:bg-paper/50"
                >
                  <td className="py-3 px-3 font-semibold text-ink uppercase">
                    {city.name}
                  </td>
                  <td className="py-3 px-3 text-ink/80">{city.country}</td>
                  <td className="py-3 px-3 text-ink/60 font-mono text-[11px]">
                    {Number(city.center_lat).toFixed(4)}, {Number(city.center_lon).toFixed(4)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-ink">
                    {city.routes_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
