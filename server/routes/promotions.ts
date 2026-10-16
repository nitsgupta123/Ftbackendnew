import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getSafeErrorMessage } from "../lib/errors";
import { requireModuleAccess } from "../lib/audit";
import {
  createPromotion,
  deletePromotion,
  getPromotionById,
  listPromotions,
  setPromotionStatus,
  updatePromotion,
} from "../../src/lib/promotion-repository";

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}/, "Use YYYY-MM-DD")
  .max(40)
  .nullable()
  .optional()
  .transform((value) => value || null);

const promotionSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    valid_from: dateString,
    valid_to: dateString,
    discount_type: z.enum(["percentage", "fixed_amount"]),
    value: z.coerce.number().positive("Value must be greater than 0").max(1_000_000),
    package_keys: z
      .array(z.string().trim().regex(/^(wizard|legacy):\d+$/, "Invalid package key"))
      .max(500)
      .default([]),
    status: z.enum(["active", "inactive"]).default("active"),
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === "percentage" && data.value > 100) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Percentage cannot exceed 100" });
    }
    if (data.valid_from && data.valid_to && data.valid_to < data.valid_from) {
      ctx.addIssue({ code: "custom", path: ["valid_to"], message: "End date is before start date" });
    }
  });

const statusSchema = z.object({ status: z.enum(["active", "inactive"]) });

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const registerPromotionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);
  app.addHook("preHandler", requireModuleAccess("packages"));

  app.get("/", async (_request, reply) => {
    try {
      return reply.send({ promotions: await listPromotions() });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: getSafeErrorMessage(error, "Failed to list promotions") });
    }
  });

  app.get("/:id", async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (!id) return reply.status(400).send({ error: "Invalid promotion ID" });
    try {
      const promotion = await getPromotionById(id);
      if (!promotion) return reply.status(404).send({ error: "Promotion not found" });
      return reply.send({ promotion });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: getSafeErrorMessage(error, "Failed to fetch promotion") });
    }
  });

  app.post("/", async (request, reply) => {
    const parsed = promotionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    try {
      const promotion = await createPromotion(parsed.data);
      return reply.status(201).send({ promotion });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: getSafeErrorMessage(error, "Failed to create promotion") });
    }
  });

  app.put("/:id", async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (!id) return reply.status(400).send({ error: "Invalid promotion ID" });
    const parsed = promotionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    try {
      const promotion = await updatePromotion(id, parsed.data);
      if (!promotion) return reply.status(404).send({ error: "Promotion not found" });
      return reply.send({ promotion });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: getSafeErrorMessage(error, "Failed to update promotion") });
    }
  });

  app.patch("/:id/status", async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (!id) return reply.status(400).send({ error: "Invalid promotion ID" });
    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    try {
      const promotion = await setPromotionStatus(id, parsed.data.status);
      if (!promotion) return reply.status(404).send({ error: "Promotion not found" });
      return reply.send({ promotion });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: getSafeErrorMessage(error, "Failed to update promotion") });
    }
  });

  app.delete("/:id", async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (!id) return reply.status(400).send({ error: "Invalid promotion ID" });
    try {
      const deleted = await deletePromotion(id);
      if (!deleted) return reply.status(404).send({ error: "Promotion not found" });
      return reply.send({ ok: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: getSafeErrorMessage(error, "Failed to delete promotion") });
    }
  });
};
