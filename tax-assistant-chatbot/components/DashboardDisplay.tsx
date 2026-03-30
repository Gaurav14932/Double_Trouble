'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import DataTable from '@/components/DataTable';
import { DashboardData } from '@/lib/chat-types';
import { AppLanguage } from '@/lib/language';
import { getInterfaceLabels } from '@/lib/ui-localization';

const WardHeatMap = dynamic(() => import('@/components/WardHeatMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="h-[360px] animate-pulse rounded-lg bg-gray-100" />
    </div>
  ),
});

interface DashboardDisplayProps {
  dashboard: DashboardData;
  tableData: Record<string, unknown>[];
  language: AppLanguage;
}

const toneClasses: Record<
  NonNullable<DashboardData['summaryCards'][number]['tone']>,
  string
> = {
  default: 'border-gray-200 bg-white text-gray-900',
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  critical: 'border-rose-200 bg-rose-50 text-rose-900',
};

export default function DashboardDisplay({
  dashboard,
  tableData,
  language,
}: DashboardDisplayProps) {
  const labels = getInterfaceLabels(language);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboard.summaryCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-4 shadow-sm ${
              toneClasses[card.tone ?? 'default']
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
              {card.label}
            </p>
            <p className="mt-3 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {dashboard.barChart.title}
          </h4>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dashboard.barChart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={dashboard.barChart.xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {dashboard.barChart.series.map((series) => (
                <Bar
                  key={series.dataKey}
                  dataKey={series.dataKey}
                  name={series.label}
                  fill={series.color}
                  radius={[8, 8, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {dashboard.pieChart.title}
          </h4>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={dashboard.pieChart.data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={104}
                label
              >
                {dashboard.pieChart.data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {dashboard.map ? <WardHeatMap map={dashboard.map} language={language} /> : null}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {labels.summaryInsights}
        </h4>
        <div className="mt-4 grid gap-3">
          {dashboard.insights.map((insight) => (
            <div
              key={insight}
              className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950"
            >
              {insight}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {dashboard.tableTitle}
        </h4>
        <DataTable data={tableData} language={language} />
      </div>
    </div>
  );
}
