// src/app/wizard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePassport } from '@/context/PassportContext';
import { SECTIONS, WIZARD_STEPS } from '@/lib/constants';
import { SectionType } from '@/lib/types';
import { Plus } from 'lucide-react';
import { MdFavorite, MdWarning, MdStar, MdHandshake } from 'react-icons/md';

export default function WizardPage() {
  const router = useRouter();
  const { user, passport, isLoading, updateChild, addBullet, completeWizard } = usePassport();

  useEffect(() => { if (!isLoading && !user) router.push('/'); }, [user, isLoading, router]);
  useEffect(() => { if (!isLoading && passport?.wizardComplete) router.push('/admin'); }, [passport, isLoading, router]);

  if (isLoading || !user || !passport) return <main className="min-h-screen flex items-center justify-center"><p>Loading...</p></main>;

  return (
    <WizardFlow
      initialChildName={passport.child.firstName}
      updateChild={updateChild}
      addBullet={addBullet}
      completeWizard={completeWizard}
    />
  );
}

function WizardFlow({
  initialChildName,
  updateChild,
  addBullet,
  completeWizard,
}: {
  initialChildName: string;
  updateChild: (updates: { firstName: string }) => void;
  addBullet: (section: SectionType, content: string, remedialSuggestion?: string) => void;
  completeWizard: () => void;
}) {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [childName, setChildName] = useState(() => initialChildName);
  const [newItems, setNewItems] = useState<Record<SectionType, { content: string; remedial: string }[]>>({
    loves: [{ content: '', remedial: '' }],
    hates: [{ content: '', remedial: '' }],
    strengths: [{ content: '', remedial: '' }],
    needs: [{ content: '', remedial: '' }],
  });

  const currentStep = WIZARD_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  const handleContinue = () => {
    if (isFirstStep) {
      if (!childName.trim()) return;
      updateChild({ firstName: childName.trim() });
      setCurrentStepIndex(1);
    } else {
      if (isLastStep) {
        Object.entries(newItems).forEach(([section, items]) => {
          items.forEach(item => { if (item.content.trim()) addBullet(section as SectionType, item.content.trim(), item.remedial.trim() || undefined); });
        });
        completeWizard();
        router.push('/admin');
      } else {
        setCurrentStepIndex(prev => prev + 1);
      }
    }
  };

  const handleBack = () => { if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1); };

  const addItemField = (section: SectionType) => {
    setNewItems(prev => ({ ...prev, [section]: [...prev[section], { content: '', remedial: '' }] }));
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

  const canContinue = isFirstStep ? childName.trim() !== '' : true;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b-2 border-purple-200/50 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Create ID Card</h1>
          <p className="text-sm text-gray-700 mt-1">Step {currentStepIndex + 1} of {WIZARD_STEPS.length}</p>
        </div>
      </header>

      {/* Breadcrumbs */}
      <nav aria-label="Progress" className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-1 items-center flex-wrap">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              const stepLabel = step.id === 'child' ? 'Basics' : getSectionLabel(step.id as SectionType, true);
              return (
                <div key={step.id} className="flex items-center">
                  {index > 0 && <span className="text-gray-400 mx-1 sm:mx-2 text-xs sm:text-sm">/</span>}
                  <button
                    onClick={() => setCurrentStepIndex(index)}
                    disabled={index > currentStepIndex}
                    className={`text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      isActive ? 'bg-gradient-to-r from-[#a855f7] to-[#be185d] text-white focus-visible:outline-white' : isCompleted ? 'text-[#be185d] hover:bg-pink-50 focus-visible:outline-purple-600' : 'text-gray-500 cursor-not-allowed focus-visible:outline-gray-400'
                    }`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {stepLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 px-4 sm:px-6 py-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {isFirstStep ? (
            <div className="bg-white rounded-md shadow-sm p-6 sm:p-8">
              <h2 className="text-2xl font-black text-gray-900 mb-6">Let&apos;s start with the basics</h2>
              <div className="space-y-1">
                <label htmlFor="child-name" className="block text-sm font-medium text-gray-700">
                  Child&apos;s first name<span className="text-[#be185d] ml-0.5">*</span>
                </label>
                <input
                  id="child-name"
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleContinue(); } }}
                  placeholder="Enter child's first name"
                  required
                  autoFocus
                  aria-describedby="child-name-hint"
                  className="w-full px-3 py-2.5 rounded-md border-2 bg-white text-base text-gray-900 border-gray-300 hover:border-gray-400 focus:border-[#a855f7] focus:outline-none focus:ring-4 focus:ring-[#a855f7]/20 transition-all min-h-[48px] placeholder:text-gray-500"
                />
                <p id="child-name-hint" className="text-xs text-gray-600">This name will appear on the passport and can be changed later</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-md shadow-sm p-6 sm:p-8">
              <div className="mb-6 pb-4 border-b-2 border-purple-200/50">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-[#a855f7] flex-shrink-0" aria-hidden="true">
                    {getSectionIcon(currentStep.id as SectionType)}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900">{SECTIONS[currentStep.id as SectionType].title}</h2>
                </div>
                <p className="text-sm text-gray-700 mt-2">{SECTIONS[currentStep.id as SectionType].prompt.replace('your child', childName || 'your child')}</p>
              </div>

              <div className="space-y-1">
                {newItems[currentStep.id as SectionType].map((item, index) => (
                  <div key={index} className={`py-3 ${index > 0 ? 'border-t border-gray-200' : ''} hover:bg-purple-50/30 transition-colors`}>
                    <div className="flex gap-3 items-start">
                      <div className="flex-grow">
                        <label htmlFor={`item-${index}`} className="sr-only">Item {index + 1}</label>
                        <textarea
                          id={`item-${index}`}
                          value={item.content}
                          onChange={(e) => updateItemField(currentStep.id as SectionType, index, 'content', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (item.content.trim()) {
                                addItemField(currentStep.id as SectionType);
                                setTimeout(() => {
                                  const nextInput = document.getElementById(`item-${index + 1}`);
                                  nextInput?.focus();
                                }, 0);
                              }
                            }
                          }}
                          placeholder="Add an item..."
                          autoFocus={index === 0}
                          className="w-full text-base text-gray-900 bg-gray-100 border-2 border-gray-200 focus:border-purple-400 focus:bg-white px-3 py-2.5 rounded-md resize-none focus:outline-none focus:ring-4 focus:ring-purple-200/50 placeholder:text-gray-600 transition-all min-h-[48px]"
                          rows={1}
                        />
                        {SECTIONS[currentStep.id as SectionType].requiresRemedial && item.content.trim() && (
                          <div className="mt-2">
                            <label htmlFor={`remedial-${index}`} className="sr-only">What helps with item {index + 1}?</label>
                            <textarea
                              id={`remedial-${index}`}
                              value={item.remedial}
                              onChange={(e) => updateItemField(currentStep.id as SectionType, index, 'remedial', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (item.content.trim() && item.remedial.trim()) {
                                    addItemField(currentStep.id as SectionType);
                                    setTimeout(() => {
                                      const nextInput = document.getElementById(`item-${index + 1}`);
                                      nextInput?.focus();
                                    }, 0);
                                  }
                                }
                              }}
                              placeholder="What helps?"
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
                          className="p-2 min-h-[44px] min-w-[44px] text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-all focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                          aria-label="Remove item"
                        >
                          <span className="text-xl" aria-hidden="true">×</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="pt-3">
                  <button
                    onClick={() => addItemField(currentStep.id as SectionType)}
                    className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium text-purple-700 hover:bg-purple-100 hover:text-purple-800 rounded-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Add another
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <footer className="bg-white border-t border-purple-200/50 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {!isFirstStep && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium text-gray-900 hover:bg-gray-100 rounded-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
            >
              ← Back
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-semibold bg-gradient-to-r from-[#a855f7] to-[#be185d] text-white hover:from-[#9333ea] hover:to-[#9f1239] rounded-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLastStep ? 'Complete' : 'Continue'} →
          </button>
        </div>
      </footer>
    </main>
  );
}
