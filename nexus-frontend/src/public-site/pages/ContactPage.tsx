import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, Clock, MessageSquare } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { usePublicCompany } from '../hooks';

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const company = usePublicCompany();

  const contactItems = [
    company.fullAddress && { icon: MapPin, label: 'Address', value: company.fullAddress },
    company.phone && { icon: Phone, label: 'Phone', value: company.phone },
    company.email && { icon: Mail, label: 'Email', value: company.email },
    { icon: Clock, label: 'Business Hours', value: 'Mon - Sat, 9:00 AM - 6:00 PM' },
    { icon: MessageSquare, label: 'Response Time', value: 'Within 24 hours' },
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string }[];

  return (
    <div>
      <PageHero
        title="Contact Us"
        description="Have a question or ready to start your project? Reach out to our team and we'll get back to you within 24 hours."
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-2xl font-bold text-ink">Get in Touch</h2>
              <p className="text-ink-muted leading-relaxed">
                Whether you have a specific project in mind or just want to explore possibilities, we're here to help.
              </p>

              <div className="space-y-4">
                {contactItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink-faint uppercase tracking-wider">{item.label}</p>
                      <p className="mt-0.5 text-sm text-ink">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-3"
            >
              {submitted ? (
                <div className="rounded-2xl border border-border bg-white p-10 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-subtle">
                    <Send className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-ink">Message Sent!</h3>
                  <p className="mt-3 text-ink-muted">
                    Thank you for reaching out. Our team will review your message and get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 text-sm font-semibold text-accent hover:text-accent-hover"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
                  className="rounded-2xl border border-border bg-white p-6 sm:p-8 space-y-5"
                >
                  <h3 className="text-lg font-semibold text-ink">Send us a Message</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">Full Name *</label>
                      <input required type="text" placeholder="Your name" className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">Email *</label>
                      <input required type="email" placeholder="you@company.com" className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">Phone *</label>
                      <input required type="tel" placeholder="+91 XXXXX XXXXX" className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">Company</label>
                      <input type="text" placeholder="Company name" className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Subject *</label>
                    <input required type="text" placeholder="How can we help?" className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Message *</label>
                    <textarea required rows={4} placeholder="Tell us about your project or question..." className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none" />
                  </div>
                  <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover">
                    <Send className="h-4 w-4" />
                    Send Message
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
