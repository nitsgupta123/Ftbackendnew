import type { FastifyPluginAsync } from "fastify";
import { getDashboardOverview } from "../../src/lib/dashboard-repository";

const VALID_CHART_DAYS = new Set([7, 30, 90]);

function parseChartDays(value?: string): number {
  const days = value ? Number(value) : 7;
  return VALID_CHART_DAYS.has(days) ? days : 7;
}

export const registerDashboardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/", async (request, reply) => {
    try {
      const query = request.query as { chartDays?: string };
      const overview = await getDashboardOverview(parseChartDays(query.chartDays));
      return reply.send(overview);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to load dashboard",
      });
    }
  });
};
