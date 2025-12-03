import React, { useState } from 'react';
import { Project, ViewState } from './types';
import ScenarioWizard from './components/ScenarioWizard';
import MangaBoard from './components/MangaBoard';
import Checklist from './components/Checklist';
import { BookOpen, PenTool, Layout, FileText, PlusCircle, ListTodo } from 'lucide-react';

const INITIAL_PROJECT: Project = {
  id: 'proj_1',
  scenario: {
    title: 'New Manga Project',
    chapterNumber: 1,
    previousSynopsis: '',
    charactersText: '',
    theme: '',
    tone: 'Shonen',
    colorMode: 'bw', // Default to B&W
    universe: '',
    ideas: '',
    generalPlan: '',
    keyEvents: '',
    detailedPlot: '',
    dialogues: '',
    script: '',
    coverDescription: ''
  },
  pages: [
    {
      id: 'page_1',
      panels: [
        { id: 'p1_1', description: '', bubbles: [] },
        { id: 'p1_2', description: '', bubbles: [] },
        { id: 'p1_3', description: '', bubbles: [] },
        { id: 'p1_4', description: '', bubbles: [] },
      ]
    }
  ],
  updatedAt: Date.now(),
};

export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [project, setProject] = useState<Project>(INITIAL_PROJECT);
  const [showChecklist, setShowChecklist] = useState(false);

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="max-w-5xl mx-auto p-12">
            <div className="text-center mb-16">
               <h1 className="text-6xl font-comic text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 mb-6 drop-shadow-sm">
                 MANGAFORGE AI
               </h1>
               <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                 The intelligent studio for mangakas. Transform your raw ideas into fully realized pages with the power of Gemini 2.5.
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1: New Project */}
              <button 
                onClick={() => setView('scenario')}
                className="group relative h-64 bg-slate-900 rounded-2xl border border-slate-800 hover:border-indigo-500 transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] flex flex-col items-center justify-center overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <PlusCircle className="w-16 h-16 text-indigo-500 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-white">Create New Manga</h3>
                <p className="text-sm text-slate-500 mt-2">Start from scratch</p>
              </button>

              {/* Card 2: Continue */}
              <button 
                onClick={() => setView('storyboard')}
                className="group h-64 bg-slate-900 rounded-2xl border border-slate-800 hover:border-emerald-500 transition-all flex flex-col items-center justify-center"
              >
                <FileText className="w-12 h-12 text-emerald-500 mb-4" />
                <h3 className="text-xl font-bold text-white">{project.scenario.title}</h3>
                <p className="text-sm text-slate-500 mt-2">Last edited: Just now</p>
              </button>
            </div>
          </div>
        );

      case 'scenario':
        return (
          <ScenarioWizard 
            project={project} 
            onUpdate={setProject} 
            onNext={() => setView('storyboard')}
          />
        );

      case 'storyboard':
        return (
          <MangaBoard 
            project={project} 
            onUpdate={setProject} 
            onBack={() => setView('scenario')}
          />
        );

      default:
        return <div>Not Implemented</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* Sidebar Navigation (Collapsed) */}
      <nav className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-8 z-40">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-comic text-xl font-bold shadow-lg shadow-indigo-500/50">
          M
        </div>
        
        <div className="flex flex-col gap-6 w-full">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full p-3 flex justify-center border-l-2 transition-all ${view === 'dashboard' ? 'border-indigo-500 text-indigo-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            title="Dashboard"
          >
            <Layout className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setView('scenario')}
            className={`w-full p-3 flex justify-center border-l-2 transition-all ${view === 'scenario' ? 'border-indigo-500 text-indigo-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            title="Scenario Studio"
          >
            <BookOpen className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setView('storyboard')}
            className={`w-full p-3 flex justify-center border-l-2 transition-all ${view === 'storyboard' ? 'border-indigo-500 text-indigo-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            title="Storyboard & Art"
          >
            <PenTool className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-auto">
          <button 
            onClick={() => setShowChecklist(!showChecklist)}
            className={`w-full p-3 flex justify-center border-l-2 transition-all ${showChecklist ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            title="Mission Log / Checklist"
          >
            <ListTodo className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Main View Area */}
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
        
        {/* Checklist Overlay */}
        <Checklist 
          project={project} 
          isOpen={showChecklist} 
          onClose={() => setShowChecklist(false)}
          onNavigateToStep={(stepId) => {
             // In a real app we would navigate to specific step.
             // For now we switch to scenario view.
             setView('scenario');
             // You would pass the stepId to ScenarioWizard prop in a real implementation
             setShowChecklist(false);
          }}
        />
      </main>
    </div>
  );
}