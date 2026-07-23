import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Phone, Loader2 } from 'lucide-react';
import { usePublicServiceBySlug, usePublicServices } from '@/queries/usePublicServices';
import { usePublicCompany } from '../hooks';
import { PageHero } from '../components/PageHero';

export function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: service, isLoading } = usePublicServiceBySlug(slug);
  const { data: allServices = [] } = usePublicServices();
  const company = usePublicCompany();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!service) {
    return (
      <PageHero title="Service Not Found">
        <p className="mt-4 text-ink-muted">The service you're looking for doesn't exist or is no longer available.</p>
        <Link to="/services" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
          View All Services <ArrowRight className="h-4 w-4" />
        </Link>
      </PageHero>
    );
  }

  const relatedServices = allServices
    .filter((s) => s.id !== service.id)
    .slice(0, 3);

  return (
    <div>
      <PageHero
        title={service.name}
        description={service.description}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold text-ink">What's Included</h2>
                <p className="mt-3 text-ink-muted leading-relaxed">
                  Our {service.name.toLowerCase()} service covers every aspect from initial planning to final delivery. Here's what's included:
                </p>
                {service.features.length > 0 ? (
                  <ul className="mt-6 space-y-3">
                    {service.features.map((feature, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="flex items-start gap-3"
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <Check className="h-3 w-3 text-accent" />
                        </div>
                        <span className="text-sm text-ink">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-6 text-sm text-ink-muted">
                    Contact us for a detailed breakdown of what's included in this service.
                  </p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-12 rounded-2xl border border-border bg-white p-8"
              >
                <h3 className="text-lg font-semibold text-ink">Our Approach</h3>
                <p className="mt-3 text-sm text-ink-muted leading-relaxed">
                  Every {service.name.toLowerCase()} project at Nexus follows our proven 6-step process. We begin with understanding your requirements, conduct a site visit, prepare a detailed quotation, and then execute with our vetted vendor network. Throughout the process, you receive regular updates through our Client Portal.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/get-quote"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover"
                  >
                    Get Quote for {service.name}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/how-it-works"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-ink transition-all hover:bg-canvas"
                  >
                    Learn How It Works
                  </Link>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <div className="rounded-2xl border border-border bg-white p-6">
                  <h3 className="text-base font-semibold text-ink">Quick Actions</h3>
                  <div className="mt-4 space-y-3">
                    <Link
                      to="/get-quote"
                      className="flex items-center gap-3 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Get Free Quote
                    </Link>
                    <a
                      href={`tel:${company.phone}`}
                      className="flex items-center gap-3 rounded-xl border border-border px-5 py-3 text-sm font-medium text-ink transition-all hover:bg-canvas"
                    >
                      <Phone className="h-4 w-4 text-accent" />
                      Call for Consultation
                    </a>
                  </div>
                </div>

                {relatedServices.length > 0 && (
                  <div className="rounded-2xl border border-border bg-white p-6">
                    <h3 className="text-base font-semibold text-ink">Related Services</h3>
                    <div className="mt-4 space-y-2">
                      {relatedServices.map((s) => (
                        <Link
                          key={s.id}
                          to={`/services/${s.slug}`}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-accent-subtle hover:text-accent"
                        >
                          {s.name}
                          <ArrowRight className="ml-auto h-3 w-3" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
