import type { FastifyPluginAsync } from "fastify";
import { getSafeErrorMessage } from "../lib/errors";
import {
  createPricingRule,
  deletePricingRule,
  getDefaultPricingRule,
  getPricingRuleById,
  getPricingRulesStats,
  listPricingRules,
  updatePricingRule,
} from "../../src/lib/pricing-rules-repository";
import type {
  ListPricingRulesParams,
  PricingRuleScopeType,
  PricingRuleStatus,
} from "../../src/lib/pricing-rules-types";
import {
  createPricingRuleSchema,
  updatePricingRuleSchema,
} from "../../src/lib/validation";
import { getRequestAudit, requireModuleAccess, requireSuperAdmin } from "../lib/audit";

const VALID_STATUSES: PricingRuleStatus[] = ["active", "inactive"];
const VALID_SCOPES: PricingRuleScopeType[] = [
  "global",
  "destination",
  "currency",
  "supplier_country",
];

function parseStatus(value?: string): PricingRuleStatus | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  return VALID_STATUSES.includes(value as PricingRuleStatus)
    ? (value as PricingRuleStatus)
    : undefined;
}

function parseScope(value?: string): PricingRuleScopeType | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  return VALID_SCOPES.includes(value as PricingRuleScopeType)
    ? (value as PricingRuleScopeType)
    : undefined;
}

export const registerPricingRulesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);
  app.addHook("preHandler", requireModuleAccess("pricing_rules"));

  app.get("/stats", async (_request, reply) => {
    try {
      const stats = await getPricingRulesStats();
      return reply.send(stats);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to load pricing rules stats"),
      });
    }
  });

  app.get("/default", async (_request, reply) => {
    try {
      const rule = await getDefaultPricingRule();
      return reply.send({ rule });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to load default pricing rule"),
      });
    }
  });

  app.get("/", async (request, reply) => {
    try {
      const query = request.query as Record<string, string | undefined>;
      const params: ListPricingRulesParams = {
        search: query.search,
        status: parseStatus(query.status) ?? "all",
        scope_type: parseScope(query.scope_type) ?? "all",
        sort:
          query.sort === "created_at"
            ? "created_at"
            : query.sort === "name"
              ? "name"
              : "display_order",
        order: query.order === "desc" ? "desc" : "asc",
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
        activeOnly: query.activeOnly === "true" || query.activeOnly === "1",
      };

      const result = await listPricingRules(params);
      return reply.send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to list pricing rules"),
      });
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const ruleId = Number(id);
      if (!Number.isInteger(ruleId) || ruleId <= 0) {
        return reply.status(400).send({ error: "Invalid pricing rule ID" });
      }

      const rule = await getPricingRuleById(ruleId);
      if (!rule) {
        return reply.status(404).send({ error: "Pricing rule not found" });
      }

      return reply.send({ rule });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to fetch pricing rule"),
      });
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const parsed = createPricingRuleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const audit = getRequestAudit(request);
      const rule = await createPricingRule(parsed.data, audit);
      return reply.status(201).send({ rule });
    } catch (error) {
      app.log.error(error);
      const message = getSafeErrorMessage(error, "Failed to create pricing rule");
      const status = message.includes("already exists") ? 409 : 500;
      return reply.status(status).send({ error: message });
    }
  });

  app.put("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const ruleId = Number(id);
      if (!Number.isInteger(ruleId) || ruleId <= 0) {
        return reply.status(400).send({ error: "Invalid pricing rule ID" });
      }

      const parsed = updatePricingRuleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const audit = getRequestAudit(request);
      const rule = await updatePricingRule(ruleId, parsed.data, audit);
      if (!rule) {
        return reply.status(404).send({ error: "Pricing rule not found" });
      }

      return reply.send({ rule });
    } catch (error) {
      app.log.error(error);
      const message = getSafeErrorMessage(error, "Failed to update pricing rule");
      const status = message.includes("already exists") ? 409 : 500;
      return reply.status(status).send({ error: message });
    }
  });

  app.delete("/:id", async (request, reply) => {
    const forbidden = await requireSuperAdmin(request, reply);
    if (forbidden) return forbidden;

    try {
      const { id } = request.params as { id: string };
      const ruleId = Number(id);
      if (!Number.isInteger(ruleId) || ruleId <= 0) {
        return reply.status(400).send({ error: "Invalid pricing rule ID" });
      }

      const deleted = await deletePricingRule(ruleId);
      if (!deleted) {
        return reply.status(404).send({ error: "Pricing rule not found" });
      }

      return reply.send({ ok: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to delete pricing rule"),
      });
    }
  });
};
