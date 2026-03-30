'use client';

import React from 'react';
import { AppLanguage } from '@/lib/language';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import DataTable from '@/components/DataTable';
import { getColumnLabel, getInterfaceLabels } from '@/lib/ui-localization';

interface ChartDisplayProps {
  data: any[];
  queryType: 'aggregate' | 'comparison';
  intent: string;
  language: AppLanguage;
}

const COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
];

export default function ChartDisplay({
  data,
  queryType,
  intent,
  language,
}: ChartDisplayProps) {
  const labels = getInterfaceLabels(language);

  if (!data || data.length === 0) {
    return <div className="p-4 text-gray-600">{labels.noDataToVisualize}</div>;
  }

  // Determine what to visualize based on data structure and intent
  const hasWardData = data.some((d) => d.ward);
  const hasZoneData = data.some((d) => d.zone);
  let keyField = '';

  if (hasWardData) {
    keyField = 'ward';
  } else if (hasZoneData) {
    keyField = 'zone';
  } else {
    // Use first string field as key
    const firstStringField = Object.keys(data[0]).find(
      (key) => typeof data[0][key] === 'string'
    );
    keyField = firstStringField || '';
  }

  // Find numeric fields for visualization
  const numericFields = Object.keys(data[0]).filter(
    (key) => typeof data[0][key] === 'number' && key !== 'property_id'
  );
  const preferredMetricOrder = [
    'collection_efficiency_pct',
    'predicted_default_likelihood_pct',
    'estimated_recovery_with_waiver',
    'estimated_recovery_without_waiver',
    'net_recovery_uplift',
    'collected_amount',
    'outstanding_due',
    'month_on_month_change_pct',
    'payment_events',
    'due_increase_pct',
    'due_increase_amount',
    'risk_score',
    'total_due',
    'total_collected',
    'total_properties',
  ];
  const prioritizedNumericFields = preferredMetricOrder
    .filter((field) => numericFields.includes(field))
    .concat(numericFields.filter((field) => !preferredMetricOrder.includes(field)));
  const isTrendVisualization =
    keyField === 'payment_month' ||
    keyField === 'payment_year' ||
    intent.toLowerCase().includes('trend');

  if (!keyField || numericFields.length === 0) {
    // Fallback to table if we can't determine visualization
    return <DataTable data={data} language={language} />;
  }

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      {prioritizedNumericFields.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">{intent}</h4>
          <ResponsiveContainer width="100%" height={300}>
            {isTrendVisualization ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={keyField} />
                <YAxis />
                <Tooltip />
                <Legend />
                {prioritizedNumericFields.slice(0, 2).map((field, idx) => (
                  <Line
                    key={field}
                    type="monotone"
                    dataKey={field}
                    name={getColumnLabel(field, language)}
                    stroke={COLORS[idx]}
                    strokeWidth={3}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={keyField} />
                <YAxis />
                <Tooltip />
                <Legend />
                {prioritizedNumericFields.slice(0, 3).map((field, idx) => (
                  <Bar
                    key={field}
                    dataKey={field}
                    name={getColumnLabel(field, language)}
                    fill={COLORS[idx]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Pie Chart for single numeric field */}
      {prioritizedNumericFields.length === 1 && data.length <= 6 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">{labels.distribution}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey={prioritizedNumericFields[0]}
                nameKey={keyField}
                cx="50%"
                cy="50%"
                outerRadius={100}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary Stats */}
      {prioritizedNumericFields.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {prioritizedNumericFields.slice(0, 4).map((field) => {
            const values = data.map((d) => d[field] || 0);
            const total = values.reduce((a, b) => a + b, 0);
            const avg = total / data.length;

            return (
              <div
                key={field}
                className="bg-white p-4 rounded-lg border border-gray-200"
              >
                <p className="text-xs font-medium text-gray-600 uppercase">
                  {getColumnLabel(field, language)}
                </p>
                <p className="text-xl font-bold text-gray-900 mt-2">
                  {typeof total === 'number'
                    ? total > 1000
                      ? (total / 1000).toFixed(1) + 'k'
                      : total.toFixed(2)
                    : total}
                </p>
                {data.length > 1 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {labels.averageLabel}: {typeof avg === 'number' ? avg.toFixed(2) : avg}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Table */}
      <details className="bg-white rounded-lg border border-gray-200">
        <summary className="p-4 cursor-pointer font-medium text-gray-700 hover:bg-gray-50">
          {labels.viewDetailedData(data.length)}
        </summary>
        <div className="border-t border-gray-200 p-4">
          <DataTable data={data} language={language} />
        </div>
      </details>
    </div>
  );
}
