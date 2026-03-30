'use client';

import React from 'react';
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

interface ChartDisplayProps {
  data: any[];
  queryType: 'aggregate' | 'comparison';
  intent: string;
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
}: ChartDisplayProps) {
  if (!data || data.length === 0) {
    return <div className="p-4 text-gray-600">No data to visualize</div>;
  }

  // Determine what to visualize based on data structure and intent
  const hasWardData = data.some((d) => d.ward);
  const hasZoneData = data.some((d) => d.zone);
  const hasPaymentStatus = data.some((d) => d.payment_status);

  let chartData = data;
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

  // Choose chart type based on data characteristics
  const isComparison = queryType === 'comparison' || data.length <= 5;

  if (!keyField || numericFields.length === 0) {
    // Fallback to table if we can't determine visualization
    return <DataTable data={data} />;
  }

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      {numericFields.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">{intent}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={keyField} />
              <YAxis />
              <Tooltip />
              <Legend />
              {numericFields.slice(0, 3).map((field, idx) => (
                <Bar key={field} dataKey={field} fill={COLORS[idx]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pie Chart for single numeric field */}
      {numericFields.length === 1 && data.length <= 6 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey={numericFields[0]}
                nameKey={keyField}
                cx="50%"
                cy="50%"
                outerRadius={100}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary Stats */}
      {numericFields.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {numericFields.slice(0, 4).map((field) => {
            const values = data.map((d) => d[field] || 0);
            const total = values.reduce((a, b) => a + b, 0);
            const avg = total / data.length;

            return (
              <div
                key={field}
                className="bg-white p-4 rounded-lg border border-gray-200"
              >
                <p className="text-xs font-medium text-gray-600 uppercase">
                  {field.split('_').join(' ')}
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
                    Avg: {typeof avg === 'number' ? avg.toFixed(2) : avg}
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
          View Detailed Data ({data.length} records)
        </summary>
        <div className="border-t border-gray-200 p-4">
          <DataTable data={data} />
        </div>
      </details>
    </div>
  );
}
