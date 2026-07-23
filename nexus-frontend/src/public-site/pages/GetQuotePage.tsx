import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, ArrowRight, ArrowLeft, Upload, X, FileImage, Video,
  ClipboardList, FileText, CheckCircle,
  Loader2, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuoteWizard } from '../hooks';
import { SERVICES, BUDGET_RANGES, TIMELINE_OPTIONS, PROPERTY_TYPES } from '../constants';

const STEP_LABELS = [
  { key: 'services', label: 'Services', icon: ClipboardList },
  { key: 'details', label: 'Details', icon: FileText },
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'review', label: 'Review', icon: CheckCircle },
  { key: 'account', label: 'Account', icon: Shield },
];

export function GetQuotePage() {
  const wizard = useQuoteWizard();
  const { currentStep } = wizard;

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

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEP_LABELS.map((step, index) => {
              const StepIcon = step.icon;
              const stepIndex = ['services', 'details', 'upload', 'review', 'account'].indexOf(step.key);
              const isActive = currentStep === step.key || 
                (currentStep === 'otp' && step.key === 'account') ||
                (currentStep === 'success' && step.key === 'account');
              const isCompleted = stepIndex < ['services', 'details', 'upload', 'review', 'account', 'otp', 'success'].indexOf(currentStep) &&
                !(currentStep === 'otp' && step.key === 'account') &&
                !(currentStep === 'success' && step.key === 'account');

              return (
                <div key={step.key} className="flex items-center">
                  <div className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    isCompleted ? 'bg-accent text-white' :
                    isActive ? 'bg-accent text-white shadow-md shadow-accent/25' :
                    'bg-canvas text-ink-faint border border-border'
                  )}>
                    {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  {index < STEP_LABELS.length - 1 && (
                    <div className={cn(
                      'hidden sm:block h-0.5 w-12 mx-2 transition-colors',
                      isCompleted ? 'bg-accent' : 'bg-border'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 hidden sm:flex items-center justify-between">
            {STEP_LABELS.map((step) => (
              <span key={step.key} className="text-xs text-ink-faint w-9 text-center">{step.label}</span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white shadow-xs">
          <AnimatePresence mode="wait">
            {currentStep === 'services' && <ServiceStep key="services" wizard={wizard} />}
            {currentStep === 'details' && <DetailsStep key="details" wizard={wizard} />}
            {currentStep === 'upload' && <UploadStep key="upload" wizard={wizard} />}
            {currentStep === 'review' && <ReviewStep key="review" wizard={wizard} />}
            {currentStep === 'account' && <AccountStep key="account" wizard={wizard} />}
            {currentStep === 'otp' && <OTPStep key="otp" wizard={wizard} />}
            {currentStep === 'success' && <SuccessStep key="success" wizard={wizard} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StepActions({ wizard, nextLabel = 'Continue' }: { wizard: ReturnType<typeof useQuoteWizard>; nextLabel?: string }) {
  const { prev, next, isFirstStep, canProceed, currentStep } = wizard;
  const isSubmitting = currentStep === 'otp';

  return (
    <div className="flex items-center justify-between border-t border-border px-6 py-4">
      {!isFirstStep ? (
        <button onClick={prev} className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      ) : <div />}
      <button
        onClick={next}
        disabled={!canProceed() || isSubmitting}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all',
          canProceed() && !isSubmitting
            ? 'bg-accent text-white hover:bg-accent-hover shadow-sm'
            : 'bg-canvas text-ink-faint cursor-not-allowed'
        )}
      >
        {isSubmitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
        ) : (
          <>{nextLabel} <ArrowRight className="h-4 w-4" /></>
        )}
      </button>
    </div>
  );
}

function ServiceStep({ wizard }: { wizard: ReturnType<typeof useQuoteWizard> }) {
  const { data, toggleService } = wizard;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6">
      <h2 className="text-lg font-semibold text-ink">Select Services</h2>
      <p className="mt-1 text-sm text-ink-muted">Choose one or more services you need for your project.</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SERVICES.map((service) => {
          const selected = data.selectedServices.includes(service.id);
          return (
            <button
              key={service.id}
              onClick={() => toggleService(service.id)}
              className={cn(
                'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                selected
                  ? 'border-accent bg-accent-subtle/50'
                  : 'border-border hover:border-border-strong bg-canvas/50'
              )}
            >
              <div className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 mt-0.5 transition-colors',
                selected ? 'border-accent bg-accent text-white' : 'border-border-strong'
              )}>
                {selected && <Check className="h-3 w-3" />}
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{service.name}</p>
                <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{service.shortDescription}</p>
              </div>
            </button>
          );
        })}
      </div>
      <StepActions wizard={wizard} />
    </motion.div>
  );
}

function DetailsStep({ wizard }: { wizard: ReturnType<typeof useQuoteWizard> }) {
  const { data, updateProjectDetails } = wizard;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6">
      <h2 className="text-lg font-semibold text-ink">Project Details</h2>
      <p className="mt-1 text-sm text-ink-muted">Tell us more about your project requirements.</p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Project Description *</label>
          <textarea
            required
            rows={3}
            value={data.projectDetails.description}
            onChange={(e) => updateProjectDetails({ description: e.target.value })}
            placeholder="Describe your project requirements..."
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Location *</label>
            <input
              required
              type="text"
              value={data.projectDetails.location}
              onChange={(e) => updateProjectDetails({ location: e.target.value })}
              placeholder="City, Area"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Property Type</label>
            <select
              value={data.projectDetails.propertyType}
              onChange={(e) => updateProjectDetails({ propertyType: e.target.value })}
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">Select type</option>
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Budget Range *</label>
            <select
              required
              value={data.projectDetails.budget}
              onChange={(e) => updateProjectDetails({ budget: e.target.value })}
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">Select budget</option>
              {BUDGET_RANGES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Timeline</label>
            <select
              value={data.projectDetails.timeline}
              onChange={(e) => updateProjectDetails({ timeline: e.target.value })}
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">Select timeline</option>
              {TIMELINE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Area (sq ft)</label>
            <input
              type="text"
              value={data.projectDetails.area || ''}
              onChange={(e) => updateProjectDetails({ area: e.target.value })}
              placeholder="e.g. 5000"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Additional Requirements</label>
          <textarea
            rows={2}
            value={data.projectDetails.additionalRequirements || ''}
            onChange={(e) => updateProjectDetails({ additionalRequirements: e.target.value })}
            placeholder="Any specific requirements or notes..."
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
          />
        </div>
      </div>
      <StepActions wizard={wizard} />
    </motion.div>
  );
}

function UploadStep({ wizard }: { wizard: ReturnType<typeof useQuoteWizard> }) {
  const { data, addFiles, removeFile } = wizard;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
    }));

    addFiles(newFiles);
    e.target.value = '';
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6">
      <h2 className="text-lg font-semibold text-ink">Upload Reference Files</h2>
      <p className="mt-1 text-sm text-ink-muted">Share images or videos to help us understand your project better. (Optional)</p>

      <div className="mt-6">
        <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-accent/50 hover:bg-accent-subtle/20 cursor-pointer">
          <Upload className="h-8 w-8 text-ink-faint" />
          <span className="mt-3 text-sm font-medium text-ink">Click to upload images or videos</span>
          <span className="mt-1 text-xs text-ink-faint">PNG, JPG, GIF, MP4 up to 10MB each</span>
          <input type="file" multiple accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
        </label>
      </div>

      {data.files.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {data.files.map((file) => (
            <div key={file.id} className="relative group rounded-xl border border-border bg-canvas overflow-hidden">
              {file.preview ? (
                <div className="aspect-square bg-accent-subtle">
                  <img src={file.preview} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="aspect-square bg-accent-subtle flex items-center justify-center">
                  <Video className="h-8 w-8 text-accent/40" />
                </div>
              )}
              <div className="p-2">
                <p className="text-xs text-ink truncate">{file.file.name}</p>
              </div>
              <button
                onClick={() => removeFile(file.id)}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <StepActions wizard={wizard} nextLabel="Review" />
    </motion.div>
  );
}

function ReviewStep({ wizard }: { wizard: ReturnType<typeof useQuoteWizard> }) {
  const { data } = wizard;
  const selectedServiceNames = SERVICES.filter((s) => data.selectedServices.includes(s.id)).map((s) => s.name);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6">
      <h2 className="text-lg font-semibold text-ink">Review Your Quote Request</h2>
      <p className="mt-1 text-sm text-ink-muted">Please review the details before submitting.</p>

      <div className="mt-6 space-y-5">
        <div className="rounded-xl border border-border bg-canvas p-4">
          <h3 className="text-sm font-semibold text-ink">Selected Services</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedServiceNames.map((name) => (
              <span key={name} className="rounded-full bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">{name}</span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-canvas p-4">
          <h3 className="text-sm font-semibold text-ink">Project Details</h3>
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
            <div><dt className="text-ink-faint">Description</dt><dd className="text-ink mt-0.5">{data.projectDetails.description || '-'}</dd></div>
            <div><dt className="text-ink-faint">Location</dt><dd className="text-ink mt-0.5">{data.projectDetails.location || '-'}</dd></div>
            <div><dt className="text-ink-faint">Budget</dt><dd className="text-ink mt-0.5">{data.projectDetails.budget || '-'}</dd></div>
            <div><dt className="text-ink-faint">Timeline</dt><dd className="text-ink mt-0.5">{data.projectDetails.timeline || '-'}</dd></div>
            <div><dt className="text-ink-faint">Property Type</dt><dd className="text-ink mt-0.5">{data.projectDetails.propertyType || '-'}</dd></div>
            <div><dt className="text-ink-faint">Area</dt><dd className="text-ink mt-0.5">{data.projectDetails.area ? `${data.projectDetails.area} sq ft` : '-'}</dd></div>
          </dl>
          {data.projectDetails.additionalRequirements && (
            <div className="mt-3">
              <dt className="text-ink-faint text-sm">Additional Requirements</dt>
              <dd className="text-ink text-sm mt-0.5">{data.projectDetails.additionalRequirements}</dd>
            </div>
          )}
        </div>

        {data.files.length > 0 && (
          <div className="rounded-xl border border-border bg-canvas p-4">
            <h3 className="text-sm font-semibold text-ink">Uploaded Files ({data.files.length})</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.files.map((f) => (
                <span key={f.id} className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-border px-2.5 py-1 text-xs text-ink-muted">
                  {f.type === 'image' ? <FileImage className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                  {f.file.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <StepActions wizard={wizard} nextLabel="Create Account" />
    </motion.div>
  );
}

function AccountStep({ wizard }: { wizard: ReturnType<typeof useQuoteWizard> }) {
  const { data, updateContactInfo } = wizard;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6">
      <h2 className="text-lg font-semibold text-ink">Create Your Account</h2>
      <p className="mt-1 text-sm text-ink-muted">Set up your account to track this quote and manage your projects.</p>
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Full Name *</label>
            <input required type="text" value={data.contactInfo.name} onChange={(e) => updateContactInfo({ name: e.target.value })} placeholder="Your full name" className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Email *</label>
            <input required type="email" value={data.contactInfo.email} onChange={(e) => updateContactInfo({ email: e.target.value })} placeholder="you@company.com" className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Phone *</label>
            <input required type="tel" value={data.contactInfo.phone} onChange={(e) => updateContactInfo({ phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Company</label>
            <input type="text" value={data.contactInfo.company || ''} onChange={(e) => updateContactInfo({ company: e.target.value })} placeholder="Company name (optional)" className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Pincode *</label>
          <input required type="text" value={data.contactInfo.pincode} onChange={(e) => updateContactInfo({ pincode: e.target.value })} placeholder="Area pincode" className="w-full max-w-xs rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
        </div>
      </div>
      <StepActions wizard={wizard} nextLabel="Submit Quote Request" />
    </motion.div>
  );
}

function OTPStep({ wizard }: { wizard: ReturnType<typeof useQuoteWizard> }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const { next } = wizard;

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-subtle text-accent">
        <Shield className="h-7 w-7" />
      </div>
      <h2 className="mt-6 text-lg font-semibold text-ink">Verify Your Email</h2>
      <p className="mt-2 text-sm text-ink-muted">
        We've sent a 6-digit code to <span className="font-medium text-ink">{wizard.data.contactInfo.email}</span>
      </p>

      <div className="mt-8 flex justify-center gap-3">
        {otp.map((digit, index) => (
          <input
            key={index}
            name={`otp-${index}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            className="h-12 w-12 rounded-xl border border-border bg-canvas text-center text-lg font-semibold text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        ))}
      </div>

      <button onClick={next} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover">
        Verify & Submit
        <ArrowRight className="h-4 w-4" />
      </button>

      <p className="mt-4 text-xs text-ink-faint">
        Didn't receive the code? <button className="text-accent hover:text-accent-hover font-medium">Resend OTP</button>
      </p>

      <p className="mt-6 text-xs text-ink-faint">
        This is a placeholder UI. OTP verification will be connected to the backend in the next phase.
      </p>
    </motion.div>
  );
}

function SuccessStep(_props: { wizard: ReturnType<typeof useQuoteWizard> }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-subtle">
        <CheckCircle className="h-8 w-8 text-success" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-ink">Quote Request Submitted!</h2>
      <p className="mt-3 mx-auto max-w-md text-ink-muted leading-relaxed">
        Your quote request has been received. Our team will review your requirements and get back to you within 24 hours with a consultation plan.
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
    </motion.div>
  );
}
