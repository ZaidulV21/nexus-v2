import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useWizardState } from '../wizard/useWizardState';
import { WizardProgress } from '../wizard/WizardProgress';
import { WizardNavigation } from '../wizard/WizardNavigation';
import {
  StepServices,
  StepQuestions,
  StepUploads,
  StepReview,
  StepContact,
  StepAccount,
  StepOtp,
  StepSubmit,
} from '../wizard/steps';
import { useCreateLead } from '@/queries/useLeads';
import type { CreateLeadInput } from '@/services/leadService';

const STEP_LABELS = ['Services', 'Details', 'Files', 'Review', 'Contact', 'Account', 'Verify', 'Submit'];

function buildLeadInput(wizard: ReturnType<typeof useWizardState>): CreateLeadInput {
  const { selectedServices, answers, contact, account } = wizard.state;

  return {
    contactName: contact.name,
    phone: contact.phone,
    email: contact.email,
    companyName: contact.company || undefined,
    source: 'WEBSITE',
    services: selectedServices.map((serviceId: string) => ({
      serviceId,
      questionnaireAnswers: answers[serviceId] || {},
    })),
    password: account.password || undefined,
  };
}

export function GetQuotePage() {
  const wizard = useWizardState();
  const { state } = wizard;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const createLeadMutation = useCreateLead();

  const completedSteps = useMemo(() => {
    const steps = new Set<number>();
    if (state.selectedServices.length > 0) steps.add(0);
    if (Object.keys(state.answers).length > 0) steps.add(1);
    if (state.files.length > 0) steps.add(2);
    if (state.contact.name && state.contact.email && state.contact.phone) steps.add(4);
    if (state.account.password && state.account.password.length >= 8 && state.account.password === state.account.confirmPassword) steps.add(5);
    if (state.otpVerified) steps.add(6);
    return steps;
  }, [state]);

  const canProceedCurrentStep = useMemo(() => {
    switch (state.currentStep) {
      case 0: return state.selectedServices.length > 0;
      case 1: return true;
      case 2: return true;
      case 3: return true;
      case 4: return state.contact.name.trim() !== '' && state.contact.email.trim() !== '' && state.contact.phone.trim() !== '';
      case 5: return !!(
        state.account.password &&
        state.account.password.length >= 8 &&
        state.account.confirmPassword &&
        state.account.password === state.account.confirmPassword
      );
      case 6: return state.otpVerified;
      default: return true;
    }
  }, [state]);

  const handleNext = useCallback(() => {
    if (canProceedCurrentStep) wizard.next();
  }, [canProceedCurrentStep, wizard]);

  const handleSubmit = useCallback(async () => {
    if (!canProceedCurrentStep || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const input = buildLeadInput(wizard);
      await createLeadMutation.mutateAsync(input);
      setIsSuccess(true);
      wizard.reset();
    } catch (err) {
      console.error('Lead submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [canProceedCurrentStep, isSubmitting, wizard, createLeadMutation]);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-canvas pt-24 pb-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-white shadow-xs">
            <div className="p-8 sm:p-12 text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
              >
                <CheckCircle className="h-10 w-10 text-green-600" />
              </motion.div>
              <h2 className="mt-6 text-2xl font-bold text-ink">Quote Request Submitted!</h2>
              <p className="mt-3 mx-auto max-w-md text-sm text-ink-muted leading-relaxed">
                Thank you! We've received your requirements and will review them shortly.
                You'll receive a confirmation email and your quote details within 24-48 hours.
              </p>
              <div className="mt-6 rounded-xl bg-canvas p-4 mx-auto max-w-sm">
                <p className="text-xs text-ink-faint">Reference Number</p>
                <p className="mt-1 text-lg font-bold text-accent font-mono">QR-{Date.now().toString(36).toUpperCase()}</p>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover">
                  Back to Home
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/login" className="text-sm font-medium text-accent hover:text-accent-hover">
                  Login to Client Portal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">Get a Free Quote</h1>
          <p className="mt-3 text-ink-muted">
            Tell us about your project and we'll provide a detailed quotation within 24 hours.
          </p>
        </motion.div>

        <WizardProgress
          steps={STEP_LABELS}
          currentStep={state.currentStep}
          completedSteps={completedSteps}
        />

        <div className="rounded-2xl border border-border bg-white shadow-xs mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {state.currentStep === 0 && (
                <StepServices
                  selectedServices={state.selectedServices}
                  onToggle={wizard.toggleService}
                />
              )}
              {state.currentStep === 1 && (
                <StepQuestions
                  selectedServices={state.selectedServices}
                  answers={state.answers}
                  onAnswer={wizard.setAnswer}
                />
              )}
              {state.currentStep === 2 && (
                <StepUploads
                  selectedServices={state.selectedServices}
                  files={state.files}
                  onAddFiles={wizard.addFiles}
                  onRemoveFile={wizard.removeFile}
                />
              )}
              {state.currentStep === 3 && (
                <StepReview state={state} goTo={wizard.goTo} />
              )}
              {state.currentStep === 4 && (
                <StepContact contact={state.contact} onUpdate={wizard.updateContact} />
              )}
              {state.currentStep === 5 && (
                <StepAccount
                  contact={state.contact}
                  account={state.account}
                  onUpdate={wizard.updateAccount}
                />
              )}
              {state.currentStep === 6 && (
                <StepOtp
                  email={state.contact.email}
                  isVerified={state.otpVerified}
                  onVerify={() => wizard.setOtpVerified(true)}
                />
              )}
              {state.currentStep === 7 && (
                <StepSubmit isSubmitting={isSubmitting} />
              )}
            </motion.div>
          </AnimatePresence>

          {state.currentStep < 7 && (
            <WizardNavigation
              isFirstStep={state.currentStep === 0}
              isLastStep={state.currentStep === 6}
              canProceed={canProceedCurrentStep}
              onBack={wizard.prev}
              onNext={handleNext}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
