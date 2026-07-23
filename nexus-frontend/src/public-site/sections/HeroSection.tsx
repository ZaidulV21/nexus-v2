import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-ink via-ink to-[#1a1a2e]">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[100px]" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Trusted by 500+ businesses across India
            </div>

            <h1 className="mt-8 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.1]">
              One Partner For All Your{' '}
              <span className="bg-gradient-to-r from-accent to-blue-400 bg-clip-text text-transparent">
                Business Infrastructure
              </span>{' '}
              Needs
            </h1>

            <p className="mt-6 max-w-xl text-lg text-white/60 leading-relaxed">
              Nexus coordinates trusted vendors for Interior, Solar, Electrical, CCTV, Signage and IT projects through one managed platform. From concept to handover, we handle everything.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                to="/get-quote"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover shadow-lg shadow-accent/25"
              >
                Get Free Quote
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              >
                <Play className="h-4 w-4" />
                Book Consultation
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-8 text-sm text-white/40">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-ink bg-accent/20 flex items-center justify-center text-xs text-white/80 font-medium">
                      {['RK', 'PS', 'AP', 'SR'][i - 1]}
                    </div>
                  ))}
                </div>
                <span>500+ Projects</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-white/15" />
              <div className="hidden sm:flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="h-3.5 w-3.5 fill-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-1">4.9/5 Rating</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
              <div className="rounded-xl bg-gradient-to-br from-white/10 to-white/5 p-8">
                <div className="space-y-4">
                  {[
                    { label: 'Interior Design', status: 'In Progress', progress: 75, color: 'bg-accent' },
                    { label: 'Solar Installation', status: 'Site Visit', progress: 30, color: 'bg-emerald-400' },
                    { label: 'CCTV Setup', status: 'Quotation', progress: 50, color: 'bg-amber-400' },
                    { label: 'Electrical Works', status: 'Completed', progress: 100, color: 'bg-emerald-400' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                      className="rounded-lg border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{item.label}</span>
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70">{item.status}</span>
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          transition={{ duration: 1, delay: 0.6 + i * 0.1 }}
                          className={`h-full rounded-full ${item.color}`}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
