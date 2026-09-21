import type { FastifyPluginAsync } from "fastify";
import { getSafeErrorMessage } from "../lib/errors";
import {
  applyPackageTemplate,
  createPackageTemplate,
  deletePackageTemplate,
  getPackageTemplateById,
  getPackageTemplateStats,
  listPackageTemplates,
  updatePackageTemplate,
} from "../../src/lib/package-template-repository";
import type {
  ListPackageTemplatesParams,
  TemplateStatus,
  TemplateType,
} from "../../src/lib/package-template-types";
import {
  createPackageTemplateSchema,
  updatePackageTemplateSchema,
} from "../../src/lib/validation";
import { getRequestAudit, requireSuperAdmin } from "../lib/audit";

const VALID_STATUSES: TemplateStatus[] = ["active", "inactive"];
const VALID_TYPES: TemplateType[] = ["full", "partial"];

function parseStatus(value?: string): TemplateStatus | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  return VALID_STATUSES.includes(value as TemplateStatus)
    ? (value as TemplateStatus)
    : undefined;
}

function parseTemplateType(value?: string): TemplateType | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  return VALID_TYPES.includes(value as TemplateType) ? (value as TemplateType) : undefined;
}

export const registerPackageTemplateRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/stats", async (_request, reply) => {
    try {
      const stats = await getPackageTemplateStats();
      return reply.send({ stats });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to fetch template stats"),
      });
    }
  });

  app.get("/", async (request, reply) => {
    try {
      const query = request.query as Record<string, string | undefined>;
      const params: ListPackageTemplatesParams = {
        search: query.search,
        status: parseStatus(query.status) ?? "all",
        template_type: parseTemplateType(query.template_type) ?? "all",
        sort:
          query.sort === "created_at"
            ? "created_at"
            : query.sort === "usage_count"
              ? "usage_count"
              : "display_order",
        order: query.order === "desc" ? "desc" : "asc",
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
        activeOnly: query.activeOnly === "true" || query.activeOnly === "1",
      };

      const result = await listPackageTemplates(params);
      return reply.send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to list templates"),
      });
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const templateId = Number(id);
      if (!Number.isInteger(templateId) || templateId <= 0) {
        return reply.status(400).send({ error: "Invalid template ID" });
      }

      const template = await getPackageTemplateById(templateId);
      if (!template) {
        return reply.status(404).send({ error: "Template not found" });
      }

      return reply.send({ template });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to fetch template"),
      });
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const parsed = createPackageTemplateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const audit = getRequestAudit(request);
      const template = await createPackageTemplate(parsed.data, audit);
      return reply.status(201).send({ template });
    } catch (error) {
      app.log.error(error);
      const message = getSafeErrorMessage(error, "Failed to create template");
      const status = message.includes("already exists") ? 409 : 500;
      return reply.status(status).send({ error: message });
    }
  });

  app.put("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const templateId = Number(id);
      if (!Number.isInteger(templateId) || templateId <= 0) {
        return reply.status(400).send({ error: "Invalid template ID" });
      }

      const parsed = updatePackageTemplateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const audit = getRequestAudit(request);
      const template = await updatePackageTemplate(templateId, parsed.data, audit);
      if (!template) {
        return reply.status(404).send({ error: "Template not found" });
      }

      return reply.send({ template });
    } catch (error) {
      app.log.error(error);
      const message = getSafeErrorMessage(error, "Failed to update template");
      const status = message.includes("already exists") ? 409 : 500;
      return reply.status(status).send({ error: message });
    }
  });

  app.post("/:id/apply", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const templateId = Number(id);
      if (!Number.isInteger(templateId) || templateId <= 0) {
        return reply.status(400).send({ error: "Invalid template ID" });
      }

      const audit = getRequestAudit(request);
      const result = await applyPackageTemplate(templateId, audit);
      if (!result) {
        return reply.status(404).send({ error: "Template not found" });
      }

      return reply.send(result);
    } catch (error) {
      app.log.error(error);
      const message = getSafeErrorMessage(error, "Failed to apply template");
      const status = message.includes("active") ? 400 : 500;
      return reply.status(status).send({ error: message });
    }
  });

  app.delete("/:id", async (request, reply) => {
    const forbidden = await requireSuperAdmin(request, reply);
    if (forbidden) return forbidden;

    try {
      const { id } = request.params as { id: string };
      const templateId = Number(id);
      if (!Number.isInteger(templateId) || templateId <= 0) {
        return reply.status(400).send({ error: "Invalid template ID" });
      }

      const deleted = await deletePackageTemplate(templateId);
      if (!deleted) {
        return reply.status(404).send({ error: "Template not found" });
      }

      return reply.send({ ok: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to delete template"),
      });
    }
  });
};
