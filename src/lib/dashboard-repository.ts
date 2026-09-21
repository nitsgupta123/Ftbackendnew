import type { RowDataPacket } from "mysql2";
import { isMissingTableError, query, sqlLimit, type QueryParam } from "./db";
import { getPackageStats } from "./package-repository";
import { SGT_TIME_ZONE, toIsoSgt } from "./format-date";
import type {
  ChartDataPoint,
  ContentSummaryItem,
  DashboardActivity,
  DashboardOverview,
  DashboardStats,
  MetricCount,
} from "./dashboard-types";

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
  try {
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
  } catch (error) {
    if (isMissingTableError(error)) {
      return { total: 0, change: 0 };
    }
    throw error;
  }
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
    `SELECT COUNT(*) AS cnt FROM tbl_post WHERE post_type = 'pages'`,
    `SELECT ${monthlySql("insert_date")} FROM tbl_post WHERE post_type = 'pages'`
  );
}

async function getDestinationsMetric(): Promise<MetricCount> {
  const where = "IFNULL(status, 0) != 2";
  return countMetric(
    `SELECT COUNT(*) AS cnt FROM tbl_destinations WHERE ${where}`,
    `SELECT ${monthlySql("insert_date")} FROM tbl_destinations WHERE ${where}`
  );
}

async function getPackagesMetric(): Promise<MetricCount> {
  try {
    const stats = await getPackageStats();
    const monthRows = await query<RowDataPacket[]>(`
      SELECT ${monthlySql("insert_date")}
      FROM tbl_packages
      WHERE IFNULL(status, 0) != 2
    `);

    return {
      total: stats.total,
      change: calcPercentChange(
        Number(monthRows[0]?.current_month ?? 0),
        Number(monthRows[0]?.previous_month ?? 0)
      ),
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      return { total: 0, change: 0 };
    }
    throw error;
  }
}

async function getTestimonialsMetric(): Promise<MetricCount> {
  const where = "IFNULL(status, 0) != 2";
  return countMetric(
    `SELECT COUNT(*) AS cnt FROM tbl_testimonials WHERE ${where}`,
    `SELECT ${monthlySql("insert_date")} FROM tbl_testimonials WHERE ${where}`
  );
}

async function getBlogsMetric(): Promise<MetricCount> {
  return countMetric(
    `SELECT COUNT(*) AS cnt FROM tbl_post WHERE post_type = 'article'`,
    `SELECT ${monthlySql("insert_date")} FROM tbl_post WHERE post_type = 'article'`
  );
}

async function getProductsMetric(): Promise<MetricCount> {
  const where = "IFNULL(status, 0) != 2";
  return countMetric(
    `SELECT COUNT(*) AS cnt FROM tbl_products WHERE ${where}`,
    `SELECT ${monthlySql("entry_date")} FROM tbl_products WHERE ${where}`
  );
}

async function getNewsletterMetric(): Promise<MetricCount> {
  return countMetric(
    `SELECT COUNT(*) AS cnt FROM tbl_message WHERE message_type = 'popupenquery'`,
    `SELECT ${monthlySql("insert_date")} FROM tbl_message WHERE message_type = 'popupenquery'`
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
      FROM tbl_message
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
  if (status === "pending_review" || status === "scheduled" || status === "archived") {
    return "Pending";
  }
  return "Draft";
}

function asAuditName(value: unknown): string | null {
  if (value == null) return null;
  const name = String(value).trim();
  return name || null;
}

async function getRecentActivities(limit = 5): Promise<DashboardActivity[]> {
  const safe = sqlLimit(limit, 50);
  const safeQuery = async (sql: string, params: QueryParam[] = []) => {
    try {
      return await query<RowDataPacket[]>(sql, params);
    } catch (error) {
      if (isMissingTableError(error)) return [] as RowDataPacket[];
      throw error;
    }
  };

  const [packages, blogs, destinations, testimonials] = await Promise.all([
    safeQuery(
      `
        SELECT
          id,
          CASE
            WHEN is_publish = 1 THEN 'published'
            WHEN is_archive = 1 THEN 'archived'
            ELSE 'draft'
          END AS status,
          COALESCE(edit_date, insert_date) AS occurred_at,
          NULL AS created_by,
          NULL AS updated_by,
          p_name AS title
        FROM tbl_packages
        WHERE IFNULL(status, 0) != 2
        ORDER BY COALESCE(edit_date, insert_date) DESC
        LIMIT ${safe}
      `
    ),
    safeQuery(
      `
        SELECT
          id,
          post_title AS title,
          CASE
            WHEN is_auto_scheduled = 1 AND IFNULL(is_auto_scheduled_posted,0) = 0 THEN 'scheduled'
            WHEN is_draft = 1 THEN 'draft'
            WHEN post_status = 2 THEN 'archived'
            WHEN post_status = 1 THEN 'published'
            ELSE 'draft'
          END AS status,
          COALESCE(post_date, edit_date, insert_date) AS occurred_at,
          NULL AS created_by,
          NULL AS updated_by
        FROM tbl_post
        WHERE post_type = 'article'
        ORDER BY COALESCE(edit_date, insert_date) DESC
        LIMIT ${safe}
      `
    ),
    safeQuery(
      `
        SELECT id, d_name AS title, status, COALESCE(edit_date, insert_date) AS occurred_at
        FROM tbl_destinations
        WHERE IFNULL(status, 0) != 2
        ORDER BY COALESCE(edit_date, insert_date) DESC
        LIMIT ${safe}
      `
    ),
    safeQuery(
      `
        SELECT id, testi_name AS title, status, COALESCE(edit_date, insert_date) AS occurred_at
        FROM tbl_testimonials
        WHERE IFNULL(status, 0) != 2
        ORDER BY COALESCE(edit_date, insert_date) DESC
        LIMIT ${safe}
      `
    ),
  ]);

  const activities: DashboardActivity[] = [
    ...packages.map((row) => ({
      id: `package-${row.id}`,
      title: `Package "${String(row.title ?? "Untitled")}" updated`,
      occurredAt: toIsoSgt(
        row.occurred_at instanceof Date || typeof row.occurred_at === "string"
          ? row.occurred_at
          : String(row.occurred_at ?? "")
      ) ?? String(row.occurred_at ?? ""),
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
      occurredAt: toIsoSgt(
        row.occurred_at instanceof Date || typeof row.occurred_at === "string"
          ? row.occurred_at
          : String(row.occurred_at ?? "")
      ) ?? String(row.occurred_at ?? ""),
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
      occurredAt: toIsoSgt(
        row.occurred_at instanceof Date || typeof row.occurred_at === "string"
          ? row.occurred_at
          : String(row.occurred_at ?? "")
      ) ?? String(row.occurred_at ?? ""),
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
      occurredAt: toIsoSgt(
        row.occurred_at instanceof Date || typeof row.occurred_at === "string"
          ? row.occurred_at
          : String(row.occurred_at ?? "")
      ) ?? String(row.occurred_at ?? ""),
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
    getRecentActivities(20),
  ]);

  return {
    stats,
    chart,
    activities,
    contentSummary: buildContentSummary(stats),
  };
}
