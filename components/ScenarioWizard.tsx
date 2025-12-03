
import React, { useState, useRef } from 'react';
import { Project, STEPS } from '../types';
import { Bot, ChevronRight, Sparkles, Upload, Loader2, ImagePlus } from 'lucide-react';
import AiChat from './AiChat';
import { analyzeCharacterReference } from '../services/geminiService';

interface Props {
  project: Project;
  onUpdate: (project: Project) => void;
  onNext: () => void;
}

const ScenarioWizard: React.FC<Props> = ({ project, onUpdate, onNext }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentStepId = STEPS[activeStep].id;

  const getStepContent = () => {
    const s = project.scenario;
    switch (currentStepId) {
      case 'characters': return s.charactersText;
      case 'theme': return s.theme;
      case 'tone': return s.tone;
      case 'universe': return s.universe;
      case 'ideas': return s.ideas;
      case 'plan': return s.generalPlan;
      case 'beats': return s.keyEvents;
      case 'development': return s.detailedPlot;
      case 'dialogue': return s.dialogues;
      case 'storyboard': return s.script;
      case 'cover': return s.coverDescription;
      default: return '';
    }
  };

  const handleInputChange = (value: string) => {
    const newScenario = { ...project.scenario };
    
    switch (currentStepId) {
      case 'characters': newScenario.charactersText = value; break;
      case 'theme': newScenario.theme = value; break;
      case 'tone': newScenario.tone = value; break;
      case 'universe': newScenario.universe = value; break;
      case 'ideas': newScenario.ideas = value; break;
      case 'plan': newScenario.generalPlan = value; break;
      case 'beats': newScenario.keyEvents = value; break;
      case 'development': newScenario.detailedPlot = value; break;
      case 'dialogue': newScenario.dialogues = value; break;
      case 'storyboard': newScenario.script = value; break;
      case 'cover': newScenario.coverDescription = value; break;
    }

    onUpdate({ ...project, scenario: newScenario });
  };

  const handleAiApply = (text: string) => {
      const current = getStepContent();
      if (!current) {
          handleInputChange(text);
      } else {
          handleInputChange(current + '\n\n' + text);
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setAnalyzingImage(true);
    
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const charName = prompt("Character Name for this image?", "Unknown Character");
        if (charName) {
            const description = await analyzeCharacterReference(reader.result, charName);
            if (description) {
                const appendText = `\n\n[VISUAL REFERENCE FOR ${charName.toUpperCase()}]\n${description}`;
                handleAiApply(appendText);
            }
        }
      }
      setAnalyzingImage(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar Steps */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto hidden md:block">
        <h2 className="text-xl font-bold mb-6 text-indigo-400 font-comic tracking-wider">SCENARIO STUDIO</h2>
        <div className="space-y-2">
          {STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(index)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeStep === index
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-slate-950">
        <div className="p-4 md:p-8 flex-1 overflow-y-hidden flex flex-col">
          <header className="mb-6 flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">{STEPS[activeStep].label}</h1>
                <p className="text-slate-400">Describe this aspect of your manga. Use the AI Co-Pilot to brainstorm.</p>
            </div>
            
            {/* Step 3: Color Mode Toggle */}
            {currentStepId === 'tone' && (
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                    <button 
                        onClick={() => onUpdate({ ...project, scenario: { ...project.scenario, colorMode: 'bw' } })}
                        className={`px-3 py-1 text-xs font-bold rounded ${project.scenario.colorMode !== 'color' ? 'bg-slate-100 text-black' : 'text-slate-400'}`}
                    >
                        B&W (Manga)
                    </button>
                    <button 
                        onClick={() => onUpdate({ ...project, scenario: { ...project.scenario, colorMode: 'color' } })}
                        className={`px-3 py-1 text-xs font-bold rounded ${project.scenario.colorMode === 'color' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                        Color (Webtoon)
                    </button>
                </div>
            )}
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
            {/* Input Area */}
            <div className="flex flex-col gap-2 h-full">
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Your Draft</span>
                  
                  {/* Step 1: Image Upload */}
                  {currentStepId === 'characters' && (
                      <div>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            accept="image/*" 
                            className="hidden" 
                          />
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={analyzingImage}
                            className="flex items-center gap-1 text-xs bg-indigo-900 hover:bg-indigo-800 text-indigo-200 px-2 py-1 rounded border border-indigo-700 transition-colors"
                          >
                             {analyzingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                             Upload Reference
                          </button>
                      </div>
                  )}
              </label>
              <textarea
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-6 text-slate-200 text-lg leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none shadow-inner font-mono"
                placeholder={`Write about the ${STEPS[activeStep].label.toLowerCase()} here...`}
                value={getStepContent()}
                onChange={(e) => handleInputChange(e.target.value)}
              />
            </div>

            {/* AI Chat Builder Area */}
            <div className="flex flex-col h-full min-h-[400px]">
               <AiChat 
                 stepLabel={STEPS[activeStep].label}
                 scenarioData={project.scenario}
                 onApplyContent={handleAiApply}
               />
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-slate-900 border-t border-slate-800 p-4 flex justify-between items-center px-8 shrink-0">
           <span className="text-slate-500 text-sm hidden md:inline">Step {activeStep + 1} of {STEPS.length}</span>
           <div className="flex gap-4 w-full md:w-auto justify-end">
             <button 
                onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                disabled={activeStep === 0}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
             >
                Previous
             </button>

             {activeStep === STEPS.length - 1 ? (
               <button 
                onClick={onNext}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
               >
                 Go to Storyboard <ChevronRight className="w-5 h-5" />
               </button>
             ) : (
               <button 
                onClick={() => setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1))}
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
               >
                 Next Step
               </button>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioWizard;
