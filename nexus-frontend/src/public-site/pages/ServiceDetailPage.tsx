import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  IndianRupee,
  Info,
  Layers,
  MessageCircle,
  Phone,
  Quote,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import { usePublicServiceBySlug, usePublicServices } from '@/queries/usePublicServices';
import { usePublicSubServices } from '@/queries/usePublicSubServices';
import { usePublicServiceMedia } from '@/queries/useServices';
import { useServicePortfolio } from '@/queries/usePortfolio';
import { usePublicCompany } from '../hooks';
import { cn } from '@/lib/utils';
import { ServiceCard } from '../components/ServiceCard';
import { ServiceGallery } from '../components/ServiceGallery';
import { MarketingGallery } from '../components/MarketingGallery';
import { PortfolioProjectCard } from '../components/PortfolioProjectCard';
import { FAQAccordion } from '../components/FAQAccordion';
import { TestimonialCard } from '../components/TestimonialCard';
import { FadeIn, StaggerGroup, StaggerItem } from '../components/motion';
import { subServiceIconMap } from '../components/subServiceIcons';
import { toServiceDetailContent, toSubServiceDetailContent } from '../lib/serviceDetailContent';
import type { ServiceDetailContent } from '../lib/serviceDetailContent';
import type { ServiceItem } from '../types';
import type { SubService } from '@/types';

const SECTION_NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'sub-services', label: 'Sub Services' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'features', label: 'Features' },
  { id: 'whats-included', label: "What's Included" },
  { id: 'process', label: 'Process' },
  { id: 'faqs', label: 'FAQ' },
  { id: 'testimonials', label: 'Reviews' },
  { id: 'related', label: 'Related' },
] as const;

type SectionId = (typeof SECTION_NAV)[number]['id'];

/** Smooth-scroll to an on-page section, accounting for the fixed navbar. */
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Track which section is currently in view (runs after content has mounted). */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string>(ids[0]);

  useEffect(() => {
    const onScroll = () => {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 180) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ids]);

  return active;
}

/** Build a WhatsApp deep-link from a phone number, or null if no real number exists. */
function buildWhatsAppLink(phone: string, text: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function SectionHeading({ tag, title, description }: { tag: string; title: string; description?: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      <span className="inline-flex items-center gap-2 rounded-full bg-accent-subtle px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
        <Sparkles className="h-3 w-3" />
        {tag}
      </span>
      <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 text-ink-muted leading-relaxed">{description}</p>}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-[70vh]">
      <div className="h-[52vh] animate-pulse bg-canvas" />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-8 w-64 animate-pulse rounded bg-canvas" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-canvas" />
        <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-canvas" />
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <div className="h-96 animate-pulse rounded-2xl bg-canvas lg:col-span-2" />
          <div className="h-96 animate-pulse rounded-2xl bg-canvas" />
        </div>
      </div>
    </div>
  );
}

/** The content actually displayed for the current route (sub-service or main service). */
interface ActiveContent {
  name: string;
  shortDescription: string;
  heroImage?: string;
  detail: ServiceDetailContent;
}

/** The "service family" grid: the parent service plus every sub-service. */
function SubServicesSection({
  service,
  subServices,
  activeSubSlug,
}: {
  service: ServiceItem;
  subServices: SubService[];
  activeSubSlug?: string;
}) {
  if (subServices.length === 0) return null;

  return (
    <section id="sub-services" data-scrollspy className="scroll-mt-36">
      <FadeIn>
        <SectionHeading
          tag="Service Options"
          title={`${service.name} — Sub Services`}
          description="Pick the specific option that fits your requirement. Each option has its own details, pricing and process."
        />
        <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StaggerItem>
            <Link
              to={`/services/${service.slug}`}
              className={cn(
                'group flex h-full flex-col gap-3 rounded-2xl border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5',
                !activeSubSlug ? 'border-accent ring-2 ring-accent/30 shadow-lg shadow-accent/10' : 'border-border'
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{service.name}</p>
                <p className="mt-1 text-xs text-ink-muted">All options</p>
              </div>
            </Link>
          </StaggerItem>

          {subServices.map((sub) => {
            const Icon = subServiceIconMap[sub.icon ?? 'Wrench'] ?? Wrench;
            const isActive = sub.slug === activeSubSlug;
            return (
              <StaggerItem key={sub.slug}>
                <Link
                  to={`/services/${service.slug}/${sub.slug}`}
                  className={cn(
                    'group flex h-full flex-col gap-3 rounded-2xl border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5',
                    isActive ? 'border-accent ring-2 ring-accent/30 shadow-lg shadow-accent/10' : 'border-border'
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink transition-colors group-hover:text-accent">{sub.name}</p>
                    <p className="mt-1 text-xs text-ink-muted line-clamp-2">{sub.shortDescription ?? sub.name}</p>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </FadeIn>
    </section>
  );
}

/** Gradient "get started" card with quote / call / WhatsApp actions. */
function GetStartedCard({
  whatsAppHref,
  company,
}: {
  whatsAppHref: string | null;
  company: { name: string; phone: string; whatsapp: string };
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
      <div className="bg-gradient-to-br from-accent to-[#2d3abf] p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Get started</p>
        <h3 className="mt-2 text-xl font-bold">Interested in this service?</h3>
        <p className="mt-2 text-sm text-white/80">
          Get a free consultation and a detailed quotation within 24 hours.
        </p>
      </div>
      <div className="space-y-3 p-6">
        <Link
          to="/get-quote"
          className="flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover"
        >
          Request Quote
          <ArrowRight className="h-4 w-4" />
        </Link>
        {company.phone && (
          <a
            href={`tel:${company.phone}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-3.5 text-sm font-semibold text-ink transition-all hover:bg-canvas"
          >
            <Phone className="h-4 w-4 text-accent" />
            Call Now
          </a>
        )}
        {whatsAppHref && (
          <a
            href={whatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 px-5 py-3.5 text-sm font-semibold text-[#128C7E] transition-all hover:bg-[#25D366]/20"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp Us
          </a>
        )}
        <div className="flex items-center gap-2 rounded-xl bg-canvas px-4 py-3 text-xs text-ink-muted">
          <Quote className="h-4 w-4 text-accent shrink-0" />
          Free consultation · No obligation · Response within 24 hrs
        </div>
      </div>
    </div>
  );
}

/** Compact facts card shown next to the CTA. Only rows with data render. */
function QuickFacts({ content, service }: { content: ActiveContent; service: ServiceItem }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-ink">Quick Service Facts</h3>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        {service.category && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-muted">Service type</dt>
            <dd className="font-medium text-ink">{service.category}</dd>
          </div>
        )}
        {content.detail.startingPrice && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-muted">Starting price</dt>
            <dd className="font-medium text-ink">{content.detail.startingPrice}</dd>
          </div>
        )}
        {content.detail.completionTime && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-muted">Timeline</dt>
            <dd className="font-medium text-ink">{content.detail.completionTime}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export function ServiceDetailPage() {
  const { slug, subSlug } = useParams<{ slug: string; subSlug?: string }>();
  const { data: service, isLoading } = usePublicServiceBySlug(slug);
  const { data: allServices = [] } = usePublicServices();
  const { data: cmsSubs = [] } = usePublicSubServices(slug);
  const { data: mediaItems = [] } = usePublicServiceMedia(slug);
  const { data: serviceProjects = [] } = useServicePortfolio(service?.slug);
  const company = usePublicCompany();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 520);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const subServices = cmsSubs;
  const activeSub = subServices.find((sub) => sub.slug === subSlug);

  let content: ActiveContent | null = null;
  if (service) {
    if (activeSub) {
      const detail = toSubServiceDetailContent(activeSub);
      detail.testimonials = service.testimonials ?? [];
      content = {
        name: activeSub.name,
        shortDescription: activeSub.shortDescription?.trim() || activeSub.name,
        heroImage: activeSub.heroImage ?? detail.gallery[0] ?? service.image,
        detail,
      };
    } else {
      const detail = toServiceDetailContent(service);
      content = {
        name: service.name,
        shortDescription: service.shortDescription,
        heroImage: detail.gallery[0] ?? service.image,
        detail,
      };
    }
  }

  const contentKey = subSlug ?? 'main';
  const unknownSub = Boolean(subSlug) && !activeSub && subServices.length > 0;

  const relatedServices = useMemo(() => {
    if (!service) return [];
    return allServices
      .filter((s) => s.id !== service.id)
      .sort((a, b) => {
        const aSame = a.categoryId === service.categoryId ? 0 : 1;
        const bSame = b.categoryId === service.categoryId ? 0 : 1;
        return aSame - bSame;
      })
      .slice(0, 3);
  }, [service, allServices]);

  // Which sections actually have content — sections render (and appear in the
  // sticky nav) only when their data is present.
  const visible: Record<SectionId, boolean> = {
    overview: content ? content.detail.overview.length > 0 : false,
    'sub-services': subServices.length > 0,
    gallery: content
      ? activeSub
        ? content.detail.gallery.length > 0
        : mediaItems.length > 0 || content.detail.gallery.length > 0
      : false,
    portfolio: serviceProjects.length > 0,
    features: content ? content.detail.features.length > 0 : false,
    'whats-included': content ? content.detail.whatsIncluded.length > 0 : false,
    process: content ? content.detail.process.length > 0 : false,
    faqs: content ? content.detail.faqs.length > 0 : false,
    testimonials: content ? content.detail.testimonials.length > 0 : false,
    related: relatedServices.length > 0,
  };

  const sectionNav = useMemo(
    () =>
      SECTION_NAV.filter((s) => visible[s.id]).map((s) => ({
        id: s.id,
        label: s.label,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      visible.overview,
      visible['sub-services'],
      visible.gallery,
      visible.portfolio,
      visible.features,
      visible['whats-included'],
      visible.process,
      visible.faqs,
      visible.testimonials,
      visible.related,
    ]
  );

  const sectionIds = useMemo(() => sectionNav.map((s) => s.id), [sectionNav]);
  const activeSection = useActiveSection(sectionIds);

  // SEO: keep the document title in sync with the active (sub)service.
  useEffect(() => {
    if (content) {
      document.title = `${content.name} | ${company.name}`;
    }
    return () => {
      document.title = company.name;
    };
  }, [content, company.name]);

  if (isLoading) return <LoadingState />;

  if (!service || !content) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-ink">Service Not Found</h1>
          <p className="mt-3 text-ink-muted">The service you're looking for doesn't exist or is no longer available.</p>
          <Link
            to="/services"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover"
          >
            View All Services <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const whatsAppHref = buildWhatsAppLink(
    company.whatsapp,
    `Hi ${company.name}, I'm interested in your ${content.name} service. Can you share more details?`
  );

  const marketingMedia = subSlug ? undefined : mediaItems;

  return (
    <div className="relative pb-28">
      {/* Scroll progress bar */}
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-accent"
      />

      {/* ── Hero banner ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-dark">
        <div className="relative h-[52vh] min-h-[400px] w-full sm:h-[58vh]">
          {content.heroImage ? (
            <img
              src={content.heroImage}
              alt={content.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-accent/20 to-dark" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/60 to-dark/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-dark/70 to-transparent" />

          <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-14 sm:px-6 lg:px-8">
            <motion.div
              key={contentKey}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <nav className="mb-5 flex items-center gap-2 text-xs font-medium text-white/60">
                <Link to="/" className="transition-colors hover:text-white">Home</Link>
                <ChevronRight className="h-3 w-3" />
                <Link to="/services" className="transition-colors hover:text-white">Services</Link>
                <ChevronRight className="h-3 w-3" />
                {activeSub && (
                  <>
                    <Link to={`/services/${service.slug}`} className="transition-colors hover:text-white">
                      {service.name}
                    </Link>
                    <ChevronRight className="h-3 w-3" />
                  </>
                )}
                <span className="text-white">{content.name}</span>
              </nav>

              <div className="flex flex-wrap items-center gap-3">
                {service.category && (
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {service.category}
                  </span>
                )}
                {content.detail.startingPrice && (
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                    From {content.detail.startingPrice}
                  </span>
                )}
              </div>

              <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {content.name}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
                {content.shortDescription}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/get-quote"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:bg-accent-hover"
                >
                  Request Quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {company.phone && (
                  <a
                    href={`tel:${company.phone}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                  >
                    <Phone className="h-4 w-4" />
                    Call Now
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Sticky section navigation ───────────────────────────────── */}
      {sectionNav.length > 0 && (
        <div className="sticky top-18 z-40 border-b border-border bg-surface/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
            {sectionNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                  activeSection === item.id
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content — sections render only when their data exists ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          key={contentKey}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="space-y-20 py-14">
            {unknownSub && (
              <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-warning">
                <Info className="h-4 w-4 shrink-0" />
                This service option isn't available yet — pick another option from the list below.
              </div>
            )}

            {/* Overview */}
            {visible.overview && (
              <section id="overview" data-scrollspy className="scroll-mt-36">
                <FadeIn>
                  <SectionHeading tag="Overview" title={`About ${content.name}`} />
                  <div className="space-y-5">
                    {content.detail.overview.map((paragraph, index) => (
                      <p key={index} className="text-[15px] leading-relaxed text-ink-muted">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {(content.detail.startingPrice || content.detail.completionTime) && (
                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                      {content.detail.startingPrice && (
                        <div className="rounded-2xl border border-border bg-surface p-5">
                          <IndianRupee className="h-5 w-5 text-accent" />
                          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-ink-faint">Starting Price</p>
                          <p className="mt-1 text-lg font-bold text-ink">{content.detail.startingPrice}</p>
                        </div>
                      )}
                      {content.detail.completionTime && (
                        <div className="rounded-2xl border border-border bg-surface p-5">
                          <Clock className="h-5 w-5 text-accent" />
                          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-ink-faint">Completion Time</p>
                          <p className="mt-1 text-lg font-bold text-ink">{content.detail.completionTime}</p>
                        </div>
                      )}
                    </div>
                  )}
                </FadeIn>
              </section>
            )}

            {/* Sub Services */}
            {visible['sub-services'] && (
              <SubServicesSection service={service} subServices={subServices} activeSubSlug={activeSub?.slug} />
            )}

            {/* Gallery */}
            {visible.gallery && (
              <section id="gallery" data-scrollspy className="scroll-mt-36">
                <FadeIn>
                  {activeSub ? (
                    <>
                      <SectionHeading tag="Gallery" title="Service Showcase" description="A look at what this service option delivers." />
                      <ServiceGallery images={content.detail.gallery} alt={content.name} />
                    </>
                  ) : marketingMedia && marketingMedia.length > 0 ? (
                    <>
                      <SectionHeading tag="Gallery" title="Service Showcase" description="A look at the work we deliver for this service." />
                      <MarketingGallery items={marketingMedia} alt={content.name} />
                    </>
                  ) : (
                    <>
                      <SectionHeading tag="Gallery" title="Project Gallery" description="A glimpse of the quality and finish you can expect with this service." />
                      <ServiceGallery images={content.detail.gallery} alt={content.name} />
                    </>
                  )}
                </FadeIn>
              </section>
            )}

            {/* Portfolio — related completed projects */}
            {visible.portfolio && (
              <section id="portfolio" data-scrollspy className="scroll-mt-36">
                <FadeIn>
                  <SectionHeading
                    tag="Related Work"
                    title="Recently Completed Projects"
                    description={`Real projects we've delivered for ${content.name}.`}
                  />
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {serviceProjects.slice(0, 3).map((project, index) => (
                      <PortfolioProjectCard key={project.id} project={project} index={index} />
                    ))}
                  </div>
                </FadeIn>
              </section>
            )}

            {/* Key Features */}
            {visible.features && (
              <section id="features" data-scrollspy className="scroll-mt-36">
                <FadeIn>
                  <SectionHeading tag="Key Features" title="Why Businesses Choose This Service" />
                  <StaggerGroup className="grid gap-4 sm:grid-cols-2">
                    {content.detail.features.map((feature) => (
                      <StaggerItem key={feature}>
                        <div className="group h-full rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                            <Layers className="h-5 w-5" />
                          </div>
                          <p className="mt-4 text-sm font-medium text-ink leading-relaxed">{feature}</p>
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerGroup>
                </FadeIn>
              </section>
            )}

            {/* What's Included */}
            {visible['whats-included'] && (
              <section id="whats-included" data-scrollspy className="scroll-mt-36">
                <FadeIn>
                  <div className="rounded-3xl border border-border bg-surface p-8 sm:p-10">
                    <SectionHeading tag="What's Included" title="Everything We Handle For You" />
                    <StaggerGroup className="grid gap-3 sm:grid-cols-2">
                      {content.detail.whatsIncluded.map((item) => (
                        <StaggerItem key={item} className="flex items-start gap-3 rounded-xl bg-canvas p-4">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-subtle">
                            <Check className="h-3 w-3 text-accent" />
                          </div>
                          <span className="text-sm text-ink">{item}</span>
                        </StaggerItem>
                      ))}
                    </StaggerGroup>
                  </div>
                </FadeIn>
              </section>
            )}

            {/* Working Process */}
            {visible.process && (
              <section id="process" data-scrollspy className="scroll-mt-36">
                <FadeIn>
                  <SectionHeading
                    tag="Our Process"
                    title={`How ${content.name} Is Delivered`}
                    description="A transparent, step-by-step journey from your first enquiry to final handover."
                  />
                  <div className="relative">
                    <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />
                    <div className="space-y-6">
                      {content.detail.process.map((step, index) => (
                        <motion.div
                          key={`${contentKey}-${step.title}-${index}`}
                          initial={{ opacity: 0, x: -16 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true, margin: '-40px' }}
                          transition={{ duration: 0.4, delay: index * 0.08 }}
                          className="relative flex gap-5 pl-0"
                        >
                          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-surface text-sm font-bold text-accent shadow-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 rounded-2xl border border-border bg-surface p-5 transition-all duration-300 hover:border-accent/25 hover:shadow-md">
                            <h3 className="text-base font-semibold text-ink">{step.title}</h3>
                            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </FadeIn>
              </section>
            )}

            {/* FAQ */}
            {visible.faqs && (
              <section id="faqs" data-scrollspy className="scroll-mt-36">
                <FadeIn>
                  <SectionHeading tag="FAQs" title="Frequently Asked Questions" />
                  <FAQAccordion
                    items={content.detail.faqs.map((f, index) => ({
                      id: `service-faq-${contentKey}-${index}`,
                      question: f.question,
                      answer: f.answer,
                      category: service.name,
                    }))}
                  />
                </FadeIn>
              </section>
            )}

            {/* Testimonials */}
            {visible.testimonials && (
              <section id="testimonials" data-scrollspy className="scroll-mt-36">
                <FadeIn>
                  <SectionHeading tag="Customer Reviews" title="What Our Clients Say" />
                  <StaggerGroup className="grid gap-4 sm:grid-cols-2">
                    {content.detail.testimonials.map((review, index) => (
                      <StaggerItem key={`${contentKey}-${index}`}>
                        <TestimonialCard
                          index={index}
                          testimonial={{
                            id: `service-review-${contentKey}-${index}`,
                            name: review.name,
                            role: review.role,
                            company: review.company,
                            content: review.content,
                            rating: review.rating,
                            avatar: review.avatar,
                          }}
                        />
                      </StaggerItem>
                    ))}
                  </StaggerGroup>
                </FadeIn>
              </section>
            )}

            {/* Related Services */}
            {visible.related && (
              <section id="related" data-scrollspy className="scroll-mt-36">
                <FadeIn>
                  <SectionHeading tag="Related Services" title="Explore More Services" />
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {relatedServices.map((related, index) => (
                      <ServiceCard
                        key={related.id}
                        name={related.name}
                        slug={related.slug}
                        description={related.shortDescription}
                        icon={related.icon}
                        image={related.image}
                        index={index}
                        variant="featured"
                      />
                    ))}
                  </div>
                </FadeIn>
              </section>
            )}

            {/* Request Quote */}
            <section id="quote" className="scroll-mt-36">
              <FadeIn>
                <SectionHeading
                  tag="Get Started"
                  title="Request a Quote"
                  description="Share your requirements and get a free consultation with a detailed quotation."
                />
                <div className="grid gap-6 lg:grid-cols-2">
                  <GetStartedCard whatsAppHref={whatsAppHref} company={company} />
                  <QuickFacts content={content} service={service} />
                </div>
              </FadeIn>
            </section>
          </div>
        </motion.div>
      </div>

      {/* ── Sticky bottom CTA ───────────────────────────────────────── */}
      <AnimatePresence>
        {showStickyCta && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/90 shadow-lg backdrop-blur-xl"
          >
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <div className="hidden min-w-0 flex-1 sm:block">
                <p className="truncate text-sm font-semibold text-ink">{content.name}</p>
                {content.detail.startingPrice && <p className="text-xs text-ink-muted">From {content.detail.startingPrice}</p>}
              </div>
              <div className="flex flex-1 gap-2 sm:flex-none sm:gap-3">
                <Link
                  to="/get-quote"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover sm:flex-none"
                >
                  Request Quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {company.phone && (
                  <a
                    href={`tel:${company.phone}`}
                    aria-label="Call now"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-ink transition-all hover:bg-canvas sm:flex-none"
                  >
                    <Phone className="h-4 w-4 text-accent" />
                    <span className="sm:hidden">Call</span>
                    <span className="hidden sm:inline">Call Now</span>
                  </a>
                )}
                {whatsAppHref && (
                  <a
                    href={whatsAppHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Chat on WhatsApp"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 px-4 py-3 text-sm font-semibold text-[#128C7E] transition-all hover:bg-[#25D366]/20 sm:flex-none"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="sm:hidden">WhatsApp</span>
                    <span className="hidden sm:inline">WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
