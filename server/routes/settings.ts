import type { FastifyPluginAsync } from "fastify";
import { getSafeErrorMessage } from "../lib/errors";
import { z } from "zod";
import { getAdminSettings, updateAdminSettings } from "../../src/lib/settings-repository";
import type { UpdateAdminSettingsInput } from "../../src/lib/settings-types";
import { validateEmailList } from "../../src/lib/email-list";

const emailListField = (label: string) =>
  z
    .string()
    .trim()
    .max(1000)
    .default("")
    .superRefine((value, ctx) => {
      const error = validateEmailList(value, label);
      if (error) {
        ctx.addIssue({ code: "custom", message: error });
      }
    });

const updateAdminSettingsSchema = z.object({
  site_name: z.string().trim().min(1, "Site name is required").max(150),
  company_name: z.string().trim().min(1, "Company name is required").max(150),
  support_email: z.string().trim().email("A valid support email is required").max(190),
  support_phone: z.string().trim().min(1, "Support phone is required").max(60),
  office_address: z.string().trim().max(300).default(""),
  timezone: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform(() => "Asia/Singapore"),
  homepage_title: z.string().trim().min(1, "Homepage title is required").max(190),
  homepage_description: z.string().trim().max(600).default(""),
  maintenance_mode: z.boolean().default(false),
  quote_cc_emails: emailListField("Quote CC emails"),
  quote_bcc_emails: emailListField("Quote BCC emails"),
});

export const registerSettingsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/", async (_request, reply) => {
    try {
      const settings = await getAdminSettings();
      return reply.send({ settings });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to load settings"),
      });
    }
  });

  app.put("/", async (request, reply) => {
    try {
      const parsed = updateAdminSettingsSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const settings = await updateAdminSettings(
        parsed.data as UpdateAdminSettingsInput,
        request.user.name ?? null
      );
      return reply.send({ settings });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to update settings"),
      });
    }
  });
};
