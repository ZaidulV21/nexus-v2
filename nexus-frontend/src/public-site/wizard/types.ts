// ── Question Engine Types ──────────────────────────────────────────────

import type { AccountCheckResult } from '@/services/publicAuthService';

export type QuestionType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number';

export interface QuestionOption {
  label: string;
  value: string;
}

export interface QuestionConfig {
  id: string;
  type: QuestionType;
  label: string;
  placeholder?: string;
  options?: QuestionOption[];
  required?: boolean;
  helpText?: string;
  /** If true, stored as an array (for multi-select checkboxes). */
  multi?: boolean;
}

export interface ServiceQuestionConfig {
  /** Matches the backend Service.id */
  serviceId: string;
  /** Human-readable service name for section headers */
  serviceName: string;
  questions: QuestionConfig[];
}

// ── Wizard State Types ─────────────────────────────────────────────────

export interface WizardFileEntry {
  id: string;
  serviceId: string;
  file: File;
  preview?: string;
  type: 'image' | 'video' | 'document';
}

export interface WizardContactInfo {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  country: string;
  preferredContact: string;
  preferredTime: string;
}

export interface WizardAccountInfo {
  password: string;
  confirmPassword: string;
}

export interface WizardState {
  /** Current step index (0-based) */
  currentStep: number;
  /** Selected service IDs */
  selectedServices: string[];
  /**
   * Sub-services pinned per selected service: { serviceId: string[] }. A
   * service can carry multiple sub-services (Interior -> Painting, Flooring,
   * Lighting), so each entry is an array of sub-service ids.
   */
  selectedSubServices: Record<string, string[]>;
  /**
   * True when the wizard was opened from a service/sub-service deep link
   * (?service=...&subService=...). The Services step is then replaced with a
   * summary where the service is locked but its sub-options remain selectable.
   */
  preselected: boolean;
  /** Dynamic question answers: { serviceId: { questionId: value } } */
  answers: Record<string, Record<string, string | string[]>>;
  /** Uploaded files grouped by serviceId */
  files: WizardFileEntry[];
  /** Contact information */
  contact: WizardContactInfo;
  /** Account creation */
  account: WizardAccountInfo;
  /** Whether OTP has been verified */
  otpVerified: boolean;
  /**
   * null = not checked yet. When set, describes whether the submitted
   * contact identifies an EXISTING client account (by verified email and/or
   * phone) and how it matched - new visitors get the account-creation flow,
   * existing clients get the Welcome Back login/OTP flow.
   */
  accountCheck: AccountCheckResult | null;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  currentStep: 0,
  selectedServices: [],
  selectedSubServices: {},
  preselected: false,
  answers: {},
  files: [],
  contact: {
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    preferredContact: 'phone',
    preferredTime: 'morning',
  },
  account: {
    password: '',
    confirmPassword: '',
  },
  otpVerified: false,
  accountCheck: null,
};
