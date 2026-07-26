import { useCallback, useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle, Send, User, Briefcase, FileText, AlertCircle } from 'lucide-react';
import { useWizardState } from '../wizard/useWizardState';
import { WizardProgress } from '../wizard/WizardProgress';
import { WizardNavigation } from '../wizard/WizardNavigation';
import {
  StepServices,
  StepQuestions,
  StepReview,
  StepContact,
  StepAccount,
  StepLogin,
  StepOtp,
  StepSubmit,
} from '../wizard/steps';
import { useCreateLead } from '@/queries/useLeads';
import { usePublicServices } from '@/queries/usePublicServices';
import { getQuestionsForService } from '../wizard/serviceQuestions';
import { publicAuthService } from '@/services/publicAuthService';
import { useAuth } from '@/app/AuthContext';
import type { CreateLeadInput } from '@/services/leadService';

// Step order: 0=Services, 1=Questions, 2=Contact, 3=Review, 4=Account/Login, 5=OTP, 6=Submit
const BASE_STEP_LABELS = ['Services', 'Details', 'Contact', 'Review', 'Account', 'Verify', 'Submit'];

function buildLeadInput(wizard: ReturnType<typeof useWizardState>, isLoggedIn: boolean, clientId?: string): CreateLeadInput {
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
    password: isLoggedIn ? undefined : (account.password || undefined),
    clientId: isLoggedIn ? clientId : undefined,
  };
}

function validateRequiredQuestions(
  selectedServices: string[],
  answers: Record<string, Record<string, string | string[]>>,
  services: Array<{ id: string; slug: string }>
): boolean {
  for (const serviceId of selectedServices) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) continue;
    const config = getQuestionsForService(service.slug);
    if (!config) continue;
    const serviceAnswers = answers[serviceId] || {};
    for (const q of config.questions) {
      if (q.required) {
        const val = serviceAnswers[q.id];
        if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
          return false;
        }
      }
    }
  }
  return true;
}

export function GetQuotePage() {
  const wizard = useWizardState();
  const { state } = wizard;
  const { login: authLogin, actor } = useAuth();
  const { data: services = [] } = usePublicServices();
  const [searchParams] = useSearchParams();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showContactErrors, setShowContactErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createLeadMutation = useCreateLead();

  // Check if we returned from forgot-password reset
  const returnedFromReset = searchParams.get('returned') === 'true';

  useEffect(() => {
    if (returnedFromReset && state.currentStep === 4 && state.emailExists === true) {
      // User returned from password reset — show login step with preserved data
      // The wizard state is already restored from localStorage
    }
  }, [returnedFromReset, state.currentStep, state.emailExists]);

  // Dynamic step labels based on email check result
  const stepLabels = useMemo(() => {
    const labels = [...BASE_STEP_LABELS];
    if (state.emailExists === true && loginSuccess) {
      labels[5] = 'Review & Submit';
    } else if (state.emailExists === true) {
      labels[5] = 'Login';
    }
    return labels;
  }, [state.emailExists, loginSuccess]);

  // Completed steps
  const completedSteps = useMemo(() => {
    const steps = new Set<number>();
    if (state.selectedServices.length > 0) steps.add(0);
    if (Object.keys(state.answers).length > 0) steps.add(1);
    if (state.contact.name.trim() && state.contact.email.trim() && state.contact.phone.trim()) steps.add(2);
    if (state.emailExists === false) {
      if (state.account.password && state.account.password.length >= 8 && state.account.password === state.account.confirmPassword) steps.add(4);
      if (state.otpVerified) steps.add(5);
    }
    if (state.emailExists === true && loginSuccess) {
      steps.add(4); // Login complete
    }
    return steps;
  }, [state, loginSuccess]);

  // Can proceed current step
  const canProceedCurrentStep = useMemo(() => {
    switch (state.currentStep) {
      case 0: return state.selectedServices.length > 0;
      case 1: return validateRequiredQuestions(state.selectedServices, state.answers, services);
      case 2: return state.contact.name.trim() !== '' && state.contact.email.trim() !== '' && state.contact.phone.trim() !== '';
      case 3: return true;
      case 4: {
        if (loginSuccess) return true; // Post-login review — Submit button in review handles it
        if (state.emailExists === true) return true; // Login step — handled internally
        return !!(
          state.account.password &&
          state.account.password.length >= 8 &&
          state.account.confirmPassword &&
          state.account.password === state.account.confirmPassword
        );
      }
      case 5: return state.otpVerified;
      default: return true;
    }
  }, [state, services, loginSuccess]);

  // Reset showContactErrors when leaving contact step
  useEffect(() => {
    if (state.currentStep !== 2) {
      setShowContactErrors(false);
    }
  }, [state.currentStep]);

  const handleNext = useCallback(async () => {
    if (!canProceedCurrentStep) {
      // Show inline validation on Contact step
      if (state.currentStep === 2) {
        setShowContactErrors(true);
      }
      return;
    }

    // After Contact step (2): check email
    if (state.currentStep === 2) {
      if (state.emailExists !== null) {
        wizard.next();
        return;
      }

      setIsCheckingEmail(true);
      try {
        const result = await publicAuthService.checkEmail(state.contact.email);
        wizard.setEmailExists(result.exists);
        wizard.next();
      } catch {
        wizard.setEmailExists(false);
        wizard.next();
      } finally {
        setIsCheckingEmail(false);
      }
      return;
    }

    // After Login step (4) for existing users: go to post-login review summary
    if (state.currentStep === 4 && state.emailExists === true && !loginSuccess) {
      // Login is handled by StepLogin — Next shouldn't advance
      // This path shouldn't be reached because WizardNavigation is hidden during login
      return;
    }

    // After post-login review (4 with loginSuccess): go to Submit
    if (state.currentStep === 4 && loginSuccess) {
      wizard.goTo(6);
      return;
    }

    wizard.next();
  }, [canProceedCurrentStep, wizard, state.currentStep, state.emailExists, state.contact.email, loginSuccess]);

  const handleLoginSuccess = useCallback(async () => {
    setLoginError(null);
    setLoginSuccess(true);
    // Don't advance — stay on step 5, show post-login review summary
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const input = buildLeadInput(wizard, state.emailExists === true, actor?.type === 'CLIENT' ? actor.id : undefined);
      await createLeadMutation.mutateAsync(input);
      setIsSuccess(true);
      wizard.reset();
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, wizard, createLeadMutation, state.emailExists]);

  // ── Success screen ──────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-canvas pt-24 pb-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-surface shadow-xs">
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

  // ── Post-login review summary (existing user, step 4 after login) ──
  const isPostLoginReview = state.currentStep === 4 && state.emailExists === true && loginSuccess;

  const selectedServiceData = services.filter((s) => state.selectedServices.includes(s.id));

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
          steps={stepLabels}
          currentStep={state.currentStep}
          completedSteps={completedSteps}
        />

        <div className="rounded-2xl border border-border bg-surface shadow-xs mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={isPostLoginReview ? 'post-login-review' : state.currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Post-login review summary */}
              {isPostLoginReview ? (
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-ink">Authentication Successful</h2>
                      <p className="text-sm text-ink-muted">You're signed in as <span className="font-medium text-ink">{state.contact.email}</span></p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Account info */}
                    <div className="rounded-2xl border border-border bg-canvas p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="h-4 w-4 text-ink-faint" />
                        <h3 className="text-sm font-semibold text-ink">Account</h3>
                      </div>
                      <p className="text-sm text-ink-muted">{state.contact.email}</p>
                    </div>

                    {/* Selected services */}
                    <div className="rounded-2xl border border-border bg-canvas p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="h-4 w-4 text-ink-faint" />
                        <h3 className="text-sm font-semibold text-ink">Selected Services</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedServiceData.map((s) => (
                          <span key={s.id} className="rounded-full bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">
                            {s.name}
                          </span>
                        ))}
                        {selectedServiceData.length === 0 && (
                          <p className="text-sm text-ink-faint">No services selected</p>
                        )}
                      </div>
                    </div>

                    {/* Enquiry summary */}
                    <div className="rounded-2xl border border-border bg-canvas p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-ink-faint" />
                        <h3 className="text-sm font-semibold text-ink">Enquiry Summary</h3>
                      </div>
                      <dl className="space-y-2 text-sm">
                        {selectedServiceData.map((service) => {
                          const config = getQuestionsForService(service.slug);
                          const serviceAnswers = state.answers[service.id] || {};
                          const hasAnswers = Object.keys(serviceAnswers).length > 0;
                          if (!hasAnswers || !config) return null;
                          return (
                            <div key={service.id}>
                              <dt className="font-medium text-ink">{service.name}</dt>
                              <dd className="mt-1 text-ink-muted">
                                {config.questions.map((q) => {
                                  const val = serviceAnswers[q.id];
                                  if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) return null;
                                  const displayVal = Array.isArray(val)
                                    ? val.map((v) => q.options?.find((o) => o.value === v)?.label || v).join(', ')
                                    : q.options?.find((o) => o.value === val)?.label || val;
                                  return (
                                    <span key={q.id} className="inline-block mr-3 mb-1">
                                      <span className="text-ink-faint">{q.label}:</span>{' '}
                                      <span className="font-medium text-ink">{displayVal}</span>
                                    </span>
                                  );
                                })}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  </div>

                  {/* Submit error */}
                  {submitError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
                    >
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <p className="text-sm text-red-600">{submitError}</p>
                    </motion.div>
                  )}

                  {/* Submit button */}
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Request
                          <Send className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Normal wizard steps */}
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
                    <StepContact
                      contact={state.contact}
                      onUpdate={wizard.updateContact}
                      showErrors={showContactErrors}
                    />
                  )}
                  {state.currentStep === 3 && (
                    <StepReview state={state} goTo={wizard.goTo} />
                  )}
                  {state.currentStep === 4 && state.emailExists === false && (
                    <StepAccount
                      contact={state.contact}
                      account={state.account}
                      onUpdate={wizard.updateAccount}
                    />
                  )}
                  {state.currentStep === 4 && state.emailExists === true && !loginSuccess && (
                    <StepLogin
                      email={state.contact.email}
                      authLogin={authLogin}
                      onLoginSuccess={handleLoginSuccess}
                      loginError={loginError}
                      onClearError={() => setLoginError(null)}
                    />
                  )}
                  {state.currentStep === 4 && state.emailExists === null && (
                    <div className="p-6 sm:p-8 text-center">
                      <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      <p className="mt-3 text-sm text-ink-muted">Checking your email...</p>
                    </div>
                  )}
                  {state.currentStep === 5 && (
                    <StepOtp
                      email={state.contact.email}
                      isVerified={state.otpVerified}
                      onVerify={() => wizard.setOtpVerified(true)}
                    />
                  )}
                  {state.currentStep === 6 && (
                    <StepSubmit isSubmitting={isSubmitting} />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Wizard navigation — hidden during post-login review and submit step */}
          {!isPostLoginReview && state.currentStep < 6 && (
            <WizardNavigation
              isFirstStep={state.currentStep === 0}
              isLastStep={state.currentStep === 5}
              canProceed={canProceedCurrentStep && !isCheckingEmail}
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
