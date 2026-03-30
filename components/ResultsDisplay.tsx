'use client';

import React, { useState } from 'react';
import DataTable from '@/components/DataTable';
import ChartDisplay from '@/components/ChartDisplay';
import DashboardDisplay from '@/components/DashboardDisplay';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatResponseData } from '@/lib/chat-types';

interface ResultsDisplayProps {
  data: ChatResponseData;
}

export default function ResultsDisplay({ data }: ResultsDisplayProps) {
  const [expanded, setExpanded] = useState(true);
  const [showSQL, setShowSQL] = useState(false);
  const [copied, setCopied] = useState(false);
  const queryLabel =
    data.query.trim().startsWith('ANALYTICS:') ||
    data.query.trim().startsWith('DASHBOARD:')
    ? 'View Analytics Logic'
    : 'View Generated Query';

  const copySQL = () => {
    navigator.clipboard.writeText(data.query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data.results || data.results.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
        <p className="font-medium">No results found</p>
        <p className="text-sm mt-1">Try adjusting your query parameters</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{data.intent}</h3>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-600">{data.resultCount} records found</p>
              {data.source === 'demo' && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Demo data
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-600 hover:text-gray-900"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Summary */}
          {data.explanation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">{data.explanation}</p>
            </div>
          )}

          {/* Dashboard / Chart / Table */}
          {data.queryType === 'dashboard' && data.dashboard ? (
            <DashboardDisplay dashboard={data.dashboard} tableData={data.results} />
          ) : data.queryType === 'aggregate' || data.queryType === 'comparison' ? (
            <ChartDisplay
              data={data.results}
              queryType={data.queryType}
              intent={data.intent}
            />
          ) : (
            <DataTable data={data.results} />
          )}

          {/* SQL Query Viewer */}
          <details className="bg-gray-100 rounded-lg">
            <summary className="p-3 cursor-pointer font-medium text-sm text-gray-700 hover:bg-gray-200">
              {queryLabel}
            </summary>
            <div className="border-t border-gray-300 p-3">
              <div className="relative bg-gray-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-gray-100 text-xs font-mono">{data.query}</pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copySQL}
                  className="absolute top-2 right-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
