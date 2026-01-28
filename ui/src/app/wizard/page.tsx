// src/app/wizard/page.tsx
'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePassport } from '@/context/PassportContext';
import { SECTIONS, WIZARD_STEPS } from '@/lib/constants';
import { SectionType } from '@/lib/types';
import { Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { MdFavorite, MdWarning, MdStar, MdHandshake } from 'react-icons/md';

// Map frontend section types to backend API types
const sectionTypeToApi: Record<SectionType, string> = {
  loves: 'LOVES',
  hates: 'HATES',
  strengths: 'STRENGTHS',
  needs: 'NEEDS',
};

// Validation rules
const VALIDATION = {
  childName: {
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/,
  },
  itemContent: {
    maxLength: 500,
  },
};

interface ValidationErrors {
  childName?: string;
  items?: Record<number, string>;
}

export default function WizardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { currentPassport, isLoading: passportLoading, createPassport, updatePassport, addSection } = usePassport();
  const [passportId, setPassportId] = useState<string | null>(null);

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    if (!authLoading && !passportLoading) {
      setInitialLoadComplete(true);
    }
  }, [authLoading, passportLoading]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // If passport exists and wizard is complete, redirect to dashboard
  useEffect(() => {
    if (initialLoadComplete && currentPassport?.wizardComplete) {
      router.push('/dashboard');
    }
  }, [currentPassport, initialLoadComplete, router]);

  // Track passport ID when created
  useEffect(() => {
    if (currentPassport?.id) {
      setPassportId(currentPassport.id);
    }
  }, [currentPassport]);

  if (!initialLoadComplete || !isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
        <p className="text-gray-600">Loading...</p>
      </main>
    );
  }

  const handleCreatePassport = async (childName: string) => {
    const passport = await createPassport(childName);
    setPassportId(passport.id);
    return passport;
  };

  const handleUpdateChild = async (updates: { firstName: string }) => {
    if (passportId) {
      await updatePassport(passportId, { childFirstName: updates.firstName });
    }
  };

  const handleAddBullet = async (section: SectionType, content: string, remedialSuggestion?: string) => {
    if (passportId) {
      const fullContent = remedialSuggestion
        ? `${content}\n\n**What helps:** ${remedialSuggestion}`
        : content;
      await addSection(passportId, sectionTypeToApi[section], fullContent);
    }
  };

  const handleCompleteWizard = async () => {
    // The wizard is marked complete when all sections are added
  };

  return (
    <WizardFlow
      initialChildName={currentPassport?.childFirstName || ''}
      hasExistingPassport={!!currentPassport}
      onCreatePassport={handleCreatePassport}
      updateChild={handleUpdateChild}
      addBullet={handleAddBullet}
      completeWizard={handleCompleteWizard}
    />
  );
}

function WizardFlow({
  initialChildName,
  hasExistingPassport,
  onCreatePassport,
  updateChild,
  addBullet,
  completeWizard,
}: {
  initialChildName: string;
  hasExistingPassport: boolean;
  onCreatePassport: (childName: string) => Promise<any>;
  updateChild: (updates: { firstName: string }) => Promise<void>;
  addBullet: (section: SectionType, content: string, remedialSuggestion?: string) => Promise<void>;
  completeWizard: () => Promise<void>;
}) {
  const router = useRouter();
  const formId = useId();
  const announcerRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [childName, setChildName] = useState(() => initialChildName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [newItems, setNewItems] = useState<Record<SectionType, { content: string; remedial: string }[]>>({
    loves: [{ content: '', remedial: '' }],
    hates: [{ content: '', remedial: '' }],
    strengths: [{ content: '', remedial: '' }],
    needs: [{ content: '', remedial: '' }],
  });

  const currentStep = WIZARD_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  // Announce step changes to screen readers
  useEffect(() => {
    if (announcerRef.current) {
      const stepLabel = currentStep.id === 'child' ? 'Basics' : getSectionLabel(currentStep.id as SectionType);
      announcerRef.current.textContent = `Step ${currentStepIndex + 1} of ${WIZARD_STEPS.length}: ${stepLabel}`;
    }
  }, [currentStepIndex, currentStep.id]);

  // Focus management on step change
  useEffect(() => {
    if (mainContentRef.current) {
      const firstInput = mainContentRef.current.querySelector('input, textarea') as HTMLElement;
      if (firstInput) {
        firstInput.focus();
      }
    }
  }, [currentStepIndex]);

  // Focus error message when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  // Clear success message after delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Validate child name
  const validateChildName = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Child's name is required";
    }
    if (trimmed.length < VALIDATION.childName.minLength) {
      return `Name must be at least ${VALIDATION.childName.minLength} character`;
    }
    if (trimmed.length > VALIDATION.childName.maxLength) {
      return `Name must be less than ${VALIDATION.childName.maxLength} characters`;
    }
    if (!VALIDATION.childName.pattern.test(trimmed)) {
      return "Name can only contain letters, spaces, hyphens, and apostrophes";
    }
    return undefined;
  };

  // Validate all fields before submission
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (isFirstStep) {
      const nameError = validateChildName(childName);
      if (nameError) {
        errors.childName = nameError;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChildNameChange = (value: string) => {
    setChildName(value);
    if (touched.childName) {
      const error = validateChildName(value);
      setValidationErrors(prev => ({ ...prev, childName: error }));
    }
  };

  const handleChildNameBlur = () => {
    setTouched(prev => ({ ...prev, childName: true }));
    const error = validateChildName(childName);
    setValidationErrors(prev => ({ ...prev, childName: error }));
  };

  const handleContinue = async () => {
    if (isSubmitting) return;

    // Clear previous messages
    setError(null);
    setSuccess(null);

    // Validate form
    if (!validateForm()) {
      // Focus first error field
      if (validationErrors.childName) {
        document.getElementById(`${formId}-child-name`)?.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      if (isFirstStep) {
        if (hasExistingPassport) {
          await updateChild({ firstName: childName.trim() });
        } else {
          await onCreatePassport(childName.trim());
        }
        setSuccess('Profile created successfully!');
        setCurrentStepIndex(1);
      } else {
        if (isLastStep) {
          // Add all sections to the passport
          for (const [section, items] of Object.entries(newItems)) {
            for (const item of items) {
              if (item.content.trim()) {
                await addBullet(
                  section as SectionType,
                  item.content.trim(),
                  item.remedial.trim() || undefined
                );
              }
            }
          }
          await completeWizard();
          router.push('/dashboard');
        } else {
          setCurrentStepIndex(prev => prev + 1);
        }
      }
    } catch (e: any) {
      console.error('Error in wizard step:', e);
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setError(null);
      setSuccess(null);
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleStepClick = (index: number) => {
    if (index <= currentStepIndex) {
      setError(null);
      setSuccess(null);
      setCurrentStepIndex(index);
    }
  };

  const addItemField = (section: SectionType) => {
    setNewItems(prev => ({
      ...prev,
      [section]: [...prev[section], { content: '', remedial: '' }],
    }));
  };

  const updateItemField = (section: SectionType, index: number, field: 'content' | 'remedial', value: string) => {
    setNewItems(prev => {
      const updated = [...prev[section]];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [section]: updated };
    });
  };

  const removeItemField = (section: SectionType, index: number) => {
    setNewItems(prev => {
      const filtered = prev[section].filter((_, i) => i !== index);
      return { ...prev, [section]: filtered.length > 0 ? filtered : [{ content: '', remedial: '' }] };
    });
  };

  const getSectionIcon = (section: SectionType) => {
    const iconClass = "text-3xl sm:text-4xl";
    switch (section) {
      case 'loves': return <MdFavorite className={iconClass} />;
      case 'hates': return <MdWarning className={iconClass} />;
      case 'strengths': return <MdStar className={iconClass} />;
      case 'needs': return <MdHandshake className={iconClass} />;
    }
  };

  const getSectionLabel = (section: SectionType, short = false) => {
    if (short) {
      switch (section) {
        case 'loves': return 'Loves';
        case 'hates': return 'Hates';
        case 'strengths': return 'Strong';
        case 'needs': return 'Needs';
      }
    }
    switch (section) {
      case 'loves': return 'Loves';
      case 'hates': return 'Difficulties';
      case 'strengths': return 'Strengths';
      case 'needs': return 'Needs';
    }
  };

  const canContinue = isFirstStep ? childName.trim() !== '' && !validationErrors.childName : true;
  const hasChildNameError = touched.childName && validationErrors.childName;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Screen reader announcements */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-purple-700 focus:text-white focus:rounded-md"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-white border-b-2 border-purple-200/50 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Create ID Card</h1>
          <p className="text-sm text-gray-700 mt-1" aria-live="polite">
            Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
          </p>
        </div>
      </header>

      {/* Progress indicator / Breadcrumbs */}
      <nav aria-label="Wizard progress" className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-2xl mx-auto">
          <ol className="flex gap-1 items-center flex-wrap" role="list">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              const isAccessible = index <= currentStepIndex;
              const stepLabel = step.id === 'child' ? 'Basics' : getSectionLabel(step.id as SectionType, true);

              return (
                <li key={step.id} className="flex items-center">
                  {index > 0 && (
                    <span className="text-gray-400 mx-1 sm:mx-2 text-xs sm:text-sm" aria-hidden="true">/</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStepClick(index)}
                    disabled={!isAccessible}
                    className={`text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#a855f7] to-[#be185d] text-white focus-visible:outline-white'
                        : isCompleted
                          ? 'text-[#be185d] hover:bg-pink-50 focus-visible:outline-purple-600'
                          : 'text-gray-500 cursor-not-allowed focus-visible:outline-gray-400'
                    }`}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`${stepLabel}${isCompleted ? ' (completed)' : isActive ? ' (current)' : ''}`}
                  >
                    <span aria-hidden="true">{isCompleted ? '✓ ' : ''}</span>
                    {stepLabel}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>

      {/* Main Content */}
      <div id="main-content" className="flex-1 px-4 sm:px-6 py-6 overflow-y-auto" ref={mainContentRef}>
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          {success && (
            <div
              className="mb-4 bg-green-50 border border-green-200 rounded-md px-4 py-3 flex items-start gap-3"
              role="status"
              aria-live="polite"
            >
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {isFirstStep ? (
            <div className="bg-white rounded-md shadow-sm p-6 sm:p-8">
              <h2 className="text-2xl font-black text-gray-900 mb-6">Let&apos;s start with the basics</h2>
              <div className="space-y-2">
                <label
                  htmlFor={`${formId}-child-name`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Child&apos;s first name
                  <span className="text-[#be185d] ml-0.5" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <input
                  id={`${formId}-child-name`}
                  type="text"
                  value={childName}
                  onChange={(e) => handleChildNameChange(e.target.value)}
                  onBlur={handleChildNameBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleContinue();
                    }
                  }}
                  placeholder="Enter child's first name"
                  required
                  autoFocus
                  autoComplete="given-name"
                  aria-describedby={`${formId}-child-name-hint ${hasChildNameError ? `${formId}-child-name-error` : ''}`}
                  aria-invalid={hasChildNameError ? 'true' : undefined}
                  aria-required="true"
                  maxLength={VALIDATION.childName.maxLength}
                  className={`w-full px-3 py-2.5 rounded-md border-2 bg-white text-base text-gray-900 transition-all min-h-[48px] placeholder:text-gray-500 focus:outline-none focus:ring-4 ${
                    hasChildNameError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 hover:border-gray-400 focus:border-[#a855f7] focus:ring-[#a855f7]/20'
                  }`}
                />
                {hasChildNameError && (
                  <p
                    id={`${formId}-child-name-error`}
                    className="text-sm text-red-600 flex items-center gap-1.5"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    {validationErrors.childName}
                  </p>
                )}
                <p
                  id={`${formId}-child-name-hint`}
                  className="text-xs text-gray-600"
                >
                  This name will appear on the passport and can be changed later
                </p>
                <p className="text-xs text-gray-500">
                  {childName.length}/{VALIDATION.childName.maxLength} characters
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-md shadow-sm p-6 sm:p-8">
              <div className="mb-6 pb-4 border-b-2 border-purple-200/50">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-[#a855f7] flex-shrink-0" aria-hidden="true">
                    {getSectionIcon(currentStep.id as SectionType)}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                    {SECTIONS[currentStep.id as SectionType].title}
                  </h2>
                </div>
                <p className="text-sm text-gray-700 mt-2">
                  {SECTIONS[currentStep.id as SectionType].prompt.replace('your child', childName || 'your child')}
                </p>
              </div>

              <fieldset>
                <legend className="sr-only">
                  {SECTIONS[currentStep.id as SectionType].title} items for {childName}
                </legend>
                <div className="space-y-1">
                  {newItems[currentStep.id as SectionType].map((item, index) => (
                    <div
                      key={index}
                      className={`py-3 ${index > 0 ? 'border-t border-gray-200' : ''} hover:bg-purple-50/30 transition-colors rounded-md`}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="flex-grow">
                          <label
                            htmlFor={`${formId}-item-${currentStep.id}-${index}`}
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Item {index + 1}
                            {index === 0 && <span className="text-gray-500 font-normal ml-1">(optional)</span>}
                          </label>
                          <textarea
                            id={`${formId}-item-${currentStep.id}-${index}`}
                            value={item.content}
                            onChange={(e) => updateItemField(currentStep.id as SectionType, index, 'content', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (item.content.trim()) {
                                  addItemField(currentStep.id as SectionType);
                                  setTimeout(() => {
                                    const nextInput = document.getElementById(`${formId}-item-${currentStep.id}-${index + 1}`);
                                    nextInput?.focus();
                                  }, 0);
                                }
                              }
                            }}
                            placeholder="Add an item..."
                            autoFocus={index === 0}
                            maxLength={VALIDATION.itemContent.maxLength}
                            aria-describedby={`${formId}-item-${currentStep.id}-${index}-hint`}
                            className="w-full text-base text-gray-900 bg-gray-100 border-2 border-gray-200 focus:border-purple-400 focus:bg-white px-3 py-2.5 rounded-md resize-none focus:outline-none focus:ring-4 focus:ring-purple-200/50 placeholder:text-gray-600 transition-all min-h-[48px]"
                            rows={1}
                          />
                          <p
                            id={`${formId}-item-${currentStep.id}-${index}-hint`}
                            className="sr-only"
                          >
                            Press Enter to add another item. Press Shift+Enter for a new line.
                          </p>
                          {SECTIONS[currentStep.id as SectionType].requiresRemedial && item.content.trim() && (
                            <div className="mt-2">
                              <label
                                htmlFor={`${formId}-remedial-${currentStep.id}-${index}`}
                                className="block text-sm font-medium text-green-700 mb-1"
                              >
                                What helps with this?
                              </label>
                              <textarea
                                id={`${formId}-remedial-${currentStep.id}-${index}`}
                                value={item.remedial}
                                onChange={(e) => updateItemField(currentStep.id as SectionType, index, 'remedial', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (item.content.trim()) {
                                      addItemField(currentStep.id as SectionType);
                                      setTimeout(() => {
                                        const nextInput = document.getElementById(`${formId}-item-${currentStep.id}-${index + 1}`);
                                        nextInput?.focus();
                                      }, 0);
                                    }
                                  }
                                }}
                                placeholder="Describe strategies or supports that help..."
                                maxLength={VALIDATION.itemContent.maxLength}
                                className="w-full text-base text-[#166534] bg-green-50 border-2 border-green-200 focus:border-green-400 focus:bg-white px-3 py-2.5 rounded-md resize-none focus:outline-none focus:ring-4 focus:ring-green-200/50 placeholder:text-green-700 transition-all min-h-[48px]"
                                rows={1}
                              />
                            </div>
                          )}
                        </div>
                        {(newItems[currentStep.id as SectionType].length > 1 || item.content.trim()) && (
                          <button
                            type="button"
                            onClick={() => removeItemField(currentStep.id as SectionType, index)}
                            className="p-2 min-h-[44px] min-w-[44px] text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                            aria-label={`Remove item ${index + 1}`}
                          >
                            <span className="text-xl" aria-hidden="true">×</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => addItemField(currentStep.id as SectionType)}
                      className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium text-purple-700 hover:bg-purple-100 hover:text-purple-800 rounded-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      Add another item
                    </button>
                  </div>
                </div>
              </fieldset>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 sm:px-6 pb-4">
          <div className="max-w-2xl mx-auto">
            <div
              ref={errorRef}
              tabIndex={-1}
              className="bg-red-50 border border-red-200 rounded-md px-4 py-3 flex items-start gap-3"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <footer className="bg-white border-t border-purple-200/50 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {!isFirstStep ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium text-gray-900 hover:bg-gray-100 rounded-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Go back to previous step"
            >
              <span aria-hidden="true">←</span> Back
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue || isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 min-h-[44px] text-sm font-semibold bg-gradient-to-r from-[#a855f7] to-[#be185d] text-white hover:from-[#9333ea] hover:to-[#9f1239] rounded-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isLastStep ? 'Complete wizard and save' : 'Continue to next step'}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin" aria-hidden="true">⟳</span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>{isLastStep ? 'Complete' : 'Continue'}</span>
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </main>
  );
}
