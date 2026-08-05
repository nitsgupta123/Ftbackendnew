import cron from "node-cron";
import type { FastifyBaseLogger } from "fastify";
import { publishDueScheduledBlogPosts } from "../../src/lib/blog-repository";

const DEFAULT_CRON = "* * * * *"; // every minute (SGT wall-clock via DB session)

export function startBlogPublishScheduler(log: FastifyBaseLogger) {
  const expression = process.env.BLOG_PUBLISH_CRON?.trim() || DEFAULT_CRON;

  if (!cron.validate(expression)) {
    log.error({ expression }, "Invalid BLOG_PUBLISH_CRON expression; scheduler not started");
    return;
  }

  const task = cron.schedule(expression, async () => {
    try {
      const result = await publishDueScheduledBlogPosts();
      if (result.publishedCount > 0) {
        log.info(
          {
            publishedCount: result.publishedCount,
            postIds: result.publishedIds,
          },
          "Published due scheduled blog posts"
        );
      }
    } catch (error) {
      log.error(error, "Failed to publish due scheduled blog posts");
    }
  });

  log.info({ expression }, "Blog publish scheduler started");

  return task;
}
