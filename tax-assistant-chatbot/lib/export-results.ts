'use client';

import { ChatResponseData } from '@/lib/chat-types';

type ExportFormat = 'pdf' | 'excel';

interface ExportRequest {
  data: ChatResponseData;
  format: ExportFormat;
}

function humanizeLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(', ');
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function buildTimestampLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function sanitizeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

function buildExportFilename(data: ChatResponseData, extension: string): string {
  const timestamp = buildTimestampLabel(new Date());
  const slug = sanitizeFilename(data.intent || 'tax_report') || 'tax_report';

  return `${slug}_${timestamp}.${extension}`;
}

function buildSummaryRows(data: ChatResponseData): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ['Intent', data.intent],
    ['Query Type', humanizeLabel(data.queryType)],
    ['Result Count', String(data.resultCount)],
    ['Source', humanizeLabel(data.source)],
  ];

  if (data.explanation) {
    rows.push(['Explanation', data.explanation]);
  }

  if (data.dashboard) {
    for (const card of data.dashboard.summaryCards) {
      rows.push([card.label, card.value]);
    }
  }

  return rows;
}

function buildInsightRows(data: ChatResponseData): string[] {
  return data.dashboard?.insights ?? [];
}

function buildFormattedResults(data: ChatResponseData): Record<string, string>[] {
  return data.results.map((row) => {
    const formattedRow: Record<string, string> = {};

    for (const [key, value] of Object.entries(row)) {
      formattedRow[humanizeLabel(key)] = formatValue(value);
    }

    return formattedRow;
  });
}

async function exportAsExcel(data: ChatResponseData): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const summaryRows = buildSummaryRows(data);
  const insightRows = buildInsightRows(data);
  const formattedResults = buildFormattedResults(data);

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Property Tax Assistant Export'],
    [],
    ...summaryRows,
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  if (insightRows.length > 0) {
    const insightsSheet = XLSX.utils.aoa_to_sheet([
      ['Summary Insights'],
      [],
      ...insightRows.map((insight, index) => [`Insight ${index + 1}`, insight]),
    ]);
    XLSX.utils.book_append_sheet(workbook, insightsSheet, 'Insights');
  }

  const resultsSheet =
    formattedResults.length > 0
      ? XLSX.utils.json_to_sheet(formattedResults)
      : XLSX.utils.aoa_to_sheet([['No rows returned']]);

  XLSX.utils.book_append_sheet(workbook, resultsSheet, 'Results');
  XLSX.writeFile(workbook, buildExportFilename(data, 'xlsx'));
}

async function exportAsPdf(data: ChatResponseData): Promise<void> {
  const [jsPdfModule, autoTableModule] = await Promise.all([
    import('jspdf/dist/jspdf.es.min.js'),
    import('jspdf-autotable'),
  ]);
  const { jsPDF } = jsPdfModule as unknown as typeof import('jspdf');
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageMargin = 40;
  const contentWidth = pageWidth - pageMargin * 2;
  const summaryRows = buildSummaryRows(data);
  const insightRows = buildInsightRows(data);
  const formattedResults = buildFormattedResults(data);
  const lastTableDoc = doc as typeof doc & {
    lastAutoTable?: {
      finalY?: number;
    };
  };

  let cursorY = 44;

  doc.setFontSize(18);
  doc.text('Property Tax Assistant Export', pageMargin, cursorY);
  cursorY += 20;

  doc.setFontSize(11);
  doc.setTextColor(75, 85, 99);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageMargin, cursorY);
  cursorY += 24;

  const explanationLines = doc.splitTextToSize(data.explanation || '', contentWidth);
  if (explanationLines.length > 0) {
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(12);
    doc.text(explanationLines, pageMargin, cursorY);
    cursorY += explanationLines.length * 14 + 12;
  }

  autoTable(doc, {
    startY: cursorY,
    head: [['Summary', 'Value']],
    body: summaryRows,
    styles: {
      fontSize: 9,
      cellPadding: 6,
      valign: 'top',
    },
    headStyles: {
      fillColor: [29, 78, 216],
    },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: contentWidth - 150 },
    },
    margin: {
      left: pageMargin,
      right: pageMargin,
    },
  });

  cursorY = (lastTableDoc.lastAutoTable?.finalY ?? cursorY) + 18;

  if (insightRows.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [['Summary Insights']],
      body: insightRows.map((insight) => [insight]),
      styles: {
        fontSize: 9,
        cellPadding: 6,
        valign: 'top',
      },
      headStyles: {
        fillColor: [15, 23, 42],
      },
      margin: {
        left: pageMargin,
        right: pageMargin,
      },
    });

    cursorY = (lastTableDoc.lastAutoTable?.finalY ?? cursorY) + 18;
  }

  if (formattedResults.length > 0) {
    const columns = Object.keys(formattedResults[0]);
    autoTable(doc, {
      startY: cursorY,
      head: [columns],
      body: formattedResults.map((row) => columns.map((column) => row[column])),
      styles: {
        fontSize: 8,
        cellPadding: 5,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [22, 163, 74],
      },
      margin: {
        left: pageMargin,
        right: pageMargin,
      },
    });
  } else {
    doc.setFontSize(11);
    doc.text('No rows returned for this query.', pageMargin, cursorY);
  }

  doc.save(buildExportFilename(data, 'pdf'));
}

export async function exportChatResponse({
  data,
  format,
}: ExportRequest): Promise<void> {
  if (format === 'excel') {
    await exportAsExcel(data);
    return;
  }

  await exportAsPdf(data);
}
