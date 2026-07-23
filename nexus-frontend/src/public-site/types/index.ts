export interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  icon: string;
  features: string[];
  image?: string;
  category: string;
}

export interface IndustryItem {
  id: string;
  image: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  services: string[];
}

export interface ProjectItem {
  id: string;
  title: string;
  category: string;
  industry: string;
  description: string;
  image?: string;
  services: string[];
}

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface ProcessStep {
  step: number;
  title: string;
  description: string;
  icon: string;
}

export interface StatItem {
  label: string;
  value: string;
  suffix?: string;
  description: string;
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}
