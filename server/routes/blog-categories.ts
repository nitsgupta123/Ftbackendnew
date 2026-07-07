import type { FastifyPluginAsync } from "fastify";
import {
  createBlogCategory,
  deleteBlogCategory,
  getBlogCategoryById,
  listBlogCategories,
  updateBlogCategory,
} from "../../src/lib/blog-category-repository";
import type { BlogCategoryStatus, ListBlogCategoriesParams } from "../../src/lib/blog-category-types";
import { createBlogCategorySchema, updateBlogCategorySchema } from "../../src/lib/validation";
import { getRequestAudit, requireSuperAdmin } from "../lib/audit";

const VALID_STATUSES: BlogCategoryStatus[] = ["active", "inactive"];

function parseStatus(value?: string): BlogCategoryStatus | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  return VALID_STATUSES.includes(value as BlogCategoryStatus)
    ? (value as BlogCategoryStatus)
    : undefined;
}

export const registerBlogCategoryRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/", async (request, reply) => {
    try {
      const query = request.query as Record<string, string | undefined>;
      const params: ListBlogCategoriesParams = {
        search: query.search,
        status: parseStatus(query.status) ?? "all",
        sort: query.sort === "created_at" ? "created_at" : "display_order",
        order: query.order === "desc" ? "desc" : "asc",
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
        activeOnly: query.activeOnly === "true" || query.activeOnly === "1",
      };

      const result = await listBlogCategories(params);
      return reply.send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to list blog categories",
      });
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const categoryId = Number(id);
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return reply.status(400).send({ error: "Invalid category ID" });
      }

      const category = await getBlogCategoryById(categoryId);
      if (!category) {
        return reply.status(404).send({ error: "Category not found" });
      }

      return reply.send({ category });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch category",
      });
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const parsed = createBlogCategorySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const audit = getRequestAudit(request);
      const category = await createBlogCategory(parsed.data, audit);
      return reply.status(201).send({ category });
    } catch (error) {
      app.log.error(error);
      const message = error instanceof Error ? error.message : "Failed to create category";
      const status = message.includes("already exists") ? 409 : 500;
      return reply.status(status).send({ error: message });
    }
  });

  app.put("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const categoryId = Number(id);
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return reply.status(400).send({ error: "Invalid category ID" });
      }

      const parsed = updateBlogCategorySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const audit = getRequestAudit(request);
      const category = await updateBlogCategory(categoryId, parsed.data, audit);
      if (!category) {
        return reply.status(404).send({ error: "Category not found" });
      }

      return reply.send({ category });
    } catch (error) {
      app.log.error(error);
      const message = error instanceof Error ? error.message : "Failed to update category";
      const status = message.includes("already exists") ? 409 : 500;
      return reply.status(status).send({ error: message });
    }
  });

  app.delete("/:id", async (request, reply) => {
    const forbidden = await requireSuperAdmin(request, reply);
    if (forbidden) return forbidden;

    try {
      const { id } = request.params as { id: string };
      const categoryId = Number(id);
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return reply.status(400).send({ error: "Invalid category ID" });
      }

      const deleted = await deleteBlogCategory(categoryId);
      if (!deleted) {
        return reply.status(404).send({ error: "Category not found" });
      }

      return reply.send({ ok: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to delete category",
      });
    }
  });
};
