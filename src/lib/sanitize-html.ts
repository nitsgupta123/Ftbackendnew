import DOMPurify from "dompurify";

const ALLOWED_IFRAME_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "player.vimeo.com",
]);

DOMPurify.addHook("uponSanitizeElement", (node, data) => {
  if (data.tagName !== "iframe" || !(node instanceof Element)) return;
  let host = "";
  try {
    host = new URL(node.getAttribute("src") ?? "", window.location.origin).hostname;
  } catch {
    host = "";
  }
  if (!ALLOWED_IFRAME_HOSTS.has(host)) {
    node.parentNode?.removeChild(node);
  }
});

/** Sanitizes stored rich-text HTML before rendering it with dangerouslySetInnerHTML. */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "target"],
  });
}
