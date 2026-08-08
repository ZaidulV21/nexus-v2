import { useEffect } from 'react';

// Marker attribute used to track the <head> elements this component manages.
// Cleanup removes exactly what was created, so page-to-page navigation never
// leaves stale canonical/OG/meta tags behind.
const MANAGED_ATTR = 'data-nexus-seo';

export interface SeoHeadProps {
  /** Page <title>. Falls back to whatever index.html sets when omitted. */
  title?: string;
  /** meta[name=description]. */
  description?: string;
  /** meta[name=keywords]. */
  keywords?: string;
  /** Absolute canonical URL. */
  canonical?: string;
  /** og:type (website by default). */
  ogType?: string;
  /** og:title — defaults to `title`. */
  ogTitle?: string;
  /** og:description — defaults to `description`. */
  ogDescription?: string;
  /** Absolute og:image URL. */
  ogImage?: string;
  /** Absolute og:url. */
  ogUrl?: string;
  /** og:site_name / twitter:site name. */
  siteName?: string;
  /** twitter:card type. */
  twitterCard?: string;
  /** When true, emits meta[name=robots] content="noindex, nofollow". */
  noindex?: boolean;
  /**
   * schema.org structured data. Renders one <script type="application/ld+json">
   * per object (or one combined script when passed as an array of objects —
   * Google recommends a @graph, so multiple separate scripts are also valid).
   * Pass a stable reference / memoized value to avoid re-syncing every render.
   */
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

interface HeadNode {
  tag: string;
  attrs: Record<string, string>;
  text?: string;
}

/** Create (or replace) one <head> node, keyed by the managed attribute. */
function upsertNode(node: HeadNode): HTMLElement {
  const key = node.attrs[MANAGED_ATTR];
  document.querySelectorAll(`[${MANAGED_ATTR}="${key}"]`).forEach((el) => el.remove());
  const el = document.createElement(node.tag);
  for (const [name, value] of Object.entries(node.attrs)) {
    el.setAttribute(name, value);
  }
  if (node.text) el.textContent = node.text;
  document.head.appendChild(el);
  return el;
}

/**
 * Dependency-free <head> manager for the SPA. Sets <title>, meta description /
 * keywords / robots, the canonical link, OpenGraph + Twitter tags and JSON-LD
 * structured data, and removes exactly what it created on the next render or
 * unmount. Each public page renders its own <SeoHead>; the admin panel and
 * client portal leave the <head> untouched.
 */
export function SeoHead(props: SeoHeadProps) {
  // JSON-stringify the whole props object as the effect key so object-literal
  // jsonLd (a fresh reference each render) does not re-sync the <head> on
  // every render — only when the actual content changes.
  const depsKey = JSON.stringify({
    ...props,
    jsonLd: props.jsonLd ? JSON.stringify(props.jsonLd) : undefined,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const { title, description, keywords, canonical, ogType, ogTitle, ogDescription, ogImage, ogUrl, siteName, twitterCard, noindex, jsonLd } = props;

    const created: HTMLElement[] = [];
    const add = (node: HeadNode) => created.push(upsertNode(node));

    if (title) document.title = title;

    if (description) {
      add({ tag: 'meta', attrs: { name: 'description', content: description, [MANAGED_ATTR]: 'description' } });
    }
    if (keywords) {
      add({ tag: 'meta', attrs: { name: 'keywords', content: keywords, [MANAGED_ATTR]: 'keywords' } });
    }

    add({
      tag: 'meta',
      attrs: { name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow', [MANAGED_ATTR]: 'robots' },
    });

    if (canonical) {
      add({ tag: 'link', attrs: { rel: 'canonical', href: canonical, [MANAGED_ATTR]: 'canonical' } });
    }

    // OpenGraph + Twitter (only tags with values are emitted).
    const og = [
      { property: 'og:type', content: ogType || 'website' },
      { property: 'og:title', content: ogTitle || title },
      { property: 'og:description', content: ogDescription || description },
      { property: 'og:url', content: ogUrl || canonical },
      { property: 'og:image', content: ogImage },
      { property: 'og:site_name', content: siteName },
    ] as const;
    for (const tag of og) {
      if (tag.content) {
        add({ tag: 'meta', attrs: { property: tag.property, content: tag.content, [MANAGED_ATTR]: tag.property } });
      }
    }
    if (twitterCard) {
      add({ tag: 'meta', attrs: { name: 'twitter:card', content: twitterCard, [MANAGED_ATTR]: 'twitter:card' } });
    }

    // Structured data: one <script> per JSON-LD object (or a single script for
    // an array, rendered as a @graph). Keeping separate scripts is valid and
    // simpler; Google merges them.
    const objects = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
    if (objects.length === 1) {
      add({ tag: 'script', attrs: { type: 'application/ld+json', [MANAGED_ATTR]: 'jsonld' }, text: JSON.stringify(objects[0]) });
    } else if (objects.length > 1) {
      add({
        tag: 'script',
        attrs: { type: 'application/ld+json', [MANAGED_ATTR]: 'jsonld' },
        text: JSON.stringify({ '@context': 'https://schema.org', '@graph': objects }),
      });
    }

    return () => {
      created.forEach((el) => el.remove());
    };
  }, [depsKey]);

  return null;
}
