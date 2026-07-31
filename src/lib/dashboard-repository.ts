import type { RowDataPacket } from "mysql2";
import { query, type QueryParam } from "./db";
import { getPackageStats } from "./package-repository";
import { SGT_TIME_ZONE } from "./format-date";
import type {
  ChartDataPoint,
  ContentSummaryItem,
  DashboardActivity,
  DashboardOverview,
  DashboardStats,
  MetricCount,
} from "./dashboard-types";

const LEGACY_DB = process.env.LEGACY_DB_NAME ?? "fz";
const DB = process.env.DB_NAME ?? "fz";

function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

async function countMetric(
  totalSql: string,
  monthSql: string,
  params: QueryParam[] = []
): Promise<MetricCount> {
  const [totalRows, monthRows] = await Promise.all([
    query<RowDataPacket[]>(totalSql, params),
    query<RowDataPacket[]>(monthSql, params),
  ]);

  const total = Number(totalRows[0]?.cnt ?? 0);
  const currentMonth = Number(monthRows[0]?.current_month ?? 0);
  const previousMonth = Number(monthRows[0]?.previous_month ?? 0);

  return {
    total,
    change: calcPercentChange(currentMonth, previousMonth),
  };
}

const MONTHLY_COUNT = `
  SUM(CASE WHEN {dateColumn} >= DATE_FORMAT(NOW(), '%Y-%m-01') THEN 1 ELSE 0 END) AS current_month,
  SUM(CASE WHEN {dateColumn} >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
            AND {dateColumn} < DATE_FORMAT(NOW(), '%Y-%m-01') THEN 1 ELSE 0 END) AS previous_month
`;

function monthlySql(dateColumn: string): string {
  return MONTHLY_COUNT.replaceAll("{dateColumn}", dateColumn);
}

async function getPagesMetric(): Promise<MetricCount> {
  return countMetric(
    `SELECT COUNT(*) AS cnt FROM ${DB}.cms_pages`,
    `SELECT ${monthlySql("COALESCE(published_at, created_at)")} FROM ${DB}.cms_pages`
  );
}

async function getDestinationsMetric(): Promise<MetricCount> {
  const where = "IFNULL(status, 0) != 2";
  return countMetric(
    `SELECT COUNT(*) AS cnt FROM ${LEGACY_DB}.tbl_destinations WHERE ${where}`,
    `SELECT ${monthlySql("insert_date")} FROM ${LEGACY_DB}.tbl_destinations WHERE ${where}`
  );
}

async function getPackagesMetric(): Promise<MetricCount> {
  const stats = await getPackageStats();
  const monthRows = await query<RowDataPacket[]>(`
    SELECT ${monthlySql("created_at")}
    FROM ${DB}.add_package
    WHERE status != 'deleted'
  `);

  return {
    total: stats.total,
    change: calcPercentChange(
      Number(monthRows[0]?.current_month ?? 0),
      Number(monthRows[0]?.previous_month ?? 0)
    ),
  };
}

async function getTestimonialsMetric(): Promise<MetricCount> {
  const where = "IFNULL(status, 0) != 2";
  return countMetric(
    `SELECT COUNT(*) AS cnt FROM ${LEGACY_DB}.tbl_testimonials WHERE ${where}`,
    `SELECT ${monthlySql("insert_date")} FROM ${LEGACY_DB}.tbl_testimonials WHERE ${where}`
  );
}

async function getBlogsMetric(): Promise<MetricCount> {
  return countMetric(
    `SELECT COUNT(*) AS cnt FROM ${DB}.blog_posts`,
    `SELECT ${monthlySql("created_at")} FROM ${DB}.blog_posts`
  );
}

async function getProductsMetric(): Promise<MetricCount> {
  const where = "IFNULL(status, 0) != 2";
  return countMetric(
    `SELECT COUNT(*) AS cnt FROM ${LEGACY_DB}.tbl_products WHERE ${where}`,
    `SELECT ${monthlySql("entry_date")} FROM ${LEGACY_DB}.tbl_products WHERE ${where}`
  );
}

async function getNewsletterMetric(): Promise<MetricCount> {
  return countMetric(
    `SELECT COUNT(*) AS cnt FROM ${LEGACY_DB}.tbl_message WHERE message_type = 'popupenquery'`,
    `SELECT ${monthlySql("insert_date")} FROM ${LEGACY_DB}.tbl_message WHERE message_type = 'popupenquery'`
  );
}

async function getDashboardStats(): Promise<DashboardStats> {
  const [pages, destinations, packages, testimonials, blogs, products, newsletterSubscribers] =
    await Promise.all([
      getPagesMetric(),
      getDestinationsMetric(),
      getPackagesMetric(),
      getTestimonialsMetric(),
      getBlogsMetric(),
      getProductsMetric(),
      getNewsletterMetric(),
    ]);

  return {
    pages,
    destinations,
    packages,
    testimonials,
    blogs,
    products,
    newsletterSubscribers,
  };
}

function formatChartLabel(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleDateString("en-US", {
      timeZone: SGT_TIME_ZONE,
      month: "short",
      day: "numeric",
    });
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        timeZone: SGT_TIME_ZONE,
        month: "short",
        day: "numeric",
      });
    }
  }
  return String(value ?? "");
}

function getSgtDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SGT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function parseDayKeyAsUtcDate(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00Z`);
}

function fillChartDays(
  rows: RowDataPacket[],
  days: number
): ChartDataPoint[] {
  const byDay = new Map<string, { visitors: number; pageViews: number }>();

  for (const row of rows) {
    const rowDate =
      row.day instanceof Date ? row.day : new Date(String(row.day));
    const key = Number.isNaN(rowDate.getTime())
      ? String(row.day).slice(0, 10)
      : getSgtDayKey(rowDate);
    byDay.set(key, {
      visitors: Number(row.visitors ?? 0),
      pageViews: Number(row.pageViews ?? 0),
    });
  }

  const points: ChartDataPoint[] = [];
  const end = parseDayKeyAsUtcDate(getSgtDayKey(new Date()));

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - offset);
    const key = getSgtDayKey(date);
    const values = byDay.get(key) ?? { visitors: 0, pageViews: 0 };
    points.push({
      date: formatChartLabel(date),
      visitors: values.visitors,
      pageViews: values.pageViews,
    });
  }

  return points;
}

async function getEnquiryChart(days: number): Promise<ChartDataPoint[]> {
  const safeDays = [7, 30, 90].includes(days) ? days : 7;
  const rows = await query<RowDataPacket[]>(
    `
      SELECT
        DATE(insert_date) AS day,
        COUNT(DISTINCT NULLIF(email, '')) AS visitors,
        COUNT(*) AS pageViews
      FROM ${LEGACY_DB}.tbl_message
      WHERE insert_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(insert_date)
      ORDER BY day ASC
    `,
    [safeDays - 1]
  );

  return fillChartDays(rows, safeDays);
}

function mapPackageStatus(status: string): DashboardActivity["status"] {
  if (status === "published") return "Published";
  if (status === "pending_review") return "Pending";
  return "Draft";
}

function mapBlogStatus(status: string): DashboardActivity["status"] {
  if (status === "published") return "Published";
  if (status === "archived") return "Pending";
  return "Draft";
}

function asAuditName(value: unknown): string | null {
  if (value == null) return null;
  const name = String(value).trim();
  return name || null;
}

async function getRecentActivities(limit = 5): Promise<DashboardActivity[]> {
  const [packages, blogs, destinations, testimonials] = await Promise.all([
    query<RowDataPacket[]>(
      `
        SELECT
          ap.id,
          ap.status,
          ap.updated_at AS occurred_at,
          ap.created_by,
          ap.updated_by,
          tp.p_name AS title
        FROM ${DB}.add_package ap
        INNER JOIN ${LEGACY_DB}.tbl_packages tp ON tp.id = ap.package_id
        WHERE ap.status != 'deleted'
        ORDER BY ap.updated_at DESC
        LIMIT ?
      `,
      [limit]
    ),
    query<RowDataPacket[]>(
      `
        SELECT
          id,
          title,
          status,
          COALESCE(published_at, updated_at, created_at) AS occurred_at,
          COALESCE(created_by, author_name) AS created_by,
          COALESCE(updated_by, created_by, author_name) AS updated_by
        FROM ${DB}.blog_posts
        ORDER BY COALESCE(published_at, updated_at, created_at) DESC
        LIMIT ?
      `,
      [limit]
    ),
    query<RowDataPacket[]>(
      `
        SELECT id, d_name AS title, status, COALESCE(edit_date, insert_date) AS occurred_at
        FROM ${LEGACY_DB}.tbl_destinations
        WHERE IFNULL(status, 0) != 2
        ORDER BY COALESCE(edit_date, insert_date) DESC
        LIMIT ?
      `,
      [limit]
    ),
    query<RowDataPacket[]>(
      `
        SELECT id, testi_name AS title, status, COALESCE(edit_date, insert_date) AS occurred_at
        FROM ${LEGACY_DB}.tbl_testimonials
        WHERE IFNULL(status, 0) != 2
        ORDER BY COALESCE(edit_date, insert_date) DESC
        LIMIT ?
      `,
      [limit]
    ),
  ]);

  const activities: DashboardActivity[] = [
    ...packages.map((row) => ({
      id: `package-${row.id}`,
      title: `Package "${String(row.title ?? "Untitled")}" updated`,
      occurredAt: new Date(row.occurred_at).toISOString(),
      createdBy: asAuditName(row.created_by),
      updatedBy: asAuditName(row.updated_by) ?? asAuditName(row.created_by),
      icon: "Package",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-500",
      status: mapPackageStatus(String(row.status)),
    })),
    ...blogs.map((row) => ({
      id: `blog-${row.id}`,
      title: `Blog post "${String(row.title)}" ${row.status === "published" ? "published" : "updated"}`,
      occurredAt: new Date(row.occurred_at).toISOString(),
      createdBy: asAuditName(row.created_by),
      updatedBy: asAuditName(row.updated_by),
      icon: "FileText",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      status: mapBlogStatus(String(row.status)),
    })),
    ...destinations.map((row) => ({
      id: `destination-${row.id}`,
      title: `Destination "${String(row.title)}" added`,
      occurredAt: new Date(row.occurred_at).toISOString(),
      createdBy: null,
      updatedBy: null,
      icon: "MapPin",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      status: "Published" as const,
    })),
    ...testimonials.map((row) => ({
      id: `testimonial-${row.id}`,
      title: `Testimonial from ${String(row.title)} approved`,
      occurredAt: new Date(row.occurred_at).toISOString(),
      createdBy: null,
      updatedBy: null,
      icon: "Star",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      status: "Published" as const,
    })),
  ];

  return activities
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
}

function buildContentSummary(stats: DashboardStats): ContentSummaryItem[] {
  return [
    { label: "Pages", value: stats.pages.total, icon: "FileStack", iconColor: "text-blue-500" },
    {
      label: "Destinations",
      value: stats.destinations.total,
      icon: "MapPin",
      iconColor: "text-emerald-500",
    },
    {
      label: "Packages",
      value: stats.packages.total,
      icon: "Package",
      iconColor: "text-violet-500",
    },
    { label: "Blogs", value: stats.blogs.total, icon: "FileText", iconColor: "text-yellow-500" },
    {
      label: "Products",
      value: stats.products.total,
      icon: "ShoppingCart",
      iconColor: "text-red-500",
    },
    {
      label: "Testimonials",
      value: stats.testimonials.total,
      icon: "Star",
      iconColor: "text-amber-500",
    },
  ];
}

export async function getDashboardOverview(chartDays = 7): Promise<DashboardOverview> {
  const stats = await getDashboardStats();
  const [chart, activities] = await Promise.all([
    getEnquiryChart(chartDays),
    getRecentActivities(),
  ]);

  return {
    stats,
    chart,
    activities,
    contentSummary: buildContentSummary(stats),
  };
}
