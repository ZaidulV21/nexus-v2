// Helpers for storing + rendering rich text (TipTap HTML) on CMS content.
// The editor stores HTML in the same `description` fields the public site
// reads, so every render path must sanitize before touching dangerouslySetInnerHTML.

import DOMPurify from 'dompurify';

const HTML_RE = /<\s*([a-z][a-z0-9-]*)(\s[^>]*)?>[\s\S]*?<\s*\/\s*\1\s*>/i;

/** True when a string looks like marked-up HTML rather than plain text. */
export function looksLikeHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return HTML_RE.test(value);
}

/**
 * Sanitize arbitrary CMS HTML before it is rendered. Allowed set mirrors the
 * TipTap StarterKit toolbar (headings, emphasis, lists, links, code, images).
 * Links are forced to https/http/mailto and opened in a new tab via rel.
 */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'hr', 'blockquote',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup',
      'ul', 'ol', 'li',
      'code', 'pre',
      'a',
      'img',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'title', 'src', 'alt', 'width', 'height'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|data:image\/)/i,
    ADD_ATTR: ['target'],
  });
}

/** Normalize editor output: strip empty paragraphs and collapse to a single
 *  `<p></p>` when the admin leaves everything blank (so the field clears). */
export function normalizeRichText(html: string): string {
  const trimmed = (html ?? '').trim();
  if (!trimmed || trimmed === '<p></p>' || trimmed === '<p><br></p>') return '';
  return trimmed;
}

/**
 * Convert stored plain text (legacy `\n\n`-separated paragraphs, no markup)
 * into editor HTML. Existing HTML passes through untouched.
 */
export function plainTextToRteHtml(value: string | null | undefined): string {
  if (!value) return '<p></p>';
  if (looksLikeHtml(value)) return value;
  return value
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n');
}

/** Strip markup + entities to a plain string (for excerpts / meta snippets). */
export function richTextToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
