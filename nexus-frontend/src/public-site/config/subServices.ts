import type { ServiceDetailFaq, ServiceDetailReview, ServiceProcessStep } from './serviceDetails';

/**
 * Sub-service definitions, purely frontend presentation data.
 *
 * A main service (keyed by its public slug) can expose several sub-services.
 * Each sub-service has its own SEO-friendly slug, hero, gallery, features,
 * process, FAQ, pricing, and reviews — all rendered by the SAME page layout.
 *
 * No backend changes: the backend service catalog, quotation flow, lead flow,
 * and service IDs are untouched. This is a progressive-enhancement layer that
 * deepens the public website presentation of an existing service.
 */

export interface SubServiceConfig {
  slug: string;
  name: string;
  shortDescription: string;
  icon: string;
  overview: string[];
  gallery: string[];
  heroImage?: string;
  features: string[];
  whatsIncluded: string[];
  process: ServiceProcessStep[];
  startingPrice?: string;
  completionTime: string;
  faqs: ServiceDetailFaq[];
  reviews: ServiceDetailReview[];
}

interface SubServiceInput {
  slug: string;
  name: string;
  shortDescription: string;
  icon?: string;
  overview: string[];
  gallery: string[];
  heroImage?: string;
  features: string[];
  whatsIncluded?: string[];
  process?: ServiceProcessStep[];
  startingPrice?: string;
  completionTime: string;
  faqs?: ServiceDetailFaq[];
  reviews?: ServiceDetailReview[];
}

/** Shared image pool so every sub-service gets a real visual treatment. */
const IMG = {
  office: 'https://plus.unsplash.com/premium_photo-1663133994495-ecdc3cc03fff?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  hotel: 'https://plus.unsplash.com/premium_photo-1661964402307-02267d1423f5?q=80&w=1073&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  retail: 'https://plus.unsplash.com/premium_photo-1661521063809-8d846817e10f?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  solar: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  factory: 'https://media.istockphoto.com/id/2158997931/photo/robotics-people-and-engineer-tablet-with-industrial-collaboration-and-planning-in-warehouse.jpg?s=612x612&w=0&k=20&c=elDfuU9Ws4HqOGGaU9f6NjaYUlJXrIS51Ry0twwzHBw=',
  warehouse: 'https://plus.unsplash.com/premium_photo-1681426730828-bfee2d13861d?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8d2FyZWhvdXNlfGVufDB8fDB8fHx8',
  classroom: 'https://thumbs.dreamstime.com/b/computer-classroom-18757791.jpg',
  restaurant: 'https://media.assettype.com/robbreportindia%2Fimport%2Farticle%2FRR-Inline---2026-01-28T121757.473.webp?w=480&auto=format%2Ccompress&fit=max',
  signage: 'https://img.magnific.com/free-photo/african-american-man-looks-clothes-online-touch-screen-monitor-fashion-boutique-mall-self-service-board-male-customer-looking-trendy-clothes-items-retail-kiosk-display_482257-63314.jpg?semt=ais_hybrid&w=740&q=80',
};

const DEFAULT_INCLUDED = [
  'Dedicated project coordinator',
  'Vetted and verified vendor team',
  'Transparent itemized quotation',
  'Milestone-based progress updates via Client Portal',
  'Quality inspection before handover',
  'Warranty and post-handover support',
];

function defaultProcess(name: string): ServiceProcessStep[] {
  return [
    { title: 'Requirement', description: `Share your ${name.toLowerCase()} requirement through our wizard or a quick consultation call.` },
    { title: 'Assessment', description: 'Our team reviews your site and finalizes the right approach and scope.' },
    { title: 'Quotation', description: 'You receive a transparent, itemized quotation with a clear timeline.' },
    { title: 'Execution', description: 'Vetted vendors execute the work with milestone-based progress updates.' },
    { title: 'Handover', description: 'Quality inspection, documentation, and a smooth handover with warranty support.' },
  ];
}

function defaultFaqs(name: string): ServiceDetailFaq[] {
  return [
    { question: `What does the ${name} service include?`, answer: `The ${name} service covers the complete scope from planning and quotation to execution and handover. You get a single point of contact, milestone updates, and a quality inspection before delivery.` },
    { question: `How much does ${name} cost?`, answer: `Every project is quoted based on your specific requirements. We provide a transparent, itemized quotation after understanding your scope, and the initial consultation is free.` },
    { question: 'How long will my project take?', answer: 'Timelines depend on the scope and complexity of the work. We share clear milestones during the quotation phase and keep you updated throughout execution.' },
    { question: 'Do you provide warranty and support?', answer: 'Yes. All work comes with warranty coverage as specified in the quotation, along with ongoing maintenance and support options.' },
  ];
}

function makeSub(input: SubServiceInput): SubServiceConfig {
  return {
    icon: input.icon ?? 'Wrench',
    whatsIncluded: input.whatsIncluded ?? DEFAULT_INCLUDED,
    process: input.process ?? defaultProcess(input.name),
    faqs: input.faqs ?? defaultFaqs(input.name),
    reviews: input.reviews ?? [],
    ...input,
  };
}

export const SUB_SERVICES: Record<string, SubServiceConfig[]> = {
  'interior-design': [
    makeSub({
      slug: 'false-ceiling',
      name: 'False Ceiling',
      shortDescription: 'Designer POP and gypsum false ceilings with integrated lighting.',
      icon: 'LayoutGrid',
      overview: [
        'Transform plain overhead spaces into clean, modern design statements with custom false ceilings. From minimalist gypsum panels to decorative POP curves, we design, fabricate, and install ceilings that hide services and enhance acoustics.',
        'Every false ceiling is engineered around your lighting layout, HVAC runs, and design style, and installed by trained fitters with clean edges and seamless finishes.',
      ],
      gallery: [IMG.office, IMG.hotel],
      features: [
        'Gypsum, POP, and modular ceiling systems',
        'Recessed and cove lighting integration',
        'Acoustic and sound-absorbing options',
        'Decorative 3D and stepped designs',
        'HVAC and service concealment',
        'Thermal insulation options',
      ],
      startingPrice: '₹95 / sq ft',
      completionTime: '1–3 weeks depending on area',
    }),
    makeSub({
      slug: 'modular-office',
      name: 'Modular Office',
      shortDescription: 'Fast, flexible workspace fit-outs with workstations, cabins, and storage.',
      icon: 'Briefcase',
      overview: [
        'Build a professional workspace in weeks, not months, with factory-finished modular systems. Workstations, cabins, partition walls, and storage arrive ready-to-assemble and install with minimal disruption.',
        'We plan the layout around your team and workflows, integrate power and data cabling cleanly, and deliver a workspace that looks bespoke and scales with your business.',
      ],
      gallery: [IMG.office, IMG.retail],
      features: [
        'Modular workstations and desks',
        'Private cabins and glass partitions',
        'Storage, wardrobes, and pantry units',
        'Integrated power and data cabling',
        'Ergonomic and space-efficient layouts',
        'Rapid factory-finished installation',
      ],
      startingPrice: '₹650 / sq ft',
      completionTime: '3–8 weeks depending on scale',
    }),
    makeSub({
      slug: 'painting',
      name: 'Painting Services',
      shortDescription: 'Interior and exterior painting with premium finishes and surface prep.',
      icon: 'Paintbrush',
      overview: [
        'Give your space a flawless, long-lasting finish with professional painting services. We handle everything from surface preparation and crack repairs to premium coats and decorative textures.',
        'Our painters use quality materials and clean workmanship — masking, priming, and finishing to a standard that protects your walls and elevates the space.',
      ],
      gallery: [IMG.hotel, IMG.office],
      features: [
        'Interior and exterior painting',
        'Texture and decorative finishes',
        'Waterproofing and damp treatment',
        'Surface prep, putty, and crack repair',
        'Premium emulsion and enamel paints',
        'Color consultation and samples',
      ],
      startingPrice: '₹22 / sq ft',
      completionTime: '1–3 weeks depending on area',
    }),
    makeSub({
      slug: 'flooring',
      name: 'Flooring Solutions',
      shortDescription: 'Tiles, laminates, SPC, epoxy, and custom flooring for any space.',
      icon: 'Layers',
      overview: [
        'From durable vitrified tiles to warm wooden laminates and industrial epoxy, we install flooring that matches your usage and style. Our teams level, lay, and finish to a flawless standard.',
        'We advise on the right material for each zone — high-traffic, wet areas, or premium zones — and execute with attention to alignment, joints, and skirting.',
      ],
      gallery: [IMG.office, IMG.hotel],
      features: [
        'Vitrified, ceramic, and tile flooring',
        'Wooden laminate and engineered flooring',
        'SPC and vinyl plank installation',
        'Epoxy and industrial flooring',
        'Skirting, leveling, and finishing',
        'Material guidance by zone and usage',
      ],
      startingPrice: '₹45 / sq ft',
      completionTime: '1–4 weeks depending on area',
    }),
  ],

  'electrical-works': [
    makeSub({
      slug: 'wiring',
      name: 'Wiring & Rewiring',
      shortDescription: 'Concealed wiring and full rewiring for homes, offices, and factories.',
      icon: 'Cable',
      overview: [
        'Safe, code-compliant electrical wiring is the backbone of any facility. We handle new wiring and complete rewiring — concealed channels, quality conductors, and organized distribution — so every point works reliably.',
        'Our electricians plan load circuits carefully, use quality switches and sockets, and test every circuit before handover with proper documentation.',
      ],
      gallery: [IMG.factory, IMG.warehouse],
      features: [
        'Concealed and surface wiring',
        'Complete rewiring and upgrades',
        'Circuit planning and load balancing',
        'Quality switches, sockets, and panels',
        'Earthing and surge protection',
        'Load testing and certification',
      ],
      startingPrice: '₹45 / sq ft',
      completionTime: '1–3 weeks depending on area',
    }),
    makeSub({
      slug: 'panel-installation',
      name: 'Panel Installation',
      shortDescription: 'Distribution boards, MCB/RCCB panels, and three-phase installations.',
      icon: 'CircuitBoard',
      overview: [
        'Power your facility with correctly sized distribution panels. We install and upgrade MCB, RCCB, and three-phase panels with organized circuits and clear labeling for safe, maintainable power.',
        'Every panel is designed around your actual load, protected against faults, and delivered with single-line diagrams and testing records.',
      ],
      gallery: [IMG.factory, IMG.warehouse],
      features: [
        'Distribution board installation',
        'MCB, RCCB, and ELCB protection',
        'Three-phase panel setup',
        'Busbar and metering solutions',
        'Load management and labeling',
        'Safety testing and documentation',
      ],
      startingPrice: '₹25,000',
      completionTime: '1–2 weeks depending on scope',
    }),
    makeSub({
      slug: 'maintenance',
      name: 'Electrical Maintenance',
      shortDescription: 'AMC plans and preventive maintenance that keep your power reliable.',
      icon: 'Cog',
      overview: [
        'Prevent downtime before it happens with scheduled electrical maintenance. We inspect, test, and maintain panels, wiring, and critical loads so small issues never become costly failures.',
        'Our AMC plans include periodic checks, thermal scanning, breaker testing, and priority callout, all documented for your records.',
      ],
      gallery: [IMG.factory, IMG.warehouse],
      features: [
        'Scheduled preventive inspections',
        'Thermal scanning of panels and joints',
        'Breaker and protection testing',
        'Earthing and continuity checks',
        'Priority emergency callout',
        'Inspection reports and documentation',
      ],
      startingPrice: '₹3,500 / year',
      completionTime: 'Ongoing service contract',
    }),
    makeSub({
      slug: 'repair',
      name: 'Electrical Repair',
      shortDescription: 'Fast fault diagnosis and repair for every electrical issue.',
      icon: 'Wrench',
      overview: [
        'Power cuts, tripping breakers, flickering lights, or faulty fixtures — our technicians diagnose and fix electrical faults quickly and safely.',
        'We carry the tools and common spares to resolve most issues in a single visit, and provide a safety inspection report with every repair.',
      ],
      gallery: [IMG.warehouse, IMG.factory],
      features: [
        'Fault diagnosis and root-cause analysis',
        'Short-circuit and tripping fixes',
        'Fixture, switch, and socket replacement',
        'Voltage fluctuation corrections',
        'Emergency same-day response',
        'Safety inspection with every visit',
      ],
      startingPrice: '₹800 callout',
      completionTime: 'Same-day / next-day service',
    }),
  ],

  'signage-solutions': [
    makeSub({
      slug: 'new-signage',
      name: 'New Signage',
      shortDescription: 'Design, fabrication, and installation of brand-new signs.',
      icon: 'Sparkles',
      overview: [
        'Launch a sign that gets your brand noticed. We design, fabricate, and install new signage — LED, neon, channel letters, and display boards — engineered to your brand and built to last.',
        'From concept and material selection to structural mounting and lighting, one team delivers your complete sign ready to impress.',
      ],
      gallery: [IMG.signage, IMG.retail],
      features: [
        'Custom design and artwork',
        'LED, neon, and illuminated signs',
        'Channel letters and 3D letters',
        'Fabrication in our partner workshop',
        'Safe structural installation',
        'Warranty and aftercare',
      ],
      startingPrice: '₹25,000',
      completionTime: '1–3 weeks depending on type',
    }),
    makeSub({
      slug: 'signage-repair',
      name: 'Signage Repair',
      shortDescription: 'Fast repair of lighting, panels, and frames for existing signs.',
      icon: 'Wrench',
      overview: [
        'A damaged sign quietly hurts your brand every day. Our technicians repair LED failures, faded panels, and damaged frames quickly, restoring your signage to full impact.',
        'We diagnose on-site, quote transparently, and complete most repairs in a single visit using quality components.',
      ],
      gallery: [IMG.signage, IMG.restaurant],
      features: [
        'LED and lighting repair',
        'Panel refurbishment and re-polishing',
        'Frame and structure repair',
        'Wiring and electrical fixes',
        'Brightness and color correction',
        'On-site diagnosis and service',
      ],
      startingPrice: '₹2,500',
      completionTime: '2–5 days depending on scope',
    }),
    makeSub({
      slug: 'signage-shifting',
      name: 'Signage Shifting',
      shortDescription: 'Safe dismantling, transport, and reinstallation of your signage.',
      icon: 'Move',
      overview: [
        'Relocating your business should not mean losing your signage investment. We carefully dismantle, transport, and reinstall your signs at the new location with the same structural quality.',
        'Electrical reconnection, alignment, and minor refurbishment are included so the sign looks brand new at its new home.',
      ],
      gallery: [IMG.signage, IMG.retail],
      features: [
        'Safe and careful dismantling',
        'Protected transport and handling',
        'Reinstallation and structural mounting',
        'Electrical reconnection and testing',
        'Alignment and leveling',
        'Minor refurbishment included',
      ],
      startingPrice: '₹8,000',
      completionTime: '3–7 days depending on size',
    }),
    makeSub({
      slug: 'signage-consultation',
      name: 'Signage Consultation',
      shortDescription: 'Expert advice on signage strategy, placement, and materials.',
      icon: 'Lightbulb',
      overview: [
        'Make every sign work harder with a professional signage audit. We review your visibility, placement, and brand impact, and recommend the right types, materials, and lighting.',
        'You receive a practical, prioritized plan — including budget ranges and compliance guidance — before spending on fabrication.',
      ],
      gallery: [IMG.signage, IMG.restaurant],
      features: [
        'Brand visibility audit',
        'Placement and sizing strategy',
        'Material and lighting guidance',
        'Local signage compliance advice',
        'Budget and ROI planning',
        'Detailed recommendation report',
      ],
      startingPrice: '₹5,000',
      completionTime: '1 week for report',
    }),
  ],

  'solar-installation': [
    makeSub({
      slug: 'rooftop-solar',
      name: 'Rooftop Solar',
      shortDescription: 'Grid-connected rooftop systems with net metering and subsidies.',
      icon: 'Sun',
      overview: [
        'Turn your roof into a power plant with a grid-tied rooftop solar system. We size, design, and install panels that slash your electricity bills while you earn from surplus generation.',
        'From mounting structures to inverters, net metering, and subsidy paperwork, our team delivers a complete, warrantied installation.',
      ],
      gallery: [IMG.solar, IMG.factory],
      features: [
        'System sizing and energy modeling',
        'Net metering installation and approvals',
        'High-efficiency panels and inverters',
        'Quality mounting structures',
        'Subsidy application assistance',
        'Remote performance monitoring',
      ],
      startingPrice: '₹55 / watt',
      completionTime: '2–6 weeks depending on size',
    }),
    makeSub({
      slug: 'off-grid-solar',
      name: 'Off-Grid Solar',
      shortDescription: 'Battery-backed solar systems for reliable power, anywhere.',
      icon: 'BatteryCharging',
      overview: [
        'Stay powered through outages with an off-grid or hybrid solar system. We design battery-backed configurations sized to your critical loads so essential equipment never stops.',
        'Inverter sizing, battery banks, and smart load management are engineered for years of dependable service.',
      ],
      gallery: [IMG.solar, IMG.warehouse],
      features: [
        'Battery backup system design',
        'Inverter and charge controller sizing',
        'Hybrid grid + solar configurations',
        'Critical load prioritization',
        'Battery bank installation',
        'Maintenance and support plans',
      ],
      startingPrice: '₹70 / watt',
      completionTime: '2–4 weeks depending on size',
    }),
    makeSub({
      slug: 'solar-maintenance',
      name: 'Solar Maintenance',
      shortDescription: 'Cleaning, monitoring, and repairs that protect your solar ROI.',
      icon: 'Cog',
      overview: [
        'A neglected solar plant loses output quietly. Our maintenance plans include panel cleaning, inverter checks, and performance monitoring to keep generation at peak.',
        'We catch issues early with data-driven checks and offer AMC options with priority callout and repair.',
      ],
      gallery: [IMG.solar, IMG.factory],
      features: [
        'Panel cleaning and inspection',
        'Inverter health checks',
        'Performance monitoring and reports',
        'Wiring and connection inspection',
        'Priority repair callout',
        'Annual AMC options',
      ],
      startingPrice: '₹4,500 / year',
      completionTime: 'Ongoing service contract',
    }),
  ],

  'cctv-installation': [
    makeSub({
      slug: 'ip-camera-systems',
      name: 'IP Camera Systems',
      shortDescription: 'HD IP surveillance with remote viewing and smart alerts.',
      icon: 'Camera',
      overview: [
        'Deploy high-definition IP camera systems with crisp imaging, reliable recording, and remote access from any device. We design coverage, run structured cabling, and configure everything.',
        'Motion alerts, video analytics, and mobile viewing come ready to use, with training for your team.',
      ],
      gallery: [IMG.retail, IMG.factory],
      features: [
        'HD and 4K IP cameras',
        'NVR recording and storage',
        'PoE network infrastructure',
        'Remote mobile and web viewing',
        'Motion alerts and analytics',
        'Access control integration',
      ],
      startingPrice: '₹4,500 / camera',
      completionTime: '1–3 weeks depending on site',
    }),
    makeSub({
      slug: 'cctv-repair',
      name: 'CCTV Repair',
      shortDescription: 'Fast diagnosis and repair of cameras, wiring, and recorders.',
      icon: 'Wrench',
      overview: [
        'Flickering feeds, offline cameras, or lost recordings — our technicians troubleshoot and repair your CCTV system quickly, restoring complete coverage.',
        'We fix cameras, wiring, NVRs, and storage issues on-site with quality replacements.',
      ],
      gallery: [IMG.retail, IMG.warehouse],
      features: [
        'Camera troubleshooting and repair',
        'Wiring and connectivity fixes',
        'NVR and DVR repairs',
        'Storage and recording recovery',
        'Image quality restoration',
        'On-site service and testing',
      ],
      startingPrice: '₹1,500',
      completionTime: '2–5 days depending on scope',
    }),
    makeSub({
      slug: 'cctv-maintenance',
      name: 'CCTV Maintenance',
      shortDescription: 'Scheduled maintenance that keeps every camera online.',
      icon: 'Cog',
      overview: [
        'Prevent blind spots with regular CCTV maintenance. We schedule inspections, clean lenses, update firmware, and optimize storage so your surveillance never lets you down.',
        'AMC plans include priority callout and documented service history.',
      ],
      gallery: [IMG.retail, IMG.factory],
      features: [
        'Scheduled system inspections',
        'Lens cleaning and alignment',
        'Firmware and security updates',
        'Storage optimization and health checks',
        'Priority callout and support',
        'Service history documentation',
      ],
      startingPrice: '₹6,000 / year',
      completionTime: 'Ongoing service contract',
    }),
  ],

  'website-it-services': [
    makeSub({
      slug: 'website-development',
      name: 'Website Development',
      shortDescription: 'Fast, secure, SEO-friendly websites built around your brand.',
      icon: 'Globe',
      overview: [
        'Get a website that looks premium and works hard — fast-loading, mobile-perfect, and built to rank. We design, develop, and launch sites that represent your business professionally.',
        'Every build includes responsive design, SEO fundamentals, performance tuning, and analytics so you can measure success.',
      ],
      gallery: [IMG.classroom, IMG.office],
      features: [
        'Responsive and mobile-first design',
        'Modern, clean development',
        'SEO-friendly structure and speed',
        'SSL, security, and backups',
        'Analytics and tracking setup',
        'Training and launch support',
      ],
      startingPrice: '₹49,000',
      completionTime: '2–4 weeks depending on scope',
    }),
    makeSub({
      slug: 'it-infrastructure',
      name: 'IT Infrastructure',
      shortDescription: 'Networks, servers, cloud, and security setup for your business.',
      icon: 'Server',
      overview: [
        'Power your operations with reliable IT infrastructure. We design and set up networks, servers, cloud hosting, backups, and security so your team and data stay safe and fast.',
        'From office networking to cloud migration, we handle the technical foundation your business runs on.',
      ],
      gallery: [IMG.office, IMG.classroom],
      features: [
        'Office network design and setup',
        'Server and cloud deployment',
        'Data backup and recovery',
        'Cybersecurity hardening',
        'Domain, email, and DNS setup',
        'Monitoring and support',
      ],
      startingPrice: '₹35,000',
      completionTime: '2–6 weeks depending on scope',
    }),
    makeSub({
      slug: 'technical-support',
      name: 'Technical Support',
      shortDescription: 'Helpdesk and managed support that keeps IT running smoothly.',
      icon: 'Headset',
      overview: [
        'Keep your systems healthy with proactive technical support. We provide helpdesk, remote assistance, monitoring, and maintenance for your websites, applications, and infrastructure.',
        'Monthly reports and priority response keep small issues from becoming business interruptions.',
      ],
      gallery: [IMG.classroom, IMG.office],
      features: [
        'Helpdesk and remote support',
        'Website and app maintenance',
        'System monitoring and alerts',
        'Security patches and updates',
        'Backup verification',
        'Monthly service reports',
      ],
      startingPrice: '₹12,000 / year',
      completionTime: 'Ongoing service contract',
    }),
  ],

  'ecommerce-development': [
    makeSub({
      slug: 'storefront-setup',
      name: 'Storefront Setup',
      shortDescription: 'Launch a complete online store with catalog, payments, and shipping.',
      icon: 'ShoppingCart',
      overview: [
        'Open your online store quickly with a complete storefront setup — product catalog, cart, secure checkout, payments, and shipping all configured and ready to sell.',
        'We design a conversion-friendly store aligned with your brand and train your team to manage it confidently.',
      ],
      gallery: [IMG.classroom, IMG.office],
      features: [
        'Product catalog and categories',
        'Payment gateway integration',
        'Shipping and tax automation',
        'Conversion-focused design',
        'Inventory and order management',
        'Team training and documentation',
      ],
      startingPrice: '₹59,000',
      completionTime: '3–6 weeks depending on scope',
    }),
    makeSub({
      slug: 'ecommerce-migration',
      name: 'E-Commerce Migration',
      shortDescription: 'Move your store to a better platform with zero lost data or SEO.',
      icon: 'ArrowLeftRight',
      overview: [
        'Upgrade platforms without the risk. We migrate your products, customers, orders, and SEO to a faster, more scalable store with minimal downtime.',
        'Payment setup, redirects, and thorough testing ensure your new store is live, correct, and ranking from day one.',
      ],
      gallery: [IMG.office, IMG.classroom],
      features: [
        'Data migration and integrity checks',
        'SEO redirects and preservation',
        'Payment and shipping reconfiguration',
        'Theme redesign on the new platform',
        'Pre-launch testing and QA',
        'Post-migration support',
      ],
      startingPrice: '₹35,000',
      completionTime: '2–5 weeks depending on size',
    }),
  ],

  'security-consulting': [
    makeSub({
      slug: 'risk-assessment',
      name: 'Security Risk Assessment',
      shortDescription: 'Identify real risks and get an actionable security roadmap.',
      icon: 'FileSearch',
      overview: [
        'Understand exactly where your business is exposed with a structured security risk assessment. We audit physical, procedural, and digital controls and map real threats.',
        'You receive a prioritized, budget-aware roadmap you can act on immediately.',
      ],
      gallery: [IMG.factory, IMG.warehouse],
      features: [
        'On-site security audit',
        'Threat and vulnerability mapping',
        'Access and surveillance review',
        'Compliance gap analysis',
        'Prioritized action roadmap',
        'Executive summary report',
      ],
      startingPrice: '₹15,000',
      completionTime: '1–2 weeks for report',
    }),
    makeSub({
      slug: 'access-control',
      name: 'Access Control Systems',
      shortDescription: 'Biometric and card-based entry systems with full audit trails.',
      icon: 'Lock',
      overview: [
        'Control exactly who enters your premises, when. We install biometric, card, and PIN access systems with central management and complete audit trails.',
        'Integration with your existing surveillance and time-attendance makes security and operations work together.',
      ],
      gallery: [IMG.office, IMG.factory],
      features: [
        'Biometric fingerprint and face readers',
        'Card and PIN access systems',
        'Centralized access management',
        'Audit trails and reports',
        'CCTV and attendance integration',
        'Professional installation',
      ],
      startingPrice: '₹18,000 / door',
      completionTime: '1–2 weeks depending on doors',
    }),
    makeSub({
      slug: 'fire-safety',
      name: 'Fire Safety Consulting',
      shortDescription: 'Detection, alarms, and evacuation plans that protect lives.',
      icon: 'Flame',
      overview: [
        'Protect people and property with a compliant fire safety framework. We assess risks, design detection and alarm systems, and plan evacuation procedures.',
        'From system design to staff drills and compliance documentation, we help you be genuinely prepared.',
      ],
      gallery: [IMG.warehouse, IMG.factory],
      features: [
        'Fire risk assessment',
        'Detection and alarm system design',
        'Suppression system planning',
        'Evacuation plans and signage',
        'Compliance and documentation',
        'Staff training and drills',
      ],
      startingPrice: '₹12,000',
      completionTime: '1–3 weeks depending on scope',
    }),
  ],
};

/** Sub-services for a main service slug (empty when none are configured). */
export function getSubServices(serviceSlug: string | undefined): SubServiceConfig[] {
  if (!serviceSlug) return [];
  return SUB_SERVICES[serviceSlug] ?? [];
}

/** Look up a single sub-service by main service slug + sub slug. */
export function getSubService(serviceSlug: string | undefined, subSlug: string | undefined): SubServiceConfig | undefined {
  if (!serviceSlug || !subSlug) return undefined;
  return getSubServices(serviceSlug).find((sub) => sub.slug === subSlug);
}
