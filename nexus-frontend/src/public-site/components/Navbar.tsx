import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePublicServiceList } from '@/queries/usePublicServices';
import { usePublicCompany } from '../hooks';
import { useMobileMenu } from '../hooks/useMobileMenu';
import { AnimatePresence, motion } from 'framer-motion';

const PAGE_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Industries', href: '/industries' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Projects', href: '/projects' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export function Navbar() {
  const { isOpen, open, close } = useMobileMenu();
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const location = useLocation();
  const { data: services } = usePublicServiceList();
  const company = usePublicCompany();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    close();
    setOpenDropdown(null);
  }, [location.pathname, close]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/90 shadow-sm backdrop-blur-xl border-b border-border/50'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                className="h-8 w-8 shrink-0 rounded object-contain"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white text-sm font-bold">
                {company.name.charAt(0)}
              </div>
            )}
            <span className="text-lg font-bold tracking-tight text-ink">
              {company.name}
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {/* Services dropdown — dynamic from API */}
            <div
              className="relative"
              onMouseEnter={() => setOpenDropdown('Services')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                className={cn(
                  'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  location.pathname.startsWith('/services')
                    ? 'text-accent'
                    : 'text-ink-muted hover:text-ink hover:bg-ink/5'
                )}
              >
                Services
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', openDropdown === 'Services' && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {openDropdown === 'Services' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-white p-2 shadow-lg"
                  >
                    <Link
                      to="/services"
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-subtle hover:text-accent"
                    >
                      All Services
                    </Link>
                    {services.map((service) => (
                      <Link
                        key={service.id}
                        to={`/services/${service.slug}`}
                        className="block rounded-lg px-3 py-2.5 text-sm text-ink-muted transition-colors hover:bg-accent-subtle hover:text-accent"
                      >
                        {service.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Page links */}
            {PAGE_LINKS.filter((p) => p.href !== '/').map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'text-accent' : 'text-ink-muted hover:text-ink hover:bg-ink/5'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Login
            </Link>
            <Link
              to="/get-quote"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover shadow-sm hover:shadow-md"
            >
              Get Quote
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            onClick={isOpen ? close : open}
            className="flex lg:hidden items-center justify-center rounded-lg p-2 text-ink-muted hover:bg-ink/5"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden border-t border-border bg-white"
          >
            <div className="space-y-1 px-4 py-4">
              {/* Services mobile dropdown */}
              <div>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'Services' ? null : 'Services')}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-ink/5"
                >
                  Services
                  <ChevronDown className={cn('h-4 w-4 transition-transform', openDropdown === 'Services' && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {openDropdown === 'Services' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 pb-2">
                        <Link
                          to="/services"
                          className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-accent-subtle hover:text-accent"
                        >
                          All Services
                        </Link>
                        {services.map((service) => (
                          <Link
                            key={service.id}
                            to={`/services/${service.slug}`}
                            className="block rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-accent-subtle hover:text-accent"
                          >
                            {service.name}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Page links */}
              {PAGE_LINKS.filter((p) => p.href !== '/').map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-lg px-3 py-2.5 text-sm font-medium',
                      isActive ? 'text-accent bg-accent-subtle' : 'text-ink-muted hover:bg-ink/5'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              <div className="border-t border-border pt-3 mt-3 flex flex-col gap-2">
                <Link to="/login" className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-ink/5 text-center">
                  Login
                </Link>
                <Link
                  to="/get-quote"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Get Quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
