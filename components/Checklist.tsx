
import React from 'react';
import { Project, STEPS } from '../types';
import { CheckCircle2, Circle, X } from 'lucide-react';

interface Props {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToStep: (stepId: string) => void;
}

const Checklist: React.FC<Props> = ({ project, isOpen, onClose, onNavigateToStep }) => {
  if (!isOpen) return null;

  const getStepStatus = (stepId: string) => {
    const s = project.scenario;
    switch (stepId) {
      case 'characters': return !!s.charactersText;
      case 'theme': return !!s.theme;
      case 'tone': return !!s.tone;
      case 'universe': return !!s.universe;
      case 'ideas': return !!s.ideas;
      case 'plan': return !!s.generalPlan;
      case 'beats': return !!s.keyEvents;
      case 'development': return !!s.detailedPlot;
      case 'dialogue': return !!s.dialogues;
      case 'storyboard': return !!s.script;
      default: return false;
    }
  };

  const completedCount = STEPS.filter(s => getStepStatus(s.id)).length;
  const progress = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 transform transition-transform duration-300">
      <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-white font-comic tracking-wider">MISSION LOG</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2 text-slate-400">
            <span>Project Completion</span>
            <span className="text-indigo-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {STEPS.map((step, index) => {
            const isDone = getStepStatus(step.id);
            return (
              <div 
                key={step.id}
                onClick={() => onNavigateToStep(step.id)}
                className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${
                  isDone 
                  ? 'border-emerald-900/50 bg-emerald-900/10 hover:bg-emerald-900/20' 
                  : 'border-slate-800 bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600" />
                )}
                <div>
                  <h4 className={`text-sm font-bold ${isDone ? 'text-emerald-200' : 'text-slate-400'}`}>
                    {step.label}
                  </h4>
                  {!isDone && <p className="text-[10px] text-indigo-400 mt-1">Click to complete</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
           <p className="text-xs text-slate-500 italic">
             "Complete all steps to unlock maximum AI creativity."
           </p>
        </div>
      </div>
    </div>
  );
};

export default Checklist;
