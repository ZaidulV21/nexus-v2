import { useState, useCallback } from 'react';
import type { QuoteWizardData, WizardStep, ProjectDetails, ContactInfo, FileEntry } from '../types';

const INITIAL_DATA: QuoteWizardData = {
  selectedServices: [],
  projectDetails: {
    description: '',
    location: '',
    budget: '',
    timeline: '',
    propertyType: '',
    area: '',
    additionalRequirements: '',
  },
  files: [],
  contactInfo: {
    name: '',
    email: '',
    phone: '',
    company: '',
    pincode: '',
  },
};

const STEP_ORDER: WizardStep[] = ['services', 'details', 'upload', 'review', 'account', 'otp', 'success'];

export function useQuoteWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('services');
  const [data, setData] = useState<QuoteWizardData>(INITIAL_DATA);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEP_ORDER.length - 1;
  const progress = ((currentStepIndex + 1) / STEP_ORDER.length) * 100;

  const toggleService = useCallback((serviceId: string) => {
    setData((prev) => {
      const exists = prev.selectedServices.includes(serviceId);
      return {
        ...prev,
        selectedServices: exists
          ? prev.selectedServices.filter((id) => id !== serviceId)
          : [...prev.selectedServices, serviceId],
      };
    });
  }, []);

  const updateProjectDetails = useCallback((details: Partial<ProjectDetails>) => {
    setData((prev) => ({
      ...prev,
      projectDetails: { ...prev.projectDetails, ...details },
    }));
  }, []);

  const addFiles = useCallback((newFiles: FileEntry[]) => {
    setData((prev) => ({
      ...prev,
      files: [...prev.files, ...newFiles],
    }));
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setData((prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.id !== fileId),
    }));
  }, []);

  const updateContactInfo = useCallback((info: Partial<ContactInfo>) => {
    setData((prev) => ({
      ...prev,
      contactInfo: { ...prev.contactInfo, ...info },
    }));
  }, []);

  const goTo = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const next = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setCurrentStep(STEP_ORDER[nextIndex]);
    }
  }, [currentStepIndex]);

  const prev = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEP_ORDER[prevIndex]);
    }
  }, [currentStepIndex]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'services':
        return data.selectedServices.length > 0;
      case 'details':
        return !!(data.projectDetails.description && data.projectDetails.location && data.projectDetails.budget);
      case 'upload':
        return true;
      case 'review':
        return true;
      case 'account':
        return !!(data.contactInfo.name && data.contactInfo.email && data.contactInfo.phone);
      default:
        return true;
    }
  };

  const reset = useCallback(() => {
    setCurrentStep('services');
    setData(INITIAL_DATA);
  }, []);

  return {
    currentStep,
    data,
    isFirstStep,
    isLastStep,
    progress,
    toggleService,
    updateProjectDetails,
    addFiles,
    removeFile,
    updateContactInfo,
    goTo,
    next,
    prev,
    canProceed,
    reset,
    stepOrder: STEP_ORDER,
  };
}
