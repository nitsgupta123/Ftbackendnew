import type { FastifyPluginAsync } from "fastify";
import {
  createPage,
  deletePage,
  getPageById,
  getPageStats,
  listPages,
  updatePage,
} from "../../src/lib/page-repository";
import type { ListPagesParams, PageStatus } from "../../src/lib/page-types";
import { createPageSchema, updatePageSchema } from "../../src/lib/validation";
import { getRequestAudit, requireSuperAdmin } from "../lib/audit";

const VALID_STATUSES: PageStatus[] = ["draft", "published", "archived"];

function parseStatus(value?: string): PageStatus | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  return VALID_STATUSES.includes(value as PageStatus) ? (value as PageStatus) : undefined;
}

export const registerPageRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/stats", async (_request, reply) => {
    try {
      const stats = await getPageStats();
      return reply.send(stats);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to load page stats",
      });
    }
  });

  app.get("/", async (request, reply) => {
    try {
      const query = request.query as Record<string, string | undefined>;
      const params: ListPagesParams = {
        search: query.search,
        status: parseStatus(query.status) ?? "all",
        page_type: query.page_type,
        sort:
          query.sort === "title"
            ? "title"
            : query.sort === "created_at"
              ? "created_at"
              : query.sort === "published_at"
                ? "published_at"
                : "display_order",
        order: query.order === "desc" ? "desc" : "asc",
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
      };

      const result = await listPages(params);
      return reply.send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to list pages",
      });
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const pageId = Number(id);
      if (!Number.isInteger(pageId) || pageId <= 0) {
        return reply.status(400).send({ error: "Invalid page ID" });
      }

      const page = await getPageById(pageId);
      if (!page) {
        return reply.status(404).send({ error: "Page not found" });
      }

      return reply.send({ page });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch page",
      });
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const parsed = createPageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const audit = getRequestAudit(request);
      const page = await createPage(parsed.data, audit);
      return reply.status(201).send({ page });
    } catch (error) {
      app.log.error(error);
      const message = error instanceof Error ? error.message : "Failed to create page";
      return reply.status(500).send({ error: message });
    }
  });

  app.put("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const pageId = Number(id);
      if (!Number.isInteger(pageId) || pageId <= 0) {
        return reply.status(400).send({ error: "Invalid page ID" });
      }

      const parsed = updatePageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const audit = getRequestAudit(request);
      const page = await updatePage(pageId, parsed.data, audit);
      if (!page) {
        return reply.status(404).send({ error: "Page not found" });
      }

      return reply.send({ page });
    } catch (error) {
      app.log.error(error);
      const message = error instanceof Error ? error.message : "Failed to update page";
      return reply.status(500).send({ error: message });
    }
  });

  app.delete("/:id", async (request, reply) => {
    const forbidden = await requireSuperAdmin(request, reply);
    if (forbidden) return forbidden;

    try {
      const { id } = request.params as { id: string };
      const pageId = Number(id);
      if (!Number.isInteger(pageId) || pageId <= 0) {
        return reply.status(400).send({ error: "Invalid page ID" });
      }

      const deleted = await deletePage(pageId);
      if (!deleted) {
        return reply.status(404).send({ error: "Page not found" });
      }

      return reply.send({ ok: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to delete page",
      });
    }
  });
};
