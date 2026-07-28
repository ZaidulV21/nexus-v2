import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Send } from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { usePublicServices } from '@/queries/usePublicServices';
import { useCreateLead } from '@/queries/useLeads';
import { clientService } from '@/services/clientService';
import { StepServices } from '@/public-site/wizard/steps/StepServices';
import { StepQuestions } from '@/public-site/wizard/steps/StepQuestions';
import { getQuestionsForService } from '@/public-site/wizard/serviceQuestions';
import { ROUTES } from '@/routes/routes';


const STEP_LABELS = ['Services', 'Questions', 'Review'];

export function PortalServiceRequestPage() {
  const { actor } = useAuth();
  const { data: services = [] } = usePublicServices();
  const createLead = useCreateLead();

  const [step, setStep] = useState(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, Record<string, string | string[]>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showServicesError, setShowServicesError] = useState(false);
  const [showQuestionsError, setShowQuestionsError] = useState(false);

  const toggleService = useCallback((serviceId: string) => {
    setSelectedServices((prev) => {
      const exists = prev.includes(serviceId);
      if (exists) {
        setAnswers((a) => { const n = { ...a }; delete n[serviceId]; return n; });
        return prev.filter((id) => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  }, []);

  const setAnswer = useCallback((serviceId: string, questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [serviceId]: { ...(prev[serviceId] || {}), [questionId]: value },
    }));
  }, []);

  function handleNext() {
    if (step === 0 && selectedServices.length === 0) {
      setShowServicesError(true);
      return;
    }
    if (step === 1) {
      let invalid = false;
      for (const serviceId of selectedServices) {
        const service = services.find((s) => s.id === serviceId);
        if (!service) continue;
        const config = getQuestionsForService(service.slug);
        if (!config) continue;
        const serviceAnswers = answers[serviceId] || {};
        for (const q of config.questions) {
          if (!q.required) continue;
          const val = serviceAnswers[q.id];
          if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
            invalid = true;
            break;
          }
        }
        if (invalid) break;
      }
      if (invalid) {
        setShowQuestionsError(true);
        return;
      }
    }
    setShowServicesError(false);
    setShowQuestionsError(false);
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    if (!actor) return;
    const serviceInputs = selectedServices.map((serviceId) => ({
      serviceId,
      questionnaireAnswers: answers[serviceId] || {},
    }));

    const client = await clientService.getCurrent();

    await createLead.mutateAsync({
      contactName: client.contactName,
      phone: client.phone,
      email: client.email ?? undefined,
      companyName: client.companyName ?? undefined,
      source: 'PORTAL',
      services: serviceInputs,
      clientId: actor.id,
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Service request submitted"
          description="Your request has been received. Our team will review it and get back to you."
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-center text-sm text-ink-muted max-w-md">
              You can track the status of this request from your dashboard. We'll also send you a notification once a quotation is ready.
            </p>
            <div className="flex gap-3 mt-2">
              <Button variant="secondary" asChild>
                <Link to={ROUTES.portal.dashboard}>Back to dashboard</Link>
              </Button>
              <Button onClick={() => { setSubmitted(false); setStep(0); setSelectedServices([]); setAnswers({}); }}>
                Submit another request
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Request a new service"
        description="Select the services you need and tell us about your project."
        actions={
          <Button variant="secondary" size="sm" asChild>
            <Link to={ROUTES.portal.dashboard}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
            </Link>
          </Button>
        }
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              i === step ? 'bg-accent text-white' : i < step ? 'bg-accent/20 text-accent' : 'bg-canvas text-ink-faint'
            }`}>
              {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`text-sm font-medium ${i === step ? 'text-ink' : 'text-ink-faint'}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <div className="mx-2 h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="p-0">
          {step === 0 && <StepServices selectedServices={selectedServices} onToggle={toggleService} showError={showServicesError} />}
          {step === 1 && <StepQuestions selectedServices={selectedServices} answers={answers} onAnswer={setAnswer} showErrors={showQuestionsError} />}
          {step === 2 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-ink">Review your request</h2>
              <p className="mt-1.5 text-sm text-ink-muted">
                Confirm the services and details before submitting.
              </p>

              <div className="mt-6 space-y-4">
                {selectedServices.map((serviceId) => {
                  const service = services.find((s) => s.id === serviceId);
                  const serviceAnswers = answers[serviceId] || {};
                  const answerEntries = Object.entries(serviceAnswers).filter(([, v]) => v && v !== '');

                  return (
                    <div key={serviceId} className="rounded-xl border border-border bg-canvas p-4">
                      <p className="text-sm font-semibold text-ink">{service?.name ?? serviceId}</p>
                      {answerEntries.length > 0 ? (
                        <dl className="mt-3 space-y-2">
                          {answerEntries.map(([qId, val]) => (
                            <div key={qId} className="flex gap-2">
                              <dt className="text-xs font-medium text-ink-faint uppercase tracking-wide min-w-[120px]">
                                {qId.replace(/-/g, ' ')}
                              </dt>
                              <dd className="text-sm text-ink">
                                {Array.isArray(val) ? val.join(', ') : String(val)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="mt-2 text-xs text-ink-faint">No additional details provided.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        {step < STEP_LABELS.length - 1 ? (
          <Button onClick={handleNext}>
            Next <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createLead.isPending}>
            {createLead.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Submit request
          </Button>
        )}
      </div>
    </div>
  );
}
