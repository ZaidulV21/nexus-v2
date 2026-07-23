import { useState, useCallback, useEffect } from 'react';
import type { WizardState, WizardFileEntry, WizardContactInfo } from './types';
import { INITIAL_WIZARD_STATE } from './types';

const STORAGE_KEY = 'nexus-quote-wizard';
const STEP_LABELS = ['Services', 'Questions', 'Uploads', 'Review', 'Contact', 'Account', 'Verify', 'Submit'];

function loadState(): WizardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WizardState>;
      // Restore contact and account, but reset transient state
      return {
        ...INITIAL_WIZARD_STATE,
        currentStep: parsed.currentStep ?? 0,
        selectedServices: parsed.selectedServices ?? [],
        answers: parsed.answers ?? {},
        contact: { ...INITIAL_WIZARD_STATE.contact, ...parsed.contact },
        account: INITIAL_WIZARD_STATE.account,
        otpVerified: false,
      };
    }
  } catch { /* ignore */ }
  return INITIAL_WIZARD_STATE;
}

function saveState(state: WizardState) {
  try {
    // Don't persist files (they contain blob URLs)
    const { files, ...rest } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch { /* ignore */ }
}

export function useWizardState() {
  const [state, setState] = useState<WizardState>(loadState);

  // Persist on every change
  useEffect(() => {
    saveState(state);
  }, [state]);

  const goTo = useCallback((step: number) => {
    setState((s) => ({ ...s, currentStep: Math.max(0, Math.min(step, STEP_LABELS.length - 1)) }));
  }, []);

  const next = useCallback(() => {
    setState((s) => ({ ...s, currentStep: Math.min(s.currentStep + 1, STEP_LABELS.length - 1) }));
  }, []);

  const prev = useCallback(() => {
    setState((s) => ({ ...s, currentStep: Math.max(s.currentStep - 1, 0) }));
  }, []);

  const toggleService = useCallback((serviceId: string) => {
    setState((s) => {
      const exists = s.selectedServices.includes(serviceId);
      const selectedServices = exists
        ? s.selectedServices.filter((id) => id !== serviceId)
        : [...s.selectedServices, serviceId];
      // Clean up answers and files for deselected services
      const answers = { ...s.answers };
      const files = s.files;
      if (exists) {
        delete answers[serviceId];
      }
      return { ...s, selectedServices, answers, files };
    });
  }, []);

  const setAnswer = useCallback((serviceId: string, questionId: string, value: string | string[]) => {
    setState((s) => ({
      ...s,
      answers: {
        ...s.answers,
        [serviceId]: {
          ...(s.answers[serviceId] || {}),
          [questionId]: value,
        },
      },
    }));
  }, []);

  const addFiles = useCallback((newFiles: WizardFileEntry[]) => {
    setState((s) => ({ ...s, files: [...s.files, ...newFiles] }));
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setState((s) => ({ ...s, files: s.files.filter((f) => f.id !== fileId) }));
  }, []);

  const updateContact = useCallback((partial: Partial<WizardContactInfo>) => {
    setState((s) => ({ ...s, contact: { ...s.contact, ...partial } }));
  }, []);

  const updateAccount = useCallback((partial: Partial<WizardState['account']>) => {
    setState((s) => ({ ...s, account: { ...s.account, ...partial } }));
  }, []);

  const setOtpVerified = useCallback((verified: boolean) => {
    setState((s) => ({ ...s, otpVerified: verified }));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_WIZARD_STATE);
  }, []);

  // Validation
  const canProceed = useCallback((): boolean => {
    switch (state.currentStep) {
      case 0: return state.selectedServices.length > 0;
      case 1: return true; // Questions are optional per the config
      case 2: return true; // Uploads are optional
      case 3: return true; // Review
      case 4: return !!(state.contact.name && state.contact.email && state.contact.phone);
      case 5: return !!(
        state.account.password &&
        state.account.password.length >= 8 &&
        state.account.confirmPassword &&
        state.account.password === state.account.confirmPassword
      );
      case 6: return state.otpVerified;
      case 7: return true;
      default: return true;
    }
  }, [state]);

  return {
    state,
    stepLabels: STEP_LABELS,
    goTo,
    next,
    prev,
    toggleService,
    setAnswer,
    addFiles,
    removeFile,
    updateContact,
    updateAccount,
    setOtpVerified,
    reset,
    canProceed,
  };
}
