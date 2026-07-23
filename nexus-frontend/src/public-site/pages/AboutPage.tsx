import { motion } from 'framer-motion';
import { Target, Users, Award, Handshake, Shield, Lightbulb } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { CTASection } from '../sections/CTASection';

const values = [
  { icon: Target, title: 'Mission-Driven', description: 'We exist to simplify business infrastructure so our clients can focus on what they do best.' },
  { icon: Users, title: 'Client-First', description: 'Every decision we make starts with how it benefits our clients. Your success is our success.' },
  { icon: Award, title: 'Quality Assured', description: 'We maintain the highest standards through rigorous vendor vetting and quality inspection processes.' },
  { icon: Handshake, title: 'Trusted Partners', description: 'Our vendor network is built on trust, verified through performance and client feedback.' },
  { icon: Shield, title: 'Transparency', description: 'No hidden costs, no surprises. Every quotation is detailed, itemized, and honest.' },
  { icon: Lightbulb, title: 'Innovation', description: 'We continuously improve our processes and leverage technology for better project outcomes.' },
];

export function AboutPage() {
  return (
    <div>
      <PageHero
        title="About Nexus"
        description="Nexus Managed Services is a managed infrastructure platform headquartered in Lucknow, India. We coordinate trusted vendors for comprehensive business infrastructure projects."
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold text-ink sm:text-4xl">Our Story</h2>
              <div className="mt-6 space-y-4 text-ink-muted leading-relaxed">
                <p>
                  businesses often struggle with managing multiple vendors for different infrastructure needs. Finding reliable partners for interior design, electrical work, solar installation, security systems, and IT infrastructure can be overwhelming.
                </p>
                <p>
                  Nexus was founded to solve this problem. We created a single platform that coordinates trusted, verified vendors for all your business infrastructure needs. From the first consultation to the final handover, we manage the entire process.
                </p>
                <p>
                  Headquartered in Lucknow, we serve businesses across Uttar Pradesh and beyond. Our network of 200+ verified vendors and our proven 6-step process ensures consistent quality and reliable delivery for every project.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { value: '500+', label: 'Projects Delivered' },
                { value: '200+', label: 'Verified Vendors' },
                { value: '98%', label: 'Client Satisfaction' },
                { value: '10+', label: 'Years Experience' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border bg-white p-6 text-center">
                  <div className="text-2xl font-bold text-accent">{stat.value}</div>
                  <div className="mt-1 text-sm text-ink-muted">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-ink text-center sm:text-4xl">Our Values</h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-2xl border border-border bg-canvas p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-subtle text-accent">
                  <value.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{value.title}</h3>
                <p className="mt-2 text-sm text-ink-muted leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </div>
  );
}
