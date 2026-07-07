import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { auditContextFromHeader, AUDIT_USER_HEADER } from "../../src/lib/audit-context";
import {
  archiveLegacyPackage,
  createPackage,
  deleteLegacyPackage,
  deletePackage,
  getPackageById,
  getPackageStats,
  listAllPackages,
  listExpiringPackages,
  listPackages,
  listRecentlyPublishedPackages,
  listTblPackages,
  listSupplierQuoteRequests,
  updatePackage,
} from "../../src/lib/package-repository";
import type {
  CreatePackageInput,
  PackageStatus,
  UpdatePackageInput,
} from "../../src/lib/package-types";

const VALID_STATUSES: PackageStatus[] = [
  "draft",
  "pending_review",
  "published",
  "archived",
  "deleted",
];

function parseStatus(value?: string): PackageStatus | undefined {
  if (!value) return undefined;
  return VALID_STATUSES.includes(value as PackageStatus)
    ? (value as PackageStatus)
    : undefined;
}

function getRequestAudit(request: FastifyRequest) {
  if (request.user?.name) {
    return { user: request.user.name };
  }
  return auditContextFromHeader(request.headers[AUDIT_USER_HEADER]);
}

export const registerPackageRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/stats", async (_request, reply) => {
    try {
      const stats = await getPackageStats();
      return reply.send({ stats });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch stats",
      });
    }
  });

  app.get("/expiring-rates", async (_request, reply) => {
    try {
      const packages = await listExpiringPackages();
      return reply.send({ packages });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch expiring rates",
      });
    }
  });

  app.get("/supplier-quotes", async (_request, reply) => {
    try {
      const packages = await listSupplierQuoteRequests();
      return reply.send({ packages });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch supplier quotes",
      });
    }
  });

  app.get("/recently-published", async (_request, reply) => {
    try {
      const packages = await listRecentlyPublishedPackages();
      return reply.send({ packages });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch recently published packages",
      });
    }
  });

  app.get("/combined", async (_request, reply) => {
    try {
      const packages = await listAllPackages();
      return reply.send({ packages });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch all packages",
      });
    }
  });

  app.get("/all", async (_request, reply) => {
    try {
      const packages = await listTblPackages();
      return reply.send({ packages });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch packages from tbl_packages",
      });
    }
  });

  app.get("/", async (request, reply) => {
    try {
      const { status } = request.query as { status?: string };
      const parsedStatus = parseStatus(status);

      if (status && !parsedStatus) {
        return reply.status(400).send({ error: "Invalid status filter" });
      }

      const packages = await listPackages(parsedStatus);
      return reply.send({ packages });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch packages",
      });
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const body = request.body as CreatePackageInput & UpdatePackageInput;
      const audit = getRequestAudit(request);
      const pkg = await createPackage(body, audit);
      return reply.status(201).send({ package: pkg });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to create package",
      });
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const packageId = Number(id);

      if (Number.isNaN(packageId)) {
        return reply.status(400).send({ error: "Invalid package id" });
      }

      const pkg = await getPackageById(packageId);
      if (!pkg) {
        return reply.status(404).send({ error: "Package not found" });
      }

      return reply.send({ package: pkg });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch package",
      });
    }
  });

  app.patch("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { source } = request.query as { source?: string };
      const packageId = Number(id);

      if (Number.isNaN(packageId)) {
        return reply.status(400).send({ error: "Invalid package id" });
      }

      const body = request.body as UpdatePackageInput;
      const audit = getRequestAudit(request);

      if (source === "legacy") {
        if (body.status === "archived") {
          const pkg = await archiveLegacyPackage(packageId, audit);
          if (!pkg) {
            return reply.status(404).send({ error: "Package not found" });
          }
          return reply.send({ package: pkg });
        }
        return reply.status(400).send({ error: "Unsupported update for legacy package" });
      }

      const pkg = await updatePackage(packageId, body, audit);

      if (!pkg) {
        return reply.status(404).send({ error: "Package not found" });
      }

      return reply.send({ package: pkg });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to update package",
      });
    }
  });

  app.delete("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { source } = request.query as { source?: string };
      const packageId = Number(id);

      if (Number.isNaN(packageId)) {
        return reply.status(400).send({ error: "Invalid package id" });
      }

      const audit = getRequestAudit(request);
      const deleted =
        source === "legacy"
          ? await deleteLegacyPackage(packageId)
          : await deletePackage(packageId, audit);
      if (!deleted) {
        return reply.status(404).send({ error: "Package not found" });
      }

      return reply.send({ success: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to delete package",
      });
    }
  });
};
