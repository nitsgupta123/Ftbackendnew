import type { FastifyPluginAsync } from "fastify";
import { getSafeErrorMessage } from "../lib/errors";
import {
  createSupplier,
  deleteSupplier,
  getSupplierById,
  getSuppliersStats,
  listSupplierCountries,
  listSuppliers,
  updateSupplier,
} from "../../src/lib/supplier-repository";
import type {
  ListSuppliersParams,
  SupplierRelationshipStatus,
  SupplierStatus,
} from "../../src/lib/supplier-types";
import { isSupplierSortField } from "../../src/lib/supplier-types";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "../../src/lib/validation";
import { getRequestAudit, requireModuleAccess, requireSuperAdmin } from "../lib/audit";
import { z } from "zod";
import {
  addCustomSupplierService,
  listCustomSupplierServices,
} from "../../src/lib/supplier-services-repository";

const customServiceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

const VALID_STATUSES: SupplierStatus[] = ["active", "inactive", "do_not_use"];
const VALID_RELATIONSHIPS: SupplierRelationshipStatus[] = [
  "new",
  "under_review",
  "with_issues",
  "on_probation",
  "inactive",
  "blacklisted",
  "poor",
  "average",
  "good",
  "excellent",
];

function parseStatus(value?: string): SupplierStatus | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  return VALID_STATUSES.includes(value as SupplierStatus)
    ? (value as SupplierStatus)
    : undefined;
}

function parseRelationship(
  value?: string
): SupplierRelationshipStatus | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  return VALID_RELATIONSHIPS.includes(value as SupplierRelationshipStatus)
    ? (value as SupplierRelationshipStatus)
    : undefined;
}

export const registerSupplierRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);
  app.addHook("preHandler", requireModuleAccess("suppliers"));

  app.get("/stats", async (_request, reply) => {
    try {
      const stats = await getSuppliersStats();
      return reply.send(stats);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to load supplier stats"),
      });
    }
  });

  app.get("/custom-services", async (_request, reply) => {
    try {
      return reply.send({ services: await listCustomSupplierServices() });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to load custom services"),
      });
    }
  });

  app.post("/custom-services", async (request, reply) => {
    const parsed = customServiceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    try {
      const services = await addCustomSupplierService(parsed.data);
      return reply.status(201).send({ services });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to save custom service"),
      });
    }
  });

  app.get("/countries", async (_request, reply) => {
    try {
      const countries = await listSupplierCountries();
      return reply.send({ countries });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to load countries"),
      });
    }
  });

  app.get("/", async (request, reply) => {
    try {
      const query = request.query as Record<string, string | undefined>;
      const sortValue = query.sort;
      const params: ListSuppliersParams = {
        search: query.search,
        status: parseStatus(query.status) ?? "all",
        relationship_status: parseRelationship(query.relationship_status) ?? "all",
        country: query.country?.trim() || "all",
        sort:
          sortValue && isSupplierSortField(sortValue)
            ? sortValue
            : "company_name",
        order: query.order === "desc" ? "desc" : "asc",
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
      };

      const result = await listSuppliers(params);
      return reply.send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to list suppliers"),
      });
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const supplierId = Number(id);
      if (!Number.isInteger(supplierId) || supplierId <= 0) {
        return reply.status(400).send({ error: "Invalid supplier ID" });
      }

      const supplier = await getSupplierById(supplierId);
      if (!supplier) {
        return reply.status(404).send({ error: "Supplier not found" });
      }

      return reply.send({ supplier });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to fetch supplier"),
      });
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const parsed = createSupplierSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const audit = getRequestAudit(request);
      const supplier = await createSupplier(parsed.data, audit);
      return reply.status(201).send({ supplier });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to create supplier"),
      });
    }
  });

  app.put("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const supplierId = Number(id);
      if (!Number.isInteger(supplierId) || supplierId <= 0) {
        return reply.status(400).send({ error: "Invalid supplier ID" });
      }

      const parsed = updateSupplierSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const audit = getRequestAudit(request);
      const supplier = await updateSupplier(supplierId, parsed.data, audit);
      if (!supplier) {
        return reply.status(404).send({ error: "Supplier not found" });
      }

      return reply.send({ supplier });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to update supplier"),
      });
    }
  });

  app.delete("/:id", async (request, reply) => {
    const forbidden = await requireSuperAdmin(request, reply);
    if (forbidden) return forbidden;

    try {
      const { id } = request.params as { id: string };
      const supplierId = Number(id);
      if (!Number.isInteger(supplierId) || supplierId <= 0) {
        return reply.status(400).send({ error: "Invalid supplier ID" });
      }

      const deleted = await deleteSupplier(supplierId);
      if (!deleted) {
        return reply.status(404).send({ error: "Supplier not found" });
      }

      return reply.send({ ok: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to delete supplier"),
      });
    }
  });
};
