import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { getSafeErrorMessage } from "../lib/errors";
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
  SupplierQuoteToolData,
  UpdatePackageInput,
} from "../../src/lib/package-types";
import { z } from "zod";
import { getAdminSettings } from "../../src/lib/settings-repository";
import { isEmailConfigured, sendMail } from "../../src/lib/email";
import { isValidEmail, parseEmailList } from "../../src/lib/email-list";
import { buildQuoteEmailAttachments } from "../../src/lib/package-quote-attachment";
import {
  applyReferenceCodeToSubject,
  withQuoteEmailSignature,
} from "../../src/lib/supplier-quote-email";
import { requireModuleAccess } from "../lib/audit";

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
    const userId = Number(request.user.sub);
    return { user: request.user.name, userId: Number.isInteger(userId) && userId > 0 ? userId : undefined };
  }
  return auditContextFromHeader(request.headers[AUDIT_USER_HEADER]);
}

const sendSupplierQuoteSchema = z.object({
  to: z
    .array(z.string().trim().email())
    .min(1, "At least one recipient is required")
    .max(20, "At most 20 recipients"),
  additionalTo: z.array(z.string().trim().email()).max(20, "At most 20 recipients").optional().default([]),
  subject: z.string().trim().min(1, "Subject is required").max(500),
  body: z.string().trim().min(1, "Email body is required").max(20000),
  emailSignature: z.string().max(2000).optional(),
  quoteData: z.record(z.string(), z.unknown()).optional(),
});

export const registerPackageRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);
  app.addHook("preHandler", requireModuleAccess("packages"));

  app.get("/stats", async (_request, reply) => {
    try {
      const stats = await getPackageStats();
      return reply.send({ stats });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to fetch stats"),
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
        error: getSafeErrorMessage(error, "Failed to fetch expiring rates"),
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
        error: getSafeErrorMessage(error, "Failed to fetch supplier quotes"),
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
        error: getSafeErrorMessage(error, "Failed to fetch recently published packages"),
      });
    }
  });

  const packagePickerRoute = { config: { permissionModule: ["packages", "blogs"] } };

  app.get("/combined", packagePickerRoute, async (_request, reply) => {
    try {
      const packages = await listAllPackages();
      return reply.send({ packages });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to fetch all packages"),
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
        error: getSafeErrorMessage(error, "Failed to fetch packages from tbl_packages"),
      });
    }
  });

  app.get("/", packagePickerRoute, async (request, reply) => {
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
        error: getSafeErrorMessage(error, "Failed to fetch packages"),
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
        error: getSafeErrorMessage(error, "Failed to create package"),
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
        error: getSafeErrorMessage(error, "Failed to fetch package"),
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
        error: getSafeErrorMessage(error, "Failed to update package"),
      });
    }
  });

  const supplierQuoteRoute = { config: { permissionModule: "supplier_quote_tool" } };
  app.post("/:id/supplier-quotes/send", supplierQuoteRoute, async (request, reply) => {
    try {
      if (!isEmailConfigured()) {
        return reply.status(503).send({
          error:
            "Email is not configured. Set SMTP_HOST (and SMTP_USER / SMTP_PASS) to enable supplier quote emails.",
        });
      }

      const { id } = request.params as { id: string };
      const packageId = Number(id);
      if (Number.isNaN(packageId)) {
        return reply.status(400).send({ error: "Invalid package id" });
      }

      const parsed = sendSupplierQuoteSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const pkg = await getPackageById(packageId);
      if (!pkg) {
        return reply.status(404).send({ error: "Package not found" });
      }

      const settings = await getAdminSettings();
      const managementCc = parseEmailList(settings.quote_cc_emails).filter(isValidEmail);
      const managementBcc = parseEmailList(settings.quote_bcc_emails).filter(isValidEmail);

      const toEmails = [
        ...new Set(
          [...parsed.data.to, ...parsed.data.additionalTo]
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean)
        ),
      ];

      if (toEmails.length === 0) {
        return reply.status(400).send({ error: "At least one recipient is required" });
      }

      const existingQuote =
        (pkg.supplier_quote_tool as SupplierQuoteToolData | null) ?? {};
      const quotePayload = (parsed.data.quoteData ?? {}) as SupplierQuoteToolData;
      const editedSignature =
        parsed.data.emailSignature?.trim() ||
        (typeof quotePayload.emailSignature === "string"
          ? quotePayload.emailSignature.trim()
          : "");
      const attachments = await buildQuoteEmailAttachments(pkg, {
        attachPackage: quotePayload.attachPackage !== false,
        includeItinerary: quotePayload.includeDayByDayItinerary !== false,
      });

      const referenceCode =
        typeof quotePayload.referenceCode === "string" ? quotePayload.referenceCode.trim() : "";
      if (!referenceCode) {
        return reply.status(400).send({
          error: "Add your reference code so it appears in the subject line",
        });
      }
      const subject = applyReferenceCodeToSubject(parsed.data.subject, referenceCode);

      const signedBody = withQuoteEmailSignature(parsed.data.body, {
        name: request.user?.name,
        role: request.user?.role,
        text: editedSignature || undefined,
      });

      const mailResult = await sendMail({
        to: toEmails,
        cc: managementCc,
        bcc: managementBcc,
        subject,
        text: signedBody,
        replyTo: settings.support_email || undefined,
        attachments,
      });

      const audit = getRequestAudit(request);

      const nextQuote: SupplierQuoteToolData = {
        ...existingQuote,
        ...quotePayload,
        referenceCode,
        toEmails: parsed.data.to,
        additionalEmails: parsed.data.additionalTo,
        emailSubject: subject,
        emailBody: parsed.data.body,
        emailSignature: editedSignature || quotePayload.emailSignature,
        lastSentAt: new Date().toISOString(),
        lastSentBy: audit.user ?? request.user?.name ?? null,
        lastSentTo: toEmails,
      };

      const updated = await updatePackage(
        packageId,
        { supplier_quote_tool: nextQuote },
        audit
      );

      return reply.send({
        success: true,
        messageId: mailResult.messageId,
        mode: mailResult.mode,
        previewUrl: mailResult.previewUrl,
        package: updated,
        recipients: {
          to: toEmails,
          cc: managementCc,
          bcc: managementBcc,
        },
        attachments: attachments.map((file) => file.filename),
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to send supplier quote email"),
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
        error: getSafeErrorMessage(error, "Failed to delete package"),
      });
    }
  });
};
