import { useState, useCallback } from 'react';
import type { WizardState, WizardFileEntry, WizardContactInfo } from './types';
import type { AccountCheckResult } from '@/services/publicAuthService';
import { INITIAL_WIZARD_STATE } from './types';

const STEP_LABELS = ['Services', 'Questions', 'Contact', 'Review', 'Account', 'Verify', 'Submit'];

export function useWizardState() {
  const [state, setState] = useState<WizardState>(INITIAL_WIZARD_STATE);

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
      // Clean up answers, files and pinned sub-services for deselected services
      const answers = { ...s.answers };
      const files = s.files;
      const selectedSubServices = { ...s.selectedSubServices };
      if (exists) {
        delete answers[serviceId];
        delete selectedSubServices[serviceId];
      }
      return { ...s, selectedServices, answers, files, selectedSubServices };
    });
  }, []);

  const toggleSubService = useCallback((serviceId: string, subServiceId: string) => {
    setState((s) => {
      const current = s.selectedSubServices[serviceId] ?? [];
      const next = current.includes(subServiceId)
        ? current.filter((id) => id !== subServiceId)
        : [...current, subServiceId];
      return {
        ...s,
        selectedSubServices: { ...s.selectedSubServices, [serviceId]: next },
      };
    });
  }, []);

  /**
   * Opens the wizard with a service (and optionally one or more sub-services)
   * already pinned, skipping the Services step. Used by the service detail
   * page deep links so the client never re-selects the service they already
   * chose - the service stays locked, but its sub-options remain selectable
   * (Phase 7: one service, multiple sub-services).
   */
  const preselect = useCallback((serviceId: string, subServiceIds?: string[]) => {
    setState((s) => ({
      ...s,
      currentStep: 1,
      preselected: true,
      selectedServices: [serviceId],
      selectedSubServices: {
        ...s.selectedSubServices,
        [serviceId]: subServiceIds ?? [],
      },
    }));
  }, []);

  /**
   * Unlocks the Services step after a deep-link preselection so the visitor
   * can keep their pinned service/sub-services AND add further services on the
   * same request (e.g. Interior Design -> Painting + Flooring, plus Electrical
   * Work -> Wiring). Existing selections are preserved.
   */
  const clearPreselect = useCallback(() => {
    setState((s) => ({ ...s, preselected: false, currentStep: 0 }));
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
    setState((s) => {
      const newContact = { ...s.contact, ...partial };
      // If email OR phone changed, reset the account check so it re-validates
      // against the new identifiers.
      const identityChanged =
        (partial.email !== undefined && partial.email !== s.contact.email) ||
        (partial.phone !== undefined && partial.phone !== s.contact.phone);
      if (identityChanged) {
        return { ...s, contact: newContact, accountCheck: null, otpVerified: false };
      }
      return { ...s, contact: newContact };
    });
  }, []);

  const updateAccount = useCallback((partial: Partial<WizardState['account']>) => {
    setState((s) => ({ ...s, account: { ...s.account, ...partial } }));
  }, []);

  const setOtpVerified = useCallback((verified: boolean) => {
    setState((s) => ({ ...s, otpVerified: verified }));
  }, []);

  const setAccountCheck = useCallback((accountCheck: AccountCheckResult) => {
    setState((s) => ({ ...s, accountCheck }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_WIZARD_STATE);
  }, []);

  // Validation — step indices follow STEP_LABELS order:
  // 0=Services, 1=Questions, 2=Contact, 3=Review, 4=Account/Login, 5=OTP, 6=Submit
  const canProceed = useCallback((): boolean => {
    switch (state.currentStep) {
      case 0: return state.selectedServices.length > 0;
      case 1: return true; // Questions validated in GetQuotePage (needs service data)
      case 2: return !!(state.contact.name && state.contact.email && state.contact.phone);
      case 3: return true; // Review
      case 4: {
        // Account or Login step - different validation based on account check
        if (state.accountCheck?.exists === true) {
          // Existing user: login step - handled by StepLogin internally
          return true;
        }
        // New user: account creation
        return !!(
          state.account.password &&
          state.account.password.length >= 8 &&
          state.account.confirmPassword &&
          state.account.password === state.account.confirmPassword
        );
      }
      case 5: return state.otpVerified;
      case 6: return true;
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
    toggleSubService,
    preselect,
    clearPreselect,
    setAnswer,
    addFiles,
    removeFile,
    updateContact,
    updateAccount,
    setOtpVerified,
    setAccountCheck,
    reset,
    canProceed,
  };
}
