import type { FastifyPluginAsync } from "fastify";
import { getSafeErrorMessage } from "../lib/errors";
import {
  deleteEnquiry,
  findEnquiryById,
  getEnquiryStats,
  listEnquiries,
  updateEnquiryStatus,
} from "../../src/lib/enquiry-repository";
import type {
  EnquirySortField,
  EnquiryStatusFilter,
  EnquiryTypeFilter,
} from "../../src/lib/enquiry-types";
import { requireModuleAccess } from "../lib/audit";

const VALID_TYPES: EnquiryTypeFilter[] = [
  "all",
  "contactus",
  "popupenquery",
  "contactus_visa",
  "contactus_corporate",
];

const VALID_STATUSES: EnquiryStatusFilter[] = ["all", "open", "closed"];
const VALID_SORTS: EnquirySortField[] = ["insert_date", "first_name", "email"];

function parseType(value?: string): EnquiryTypeFilter {
  if (value && VALID_TYPES.includes(value as EnquiryTypeFilter)) {
    return value as EnquiryTypeFilter;
  }
  return "all";
}

function parseStatus(value?: string): EnquiryStatusFilter {
  if (value && VALID_STATUSES.includes(value as EnquiryStatusFilter)) {
    return value as EnquiryStatusFilter;
  }
  return "all";
}

function parseSort(value?: string): EnquirySortField {
  if (value && VALID_SORTS.includes(value as EnquirySortField)) {
    return value as EnquirySortField;
  }
  return "insert_date";
}

export const registerEnquiryRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);
  app.addHook("preHandler", requireModuleAccess("enquiries"));

  app.get("/stats", async (_request, reply) => {
    try {
      const stats = await getEnquiryStats();
      return reply.send({ stats });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to fetch enquiry stats"),
      });
    }
  });

  app.get("/", async (request, reply) => {
    try {
      const query = request.query as Record<string, string | undefined>;
      const result = await listEnquiries({
        search: query.search,
        type: parseType(query.type),
        status: parseStatus(query.status),
        sort: parseSort(query.sort),
        order: query.order === "asc" ? "asc" : "desc",
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
      });
      return reply.send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to list enquiries"),
      });
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const enquiryId = Number(id);
      if (!Number.isInteger(enquiryId) || enquiryId <= 0) {
        return reply.status(400).send({ error: "Invalid enquiry ID" });
      }

      const enquiry = await findEnquiryById(enquiryId);
      if (!enquiry) {
        return reply.status(404).send({ error: "Enquiry not found" });
      }

      return reply.send({ enquiry });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to fetch enquiry"),
      });
    }
  });

  app.patch("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const enquiryId = Number(id);
      if (!Number.isInteger(enquiryId) || enquiryId <= 0) {
        return reply.status(400).send({ error: "Invalid enquiry ID" });
      }

      const body = request.body as { status?: string };
      if (body.status !== "open" && body.status !== "closed") {
        return reply.status(400).send({ error: "Status must be open or closed" });
      }

      const enquiry = await updateEnquiryStatus(enquiryId, body.status);
      if (!enquiry) {
        return reply.status(404).send({ error: "Enquiry not found" });
      }

      return reply.send({ enquiry });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to update enquiry"),
      });
    }
  });

  app.delete("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const enquiryId = Number(id);
      if (!Number.isInteger(enquiryId) || enquiryId <= 0) {
        return reply.status(400).send({ error: "Invalid enquiry ID" });
      }

      const deleted = await deleteEnquiry(enquiryId);
      if (!deleted) {
        return reply.status(404).send({ error: "Enquiry not found" });
      }

      return reply.send({ success: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to delete enquiry"),
      });
    }
  });
};
