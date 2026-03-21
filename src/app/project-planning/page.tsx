'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const heroPhoto =
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2200&q=80';

const steps = [
  { id: 1, title: 'Scope', description: 'What areas need work?' },
  { id: 2, title: 'Timeline', description: 'When do you need it done?' },
  { id: 3, title: 'Budget', description: 'What is your investment range?' },
  { id: 4, title: 'Contact', description: 'Tell us how to reach you' },
];

export default function ProjectPlanningPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    scope: '',
    timeline: '',
    budget: '',
    name: '',
    email: '',
    phone: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/project-planning/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const payload = await res.json() as {
        data: { id: string; message: string } | null;
        error: { message: string } | null;
      };

      if (!res.ok || payload.error) {
        setSubmitError(payload.error?.message ?? 'Failed to submit. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-chimera-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto w-20 h-20 bg-chimera-gold rounded-md flex items-center justify-center mb-8">
            <Check className="w-10 h-10 text-black" />
          </div>
          <h2 className="font-display text-5xl mb-4">Thank You</h2>
          <p className="text-xl text-chimera-text-secondary">
            We&apos;ve received your project brief. A planner will contact you within 48 hours.
          </p>
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="mt-12 px-10 py-4 bg-white text-black rounded-md font-medium hover:bg-chimera-gold transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-chimera-black min-h-screen">
      <section className="min-h-[50vh] flex items-center relative overflow-hidden">
        <Image
          src={heroPhoto}
          alt="Architectural blueprints and project planning documents"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="max-w-4xl mx-auto px-6 pt-20 relative z-10">
          <div className="uppercase tracking-[4px] text-chimera-gold text-sm mb-6">START YOUR BUILD</div>
          <h1 className="font-display text-7xl leading-none tracking-tight mb-6">
            PLAN YOUR
            <br />
            PROJECT
          </h1>
          <p className="text-xl text-chimera-text-secondary max-w-lg">
            Answer four quick questions and we&apos;ll match you with the right plan.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="flex justify-between mb-16">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${step.id === currentStep ? 'text-white' : 'text-chimera-text-muted'}`}
            >
              <div
                className={`w-10 h-10 rounded-md border-2 flex items-center justify-center mb-3 transition-colors ${
                  step.id === currentStep ? 'border-chimera-gold bg-chimera-gold text-black' : 'border-chimera-border'
                }`}
              >
                {step.id}
              </div>
              <div className="text-sm font-medium">{step.title}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <h2 className="font-display text-6xl mb-8">What are we renovating?</h2>
                <div className="grid grid-cols-2 gap-4">
                  {['Kitchen', 'Bathroom', 'Basement', 'Whole Home', 'Addition', 'Other'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateField('scope', opt)}
                      className={`p-8 text-left border rounded-xl transition-colors hover:border-chimera-gold ${
                        formData.scope === opt ? 'border-chimera-gold bg-chimera-surface' : 'border-chimera-border'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <h2 className="font-display text-6xl mb-8">When do you want this completed?</h2>
                <div className="space-y-4">
                  {['Next 3 months', '3-6 months', '6-12 months', '2027 or later'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateField('timeline', opt)}
                      className={`w-full p-8 text-left border rounded-xl text-xl transition-colors hover:border-chimera-gold ${
                        formData.timeline === opt ? 'border-chimera-gold bg-chimera-surface' : 'border-chimera-border'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <h2 className="font-display text-6xl mb-8">What is your budget range?</h2>
                <div className="space-y-4">
                  {['Under $50k', '$50k - $100k', '$100k - $200k', '$200k+'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateField('budget', opt)}
                      className={`w-full p-8 text-left border rounded-xl text-xl transition-colors hover:border-chimera-gold ${
                        formData.budget === opt ? 'border-chimera-gold bg-chimera-surface' : 'border-chimera-border'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <h2 className="font-display text-6xl mb-8">Final Details</h2>
                <div className="space-y-8">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full bg-transparent border-b border-chimera-border pb-4 text-xl focus:outline-none"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full bg-transparent border-b border-chimera-border pb-4 text-xl focus:outline-none"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full bg-transparent border-b border-chimera-border pb-4 text-xl focus:outline-none"
                    required
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {submitError && (
            <div className="mt-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {submitError}
            </div>
          )}

          <div className="flex justify-between mt-16">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-3 text-chimera-text-muted disabled:opacity-30"
            >
              <ChevronLeft /> Back
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-3 bg-chimera-gold text-black px-10 py-4 rounded-md font-medium hover:bg-white transition-colors"
              >
                Continue <ChevronRight />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-white text-black px-12 py-4 rounded-md font-semibold hover:bg-chimera-gold transition-colors disabled:opacity-70"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Project Brief'}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
