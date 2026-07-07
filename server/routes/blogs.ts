import type { FastifyPluginAsync } from "fastify";
import {
  createBlogPost,
  deleteBlogPost,
  getBlogPostById,
  getBlogStats,
  listBlogPosts,
  updateBlogPost,
} from "../../src/lib/blog-repository";
import type { BlogPostStatus, ListBlogPostsParams } from "../../src/lib/blog-types";
import { createBlogPostSchema, updateBlogPostSchema } from "../../src/lib/validation";
import { getRequestAudit, requireSuperAdmin } from "../lib/audit";

const VALID_STATUSES: BlogPostStatus[] = ["draft", "published", "archived"];

function parseStatus(value?: string): BlogPostStatus | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  return VALID_STATUSES.includes(value as BlogPostStatus) ? (value as BlogPostStatus) : undefined;
}

export const registerBlogRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/stats", async (_request, reply) => {
    try {
      const stats = await getBlogStats();
      return reply.send(stats);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to load blog stats",
      });
    }
  });

  app.get("/", async (request, reply) => {
    try {
      const query = request.query as Record<string, string | undefined>;
      const params: ListBlogPostsParams = {
        search: query.search,
        status: parseStatus(query.status) ?? "all",
        category_id: query.category_id ? Number(query.category_id) : undefined,
        sort:
          query.sort === "title"
            ? "title"
            : query.sort === "created_at"
              ? "created_at"
              : "published_at",
        order: query.order === "asc" ? "asc" : "desc",
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
        featuredOnly: query.featuredOnly === "true" || query.featuredOnly === "1",
      };

      const result = await listBlogPosts(params);
      return reply.send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to list blog posts",
      });
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const postId = Number(id);
      if (!Number.isInteger(postId) || postId <= 0) {
        return reply.status(400).send({ error: "Invalid blog post ID" });
      }

      const post = await getBlogPostById(postId);
      if (!post) {
        return reply.status(404).send({ error: "Blog post not found" });
      }

      return reply.send({ post });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch blog post",
      });
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const parsed = createBlogPostSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const audit = getRequestAudit(request);
      const post = await createBlogPost(parsed.data, audit);
      return reply.status(201).send({ post });
    } catch (error) {
      app.log.error(error);
      const message = error instanceof Error ? error.message : "Failed to create blog post";
      return reply.status(500).send({ error: message });
    }
  });

  app.put("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const postId = Number(id);
      if (!Number.isInteger(postId) || postId <= 0) {
        return reply.status(400).send({ error: "Invalid blog post ID" });
      }

      const parsed = updateBlogPostSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const audit = getRequestAudit(request);
      const post = await updateBlogPost(postId, parsed.data, audit);
      if (!post) {
        return reply.status(404).send({ error: "Blog post not found" });
      }

      return reply.send({ post });
    } catch (error) {
      app.log.error(error);
      const message = error instanceof Error ? error.message : "Failed to update blog post";
      return reply.status(500).send({ error: message });
    }
  });

  app.delete("/:id", async (request, reply) => {
    const forbidden = await requireSuperAdmin(request, reply);
    if (forbidden) return forbidden;

    try {
      const { id } = request.params as { id: string };
      const postId = Number(id);
      if (!Number.isInteger(postId) || postId <= 0) {
        return reply.status(400).send({ error: "Invalid blog post ID" });
      }

      const deleted = await deleteBlogPost(postId);
      if (!deleted) {
        return reply.status(404).send({ error: "Blog post not found" });
      }

      return reply.send({ ok: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to delete blog post",
      });
    }
  });
};
