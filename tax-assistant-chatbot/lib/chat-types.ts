export type QueryType = 'table' | 'aggregate' | 'comparison' | 'dashboard';
export type DataSource = 'database' | 'demo';

export interface DashboardSummaryCard {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'warning' | 'critical';
}

export interface DashboardBarSeries {
  dataKey: string;
  label: string;
  color: string;
}

export interface DashboardMapPoint {
  ward: string;
  lat: number;
  lng: number;
  pendingTax: number;
  totalProperties: number;
  isFocus?: boolean;
}

export interface DashboardData {
  summaryCards: DashboardSummaryCard[];
  insights: string[];
  tableTitle: string;
  barChart: {
    title: string;
    data: Record<string, unknown>[];
    xKey: string;
    series: DashboardBarSeries[];
  };
  pieChart: {
    title: string;
    data: Array<{
      name: string;
      value: number;
      color: string;
    }>;
  };
  map?: {
    title: string;
    subtitle: string;
    center: [number, number];
    zoom: number;
    wards: DashboardMapPoint[];
  };
}

export interface ChatResponseData {
  results: Record<string, unknown>[];
  intent: string;
  explanation: string;
  queryType: QueryType;
  resultCount: number;
  query: string;
  source: DataSource;
  dashboard?: DashboardData;
}
