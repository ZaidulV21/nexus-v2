import type { ServiceQuestionConfig } from './types';

/**
 * Configuration-driven service questions.
 *
 * To add a new service: just add a new entry to this array.
 * No wizard logic changes required.
 *
 * The `serviceId` must match the backend Service.id.
 * At runtime, configs are matched to services fetched from the API.
 */
export const SERVICE_QUESTION_CONFIGS: ServiceQuestionConfig[] = [
  {
    serviceId: 'interior-design',
    serviceName: 'Interior Design',
    questions: [
      { id: 'property_type', type: 'select', label: 'Property Type', required: true, options: [
        { label: 'Office Space', value: 'office' },
        { label: 'Retail Store', value: 'retail' },
        { label: 'Restaurant / Café', value: 'restaurant' },
        { label: 'Residential', value: 'residential' },
        { label: 'Warehouse / Industrial', value: 'warehouse' },
        { label: 'Other', value: 'other' },
      ]},
      { id: 'area_sqft', type: 'number', label: 'Area (sq ft)', placeholder: 'e.g. 2000', required: true },
      { id: 'num_rooms', type: 'number', label: 'Number of Rooms / Sections', placeholder: 'e.g. 5' },
      { id: 'design_style', type: 'select', label: 'Preferred Design Style', options: [
        { label: 'Modern / Minimalist', value: 'modern' },
        { label: 'Traditional / Classic', value: 'traditional' },
        { label: 'Industrial', value: 'industrial' },
        { label: 'Scandinavian', value: 'scandinavian' },
        { label: 'No Preference', value: 'none' },
      ]},
      { id: 'budget', type: 'select', label: 'Budget Range', required: true, options: [
        { label: 'Under ₹1 Lakh', value: 'under-1l' },
        { label: '₹1 - 5 Lakhs', value: '1l-5l' },
        { label: '₹5 - 15 Lakhs', value: '5l-15l' },
        { label: '₹15 - 50 Lakhs', value: '15l-50l' },
        { label: 'Above ₹50 Lakhs', value: 'above-50l' },
      ]},
      { id: 'timeline', type: 'select', label: 'Expected Timeline', options: [
        { label: 'Urgent (Within 1 month)', value: 'urgent' },
        { label: '1 - 3 months', value: '1-3m' },
        { label: '3 - 6 months', value: '3-6m' },
        { label: 'Flexible', value: 'flexible' },
      ]},
      { id: 'site_address', type: 'textarea', label: 'Site Address', placeholder: 'Full address for site visit', required: true },
      { id: 'additional_notes', type: 'textarea', label: 'Additional Notes', placeholder: 'Any specific requirements or preferences...' },
    ],
  },
  {
    serviceId: 'solar-installation',
    serviceName: 'Solar Installation',
    questions: [
      { id: 'property_type', type: 'select', label: 'Property Type', required: true, options: [
        { label: 'Residential', value: 'residential' },
        { label: 'Commercial', value: 'commercial' },
        { label: 'Industrial', value: 'industrial' },
        { label: 'Agricultural', value: 'agricultural' },
      ]},
      { id: 'monthly_bill', type: 'select', label: 'Monthly Electricity Bill', required: true, options: [
        { label: 'Under ₹2,000', value: 'under-2k' },
        { label: '₹2,000 - 5,000', value: '2k-5k' },
        { label: '₹5,000 - 15,000', value: '5k-15k' },
        { label: '₹15,000 - 50,000', value: '15k-50k' },
        { label: 'Above ₹50,000', value: 'above-50k' },
      ]},
      { id: 'roof_type', type: 'select', label: 'Roof Type', required: true, options: [
        { label: 'Flat Concrete', value: 'flat' },
        { label: 'Sloped / Tiled', value: 'sloped' },
        { label: 'Metal Sheet', value: 'metal' },
        { label: 'Not Sure', value: 'unsure' },
      ]},
      { id: 'roof_area', type: 'number', label: 'Roof Area (sq ft)', placeholder: 'e.g. 1000' },
      { id: 'existing_meter', type: 'radio', label: 'Existing Electricity Meter', required: true, options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]},
      { id: 'financing', type: 'radio', label: 'Financing Required', options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No, full payment', value: 'no' },
      ]},
      { id: 'budget', type: 'select', label: 'Budget Range', options: [
        { label: 'Under ₹1 Lakh', value: 'under-1l' },
        { label: '₹1 - 3 Lakhs', value: '1l-3l' },
        { label: '₹3 - 10 Lakhs', value: '3l-10l' },
        { label: '₹10 - 25 Lakhs', value: '10l-25l' },
        { label: 'Above ₹25 Lakhs', value: 'above-25l' },
      ]},
      { id: 'location', type: 'textarea', label: 'Installation Location', placeholder: 'Full address', required: true },
    ],
  },
  {
    serviceId: 'electrical-works',
    serviceName: 'Electrical Works',
    questions: [
      { id: 'building_type', type: 'select', label: 'Building Type', required: true, options: [
        { label: 'Residential', value: 'residential' },
        { label: 'Commercial Office', value: 'commercial' },
        { label: 'Industrial / Factory', value: 'industrial' },
        { label: 'Retail / Showroom', value: 'retail' },
      ]},
      { id: 'work_type', type: 'select', label: 'Type of Work', required: true, options: [
        { label: 'New Installation', value: 'new' },
        { label: 'Repair / Fix', value: 'repair' },
        { label: 'Upgrade / Rewiring', value: 'upgrade' },
        { label: 'AMC / Maintenance', value: 'amc' },
      ]},
      { id: 'area_sqft', type: 'number', label: 'Approximate Area (sq ft)', placeholder: 'e.g. 3000' },
      { id: 'voltage', type: 'select', label: 'Voltage Requirement', options: [
        { label: 'Single Phase (220V)', value: 'single' },
        { label: 'Three Phase (440V)', value: 'three' },
        { label: 'Not Sure', value: 'unsure' },
      ]},
      { id: 'timeline', type: 'select', label: 'Expected Timeline', options: [
        { label: 'Urgent', value: 'urgent' },
        { label: 'Within 1 week', value: '1w' },
        { label: 'Within 1 month', value: '1m' },
        { label: 'Flexible', value: 'flexible' },
      ]},
      { id: 'description', type: 'textarea', label: 'Describe the Requirements', placeholder: 'What electrical work do you need?', required: true },
    ],
  },
  {
    serviceId: 'cctv-installation',
    serviceName: 'CCTV Installation',
    questions: [
      { id: 'premises_type', type: 'select', label: 'Premises Type', required: true, options: [
        { label: 'Residential / Home', value: 'residential' },
        { label: 'Office', value: 'office' },
        { label: 'Factory / Warehouse', value: 'factory' },
        { label: 'Retail / Showroom', value: 'retail' },
        { label: 'Society / Campus', value: 'campus' },
      ]},
      { id: 'indoor_cameras', type: 'number', label: 'Indoor Cameras Needed', placeholder: 'e.g. 4' },
      { id: 'outdoor_cameras', type: 'number', label: 'Outdoor Cameras Needed', placeholder: 'e.g. 2' },
      { id: 'storage', type: 'select', label: 'Storage Duration Required', options: [
        { label: '7 days', value: '7d' },
        { label: '15 days', value: '15d' },
        { label: '30 days', value: '30d' },
        { label: '90 days', value: '90d' },
      ]},
      { id: 'existing_wiring', type: 'radio', label: 'Existing CCTV Wiring', required: true, options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
        { label: 'Not Sure', value: 'unsure' },
      ]},
      { id: 'monitoring', type: 'radio', label: 'Remote Monitoring Required', options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]},
      { id: 'location', type: 'textarea', label: 'Installation Location', placeholder: 'Full address', required: true },
    ],
  },
  {
    serviceId: 'signage-solutions',
    serviceName: 'Signage Solutions',
    questions: [
      { id: 'placement', type: 'select', label: 'Signage Placement', required: true, options: [
        { label: 'Indoor', value: 'indoor' },
        { label: 'Outdoor', value: 'outdoor' },
        { label: 'Both', value: 'both' },
      ]},
      { id: 'sign_type', type: 'select', label: 'Type of Signage', required: true, options: [
        { label: 'Board / Fascia', value: 'board' },
        { label: 'LED / Neon', value: 'led' },
        { label: 'Wayfinding / Directional', value: 'wayfinding' },
        { label: 'Digital Display', value: 'digital' },
        { label: 'Vehicle Branding', value: 'vehicle' },
      ]},
      { id: 'dimensions', type: 'text', label: 'Approximate Dimensions', placeholder: 'e.g. 10ft x 3ft' },
      { id: 'lighting', type: 'radio', label: 'Lighting Required', options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]},
      { id: 'description', type: 'textarea', label: 'Design & Content Details', placeholder: 'Describe what the signage should say/show', required: true },
      { id: 'location', type: 'textarea', label: 'Installation Location', placeholder: 'Full address', required: true },
    ],
  },
  {
    serviceId: 'website-it-services',
    serviceName: 'Website & IT Services',
    questions: [
      { id: 'business_name', type: 'text', label: 'Business Name', placeholder: 'Your company name', required: true },
      { id: 'business_type', type: 'select', label: 'Business Type', required: true, options: [
        { label: 'Startup', value: 'startup' },
        { label: 'Small Business', value: 'small' },
        { label: 'Enterprise', value: 'enterprise' },
        { label: 'Freelancer / Individual', value: 'freelancer' },
      ]},
      { id: 'website_type', type: 'select', label: 'Website Type', required: true, options: [
        { label: 'Business / Corporate', value: 'corporate' },
        { label: 'E-Commerce', value: 'ecommerce' },
        { label: 'Blog / Content', value: 'blog' },
        { label: 'Portfolio', value: 'portfolio' },
        { label: 'Web Application', value: 'webapp' },
      ]},
      { id: 'ecommerce', type: 'radio', label: 'E-Commerce Functionality', options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]},
      { id: 'admin_panel', type: 'radio', label: 'Admin Panel Required', options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]},
      { id: 'existing_website', type: 'text', label: 'Existing Website URL', placeholder: 'https://... (if any)' },
      { id: 'preferred_launch', type: 'text', label: 'Preferred Launch Date', placeholder: 'e.g. Within 2 months' },
      { id: 'description', type: 'textarea', label: 'Project Requirements', placeholder: 'Describe your website/IT needs', required: true },
    ],
  },
  {
    serviceId: 'ecommerce-development',
    serviceName: 'E-Commerce Development',
    questions: [
      { id: 'num_products', type: 'select', label: 'Number of Products', required: true, options: [
        { label: 'Under 50', value: 'under-50' },
        { label: '50 - 200', value: '50-200' },
        { label: '200 - 1000', value: '200-1000' },
        { label: '1000+', value: '1000-plus' },
      ]},
      { id: 'payment_gateway', type: 'radio', label: 'Payment Gateway Required', required: true, options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]},
      { id: 'shipping', type: 'radio', label: 'Shipping Integration Required', options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]},
      { id: 'inventory', type: 'radio', label: 'Inventory Management Required', options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]},
      { id: 'brand_assets', type: 'radio', label: 'Existing Brand Assets (Logo, Colors)', options: [
        { label: 'Yes, have everything', value: 'yes' },
        { label: 'Partial', value: 'partial' },
        { label: 'No, need design', value: 'no' },
      ]},
      { id: 'platform', type: 'select', label: 'Preferred Platform', options: [
        { label: 'Shopify', value: 'shopify' },
        { label: 'WooCommerce', value: 'woocommerce' },
        { label: 'Custom Build', value: 'custom' },
        { label: 'No Preference', value: 'none' },
      ]},
      { id: 'description', type: 'textarea', label: 'Additional Requirements', placeholder: 'Any specific features or integrations...' },
    ],
  },
  {
    serviceId: 'security-consulting',
    serviceName: 'Security Consulting',
    questions: [
      { id: 'business_type', type: 'select', label: 'Business Type', required: true, options: [
        { label: 'Corporate Office', value: 'office' },
        { label: 'Retail / Mall', value: 'retail' },
        { label: 'Industrial / Factory', value: 'industrial' },
        { label: 'Residential Society', value: 'residential' },
        { label: 'Hospital / Healthcare', value: 'healthcare' },
      ]},
      { id: 'challenges', type: 'checkbox', label: 'Security Challenges', multi: true, options: [
        { label: 'Theft / Break-ins', value: 'theft' },
        { label: 'Unauthorized Access', value: 'access' },
        { label: 'Fire Safety', value: 'fire' },
        { label: 'CCTV Monitoring', value: 'cctv' },
        { label: 'Cybersecurity', value: 'cyber' },
        { label: 'Employee Safety', value: 'employee' },
      ]},
      { id: 'num_locations', type: 'number', label: 'Number of Locations', placeholder: 'e.g. 3' },
      { id: 'compliance', type: 'checkbox', label: 'Compliance Requirements', multi: true, options: [
        { label: 'ISO 27001', value: 'iso27001' },
        { label: 'SOC 2', value: 'soc2' },
        { label: 'GDPR', value: 'gdpr' },
        { label: 'Local Regulations', value: 'local' },
        { label: 'None', value: 'none' },
      ]},
      { id: 'description', type: 'textarea', label: 'Describe Your Security Concerns', placeholder: 'What security issues are you facing?', required: true },
    ],
  },
];

/**
 * Look up question config for a given service slug.
 * Returns undefined if no config exists (future services without questions).
 */
export function getQuestionsForService(serviceSlug: string): ServiceQuestionConfig | undefined {
  return SERVICE_QUESTION_CONFIGS.find((c) => c.serviceId === serviceSlug);
}
