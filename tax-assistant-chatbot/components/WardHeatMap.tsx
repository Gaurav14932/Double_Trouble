'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { DashboardData } from '@/lib/chat-types';

interface WardHeatMapProps {
  map: NonNullable<DashboardData['map']>;
}

export default function WardHeatMap({ map }: WardHeatMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const maxPendingTax = useMemo(
    () => Math.max(...map.wards.map((ward) => ward.pendingTax), 1),
    [map.wards]
  );
  const totalPendingTax = useMemo(
    () => map.wards.reduce((sum, ward) => sum + ward.pendingTax, 0),
    [map.wards]
  );
  const averagePendingTax = totalPendingTax / Math.max(map.wards.length, 1);
  const hottestWard = useMemo(
    () =>
      map.wards.reduce((current, candidate) =>
        candidate.pendingTax > current.pendingTax ? candidate : current
      ),
    [map.wards]
  );

  useEffect(() => {
    if (!mapContainerRef.current || map.wards.length === 0) {
      return;
    }

    const mapInstance = L.map(mapContainerRef.current, {
      center: map.center,
      zoom: map.zoom,
      scrollWheelZoom: false,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; OpenStreetMap contributors &copy; CARTO',
    }).addTo(mapInstance);

    const glowPane = mapInstance.createPane('ward-glow');
    glowPane.style.zIndex = '410';

    const pointPane = mapInstance.createPane('ward-points');
    pointPane.style.zIndex = '420';

    const labelPane = mapInstance.createPane('ward-labels');
    labelPane.style.zIndex = '430';
    labelPane.style.pointerEvents = 'none';

    const bounds = L.latLngBounds([]);

    for (const ward of map.wards) {
      const intensity = ward.pendingTax / maxPendingTax;
      const fillColor = getHeatColor(intensity);

      L.circleMarker([ward.lat, ward.lng], {
        pane: 'ward-glow',
        radius: 20 + intensity * 18,
        stroke: false,
        fillColor,
        fillOpacity: 0.14 + intensity * 0.1,
      }).addTo(mapInstance);

      const circle = L.circleMarker([ward.lat, ward.lng], {
        pane: 'ward-points',
        radius: 9 + intensity * 9,
        color: ward.isFocus ? '#0f172a' : '#ffffff',
        weight: ward.isFocus ? 3 : 2.5,
        fillColor,
        fillOpacity: 0.9,
      }).addTo(mapInstance);

      L.circleMarker([ward.lat, ward.lng], {
        pane: 'ward-points',
        radius: 3.5 + intensity * 2.5,
        color: '#ffffff',
        weight: 1.5,
        fillColor: '#ffffff',
        fillOpacity: 0.95,
      }).addTo(mapInstance);

      if (ward.isFocus) {
        L.circleMarker([ward.lat, ward.lng], {
          pane: 'ward-glow',
          radius: 28 + intensity * 18,
          color: '#0f172a',
          weight: 1.5,
          fillColor,
          fillOpacity: 0,
          opacity: 0.5,
          dashArray: '5 6',
        }).addTo(mapInstance);
      }

      const labelOffset = getWardLabelOffset(ward.ward);

      L.marker([ward.lat, ward.lng], {
        pane: 'ward-labels',
        interactive: false,
        icon: L.divIcon({
          className: 'ward-map-label-icon',
          iconSize: [118, 44],
          iconAnchor: [labelOffset[0], labelOffset[1]],
          html: `
            <div class="ward-map-label${ward.isFocus ? ' ward-map-label--focus' : ''}">
              <span class="ward-map-label__name">${ward.ward}</span>
              <span class="ward-map-label__value">${formatCompactCurrency(ward.pendingTax)}</span>
            </div>
          `,
        }),
      }).addTo(mapInstance);

      circle.bindTooltip(
        `
          <div class="ward-map-tooltip__content">
            <p class="ward-map-tooltip__title">${ward.ward}</p>
            <p>Pending tax: <strong>${formatCurrency(ward.pendingTax)}</strong></p>
            <p>Properties covered: <strong>${ward.totalProperties}</strong></p>
            ${
              ward.isFocus
                ? '<p class="ward-map-tooltip__focus">Highlighted report area</p>'
                : ''
            }
          </div>
        `,
        {
          className: 'ward-map-tooltip',
          direction: 'top',
          offset: [0, -14],
          sticky: true,
        }
      );

      L.circleMarker([ward.lat, ward.lng], {
        pane: 'ward-glow',
        radius: 26 + intensity * 14,
        color: fillColor,
        weight: 1,
        fillColor: getHeatColor(intensity),
        fillOpacity: 0,
        opacity: 0.12 + intensity * 0.1,
      }).addTo(mapInstance);

      bounds.extend([ward.lat, ward.lng]);
    }

    if (bounds.isValid()) {
      mapInstance.fitBounds(bounds.pad(0.25), {
        maxZoom: map.zoom,
      });
    } else {
      mapInstance.setView(map.center, map.zoom);
    }

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            mapInstance.invalidateSize();
          })
        : null;

    resizeObserver?.observe(mapContainerRef.current);
    const frameId = window.requestAnimationFrame(() => {
      mapInstance.invalidateSize();
    });

    return () => {
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(frameId);
      mapInstance.remove();
    };
  }, [map.center, map.wards, map.zoom, maxPendingTax]);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
            {map.title}
          </h4>
          <p className="mt-2 text-sm leading-6 text-slate-200/80">{map.subtitle}</p>
        </div>
        <div className="rounded-2xl border border-rose-200/20 bg-white/10 px-4 py-3 text-sm text-white shadow-lg backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            Highest Pending Ward
          </p>
          <p className="mt-2 text-base font-semibold">{hottestWard.ward}</p>
          <p className="text-sm text-rose-200">{formatCurrency(hottestWard.pendingTax)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            Wards Visible
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{map.wards.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            Total Pending Tax
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatCompactCurrency(totalPendingTax)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            Average Per Ward
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatCompactCurrency(averagePendingTax)}
          </p>
        </div>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/30">
        <div
          className="pointer-events-none absolute inset-0 z-[401] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.16),transparent_28%)]"
          aria-hidden="true"
        />
        <div ref={mapContainerRef} className="h-[420px] w-full" />

        <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-2xl border border-white/15 bg-slate-950/72 px-4 py-3 shadow-xl backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            Heat Scale
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[11px] text-slate-300">Low</span>
            <div className="h-2 w-28 rounded-full bg-gradient-to-r from-[#fde68a] via-[#fb923c] to-[#b91c1c]" />
            <span className="text-[11px] text-slate-300">High</span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-400">
            Larger glowing markers mean more pending tax. Ward tags show live dues.
          </p>
        </div>

        <div className="pointer-events-none absolute bottom-4 right-4 z-[500] rounded-2xl border border-white/15 bg-white/88 px-4 py-3 text-slate-900 shadow-xl backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Focus
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-900 bg-rose-500" />
            <span>Dark outline marks the active report ward.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getHeatColor(intensity: number) {
  if (intensity >= 0.85) {
    return '#b91c1c';
  }

  if (intensity >= 0.65) {
    return '#dc2626';
  }

  if (intensity >= 0.45) {
    return '#f97316';
  }

  return '#facc15';
}

function formatCurrency(value: number) {
  return `INR ${value.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

function formatCompactCurrency(value: number) {
  const compactValue = new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

  return `INR ${compactValue}`;
}

function getWardLabelOffset(ward: string): [number, number] {
  const offsets: Record<string, [number, number]> = {
    'Ward 1': [58, 46],
    'Ward 2': [0, 54],
    'Ward 3': [-56, 44],
    'Ward 4': [-72, 18],
    'Ward 5': [82, 18],
  };

  return offsets[ward] ?? [54, 46];
}
