export interface MetricCount {
  total: number;
  change: number;
}

export interface DashboardStats {
  pages: MetricCount;
  destinations: MetricCount;
  packages: MetricCount;
  testimonials: MetricCount;
  blogs: MetricCount;
  products: MetricCount;
  newsletterSubscribers: MetricCount;
}

export interface ChartDataPoint {
  date: string;
  visitors: number;
  pageViews: number;
}

export type ActivityStatus = "Published" | "Draft" | "Pending" | "Archived";

export interface DashboardActivity {
  id: string;
  title: string;
  occurredAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  icon: string;
  iconBg: string;
  iconColor: string;
  status?: ActivityStatus;
}

export interface ContentSummaryItem {
  label: string;
  value: number;
  icon: string;
  iconColor: string;
}

export interface DashboardOverview {
  stats: DashboardStats;
  chart: ChartDataPoint[];
  activities: DashboardActivity[];
  contentSummary: ContentSummaryItem[];
}
