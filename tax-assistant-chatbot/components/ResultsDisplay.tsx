'use client';

import React, { useState } from 'react';
import DataTable from '@/components/DataTable';
import ChartDisplay from '@/components/ChartDisplay';
import DashboardDisplay from '@/components/DashboardDisplay';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatResponseData } from '@/lib/chat-types';
import { exportChatResponse } from '@/lib/export-results';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AppLanguage } from '@/lib/language';
import { getInterfaceLabels } from '@/lib/ui-localization';

interface ResultsDisplayProps {
  data: ChatResponseData;
  language: AppLanguage;
}

export default function ResultsDisplay({ data, language }: ResultsDisplayProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'excel' | null>(
    null
  );
  const { toast } = useToast();
  const labels = getInterfaceLabels(language);
  const queryLabel =
    data.query.trim().startsWith('ANALYTICS:') ||
    data.query.trim().startsWith('DASHBOARD:')
    ? labels.viewAnalyticsLogic
    : labels.viewGeneratedQuery;

  const copySQL = () => {
    navigator.clipboard.writeText(data.query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setExportingFormat(format);
      await exportChatResponse({ data, format });
      toast({
        title: labels.exportReadyTitle(format),
        description: labels.exportReadyDescription,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to export this result.';

      toast({
        title: labels.exportFailedTitle,
        description: message,
        variant: 'destructive',
      });
    } finally {
      setExportingFormat(null);
    }
  };

  if (!data.results || data.results.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
        <p className="font-medium">{labels.noResultsTitle}</p>
        <p className="text-sm mt-1">{labels.noResultsDescription}</p>
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
              <p className="text-sm text-gray-600">{labels.recordsFound(data.resultCount)}</p>
              {data.source === 'demo' && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {labels.demoData}
                </span>
              )}
            </div>
          </div>
          <div className="ml-4 flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportingFormat !== null}
                  className="shrink-0"
                >
                  {exportingFormat ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exportingFormat ? labels.exporting : labels.export}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="w-4 h-4" />
                  {labels.exportAsPdf}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="w-4 h-4" />
                  {labels.exportAsExcel}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
            <DashboardDisplay
              dashboard={data.dashboard}
              tableData={data.results}
              language={language}
            />
          ) : data.queryType === 'aggregate' || data.queryType === 'comparison' ? (
            <ChartDisplay
              data={data.results}
              queryType={data.queryType}
              intent={data.intent}
              language={language}
            />
          ) : (
            <DataTable data={data.results} language={language} />
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
