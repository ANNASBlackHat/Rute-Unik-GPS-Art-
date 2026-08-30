'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export interface CatalogRouteItem {
  id: string;
  name: string;
  city_id: string;
  city_name: string;
  status: 'official' | 'community' | 'pending' | 'rejected';
  distance_m: number;
  elevation_gain_m: number | null;
  thumbnail_svg: string;
  created_at: string;
  contributor_email: string;
}

export function CatalogManager({
  initialRoutes,
}: {
  initialRoutes: CatalogRouteItem[];
}) {
  const t = useTranslations('admin');
  const [routes, setRoutes] = useState<CatalogRouteItem[]>(initialRoutes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    if (!confirm('Delete this route permanently? This cannot be undone.')) return;
    setLoadingId(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/routes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      setFeedback('Route deleted');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed');
    } finally { setLoadingId(null); }
  };

  const handleStatusChange = async (
    id: string,
    targetStatus: 'official' | 'community' | 'rejected'
  ) => {
    setLoadingId(id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/routes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      setRoutes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: targetStatus } : r))
      );
      setFeedback(t('statusUpdatedSuccess'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setFeedback(`${msg}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleSaveName = async (id: string) => {
    setLoadingId(id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/routes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.toUpperCase() }),
      });

      if (!res.ok) throw new Error('Failed to update title');

      setRoutes((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, name: editName.toUpperCase() } : r
        )
      );
      setEditingId(null);
      setFeedback(t('titleUpdatedSuccess'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setFeedback(`${msg}`);
    } finally {
      setLoadingId(null);
    }
  };

  const renderBadge = (status: CatalogRouteItem['status']) => {
    switch (status) {
      case 'official':
        return <Badge variant="official">RESMI</Badge>;
      case 'community':
        return <Badge variant="community">KOMUNITAS</Badge>;
      case 'pending':
        return (
          <span className="px-2 py-0.5 rounded-[3px] border border-contour-tan bg-paper text-ink font-data text-[10px] uppercase font-bold">
            MENUNGGU
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-0.5 rounded-[3px] border border-red-300 text-red-700 font-data text-[10px] uppercase font-bold">
            DITOLAK
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          id="catalog-feedback-banner"
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

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-sm uppercase text-ink tracking-wider border-b border-contour-tan pb-2">
          {t('routeCatalogTitle')} ({routes.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-data text-xs border-collapse">
            <thead>
              <tr className="border-b border-contour-tan text-ink/60 uppercase text-[10px]">
                <th className="py-2.5 px-3">Garis Bentuk</th>
                <th className="py-2.5 px-3">Nama Rute</th>
                <th className="py-2.5 px-3">Kota</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Jarak</th>
                <th className="py-2.5 px-3">Kontributor</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-contour-tan/50">
              {routes.map((route) => (
                <tr
                  key={route.id}
                  data-testid="admin-catalog-row"
                  className="hover:bg-paper/50"
                >
                  <td className="py-3 px-3 w-16">
                    <div className="w-12 h-12 bg-paper border border-contour-tan rounded-[4px] p-1 flex items-center justify-center">
                      <div
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{
                          __html: route.thumbnail_svg,
                        }}
                      />
                    </div>
                  </td>

                  <td className="py-3 px-3 font-display uppercase text-ink">
                    {editingId === route.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 bg-paper border border-contour-tan rounded text-xs uppercase"
                        />
                        <button
                          onClick={() => handleSaveName(route.id)}
                          className="text-moss font-bold hover:underline"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-ink/50 hover:text-ink"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/routes/${route.id}`}
                          className="hover:text-trail-orange transition-colors"
                        >
                          {route.name}
                        </Link>
                        <button
                          onClick={() => {
                            setEditingId(route.id);
                            setEditName(route.name);
                          }}
                          className="text-[10px] text-ink/40 hover:text-ink"
                        >
                          ✎
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-3 uppercase text-ink/80">
                    {route.city_name}
                  </td>

                  <td className="py-3 px-3">{renderBadge(route.status)}</td>

                  <td className="py-3 px-3">
                    {(route.distance_m / 1000).toFixed(2)} km
                  </td>

                  <td className="py-3 px-3 text-ink/60 truncate max-w-[140px]">
                    {route.contributor_email}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {route.status !== 'official' && (
                        <Button
                          id={`btn-set-official-${route.id}`}
                          variant="secondary"
                          disabled={loadingId === route.id}
                          onClick={() =>
                            handleStatusChange(route.id, 'official')
                          }
                          className="text-[10px] py-0.5 px-2"
                        >
                          Jadikan Resmi
                        </Button>
                      )}

                      {route.status !== 'community' && (
                        <Button
                          id={`btn-set-community-${route.id}`}
                          variant="secondary"
                          disabled={loadingId === route.id}
                          onClick={() =>
                            handleStatusChange(route.id, 'community')
                          }
                          className="text-[10px] py-0.5 px-2"
                        >
                          Komunitas
                        </Button>
                      )}

                      {route.status !== 'rejected' && (
                        <Button
                          id={`btn-unpublish-${route.id}`}
                          variant="secondary"
                          disabled={loadingId === route.id}
                          onClick={() =>
                            handleStatusChange(route.id, 'rejected')
                          }
                          className="text-[10px] py-0.5 px-2 border-red-300 text-red-700"
                        >
                          Cabut
                        </Button>
                      )}
                      <Button
                        id={`btn-delete-${route.id}`}
                        variant="secondary"
                        disabled={loadingId === route.id}
                        onClick={() => handleRemove(route.id)}
                        className="text-[10px] py-0.5 px-2 border-error text-error hover:bg-error hover:text-error-on"
                      >
                        Hapus
                      </Button>
                    </div>
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
