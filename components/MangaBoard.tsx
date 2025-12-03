
import React, { useState, useEffect, useRef } from 'react';
import { Project, Page, Panel, Bubble } from '../types';
import { generatePanelImage, generatePageLayout, generateFullChapter, summarizeEpisode } from '../services/geminiService';
import { 
  Plus, Image as ImageIcon, MessageSquare, 
  Trash2, Download, Wand2, Loader2, LayoutGrid,
  Move, Type, BrainCircuit, Sparkles, FileText, Layers, FileDown,
  Palette, Zap, Play, Forward
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface Props {
  project: Project;
  onUpdate: (project: Project) => void;
  onBack: () => void;
}

const SFX_PRESETS = [
  { label: 'BOOM (Don!)', text: 'ドン!', type: 'shout' },
  { label: 'GOGO (Menace)', text: 'ゴゴゴ', type: 'caption' },
  { label: 'BANG (Ban!)', text: 'バン!', type: 'shout' },
  { label: 'SHOCK (Doon!)', text: 'ドーン!', type: 'shout' },
  { label: 'SILENCE (Shiiin)', text: 'シーン...', type: 'caption' },
];

const MangaBoard: React.FC<Props> = ({ project, onUpdate, onBack }) => {
  const [activePageId, setActivePageId] = useState<string>(project.pages[0]?.id || '');
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [autoDrafting, setAutoDrafting] = useState(false);
  const [fullChapterLoading, setFullChapterLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [finishingEpisode, setFinishingEpisode] = useState(false);
  const [prompt, setPrompt] = useState('');
  
  const [inkMode, setInkMode] = useState(project.scenario.colorMode === 'bw');

  const [draggingBubble, setDraggingBubble] = useState<{ panelId: string, bubbleId: string } | null>(null);
  const dragStartPos = useRef<{ x: number, y: number } | null>(null);
  const activeBubblePos = useRef<{ x: number, y: number } | null>(null);

  // Sync activePageId when project pages change (e.g. after Full Chapter Gen or Next Episode)
  useEffect(() => {
    const pageExists = project.pages.find(p => p.id === activePageId);
    if (!pageExists && project.pages.length > 0) {
      setActivePageId(project.pages[0].id);
      setSelectedPanelId(null);
    }
  }, [project.pages, activePageId]);

  const activePage = project.pages.find(p => p.id === activePageId);
  const activePanel = activePage?.panels.find(p => p.id === selectedPanelId);

  // --- Drag & Drop Logic ---

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!draggingBubble || !dragStartPos.current || !activeBubblePos.current) return;

      const panelEl = document.getElementById(`panel-${draggingBubble.panelId}`);
      if (!panelEl) return;

      const rect = panelEl.getBoundingClientRect();
      const dxPx = e.clientX - dragStartPos.current.x;
      const dyPx = e.clientY - dragStartPos.current.y;

      const dxPct = (dxPx / rect.width) * 100;
      const dyPct = (dyPx / rect.height) * 100;

      let newX = activeBubblePos.current.x + dxPct;
      let newY = activeBubblePos.current.y + dyPct;

      newX = Math.max(0, Math.min(90, newX));
      newY = Math.max(0, Math.min(90, newY));

      updateBubblePosition(draggingBubble.panelId, draggingBubble.bubbleId, newX, newY);
    };

    const handleGlobalMouseUp = () => {
      if (draggingBubble) {
        setDraggingBubble(null);
        dragStartPos.current = null;
        activeBubblePos.current = null;
      }
    };

    if (draggingBubble) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingBubble, project]);

  const startDrag = (e: React.MouseEvent, panelId: string, bubble: Bubble) => {
    e.stopPropagation(); 
    setSelectedPanelId(panelId);
    setDraggingBubble({ panelId, bubbleId: bubble.id });
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    activeBubblePos.current = { x: bubble.x, y: bubble.y };
  };

  const updateBubblePosition = (panelId: string, bubbleId: string, x: number, y: number) => {
    const newPages = project.pages.map(page => {
      if (page.id === activePageId) {
        return {
          ...page,
          panels: page.panels.map(p => {
            if (p.id === panelId) {
              return {
                ...p,
                bubbles: p.bubbles.map(b => b.id === bubbleId ? { ...b, x, y } : b)
              };
            }
            return p;
          })
        };
      }
      return page;
    });
    onUpdate({ ...project, pages: newPages });
  };

  // --- Actions ---

  const addPage = () => {
    const newPage: Page = {
      id: Date.now().toString(),
      panels: [
        { id: `p-${Date.now()}-1`, description: '', bubbles: [] },
        { id: `p-${Date.now()}-2`, description: '', bubbles: [] },
        { id: `p-${Date.now()}-3`, description: '', bubbles: [] },
      ]
    };
    onUpdate({ ...project, pages: [...project.pages, newPage] });
    setActivePageId(newPage.id);
  };

  const handleAutoDraft = async () => {
    if (!activePage) return;
    setAutoDrafting(true);

    const layoutData = await generatePageLayout(project.scenario);
    
    if (layoutData && layoutData.length > 0) {
      const newPanels: Panel[] = layoutData.map((item: any, index: number) => ({
        id: `p-${Date.now()}-${index}`,
        description: item.description,
        bubbles: item.bubbles.map((b: any, bIdx: number) => ({
          id: `b-${Date.now()}-${index}-${bIdx}`,
          text: b.text,
          type: b.type,
          x: 50 + (bIdx * 5),
          y: 20 + (bIdx * 10)
        }))
      }));

      const newPages = project.pages.map(page => {
        if (page.id === activePageId) {
          return { ...page, panels: newPanels };
        }
        return page;
      });
      onUpdate({ ...project, pages: newPages });
      
      if (newPanels.length > 0) {
        setSelectedPanelId(newPanels[0].id);
        setPrompt(newPanels[0].description);
      }
    }
    setAutoDrafting(false);
  };

  const handleFullChapterGen = async () => {
    setFullChapterLoading(true);
    const chapterData = await generateFullChapter(project.scenario);
    
    if (chapterData && chapterData.length > 0) {
        const generatedPages: Page[] = chapterData.map((pData: any, pIdx: number) => {
             const timestamp = Date.now() + pIdx;
             return {
                 id: `page_${timestamp}`,
                 panels: pData.panels.map((item: any, idx: number) => ({
                    id: `p-${timestamp}-${idx}`,
                    description: item.description,
                    bubbles: item.bubbles.map((b: any, bIdx: number) => ({
                        id: `b-${timestamp}-${idx}-${bIdx}`,
                        text: b.text,
                        type: b.type,
                        x: 20 + (bIdx * 10),
                        y: 20 + (bIdx * 10)
                    }))
                 }))
             }
        });
        onUpdate({ ...project, pages: generatedPages });
        // UseEffect will handle activePageId update
    }
    setFullChapterLoading(false);
  };

  const handleGenerateImage = async () => {
    if (!activePanel || !prompt) return;
    setGenerating(true);

    let previousDesc = undefined;
    if (activePage) {
        const currentIdx = activePage.panels.findIndex(p => p.id === activePanel.id);
        if (currentIdx > 0) {
            previousDesc = activePage.panels[currentIdx - 1].description;
        }
    }

    const imageUrl = await generatePanelImage(prompt, project.scenario, previousDesc);
    if (imageUrl) {
      updatePanel(activePanel.id, { imageUrl, description: prompt });
    }
    setGenerating(false);
  };

  const handleGenerateAllImages = async () => {
    if (!activePage) return;
    setGeneratingAll(true);

    const panelsToGen = activePage.panels.filter(p => p.description && !p.imageUrl);
    
    if (panelsToGen.length === 0) {
        setGeneratingAll(false);
        return;
    }

    const promises = panelsToGen.map(async (panel) => {
        const pIndex = activePage.panels.findIndex(p => p.id === panel.id);
        const prevDesc = pIndex > 0 ? activePage.panels[pIndex - 1].description : undefined;
        const url = await generatePanelImage(panel.description, project.scenario, prevDesc);
        return { panelId: panel.id, url };
    });

    const results = await Promise.all(promises);

    const newPages = project.pages.map(page => {
        if (page.id === activePageId) {
            return {
                ...page,
                panels: page.panels.map(p => {
                    const res = results.find(r => r.panelId === p.id);
                    if (res && res.url) {
                        return { ...p, imageUrl: res.url };
                    }
                    return p;
                })
            };
        }
        return page;
    });

    onUpdate({ ...project, pages: newPages });
    setGeneratingAll(false);
  };

  const handleFinishEpisode = async () => {
      if (!confirm("Are you sure? This will finalize this chapter, generate a summary, and prepare the project for the next episode.")) return;
      
      setFinishingEpisode(true);
      const summary = await summarizeEpisode(project.scenario);
      const newChapterNum = (project.scenario.chapterNumber || 1) + 1;
      const newSynopsis = (project.scenario.previousSynopsis || '') + `\n\n[CHAPTER ${project.scenario.chapterNumber} SUMMARY]:\n${summary}`;
      
      const nextProjectState: Project = {
          ...project,
          scenario: {
              ...project.scenario,
              chapterNumber: newChapterNum,
              previousSynopsis: newSynopsis,
              script: '', 
              detailedPlot: '', 
              keyEvents: '', 
              dialogues: '', 
              coverDescription: '', 
          },
          pages: [ 
            {
                id: `ep${newChapterNum}_p1`,
                panels: [{ id: `p-${Date.now()}-1`, description: 'COVER PAGE: New Chapter', bubbles: [] }]
            }
          ]
      };
      
      onUpdate(nextProjectState);
      setFinishingEpisode(false);
      alert(`Chapter ${project.scenario.chapterNumber} finalized! Starting Chapter ${newChapterNum}.`);
  };

  const updatePanel = (panelId: string, updates: Partial<Panel>) => {
    if (!activePage) return;
    const newPages = project.pages.map(page => {
      if (page.id === activePageId) {
        return {
          ...page,
          panels: page.panels.map(p => p.id === panelId ? { ...p, ...updates } : p)
        };
      }
      return page;
    });
    onUpdate({ ...project, pages: newPages });
  };

  const addBubble = (type: Bubble['type'], textOverride?: string) => {
    if (!selectedPanelId || !activePage) return;
    const newBubble: Bubble = {
        id: Date.now().toString(),
        text: textOverride || 'New text...',
        type,
        x: 40, 
        y: 40
    };
    const newPages = project.pages.map(page => {
        if(page.id === activePageId) {
            return {
                ...page,
                panels: page.panels.map(p => {
                    if(p.id === selectedPanelId) {
                        return { ...p, bubbles: [...p.bubbles, newBubble] };
                    }
                    return p;
                })
            }
        }
        return page;
    });
    onUpdate({ ...project, pages: newPages });
  };

  const handleExportPDF = async () => {
    setExporting(true);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    try {
      for (let i = 0; i < project.pages.length; i++) {
        const pageId = project.pages[i].id;
        const el = document.getElementById(`export-page-${pageId}`);
        
        if (el) {
          const canvas = await html2canvas(el, { 
            scale: 2,
            useCORS: true, 
            logging: false 
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.9);
          
          if (i > 0) pdf.addPage();
          
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }
      }
      pdf.save(`${project.scenario.title || 'manga-project'}_Ch${project.scenario.chapterNumber}.pdf`);
    } catch (e) {
      console.error("Export failed", e);
      alert("Export failed. Please check console.");
    } finally {
      setExporting(false);
    }
  };

  const imageStyle = inkMode 
    ? { filter: 'grayscale(100%) contrast(120%) brightness(105%)' }
    : {};

  return (
    <div className="flex h-full bg-slate-950 text-slate-200">
      
      {/* Hidden Container for Exporting */}
      <div 
        id="export-container" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: '-9999px', 
          width: '794px', 
        }}
      >
        {project.pages.map((page, i) => (
          <div 
            key={page.id} 
            id={`export-page-${page.id}`}
            className="w-[794px] h-[1123px] bg-white p-8 grid grid-cols-2 gap-4 border-black mb-10"
            style={{ display: 'grid' }}
          >
             {page.panels.map((panel, idx) => (
               <div 
                 key={panel.id} 
                 className={`relative border-2 border-black overflow-hidden bg-white ${
                    page.panels.length === 3 && idx === 0 ? 'col-span-2 row-span-2' : 
                    page.panels.length === 1 ? 'col-span-2 row-span-2 h-full' :
                    'col-span-1'
                 }`}
               >
                 {panel.imageUrl && (
                   <img src={panel.imageUrl} className="w-full h-full object-cover" style={imageStyle} />
                 )}
                 {panel.bubbles.map(b => (
                   <div 
                      key={b.id}
                      style={{ top: `${b.y}%`, left: `${b.x}%` }}
                      className={`absolute bg-white text-black p-3 text-xs font-comic text-center border-2 border-black max-w-[150px] z-20
                        ${b.type === 'thought' ? 'rounded-[20px] border-dashed' : 
                          b.type === 'shout' ? 'rounded-none transform -rotate-2 border-4 font-bold uppercase' : 
                          b.type === 'caption' ? 'rounded-none bg-yellow-100 shadow-none border text-left' : 'rounded-[50%]'
                        }
                      `}
                   >
                     {b.text}
                   </div>
                 ))}
               </div>
             ))}
             <div className="absolute bottom-4 right-4 text-black font-bold">{i + 1}</div>
          </div>
        ))}
      </div>

      {/* Left: Page Navigator */}
      <div className="w-24 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-4 overflow-y-auto z-10">
        <div className="text-xs font-bold text-slate-500 uppercase mb-2">Pages</div>
        {project.pages.map((page, idx) => (
          <button
            key={page.id}
            onClick={() => setActivePageId(page.id)}
            className={`w-16 h-20 border-2 rounded flex items-center justify-center text-sm font-bold transition-all relative group ${
              activePageId === page.id 
              ? 'border-indigo-500 bg-indigo-900/20 text-indigo-400 shadow-lg shadow-indigo-500/20' 
              : 'border-slate-700 hover:border-slate-500 text-slate-500 bg-slate-800'
            }`}
          >
            {idx === 0 ? 'COV' : idx + 1}
            <span className="absolute -top-2 -right-2 bg-slate-950 text-[10px] text-slate-600 px-1 border border-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {page.panels.length}p
            </span>
          </button>
        ))}
        <button 
          onClick={addPage}
          className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 border border-slate-700 transition-colors mt-2"
          title="Add Empty Page"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Middle: Canvas / Grid */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center bg-slate-950 relative">
        {/* Toolbar */}
        <div className="w-full max-w-4xl mb-6 flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-500" />
                {project.pages.findIndex(p => p.id === activePageId) === 0 ? 'COVER PAGE' : `Page ${project.pages.findIndex(p => p.id === activePageId) + 1}`}
            </h2>
            
            <div className="flex gap-3">
               <button 
                onClick={() => setInkMode(!inkMode)}
                className={`flex items-center gap-2 border px-4 py-2 rounded-lg font-bold shadow-lg text-sm transition-all ${inkMode ? 'bg-slate-100 text-black border-white' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                title="Toggle High Contrast Ink Mode"
               >
                 <Palette className="w-4 h-4" />
                 {inkMode ? 'Ink Mode: ON' : 'Ink Mode: OFF'}
               </button>

               <button 
                onClick={handleGenerateAllImages}
                disabled={generatingAll}
                className="flex items-center gap-2 bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-500/50 text-emerald-200 px-4 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 text-sm transition-all"
               >
                 {generatingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                 Gen All Images
               </button>

               <button 
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 text-sm transition-all"
               >
                 {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                 Export PDF
               </button>

               <button 
                onClick={handleFullChapterGen}
                disabled={fullChapterLoading || autoDrafting}
                className="flex items-center gap-2 bg-indigo-900/50 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-200 px-4 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 text-sm transition-all"
              >
                {fullChapterLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                Full Chapter
              </button>
            </div>
        </div>

        {/* Page Container */}
        <div className="w-full max-w-4xl bg-white aspect-[1/1.414] shadow-2xl p-8 grid grid-cols-2 gap-4">
            {activePage?.panels.map((panel, idx) => (
                <div 
                    key={panel.id}
                    id={`panel-${panel.id}`}
                    onClick={() => {
                        setSelectedPanelId(panel.id);
                        setPrompt(panel.description || '');
                    }}
                    className={`relative border-2 overflow-hidden bg-white group transition-all ${
                        selectedPanelId === panel.id 
                        ? 'border-indigo-600 ring-4 ring-indigo-500/30 z-10' 
                        : 'border-black hover:border-slate-600'
                    } ${
                        (project.pages.findIndex(p => p.id === activePageId) === 0 && idx === 0) ? 'col-span-2 row-span-6 h-full min-h-[800px]' :
                        activePage.panels.length === 3 && idx === 0 ? 'col-span-2 row-span-2 min-h-[300px]' : 
                        activePage.panels.length === 1 ? 'col-span-2 row-span-2 h-full' :
                        'col-span-1 min-h-[200px]'
                    }`}
                >
                    {panel.imageUrl ? (
                        <img src={panel.imageUrl} alt="Panel" className="w-full h-full object-cover pointer-events-none transition-all duration-500" style={imageStyle} />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                            {panel.description ? (
                                <p className="text-slate-500 text-xs italic mb-2 line-clamp-4 bg-slate-100 p-1 rounded">
                                  {panel.description.substring(0, 100)}...
                                </p>
                            ) : null}
                            <ImageIcon className={`w-8 h-8 mb-1 text-slate-400 ${!panel.description ? 'opacity-50' : ''}`} />
                            <span className="font-comic text-slate-400 text-xs uppercase">
                                {panel.description ? 'Ready to Gen' : 'Empty Panel'}
                            </span>
                        </div>
                    )}

                    {panel.bubbles.map(bubble => (
                        <div
                            key={bubble.id}
                            onMouseDown={(e) => startDrag(e, panel.id, bubble)}
                            style={{ top: `${bubble.y}%`, left: `${bubble.x}%` }}
                            className={`absolute bg-white text-black p-3 text-xs font-comic text-center shadow-[2px_2px_0px_rgba(0,0,0,0.2)] border-2 border-black max-w-[150px] cursor-move select-none hover:scale-105 active:scale-110 transition-transform
                                ${bubble.type === 'thought' ? 'rounded-[20px] border-dashed' : 
                                  bubble.type === 'shout' ? 'rounded-none transform -rotate-2 border-4 font-bold uppercase text-red-600' : 
                                  bubble.type === 'caption' ? 'rounded-none bg-yellow-100 shadow-none border text-left' : 'rounded-[50%]'
                                }
                                ${selectedPanelId === panel.id ? 'z-50' : 'z-20'}
                            `}
                        >
                            {bubble.text}
                        </div>
                    ))}
                    
                    <div className="absolute top-0 left-0 bg-black text-white px-2 py-1 text-xs font-bold z-20 pointer-events-none">
                        {idx + 1}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Right: Editor Panel */}
      <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl z-20">
        {activePanel ? (
          <>
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">Panel Editor</h3>
                  <p className="text-xs text-slate-500">ID: {activePanel.id}</p>
                </div>
                <div className="text-right">
                   <span className="text-xs font-bold text-indigo-400">Step 10 Data</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* 1. VISUAL PROMPT SECTION */}
                <div className="p-6 border-b border-slate-800 space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-2">
                            <Wand2 className="w-4 h-4" /> Visual Description (Prompt)
                        </label>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded-full border border-emerald-900">
                             <BrainCircuit className="w-3 h-3" />
                             Context Linked
                        </div>
                    </div>
                    
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="What should this panel look like? (e.g. Kenzo punching the robot)"
                        className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                    />
                    <button 
                        onClick={handleGenerateImage}
                        disabled={generating || !prompt}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg"
                    >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Image'}
                    </button>
                    {activePanel.imageUrl && (
                      <button 
                         onClick={() => updatePanel(activePanel.id, { imageUrl: undefined })}
                         className="text-xs text-slate-500 hover:text-red-400 w-full text-center mt-2"
                      >
                        Clear Image
                      </button>
                    )}
                </div>

                {/* 2. TEXT & BUBBLES SECTION */}
                <div className="p-6 space-y-4 bg-slate-900/50">
                    <label className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Dialogue & Bubbles
                        <span className="text-[10px] text-slate-500 font-normal ml-auto">(Drag on canvas to move)</span>
                    </label>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => addBubble('speech')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-center border border-slate-700 transition-colors">
                            Speech Bubble
                        </button>
                        <button onClick={() => addBubble('thought')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-center border border-slate-700 transition-colors">
                            Thought Cloud
                        </button>
                        <button onClick={() => addBubble('shout')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-center border border-slate-700 transition-colors">
                            Shout / FX
                        </button>
                        <button onClick={() => addBubble('caption')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-center border border-slate-700 transition-colors">
                            Square Caption
                        </button>
                    </div>

                     <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mt-4">
                        <Zap className="w-3 h-3 text-yellow-500" /> Japanese SFX (Katakana)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {SFX_PRESETS.map(sfx => (
                           <button 
                             key={sfx.text}
                             onClick={() => addBubble(sfx.type as any, sfx.text)}
                             className="bg-slate-800 border border-slate-700 text-xs px-2 py-1 rounded hover:bg-slate-700 hover:text-white transition-colors"
                           >
                             {sfx.text} <span className="text-[10px] text-slate-500 ml-1">({sfx.label})</span>
                           </button>
                        ))}
                    </div>
                    
                    <div className="space-y-3 mt-4">
                        {activePanel.bubbles.length === 0 && (
                          <div className="text-center p-4 border border-dashed border-slate-800 rounded text-slate-600 text-xs">
                            No text in this panel yet.
                          </div>
                        )}
                        {activePanel.bubbles.map((b, i) => (
                            <div key={b.id} className="flex flex-col gap-2 bg-slate-950 p-3 rounded border border-slate-800 relative group">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">{b.type} #{i+1}</span>
                                  <button 
                                      onClick={() => {
                                          const newBubbles = activePanel.bubbles.filter(x => x.id !== b.id);
                                          updatePanel(activePanel.id, { bubbles: newBubbles });
                                      }}
                                      className="text-slate-600 hover:text-red-400"
                                  >
                                      <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <textarea 
                                    className="w-full bg-slate-900 border border-slate-800 text-sm text-slate-300 p-2 rounded outline-none focus:border-emerald-500 resize-none" 
                                    value={b.text}
                                    rows={2}
                                    onChange={(e) => {
                                        const newBubbles = [...activePanel.bubbles];
                                        newBubbles[i].text = e.target.value;
                                        updatePanel(activePanel.id, { bubbles: newBubbles });
                                    }}
                                />
                                <div className="flex gap-2 text-[10px] text-slate-500">
                                   <span>X: {Math.round(b.x)}%</span>
                                   <span>Y: {Math.round(b.y)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8 text-center bg-slate-900/80">
            <LayoutGrid className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-slate-500">No Panel Selected</h3>
            <p className="text-sm mt-2 max-w-[200px]">Click on a panel in the page view to edit its image and dialogue.</p>
          </div>
        )}
        
        {/* Finish Episode Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
             <button 
               onClick={handleFinishEpisode}
               disabled={finishingEpisode}
               className="w-full bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 px-4 py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 transition-all"
             >
                {finishingEpisode ? <Loader2 className="w-5 h-5 animate-spin" /> : <Forward className="w-5 h-5" />}
                FINISH EPISODE {project.scenario.chapterNumber} & START NEXT
             </button>
        </div>
      </div>
    </div>
  );
};

export default MangaBoard;
