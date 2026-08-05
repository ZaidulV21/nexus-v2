import type { ServiceItem } from '../types';

export interface ServiceProcessStep {
  title: string;
  description: string;
}

export interface ServiceDetailFaq {
  question: string;
  answer: string;
}

export interface ServiceDetailReview {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
}

export interface ServiceDetailConfig {
  overview: string[];
  gallery: string[];
  features: string[];
  whatsIncluded: string[];
  process: ServiceProcessStep[];
  startingPrice?: string;
  completionTime: string;
  faqs: ServiceDetailFaq[];
  reviews: ServiceDetailReview[];
}

const GENERIC_PROCESS: ServiceProcessStep[] = [
  { title: 'Requirement Gathering', description: 'Share your needs through our guided wizard or a quick consultation call.' },
  { title: 'Consultation & Planning', description: 'Our experts discuss requirements and prepare the right approach for your project.' },
  { title: 'Site Assessment', description: 'We visit your location to verify conditions and finalize the execution plan.' },
  { title: 'Detailed Quotation', description: 'Receive a transparent, itemized quotation with clear timelines and milestones.' },
  { title: 'Execution & Updates', description: 'Vetted vendors execute the work while you track progress in real time.' },
  { title: 'Quality Handover', description: 'Inspection, documentation, and a smooth handover with warranty support.' },
];

const GENERIC_INCLUDED = [
  'Dedicated project coordinator',
  'Vetted and verified vendor team',
  'Regular progress updates via Client Portal',
  'Quality inspection at every milestone',
  'Transparent itemized quotation',
  'Warranty and post-handover support',
];

const GENERIC_FAQS = (serviceName: string): ServiceDetailFaq[] => [
  {
    question: `How does the ${serviceName} process work?`,
    answer: 'The process begins with sharing your requirements through our guided wizard or a consultation call. We then plan, quote, execute, and hand over your project with quality inspection at every milestone.',
  },
  {
    question: `How much does ${serviceName} cost?`,
    answer: 'Every project is quoted based on your specific scope. We provide a transparent, itemized quotation after understanding your requirements, and the initial consultation is completely free.',
  },
  {
    question: 'How long will my project take?',
    answer: 'Timelines depend on the scope and complexity of the work. We share clear milestones during the quotation phase and keep you updated on progress throughout execution.',
  },
  {
    question: 'Do you provide warranty and support?',
    answer: 'Yes. All projects come with warranty coverage as specified in the quotation, along with ongoing maintenance and support options.',
  },
];

export const SERVICE_DETAIL_CONFIGS: Record<string, ServiceDetailConfig> = {
  'interior-design': {
    overview: [
      'Our interior design service transforms commercial and residential spaces into environments that inspire productivity and reflect your brand identity. From space planning to final styling, every decision is guided by functionality, aesthetics, and your business objectives.',
      'We manage the entire fit-out journey — layout optimization, materials, finishes, lighting, furniture, and turnkey execution. You work with a single point of contact who coordinates designers, vendors, and contractors, so the experience is seamless from concept to handover.',
      'Whether you are outfitting a new office, renovating a showroom, or building a restaurant, our team delivers a design that is as practical as it is beautiful.',
    ],
    gallery: [
      'https://plus.unsplash.com/premium_photo-1663133994495-ecdc3cc03fff?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      'https://plus.unsplash.com/premium_photo-1661964402307-02267d1423f5?q=80&w=1073&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      'https://plus.unsplash.com/premium_photo-1661521063809-8d846817e10f?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    ],
    features: [
      'Space planning and layout optimization',
      'Custom furniture and millwork',
      'Material, finish, and color selection',
      'Architectural and ambient lighting design',
      'Turnkey fit-out and project management',
      '3D visualization before execution',
    ],
    whatsIncluded: [
      'Initial design consultation and site survey',
      'Concept design with 3D visualization',
      'Detailed layout and construction drawings',
      'Material sourcing and vendor management',
      'On-site supervision and quality control',
      'Final styling, handover, and warranty support',
    ],
    process: [
      { title: 'Discovery', description: 'Share your vision, space dimensions, and functional needs through our wizard or consultation call.' },
      { title: 'Concept Design', description: 'Our designers craft a concept with layouts, mood boards, and 3D visualizations for your approval.' },
      { title: 'Detailed Planning', description: 'We finalize drawings, materials, finishes, and a transparent itemized quotation.' },
      { title: 'Execution', description: 'Vetted contractors and vendors implement the fit-out with daily supervision and milestone updates.' },
      { title: 'Styling & Handover', description: 'Furniture, accessories, and finishing touches complete the space before final inspection and handover.' },
    ],
    startingPrice: '₹450 / sq ft',
    completionTime: '4–12 weeks depending on scope',
    faqs: [
      { question: 'Do you handle commercial and residential interiors?', answer: 'Yes. We design and execute interiors for offices, retail stores, restaurants, healthcare facilities, and residential spaces. Each project is tailored to the specific needs of the space.' },
      { question: 'Will I get 3D designs before execution?', answer: 'Yes. Every interior project includes concept designs and 3D visualizations so you can see and approve the space before any work begins.' },
      { question: 'Can you work within my budget?', answer: 'Absolutely. We propose material and finish options across price ranges and prepare a transparent quotation that respects your budget while meeting quality standards.' },
      { question: 'Who manages the contractors and vendors?', answer: 'Nexus is your single point of contact. We coordinate designers, contractors, and suppliers, and keep you updated through the Client Portal at every milestone.' },
    ],
    reviews: [
      { name: 'Rajesh Kumar', role: 'Facilities Director', company: 'TechVista Solutions', rating: 5, content: 'Nexus transformed our office space beautifully. One point of contact for interior design, electrical work, and IT setup — delivered on time and within budget.' },
      { name: 'Sneha Reddy', role: 'CEO', company: 'MedCare Hospitals', rating: 5, content: 'For our new wing we needed a partner who understood compliance. Nexus delivered a complete fit-out that met every regulatory requirement.' },
      { name: 'Vikram Singh', role: 'Managing Director', company: 'Singh Manufacturing', rating: 5, content: 'The design team understood our brand perfectly. Professional, transparent, and the 3D walkthrough made approvals effortless.' },
    ],
  },

  'solar-installation': {
    overview: [
      'Our solar installation service delivers end-to-end renewable energy solutions for commercial, industrial, and residential properties. We manage everything from feasibility assessment and system design to installation, grid integration, and long-term monitoring.',
      'Each installation is engineered around your energy consumption and roof conditions to maximize generation and return on investment. We handle approvals, subsidy assistance, and safety compliance so you get a turnkey system without the complexity.',
      'With measurable savings on electricity bills and a reduced carbon footprint, solar is one of the smartest infrastructure investments your business can make.',
    ],
    gallery: [
      'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      'https://media.istockphoto.com/id/2158997931/photo/robotics-people-and-engineer-tablet-with-industrial-collaboration-and-planning-in-warehouse.jpg?s=612x612&w=0&k=20&c=elDfuU9Ws4HqOGGaU9f6NjaYUlJXrIS51Ry0twwzHBw=',
    ],
    features: [
      'Site assessment and feasibility study',
      'System design and energy modeling',
      'High-efficiency panel and inverter selection',
      'Grid-tied, off-grid, and hybrid configurations',
      'Net metering and subsidy assistance',
      'Remote monitoring and AMC support',
    ],
    whatsIncluded: [
      'Free feasibility study and energy savings analysis',
      'Custom system design for your roof and usage',
      'Quality panels, inverters, and mounting structures',
      'Complete installation and grid integration',
      'Net metering application assistance',
      'Commissioning, training, and performance monitoring',
    ],
    process: [
      { title: 'Energy Assessment', description: 'We analyze your electricity bills and site conditions to size the right system.' },
      { title: 'System Design', description: 'Our engineers design an optimized layout and share projected savings.' },
      { title: 'Approvals', description: 'We handle net metering applications and subsidy paperwork on your behalf.' },
      { title: 'Installation', description: 'Certified technicians install panels, inverters, and wiring to code.' },
      { title: 'Commissioning', description: 'We test the system, integrate it with the grid, and hand over monitoring access.' },
    ],
    startingPrice: '₹55 / watt',
    completionTime: '2–6 weeks depending on system size',
    faqs: [
      { question: 'What size solar system do I need?', answer: 'System size depends on your monthly consumption and available roof area. We analyze your bills and site during the free feasibility study and recommend the optimal capacity.' },
      { question: 'Do you help with government subsidies?', answer: 'Yes. We assist with subsidy applications and net metering approvals, guiding you through the entire documentation process.' },
      { question: 'How much can I save on electricity?', answer: 'Most commercial clients reduce grid consumption by 60–90%, with payback typically achieved in 3–5 years depending on tariff and system size.' },
      { question: 'What happens after installation?', answer: 'We provide remote monitoring, maintenance support, and optional AMC packages to keep your system generating at peak performance for decades.' },
    ],
    reviews: [
      { name: 'Priya Sharma', role: 'Operations Head', company: 'GreenEnergy Corp', rating: 5, content: 'The solar project was handled end-to-end with exceptional professionalism. Our energy bills dropped by 35% and the team managed every approval.' },
      { name: 'Vikram Singh', role: 'Managing Director', company: 'Singh Manufacturing', rating: 5, content: 'Nexus coordinated our factory electrification and solar installation simultaneously. Their coordination between vendor teams was impressive.' },
      { name: 'Amit Patel', role: 'Owner', company: 'Patel Retail Group', rating: 5, content: 'From feasibility to net metering, everything was handled. The monitoring dashboard makes it easy to track generation across locations.' },
    ],
  },

  'electrical-works': {
    overview: [
      'From new installations to upgrades and preventive maintenance, our electrical services keep your facility powered, safe, and code-compliant. We work across residential, commercial, and industrial settings with certified electricians and rigorous safety standards.',
      'Whether you need a complete power distribution system, rewiring, backup power, or an energy efficiency audit, our team designs and delivers solutions that meet today\u2019s demands and tomorrow\u2019s growth.',
      'Every job follows industry best practices, proper documentation, and load testing before handover, so you can run your operations with total confidence.',
    ],
    gallery: [
      'https://media.istockphoto.com/id/2158997931/photo/robotics-people-and-engineer-tablet-with-industrial-collaboration-and-planning-in-warehouse.jpg?s=612x612&w=0&k=20&c=elDfuU9Ws4HqOGGaU9f6NjaYUlJXrIS51Ry0twwzHBw=',
      'https://plus.unsplash.com/premium_photo-1681426730828-bfee2d13861d?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8d2FyZWhvdXNlfGVufDB8fDB8fHx8',
    ],
    features: [
      'Panel and distribution board installation',
      'Wiring, cabling, and cable tray management',
      'Power distribution and load balancing',
      'Backup power and UPS solutions',
      'Electrical safety audits and compliance',
      'Energy efficiency upgrades and AMC',
    ],
    whatsIncluded: [
      'Free site assessment and load analysis',
      'Detailed design and itemized quotation',
      'Certified electricians and quality materials',
      'Load testing and safety certification',
      'Single-line diagrams and documentation',
      'Warranty and scheduled maintenance options',
    ],
    process: [
      { title: 'Assessment', description: 'We survey your facility and analyze current load and safety conditions.' },
      { title: 'Design', description: 'Engineers prepare a layout, material schedule, and transparent quotation.' },
      { title: 'Installation', description: 'Certified teams execute the work with minimal disruption to operations.' },
      { title: 'Testing & Handover', description: 'We test loads, verify safety, document the installation, and hand over with warranty.' },
    ],
    startingPrice: '₹35,000',
    completionTime: '1–4 weeks depending on scope',
    faqs: [
      { question: 'Do you handle emergency electrical faults?', answer: 'Yes, we offer priority response for urgent faults, and AMC plans that include scheduled and on-call maintenance.' },
      { question: 'Are your electricians certified?', answer: 'Every electrician on our team is certified and undergoes safety training. All work is inspected and tested before handover.' },
      { question: 'Can you upgrade an old building\u2019s wiring?', answer: 'Absolutely. We manage full rewiring projects, upgrading panels, cabling, and earthing to current safety standards.' },
      { question: 'Do you provide documentation?', answer: 'Yes, every project includes single-line diagrams, test reports, and certification records for compliance and future maintenance.' },
    ],
    reviews: [
      { name: 'Vikram Singh', role: 'Managing Director', company: 'Singh Manufacturing', rating: 5, content: 'Nexus handled our factory electrification alongside solar installation. Safety-first approach and zero downtime for production.' },
      { name: 'Rajesh Kumar', role: 'Facilities Director', company: 'TechVista Solutions', rating: 5, content: 'Panel upgrade and rewiring for our office were done over a weekend. Transparent pricing and spotless documentation.' },
    ],
  },

  'cctv-installation': {
    overview: [
      'Protect your people, premises, and assets with professionally designed surveillance systems. We assess your property, recommend the right camera types and coverage, and install a network that gives you complete visibility — live and recorded.',
      'From small offices to multi-site retail chains, our solutions include IP cameras, NVRs, remote viewing, analytics, and access control integration. Everything is set up, configured, and tested so the system works the moment you need it.',
      'Ongoing maintenance and support keep your security infrastructure reliable year after year.',
    ],
    gallery: [
      'https://plus.unsplash.com/premium_photo-1661521063809-8d846817e10f?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      'https://media.istockphoto.com/id/2158997931/photo/robotics-people-and-engineer-tablet-with-industrial-collaboration-and-planning-in-warehouse.jpg?s=612x612&w=0&k=20&c=elDfuU9Ws4HqOGGaU9f6NjaYUlJXrIS51Ry0twwzHBw=',
    ],
    features: [
      'IP, HD, and analog camera systems',
      'Network Video Recorder (NVR) setup',
      'Remote live viewing and playback',
      'Motion alerts and video analytics',
      'Access control integration',
      'Annual maintenance contracts',
    ],
    whatsIncluded: [
      'Free site survey and coverage plan',
      'Camera placement design with coverage map',
      'Cameras, NVRs, wiring, and accessories',
      'Professional installation and configuration',
      'Mobile and web remote viewing setup',
      'Training, documentation, and warranty',
    ],
    process: [
      { title: 'Site Survey', description: 'We map entry points, blind spots, and critical areas to design coverage.' },
      { title: 'Solution Design', description: 'We recommend camera types, storage, and features with a transparent quote.' },
      { title: 'Installation', description: 'Certified technicians mount cameras and run structured cabling cleanly.' },
      { title: 'Configuration', description: 'NVR setup, remote access, alerts, and analytics are configured and tested.' },
      { title: 'Training & Handover', description: 'We train your team, share documentation, and hand over the system.' },
    ],
    startingPrice: '₹4,500 / camera',
    completionTime: '1–3 weeks depending on site size',
    faqs: [
      { question: 'Can I view my cameras on my phone?', answer: 'Yes. Every system includes remote viewing on mobile and web, so you can watch live footage and playback from anywhere.' },
      { question: 'How long is footage stored?', answer: 'Storage depends on the NVR capacity and number of cameras. We recommend a storage duration based on your needs and can configure 7 to 90+ days.' },
      { question: 'Do you service existing CCTV systems?', answer: 'Yes, we upgrade, repair, and maintain existing surveillance systems, including migration to IP cameras.' },
      { question: 'Can cameras work at night?', answer: 'Yes, we use cameras with IR night vision and options for low-light sensors and analytics for after-hours protection.' },
    ],
    reviews: [
      { name: 'Amit Patel', role: 'Owner', company: 'Patel Retail Group', rating: 5, content: 'Centralized surveillance across 25 outlets with remote monitoring. Setup was clean and the training was thorough.' },
      { name: 'Sneha Reddy', role: 'CEO', company: 'MedCare Hospitals', rating: 5, content: 'Compliant and discreet installation across our facility. The analytics alerts have genuinely improved our security posture.' },
    ],
  },

  'signage-solutions': {
    overview: [
      'Make a lasting impression with signage engineered to communicate your brand. From LED and channel letter signs to wayfinding and large-format outdoor displays, we design, fabricate, and install signage that looks premium and lasts.',
      'Our team handles everything — concept, materials, fabrication, lighting, permits, and installation — so your brand shows up exactly how you imagined, on time and on budget.',
      'Whether you are launching a new store, rebranding, or upgrading to digital signage, we make your space impossible to ignore.',
    ],
    gallery: [
      'https://plus.unsplash.com/premium_photo-1661964402307-02267d1423f5?q=80&w=1073&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      'https://media.assettype.com/robbreportindia%2Fimport%2Farticle%2FRR-Inline---2026-01-28T121757.473.webp?w=480&auto=format%2Ccompress&fit=max',
    ],
    features: [
      'LED and digital signage',
      'Channel letter and 3D letters',
      'Wayfinding and directional signs',
      'Outdoor billboards and hoardings',
      'Window graphics and vehicle wraps',
      'Signage maintenance and AMC',
    ],
    whatsIncluded: [
      'Design concepts and material samples',
      'Fabrication in our partner workshop',
      'LED lighting and electrical integration',
      'Structural mounting and safe installation',
      'Permit and compliance assistance',
      'Installation warranty and maintenance',
    ],
    process: [
      { title: 'Design', description: 'We create concepts, artwork, and material recommendations for your sign.' },
      { title: 'Fabrication', description: 'Skilled fabricators build your sign to exact specifications with premium materials.' },
      { title: 'Installation', description: 'Our team mounts, wires, and tests the signage safely and securely.' },
      { title: 'Handover', description: 'Final inspection, brightness calibration, and handover with warranty.' },
    ],
    startingPrice: '₹25,000',
    completionTime: '1–3 weeks depending on size and type',
    faqs: [
      { question: 'Do you handle design as well as fabrication?', answer: 'Yes. We provide complete design support — from initial concepts to artwork — and manage fabrication and installation end to end.' },
      { question: 'Can you help with signage permits?', answer: 'We assist with local signage permits and compliance so your installation is approved and safe.' },
      { question: 'What about illuminated signage?', answer: 'We specialize in LED and channel letter signage, including electrical integration and brightness control for maximum impact.' },
      { question: 'Do you service or maintain signage?', answer: 'Yes, we offer maintenance contracts covering lighting, cleaning, and repairs to keep your branding looking its best.' },
    ],
    reviews: [
      { name: 'Amit Patel', role: 'Owner', company: 'Patel Retail Group', rating: 5, content: 'Our new storefront signage draws customers in. Premium finish and the LED lighting looks stunning at night.' },
    ],
  },

  'website-it-services': {
    overview: [
      'Your digital presence is your 24/7 salesperson. Our website and IT services cover everything from custom website development and web applications to IT infrastructure, hosting, and ongoing technical support.',
      'We build fast, secure, and search-friendly websites that represent your business professionally. Behind the scenes, we set up the infrastructure — domains, email, hosting, backups — so everything just works.',
      'One team handles your entire technology stack, giving you a reliable partner for growth, not just a one-time project.',
    ],
    gallery: [
      'https://plus.unsplash.com/premium_photo-1663133994495-ecdc3cc03fff?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      'https://thumbs.dreamstime.com/b/computer-classroom-18757791.jpg',
    ],
    features: [
      'Custom website development',
      'Web application development',
      'E-commerce storefronts',
      'Cloud hosting and deployment',
      'Domain, email, and DNS configuration',
      'Technical support and maintenance',
    ],
    whatsIncluded: [
      'Discovery workshop and sitemap planning',
      'Modern, responsive UI design',
      'SEO-friendly development and performance tuning',
      'SSL, hosting, and backup setup',
      'Analytics and tracking configuration',
      'Training and ongoing support',
    ],
    process: [
      { title: 'Discovery', description: 'We understand your business, goals, and target audience to define scope.' },
      { title: 'Design', description: 'We design a modern, on-brand interface and get your sign-off before development.' },
      { title: 'Development', description: 'We build and test your website or application with security best practices.' },
      { title: 'Launch', description: 'Deployment, domain setup, and analytics go live with zero downtime.' },
      { title: 'Support', description: 'We provide training, maintenance, and ongoing improvements as you grow.' },
    ],
    startingPrice: '₹49,000',
    completionTime: '2–6 weeks depending on scope',
    faqs: [
      { question: 'How long does a website take to build?', answer: 'A standard business website typically takes 2–4 weeks, while custom web applications can take 4–8 weeks depending on features.' },
      { question: 'Will my website work on mobile?', answer: 'Every site we build is responsive and tested across devices, browsers, and screen sizes for a flawless experience.' },
      { question: 'Do you provide hosting and domain?', answer: 'Yes, we handle domain registration, hosting, SSL, email configuration, and backups as part of our IT services.' },
      { question: 'Can you maintain an existing website?', answer: 'Yes. We support, secure, and improve existing websites and applications, including redesigns and performance fixes.' },
    ],
    reviews: [
      { name: 'Sneha Reddy', role: 'CEO', company: 'MedCare Hospitals', rating: 5, content: 'Our new website is fast, clean, and easy to update. The team handled everything including hosting and email setup.' },
      { name: 'Rajesh Kumar', role: 'Facilities Director', company: 'TechVista Solutions', rating: 5, content: 'From design to launch, communication was excellent. The site ranks well and our clients love it.' },
    ],
  },

  'ecommerce-development': {
    overview: [
      'Launch or upgrade your online store with platforms built for conversions. Our e-commerce solutions cover custom storefronts, payment gateways, inventory management, shipping integrations, and performance optimization.',
      'We design shopping experiences that are fast, secure, and easy to manage — whether you are a startup selling your first products or a retailer scaling across marketplaces.',
      'From catalog setup to analytics, we handle the technical heavy lifting so you can focus on selling.',
    ],
    gallery: [
      'https://thumbs.dreamstime.com/b/computer-classroom-18757791.jpg',
      'https://plus.unsplash.com/premium_photo-1663133994495-ecdc3cc03fff?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    ],
    features: [
      'Custom e-commerce storefronts',
      'Payment gateway integration',
      'Inventory and order management',
      'Shipping and tax automation',
      'Marketplace integrations',
      'Analytics and conversion optimization',
    ],
    whatsIncluded: [
      'Store strategy and product catalog planning',
      'Custom theme design and development',
      'Payment gateway and shipping setup',
      'Inventory and order management configuration',
      'Security, SSL, and performance tuning',
      'Training, documentation, and support',
    ],
    process: [
      { title: 'Strategy', description: 'We map your catalog, pricing, and sales goals into a store architecture.' },
      { title: 'Design', description: 'We design a conversion-focused storefront aligned with your brand.' },
      { title: 'Development', description: 'We build product, cart, checkout, and payment flows with clean code.' },
      { title: 'Integration', description: 'Payment gateways, shipping, and marketplaces are connected and tested.' },
      { title: 'Launch & Optimize', description: 'We launch, monitor, and optimize performance and conversions over time.' },
    ],
    startingPrice: '₹79,000',
    completionTime: '3–8 weeks depending on scope',
    faqs: [
      { question: 'Which platform do you build on?', answer: 'We build on leading platforms like Shopify and WooCommerce, or fully custom solutions when your requirements are unique.' },
      { question: 'Do you handle payments and shipping?', answer: 'Yes. We integrate popular payment gateways and shipping providers, including automated rates, taxes, and tracking.' },
      { question: 'Can you migrate my existing store?', answer: 'Yes, we handle store migrations with minimal downtime, preserving your products, customers, and SEO.' },
      { question: 'Do you provide ongoing support?', answer: 'We offer maintenance plans covering updates, security, backups, and feature enhancements after launch.' },
    ],
    reviews: [
      { name: 'Amit Patel', role: 'Owner', company: 'Patel Retail Group', rating: 5, content: 'Checkout is seamless and the store loads fast even on mobile. Online sales now a strong share of our revenue.' },
    ],
  },

  'security-consulting': {
    overview: [
      'Protect your business with a security strategy designed around your real risks. Our consultants assess vulnerabilities across physical, procedural, and digital layers, then design a comprehensive framework that fits your operations and budget.',
      'From risk assessments and access control planning to CCTV design, fire safety, and compliance audits, we give you a clear roadmap — and the execution to match.',
      'You get actionable recommendations, not generic reports, backed by experts who stay involved through implementation.',
    ],
    gallery: [
      'https://media.istockphoto.com/id/2158997931/photo/robotics-people-and-engineer-tablet-with-industrial-collaboration-and-planning-in-warehouse.jpg?s=612x612&w=0&k=20&c=elDfuU9Ws4HqOGGaU9f6NjaYUlJXrIS51Ry0twwzHBw=',
      'https://plus.unsplash.com/premium_photo-1681426730828-bfee2d13861d?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8d2FyZWhvdXNlfGVufDB8fDB8fHx8',
    ],
    features: [
      'Security risk assessment',
      'Access control planning',
      'CCTV and surveillance system design',
      'Fire safety consulting',
      'Compliance and audit support',
      'Emergency response planning',
    ],
    whatsIncluded: [
      'On-site security audit and risk mapping',
      'Threat and vulnerability analysis',
      'Actionable security roadmap and report',
      'System design for access, CCTV, and fire safety',
      'Compliance gap analysis',
      'Implementation support and staff guidance',
    ],
    process: [
      { title: 'Audit', description: 'We inspect your premises and review current security controls and procedures.' },
      { title: 'Risk Analysis', description: 'We map threats and vulnerabilities with likelihood and impact ratings.' },
      { title: 'Roadmap', description: 'You receive a prioritized, budget-aware action plan and system designs.' },
      { title: 'Implementation', description: 'We deploy recommended systems and controls, or guide your team through it.' },
      { title: 'Review', description: 'Post-implementation testing, staff guidance, and periodic re-assessments.' },
    ],
    startingPrice: '₹15,000',
    completionTime: '1–2 weeks for assessment and report',
    faqs: [
      { question: 'What does a security assessment include?', answer: 'A full audit of physical perimeters, access points, surveillance, fire safety, procedures, and compliance, delivered with a prioritized action plan.' },
      { question: 'Do you implement the recommendations?', answer: 'Yes. We can deploy the recommended systems — CCTV, access control, fire safety — end to end, or guide your own team.' },
      { question: 'Can you help with compliance audits?', answer: 'We support compliance with standards like ISO 27001, SOC 2, and local regulations, including gap analysis and remediation.' },
      { question: 'How often should security be reviewed?', answer: 'We recommend an annual review or a fresh assessment after major changes to your facility, staff, or operations.' },
    ],
    reviews: [
      { name: 'Sneha Reddy', role: 'CEO', company: 'MedCare Hospitals', rating: 5, content: 'The risk report was actionable and the team stayed involved through implementation. Our compliance audit passed without findings.' },
      { name: 'Amit Patel', role: 'Owner', company: 'Patel Retail Group', rating: 5, content: 'Clear priorities, realistic budgets, and a roadmap we could actually execute across all our locations.' },
    ],
  },
};

/** Look up the enriched detail content for a service slug. */
export function getServiceDetailConfig(slug: string | undefined): ServiceDetailConfig | undefined {
  if (!slug) return undefined;
  return SERVICE_DETAIL_CONFIGS[slug];
}

/**
 * Build a sensible default detail view for services that have no curated
 * content yet. This guarantees every service renders a complete, premium
 * detail page without requiring backend or config changes.
 */
export function buildDefaultServiceDetail(service: ServiceItem): ServiceDetailConfig {
  return {
    overview: [
      service.description ||
        `${service.name} services delivered end to end by our vetted vendor network and managed project team.`,
      `Our ${service.name.toLowerCase()} service is planned, quoted, and executed with full transparency. You get a single point of contact, milestone-based progress updates, and a quality inspection before handover.`,
    ],
    gallery: service.image ? [service.image] : [],
    features:
      service.features.length > 0
        ? service.features
        : ['Transparent itemized quotation', 'Vetted and verified vendor team', 'Dedicated project coordinator', 'Milestone-based progress updates', 'Quality inspection before handover', 'Warranty and post-handover support'],
    whatsIncluded: GENERIC_INCLUDED,
    process: GENERIC_PROCESS,
    completionTime: 'Varies by scope — timelines shared during quotation',
    faqs: GENERIC_FAQS(service.name),
    reviews: [],
  };
}
