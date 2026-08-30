'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/routing';

export interface PendingRoute {
  id: string;
  name: string;
  distance_m: number;
  elevation_gain_m: number | null;
  thumbnail_svg: string;
  created_at: string;
  city_name: string;
  contributor_email: string;
  contributor_name: string;
  duplicate_flag_count: string | number;
}

export function PendingList({ initialRoutes }: { initialRoutes: PendingRoute[] }) {
  const t = useTranslations('admin');
  const [routes, setRoutes] = useState<PendingRoute[]>(initialRoutes);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleApprove = async (id: string, status: 'official' | 'community') => {
    setActionInProgress(id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/routes/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error('Failed to approve route');

      setRoutes((prev) => prev.filter((r) => r.id !== id));
      setFeedback(
        status === 'official'
          ? t('approvedOfficialSuccess')
          : t('approvedCommunitySuccess')
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setFeedback(`${msg}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionInProgress(id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/routes/${id}/reject`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to reject route');

      setRoutes((prev) => prev.filter((r) => r.id !== id));
      setFeedback(t('rejectedSuccess'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setFeedback(`${msg}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          id="admin-feedback-banner"
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

      {routes.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center space-y-3">
          <span className="text-3xl block">✓</span>
          <h2 className="font-display text-base uppercase text-ink">
            {t('noPendingRoutes')}
          </h2>
          <p className="font-body text-xs text-ink/70">
            {t('noPendingRoutesSubtitle')}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {routes.map((route) => {
            const hasDuplicateFlag = Number(route.duplicate_flag_count) > 0;
            const distanceKm = (route.distance_m / 1000).toFixed(2);
            const elevation = route.elevation_gain_m
              ? `+${Math.round(route.elevation_gain_m)} m`
              : '—';

            return (
              <Card
                key={route.id}
                data-testid="admin-pending-card"
                className="p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Metadata */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-data text-[11px] text-ink/60 uppercase tracking-wider font-semibold truncate">
                      {route.city_name}
                    </span>
                    {hasDuplicateFlag && (
                      <span
                        data-testid="duplicate-warning-badge"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-trail-orange/40 bg-trail-orange/10 text-trail-orange font-data text-[10px] font-bold uppercase tracking-wider"
                      >
                        {t('duplicateDetected')}
                      </span>
                    )}
                  </div>

                  {/* Square SVG Linework Thumbnail */}
                  <div className="aspect-square bg-paper border border-contour-tan rounded-[6px] p-4 flex items-center justify-center overflow-hidden">
                    <div
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ __html: route.thumbnail_svg }}
                    />
                  </div>

                  {/* Route Title & Contributor */}
                  <div className="space-y-1">
                    <h3 className="font-display text-lg text-ink uppercase tracking-tight line-clamp-1">
                      {route.name}
                    </h3>
                    <p className="font-data text-[11px] text-ink/60">
                      {t('submittedBy')}: {route.contributor_email} (
                      {route.contributor_name})
                    </p>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-2 p-2 bg-paper border border-contour-tan rounded-[4px] font-data text-xs">
                    <div>
                      <span className="text-[11px] text-ink/70 block uppercase">
                        {t('distance')}
                      </span>
                      <span className="font-semibold text-ink">
                        {distanceKm} km
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-ink/70 block uppercase">
                        {t('elevation')}
                      </span>
                      <span className="font-semibold text-ink">{elevation}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-contour-tan flex flex-wrap gap-2 items-center justify-between">
                  <Link
                    href={`/routes/${route.id}`}
                    className="font-data text-xs text-ink/70 hover:text-ink underline uppercase"
                  >
                    {t('inspectDetail')}
                  </Link>

                  <div className="flex items-center gap-2">
                    <Button
                      id={`btn-reject-${route.id}`}
                      variant="secondary"
                      disabled={actionInProgress === route.id}
                      onClick={() => handleReject(route.id)}
                      className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 text-xs px-2.5 py-1"
                    >
                      {t('rejectBtn')}
                    </Button>

                    <Button
                      id={`btn-approve-community-${route.id}`}
                      variant="secondary"
                      disabled={actionInProgress === route.id}
                      onClick={() => handleApprove(route.id, 'community')}
                      className="border-moss text-moss hover:bg-moss/10 text-xs px-2.5 py-1"
                    >
                      {t('approveCommunityBtn')}
                    </Button>

                    <Button
                      id={`btn-approve-official-${route.id}`}
                      variant="primary"
                      disabled={actionInProgress === route.id}
                      onClick={() => handleApprove(route.id, 'official')}
                      className="text-xs px-2.5 py-1"
                    >
                      {t('approveOfficialBtn')}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
