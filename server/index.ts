import { config } from "dotenv";

config({ path: ".env.local" });
config();
import path from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { registerAuthPlugin } from "./plugins/auth";
import { registerAuthRoutes } from "./routes/auth";
import { registerPackageRoutes } from "./routes/packages";
import { registerLegacyAssetRoutes } from "./routes/legacy-assets";
import { registerCategoryRoutes } from "./routes/categories";
import { registerUserRoutes } from "./routes/users";
import { registerPricingRulesRoutes } from "./routes/pricing-rules";
import { registerPackageTemplateRoutes } from "./routes/package-templates";
import { registerBlogRoutes } from "./routes/blogs";
import { registerBlogCategoryRoutes } from "./routes/blog-categories";
import { registerPageRoutes } from "./routes/pages";
import { registerDashboardRoutes } from "./routes/dashboard";
import { registerEnquiryRoutes } from "./routes/enquiries";
import { registerSettingsRoutes } from "./routes/settings";
import { registerMediaRoutes } from "./routes/media";
import { registerPermissionRoutes } from "./routes/permissions";
import { registerSupplierRoutes } from "./routes/suppliers";
import { registerPromotionRoutes } from "./routes/promotions";
import { isDbConnectionError, verifyDbConnection } from "../src/lib/db";
import { getSafeErrorMessage } from "./lib/errors";
import { startBlogPublishScheduler } from "./jobs/blog-publish-scheduler";

const PORT = Number(process.env.API_PORT ?? 4000);
const HOST = process.env.API_HOST ?? "0.0.0.0";
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const DIST_ROOT = path.join(process.cwd(), "dist");

async function buildServer() {
  mkdirSync(UPLOAD_ROOT, { recursive: true });

  const app = Fastify({
    logger: {
      level: process.env.API_LOG_LEVEL ?? "info",
    },
  });

  const defaultCorsOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  const envCorsOrigins =
    process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];

  await app.register(cors, {
    origin: [...new Set([...defaultCorsOrigins, ...envCorsOrigins])],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });

  await app.register(multipart, {
    limits: {
      fileSize: 80 * 1024 * 1024,
      files: 1,
    },
  });

  await app.register(fastifyStatic, {
    root: UPLOAD_ROOT,
    prefix: "/uploads/",
    decorateReply: false,
    setHeaders: (reply) => {
      reply.header("X-Content-Type-Options", "nosniff");
      reply.header("X-Frame-Options", "DENY");
      reply.header("Referrer-Policy", "no-referrer");
      reply.header(
        "X-Robots-Tag",
        "noindex, nofollow, noarchive, nosnippet, noimageindex"
      );
    },
  });

  app.get("/health", async () => ({
    ok: true,
    service: "ftbackend",
  }));

  await registerAuthPlugin(app);
  await app.register(registerAuthRoutes, { prefix: "/api/auth" });
  await app.register(registerPackageRoutes, { prefix: "/api/packages" });
  await app.register(registerCategoryRoutes, { prefix: "/api/categories" });
  await app.register(registerUserRoutes, { prefix: "/api/users" });
  await app.register(registerPricingRulesRoutes, { prefix: "/api/pricing-rules" });
  await app.register(registerPackageTemplateRoutes, { prefix: "/api/package-templates" });
  await app.register(registerBlogRoutes, { prefix: "/api/blogs" });
  await app.register(registerBlogCategoryRoutes, { prefix: "/api/blog-categories" });
  await app.register(registerPageRoutes, { prefix: "/api/pages" });
  await app.register(registerDashboardRoutes, { prefix: "/api/dashboard" });
  await app.register(registerEnquiryRoutes, { prefix: "/api/enquiries" });
  await app.register(registerSettingsRoutes, { prefix: "/api/settings" });
  await app.register(registerMediaRoutes, { prefix: "/api/media" });
  await app.register(registerPermissionRoutes, { prefix: "/api/permissions" });
  await app.register(registerSupplierRoutes, { prefix: "/api/suppliers" });
  await app.register(registerPromotionRoutes, { prefix: "/api/promotions" });
  await app.register(registerLegacyAssetRoutes, { prefix: "/api/legacy-assets" });

  if (existsSync(DIST_ROOT)) {
    await app.register(fastifyStatic, {
      root: DIST_ROOT,
      prefix: "/panel/",
      decorateReply: false,
      wildcard: false,
      setHeaders: (reply) => {
        reply.header(
          "X-Robots-Tag",
          "noindex, nofollow, noarchive, nosnippet, noimageindex"
        );
      },
    });

    const spaIndex = readFileSync(path.join(DIST_ROOT, "index.html"));

    app.get("/", async (_request, reply) => reply.redirect("/panel/"));
    app.get("/panel", async (_request, reply) => reply.redirect("/panel/"));

    app.setNotFoundHandler(async (request, reply) => {
      const url = request.url.split("?")[0] ?? "";
      if (
        url.startsWith("/api") ||
        url.startsWith("/uploads") ||
        url === "/health"
      ) {
        return reply.status(404).send({ error: "Not found" });
      }
      if (url === "/panel" || url.startsWith("/panel/")) {
        return reply
          .type("text/html")
          .header(
            "X-Robots-Tag",
            "noindex, nofollow, noarchive, nosnippet, noimageindex"
          )
          .send(spaIndex);
      }
      return reply.redirect("/panel/");
    });
  }

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header(
      "Content-Security-Policy",
      "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
    );
    if (process.env.NODE_ENV === "production") {
      reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    reply.header(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive, nosnippet, noimageindex"
    );
    return payload;
  });

  app.setErrorHandler((error, _request, reply) => {
    if (isDbConnectionError(error)) {
      return reply.status(503).send({
        error: "Database is unavailable. Start MySQL and try again.",
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: getSafeErrorMessage(error, "Internal server error"),
    });
  });

  return app;
}

async function start() {
  const app = await buildServer();

  try {
    await verifyDbConnection();
    app.log.info("Database connection verified");
  } catch (error) {
    app.log.error(
      error,
      "Database connection failed. Start MySQL (e.g. XAMPP) and restart the API server."
    );
    process.exit(1);
  }

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Fastify API running at http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
    startBlogPublishScheduler(app.log);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
