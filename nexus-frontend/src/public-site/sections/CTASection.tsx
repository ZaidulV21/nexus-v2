import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Phone } from 'lucide-react';
import { usePublicCompany } from '../hooks';

export function CTASection() {
  const company = usePublicCompany();

  return (
    <section className="py-20 sm:py-28 bg-ink">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-[#2d3abf] p-10 sm:p-14 lg:p-20 text-center"
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Ready to Transform Your Infrastructure?
            </h2>
            <p className="mt-5 mx-auto max-w-2xl text-lg text-white/70">
              Get a free consultation and detailed quotation for your next project. Our team responds within 24 hours.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/get-quote"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-accent transition-all hover:bg-white/90 shadow-lg"
              >
                Get Free Quote
                <ArrowRight className="h-4 w-4" />
              </Link>
              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  <Phone className="h-4 w-4" />
                  Call Us Now
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
