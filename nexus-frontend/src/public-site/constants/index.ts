import type { NavItem, IndustryItem, ProcessStep, StatItem, TestimonialItem, FAQItem } from '../types';

export const NAVIGATION: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Industries', href: '/industries' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Projects', href: '/projects' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export const INDUSTRIES: IndustryItem[] = [
  {
    id: '1',
    name: 'Retail',
    slug: 'retail',
    image: 'https://img.magnific.com/free-photo/african-american-man-looks-clothes-online-touch-screen-monitor-fashion-boutique-mall-self-service-board-male-customer-looking-trendy-clothes-items-retail-kiosk-display_482257-63314.jpg?semt=ais_hybrid&w=740&q=80',
    description: 'End-to-end infrastructure solutions for retail stores, showrooms, and chain outlets. From interior fit-outs to security systems.',
    icon: 'Store',
    services: ['Interior Design', 'CCTV Installation', 'Signage Solutions', 'Electrical Works'],
  },
  {
    id: '2',
    name: 'Healthcare',
    image: 'https://www.consultancy.eu/illustrations/news/detail/2024-11-25-010004496-Nine_technologies_revolutionizing_the_global_healthcare_industry.jpg?size=900/445',
    slug: 'healthcare',
    description: 'Specialized infrastructure for hospitals, clinics, and diagnostic centers with compliance-first approach.',
    icon: 'Heart',
    services: ['Interior Design', 'Electrical Works', 'CCTV Installation', 'Security Consulting'],
  },
  {
    id: '3',
    name: 'Education',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT65QPFs10doj4GsJRJzi3hjgeqFlALMie-VLOspboHZw8_EmlBpjFMpcUQ&s=10',
    slug: 'education',
    description: 'Smart campus infrastructure for schools, colleges, and training centers.',
    icon: 'GraduationCap',
    services: ['IT Services', 'CCTV Installation', 'Electrical Works', 'Solar Installation'],
  },
  {
    id: '4',
    name: 'Hospitality',
    image: 'https://t3.ftcdn.net/jpg/20/29/40/22/360_F_2029402224_YufukHWzp1kvEQZhb5zaLoseiFy1GQRm.jpg',
    slug: 'hospitality',
    description: 'Premium infrastructure for hotels, resorts, and restaurants that enhances guest experience.',
    icon: 'Hotel',
    services: ['Interior Design', 'Solar Installation', 'Signage Solutions', 'Security Consulting'],
  },
  {
    id: '5',
    name: 'Manufacturing',
    image: 'https://media.istockphoto.com/id/2158997931/photo/robotics-people-and-engineer-tablet-with-industrial-collaboration-and-planning-in-warehouse.jpg?s=612x612&w=0&k=20&c=elDfuU9Ws4HqOGGaU9f6NjaYUlJXrIS51Ry0twwzHBw=',
    slug: 'manufacturing',
    description: 'Industrial-grade infrastructure solutions for factories, warehouses, and production facilities.',
    icon: 'Factory',
    services: ['Electrical Works', 'Solar Installation', 'Security Consulting', 'CCTV Installation'],
  },
  {
    id: '6',
    name: 'Corporate Offices',
    image: 'https://thumbs.dreamstime.com/b/computer-classroom-18757791.jpg',
    slug: 'corporate-offices',
    description: 'Modern office infrastructure that fosters productivity and reflects corporate culture.',
    icon: 'Building2',
    services: ['Interior Design', 'IT Services', 'Electrical Works', 'CCTV Installation'],
  },
  {
    id: '7',
    name: 'Warehouses',
    image: 'https://plus.unsplash.com/premium_photo-1681426730828-bfee2d13861d?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8d2FyZWhvdXNlfGVufDB8fDB8fHww',
    slug: 'warehouses',
    description: 'Secure and efficient warehouse infrastructure with smart monitoring solutions.',
    icon: 'Warehouse',
    services: ['CCTV Installation', 'Electrical Works', 'Solar Installation', 'Security Consulting'],
  },
  {
    id: '8',
    name: 'Restaurants',
    image: 'https://media.assettype.com/robbreportindia%2Fimport%2Farticle%2FRR-Inline---2026-01-28T121757.473.webp?w=480&auto=format%2Ccompress&fit=max',
    slug: 'restaurants',
    description: 'Complete fit-out and infrastructure solutions for restaurants, cafes, and cloud kitchens.',
    icon: 'UtensilsCrossed',
    services: ['Interior Design', 'Electrical Works', 'CCTV Installation', 'Signage Solutions'],
  },
];

export const PROCESS_STEPS: ProcessStep[] = [
  { step: 1, title: 'Requirement', description: 'Share your project needs through our guided wizard or consultation call.', icon: 'ClipboardList' },
  { step: 2, title: 'Consultation', description: 'Our experts discuss your requirements and recommend the best approach.', icon: 'MessageSquare' },
  { step: 3, title: 'Site Visit', description: 'Our team visits your location to assess the site and finalize plans.', icon: 'MapPin' },
  { step: 4, title: 'Quotation', description: 'Receive a detailed, transparent quotation with itemized costs.', icon: 'FileText' },
  { step: 5, title: 'Execution', description: 'Our vetted vendors execute the project with regular progress updates.', icon: 'Hammer' },
  { step: 6, title: 'Handover', description: 'Quality inspection, documentation, and seamless project handover.', icon: 'CheckCircle' },
];

export const STATS: StatItem[] = [
  { label: 'Projects Completed', value: '500', suffix: '+', description: 'Successfully delivered across industries' },
  { label: 'Response Time', value: '24', suffix: ' hrs', description: 'Average initial response time' },
  { label: 'Client Satisfaction', value: '98', suffix: '%', description: 'Based on post-project surveys' },
  { label: 'Vendor Network', value: '200', suffix: '+', description: 'Verified and trusted partners' },
  { label: 'Years Experience', value: '10', suffix: '+', description: 'In managed infrastructure services' },
];

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    role: 'Facilities Director',
    company: 'TechVista Solutions',
    content: 'Nexus transformed our office space beautifully. Their managed approach meant we had one point of contact for interior design, electrical work, and IT setup. The project was delivered on time and within budget.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Priya Sharma',
    role: 'Operations Head',
    company: 'GreenEnergy Corp',
    content: 'The solar installation project was handled end-to-end with exceptional professionalism. From site assessment to commissioning, Nexus coordinated everything seamlessly. Our energy bills dropped by 35%.',
    rating: 5,
  },
  {
    id: '3',
    name: 'Amit Patel',
    role: 'Owner',
    company: 'Patel Retail Group',
    content: 'Managing infrastructure across 30+ retail locations was a nightmare until we found Nexus. Their vendor network and project management capabilities are outstanding.',
    rating: 5,
  },
  {
    id: '4',
    name: 'Sneha Reddy',
    role: 'CEO',
    company: 'MedCare Hospitals',
    content: 'For our new hospital wing, we needed a partner who understood healthcare compliance. Nexus delivered a complete infrastructure solution that met all regulatory requirements.',
    rating: 5,
  },
  {
    id: '5',
    name: 'Vikram Singh',
    role: 'Managing Director',
    company: 'Singh Manufacturing',
    content: 'Nexus handled our factory electrification and solar installation simultaneously. Their coordination between different vendor teams was impressive. Highly recommended for industrial projects.',
    rating: 5,
  },
];

export const FAQS: FAQItem[] = [
  {
    id: '1',
    question: 'What is Nexus Managed Services?',
    answer: 'Nexus is a managed infrastructure platform that coordinates trusted vendors for interior design, solar installation, electrical works, CCTV, signage, and IT projects. We serve as your single point of contact, managing the entire project lifecycle from requirement gathering to handover.',
    category: 'General',
  },
  {
    id: '2',
    question: 'How does the quote request process work?',
    answer: 'Simply click "Get Free Quote" and follow our guided wizard. Select the services you need, provide project details, upload any reference images, and create an account. Our team will review your requirements and respond within 24 hours with a detailed consultation plan.',
    category: 'General',
  },
  {
    id: '3',
    question: 'What areas do you serve?',
    answer: 'We are currently headquartered in Lucknow and serve projects across Uttar Pradesh and surrounding regions. For large-scale projects, we can coordinate across multiple locations in India through our extensive vendor network.',
    category: 'General',
  },
  {
    id: '4',
    question: 'How many services can I include in a single quote?',
    answer: 'You can select multiple services in a single quote request. This is one of our key advantages — we coordinate all services under one project, ensuring seamless execution and consistent quality across all workstreams.',
    category: 'Quotation',
  },
  {
    id: '5',
    question: 'Is there any cost for the initial consultation?',
    answer: 'No, the initial consultation is completely free. Our team will discuss your requirements, suggest the best approach, and provide a detailed quotation with transparent pricing before any commitment is needed.',
    category: 'Quotation',
  },
  {
    id: '6',
    question: 'How do you ensure quality of work?',
    answer: 'All vendors in our network are thoroughly vetted and verified. We implement a rigorous quality inspection process at every milestone, provide regular progress updates, and maintain accountability through our project management system until successful handover.',
    category: 'Quality',
  },
  {
    id: '7',
    question: 'Can I track my project progress online?',
    answer: 'Yes! Once your project is confirmed, you get access to our Client Portal where you can track real-time progress, view timelines, communicate with the project team, access documents, and receive status updates.',
    category: 'Projects',
  },
  {
    id: '8',
    question: 'What payment terms do you offer?',
    answer: 'We offer flexible payment terms typically structured as: advance payment to begin, milestone-based payments during execution, and final payment upon successful handover. Specific terms are detailed in the quotation and can be discussed during consultation.',
    category: 'Payment',
  },
  {
    id: '9',
    question: 'Do you provide warranties on completed work?',
    answer: 'Yes, all projects come with warranty coverage as specified in the quotation. This typically includes workmanship warranty from vendors and material warranties from manufacturers. Extended maintenance contracts are also available.',
    category: 'Quality',
  },
  {
    id: '10',
    question: 'What industries do you specialize in?',
    answer: 'We serve a wide range of industries including Retail, Healthcare, Education, Hospitality, Manufacturing, Corporate Offices, Warehouses, and Restaurants. Our approach is tailored to meet the specific infrastructure requirements of each industry.',
    category: 'General',
  },
  {
    id: '11',
    question: 'How long does a typical project take?',
    answer: 'Project timelines vary based on scope and complexity. A single-service project might take 1-2 weeks, while a multi-service fit-out could take 4-12 weeks. We provide detailed timelines during the quotation phase with clear milestones.',
    category: 'Projects',
  },
  {
    id: '12',
    question: 'Can I modify my requirements after submitting a quote?',
    answer: 'Absolutely. The initial quote request is just the starting point. During the consultation phase, you can refine, add, or modify requirements. We adapt the scope and pricing accordingly before any commitment is made.',
    category: 'Quotation',
  },
];

export const BUDGET_RANGES = [
  'Under ₹1 Lakh',
  '₹1 - 5 Lakhs',
  '₹5 - 10 Lakhs',
  '₹10 - 25 Lakhs',
  '₹25 - 50 Lakhs',
  '₹50 Lakhs - 1 Crore',
  'Above ₹1 Crore',
];

export const TIMELINE_OPTIONS = [
  'Urgent (Within 1 week)',
  '1 - 2 Weeks',
  '2 - 4 Weeks',
  '1 - 2 Months',
  '2 - 3 Months',
  '3 - 6 Months',
  'Flexible / No Rush',
];

export const PROPERTY_TYPES = [
  'Office Space',
  'Retail Store',
  'Warehouse',
  'Factory / Industrial',
  'Restaurant / Cafe',
  'Hotel / Hospitality',
  'Healthcare Facility',
  'Educational Institution',
  'Residential',
  'Other',
];

export const COMPANY_INFO = {
  name: 'Nexus Managed Services',
  tagline: 'One Partner For All Your Business Infrastructure Needs',
  location: 'Lucknow, India',
  email: 'info@nexusmcs.com',
  phone: '+91 XXXXX XXXXX',
  address: 'Lucknow, Uttar Pradesh, India',
};
