import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle, Send, User, Briefcase, FileText, AlertCircle, BadgeCheck } from 'lucide-react';
import { useWizardState } from '../wizard/useWizardState';
import { WizardProgress } from '../wizard/WizardProgress';
import { WizardNavigation } from '../wizard/WizardNavigation';
import {
  StepServices,
  StepServicesPreselected,
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
import { usePublicSubServices } from '@/queries/usePublicSubServices';
import { getQuestionsForService } from '../wizard/serviceQuestions';
import { publicAuthService, type AccountCheckResult } from '@/services/publicAuthService';
import { useAuth } from '@/app/AuthContext';
import type { CreateLeadInput } from '@/services/leadService';
import { SeoHead, siteUrl } from '../seo';

// Step order: 0=Services, 1=Questions, 2=Contact, 3=Review, 4=Account/Login, 5=OTP, 6=Submit
const BASE_STEP_LABELS = ['Services', 'Details', 'Contact', 'Review', 'Account', 'Verify', 'Submit'];

function buildLeadInput(wizard: ReturnType<typeof useWizardState>, isLoggedIn: boolean, clientId?: string): CreateLeadInput {
  const { selectedServices, answers, contact, account, selectedSubServices } = wizard.state;

  return {
    contactName: contact.name,
    phone: contact.phone,
    email: contact.email,
    companyName: contact.company || undefined,
    source: 'WEBSITE',
    services: selectedServices.map((serviceId: string) => {
      const subServiceIds = selectedSubServices[serviceId] ?? [];
      return {
        serviceId,
        ...(subServiceIds.length > 0 ? { subServiceIds } : {}),
        questionnaireAnswers: answers[serviceId] || {},
      };
    }),
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
  const { login: authLogin, setSession: authSetSession, actor } = useAuth();
  const { data: services = [] } = usePublicServices();
  const [searchParams] = useSearchParams();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showContactErrors, setShowContactErrors] = useState(false);
  const [showServicesError, setShowServicesError] = useState(false);
  const [showQuestionsError, setShowQuestionsError] = useState(false);
  const [showAccountErrors, setShowAccountErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createLeadMutation = useCreateLead();

  // True when the submitted contact matched an EXISTING client account (by
  // verified email and/or phone). Those visitors go through the Welcome Back
  // login/OTP flow instead of registering again.
  const isExistingUser = state.accountCheck?.exists === true;

  // Deep-linked preselection: /get-quote?service=<id|slug>[&subService=<id>...]
  // opens the wizard with the service (and zero or more specific sub-services)
  // already pinned. The client picked their option on the service page - the
  // service is locked, but its sub-options remain selectable so one service
  // can carry multiple sub-services (Interior -> Painting, Flooring, Lighting).
  const serviceParam = searchParams.get('service');
  const subServiceParams = searchParams.getAll('subService');

  const preselectedService = useMemo(
    () => services.find((s) => s.id === serviceParam || s.slug === serviceParam),
    [services, serviceParam]
  );

  const {
    data: preselectedSubs = [],
    isLoading: preselectedSubsLoading,
  } = usePublicSubServices(preselectedService?.slug);

  const subServiceNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const sub of preselectedSubs) map[sub.id] = sub.name;
    return map;
  }, [preselectedSubs]);

  const appliedPreselection = useRef(false);
  useEffect(() => {
    if (appliedPreselection.current || !preselectedService) return;
    // If sub-services were requested, wait until the service's sub list has
    // loaded so we can validate the ids before pinning them (unknown ids are
    // dropped; a fully unknown set falls back to service-only).
    if (subServiceParams.length > 0 && preselectedSubsLoading) return;
    appliedPreselection.current = true;
    const validSubIds = subServiceParams.filter((id) => preselectedSubs.some((sub) => sub.id === id));
    wizard.preselect(preselectedService.id, validSubIds);
  }, [preselectedService, subServiceParams, preselectedSubs, preselectedSubsLoading, wizard]);

  // Check if we returned from forgot-password reset
  const returnedFromReset = searchParams.get('returned') === 'true';

  useEffect(() => {
    if (returnedFromReset && state.currentStep === 4 && state.accountCheck?.exists === true) {
      // User returned from password reset — show login step with preserved data
    }
  }, [returnedFromReset, state.currentStep, state.accountCheck]);

  // Dynamic step labels based on account check result
  const stepLabels = useMemo(() => {
    const labels = [...BASE_STEP_LABELS];
    if (isExistingUser && loginSuccess) {
      labels[5] = 'Review & Submit';
    } else if (isExistingUser) {
      labels[5] = 'Login';
    }
    return labels;
  }, [isExistingUser, loginSuccess]);

  // Completed steps
  const completedSteps = useMemo(() => {
    const steps = new Set<number>();
    if (state.selectedServices.length > 0) steps.add(0);
    if (Object.keys(state.answers).length > 0) steps.add(1);
    if (state.contact.name.trim() && state.contact.email.trim() && state.contact.phone.trim()) steps.add(2);
    if (state.accountCheck?.exists === false) {
      if (state.account.password && state.account.password.length >= 8 && state.account.password === state.account.confirmPassword) steps.add(4);
      if (state.otpVerified) steps.add(5);
    }
    if (isExistingUser && loginSuccess) {
      steps.add(4); // Login complete
    }
    return steps;
  }, [state, loginSuccess, isExistingUser]);

  // Can proceed current step
  const canProceedCurrentStep = useMemo(() => {
    switch (state.currentStep) {
      case 0: return state.selectedServices.length > 0;
      case 1: return validateRequiredQuestions(state.selectedServices, state.answers, services);
      case 2: return state.contact.name.trim() !== '' && state.contact.email.trim() !== '' && state.contact.phone.trim() !== '';
      case 3: return true;
      case 4: {
        if (loginSuccess) return true; // Post-login review — Submit button in review handles it
        if (isExistingUser) return true; // Login step — handled internally
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
  }, [state, services, loginSuccess, isExistingUser]);

  // Reset validation flags when leaving a step
  useEffect(() => {
    if (state.currentStep !== 0) setShowServicesError(false);
    if (state.currentStep !== 1) setShowQuestionsError(false);
    if (state.currentStep !== 2) setShowContactErrors(false);
    if (state.currentStep !== 4) setShowAccountErrors(false);
  }, [state.currentStep]);

  const handleNext = useCallback(async () => {
    if (!canProceedCurrentStep) {
      switch (state.currentStep) {
        case 0:
          setShowServicesError(true);
          break;
        case 1:
          setShowQuestionsError(true);
          break;
        case 2:
          setShowContactErrors(true);
          break;
        case 4:
          setShowAccountErrors(true);
          break;
      }
      return;
    }

    // After Contact step (2): check the submitted identifiers for an existing account
    if (state.currentStep === 2) {
      if (state.accountCheck !== null) {
        wizard.next();
        return;
      }

      setIsCheckingEmail(true);
      try {
        const result = await publicAuthService.checkAccount({
          email: state.contact.email,
          phone: state.contact.phone,
        });
        wizard.setAccountCheck(result);
        wizard.next();
      } catch {
        // Fall back to the new-user flow; the backend duplicate guard still
        // prevents a second account for an existing email/phone.
        const fallback: AccountCheckResult = {
          exists: false,
          match: null,
          account: null,
          flags: { phoneMismatch: false, emailMismatch: false },
        };
        wizard.setAccountCheck(fallback);
        wizard.next();
      } finally {
        setIsCheckingEmail(false);
      }
      return;
    }

    // After Login step (4) for existing users: go to post-login review summary
    if (state.currentStep === 4 && isExistingUser && !loginSuccess) {
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
  }, [canProceedCurrentStep, wizard, state.currentStep, isExistingUser, state.contact.email, state.contact.phone, loginSuccess]);

  const handleLoginSuccess = useCallback(async () => {
    setLoginError(null);
    setLoginSuccess(true);
    // Don't advance — stay on step 4, show post-login review summary
  }, []);

  // OTP sign-in for an existing client (Welcome Back flow). The code goes to
  // the account's email ON FILE - the backend never reveals it to us, only a
  // masked form. On verify the backend returns a real client token/session.
  const handleSendOtpLogin = useCallback(async () => {
    const account = state.accountCheck?.account;
    if (!account) throw new Error('Account information is missing. Please try again.');
    await publicAuthService.sendOtpLogin({ clientId: account.clientId });
  }, [state.accountCheck]);

  const handleVerifyOtpLogin = useCallback(
    async (otp: string) => {
      const account = state.accountCheck?.account;
      if (!account) throw new Error('Account information is missing. Please try again.');
      const result = await publicAuthService.verifyOtpLogin({ clientId: account.clientId, otp });
      authSetSession(result);
    },
    [state.accountCheck, authSetSession]
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Existing clients submit attached to their account (clientId, no
      // password); new visitors submit with the password they just created.
      const input = buildLeadInput(wizard, loginSuccess, actor?.type === 'CLIENT' ? actor.id : undefined);
      await createLeadMutation.mutateAsync(input);
      setIsSuccess(true);
      wizard.reset();
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, wizard, createLeadMutation, loginSuccess, actor]);

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
  const isPostLoginReview = state.currentStep === 4 && isExistingUser && loginSuccess;

  const selectedServiceData = services.filter((s) => state.selectedServices.includes(s.id));

  return (
    <div className="min-h-screen bg-canvas pt-24 pb-16">
      <SeoHead
        title="Get a Free Quote | Nexus"
        description="Tell us about your project and receive a detailed quotation within 24 hours. Free consultation, no obligation."
        canonical={siteUrl('/get-quote')}
        noindex
      />
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
                      <p className="text-sm text-ink-muted">You're signed in as <span className="font-medium text-ink">{state.accountCheck?.account?.emailMasked ?? state.contact.email}</span></p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Account info */}
                    <div className="rounded-2xl border border-border bg-canvas p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="h-4 w-4 text-ink-faint" />
                        <h3 className="text-sm font-semibold text-ink">Account</h3>
                      </div>
                      <p className="text-sm text-ink-muted">{state.accountCheck?.account?.emailMasked ?? state.contact.email}</p>
                    </div>

                    {/* Selected services */}
                    <div className="rounded-2xl border border-border bg-canvas p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="h-4 w-4 text-ink-faint" />
                        <h3 className="text-sm font-semibold text-ink">Selected Services</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedServiceData.map((s) => {
                          const subIds = (state.selectedSubServices[s.id] ?? []).filter((id) => subServiceNames[id]);
                          return (
                            <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">
                              {s.name}
                              {subIds.map((subId) => (
                                <span key={subId} className="inline-flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white">
                                  <BadgeCheck className="h-3 w-3" />
                                  {subServiceNames[subId]}
                                </span>
                              ))}
                            </span>
                          );
                        })}
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
                  {state.currentStep === 0 && (state.preselected ? (
                    <StepServicesPreselected
                      service={preselectedService}
                      subServices={preselectedSubs}
                      selectedSubServiceIds={state.selectedSubServices[preselectedService?.id ?? ''] ?? []}
                      onToggleSubService={(subId) => wizard.toggleSubService(preselectedService?.id ?? '', subId)}
                      onAddService={wizard.clearPreselect}
                    />
                  ) : (
                    <StepServices
                      selectedServices={state.selectedServices}
                      onToggle={wizard.toggleService}
                      showError={showServicesError}
                    />
                  ))}
                  {state.currentStep === 1 && (
                    <StepQuestions
                      selectedServices={state.selectedServices}
                      answers={state.answers}
                      onAnswer={wizard.setAnswer}
                      showErrors={showQuestionsError}
                      selectedSubServices={state.selectedSubServices}
                      subServiceNames={subServiceNames}
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
                    <StepReview state={state} goTo={wizard.goTo} subServiceNames={subServiceNames} />
                  )}
                  {state.currentStep === 4 && state.accountCheck?.exists === false && (
                    <StepAccount
                      contact={state.contact}
                      account={state.account}
                      onUpdate={wizard.updateAccount}
                      showErrors={showAccountErrors}
                    />
                  )}
                  {state.currentStep === 4 && isExistingUser && !loginSuccess && (
                    <StepLogin
                      enteredEmail={state.contact.email}
                      account={state.accountCheck?.account ?? null}
                      flags={state.accountCheck?.flags ?? { phoneMismatch: false, emailMismatch: false }}
                      authLogin={authLogin}
                      onLoginSuccess={handleLoginSuccess}
                      loginError={loginError}
                      onClearError={() => setLoginError(null)}
                      sendOtpLogin={handleSendOtpLogin}
                      verifyOtpLogin={handleVerifyOtpLogin}
                    />
                  )}
                  {state.currentStep === 4 && state.accountCheck === null && (
                    <div className="p-6 sm:p-8 text-center">
                      <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      <p className="mt-3 text-sm text-ink-muted">Checking your details...</p>
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
