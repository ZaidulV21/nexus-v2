/**
 * Defensive server-side sanitizer for CMS rich-text (TipTap HTML) content.
 *
 * The public website renders descriptions through DOMPurify, so stored markup
 * is inert on the live site. This is a second, transport-level guard used
 * whenever content is copied (service/sub-service duplicate) or serialized
 * into structured data: it strips active content (script/style and their
 * bodies), inline event handlers and javascript: URLs so copied rows never
 * carry executable payloads into new records.
 */
export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return '';
  return input
    // Remove <script>...</script> and <style>...</style> blocks entirely.
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Remove on* inline event handlers (onclick, onerror, ...).
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Neutralize javascript: URLs on href/src attributes.
    .replace(/\s(href|src|xlink:href)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, ' $1=""')
    // Drop any <iframe>/<object>/<embed> embeds - never needed in a description.
    .replace(/<(iframe|object|embed)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(iframe|object|embed)[^>]*\/?>/gi, '');
}
