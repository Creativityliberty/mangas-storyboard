
export interface Character {
  id: string;
  name: string;
  role: string;
  traits: string;
  appearance: string;
}

export interface Bubble {
  id: string;
  text: string;
  type: 'speech' | 'thought' | 'shout' | 'caption';
  x: number;
  y: number;
}

export interface Panel {
  id: string;
  description: string; // The prompt
  imageUrl?: string;
  bubbles: Bubble[];
}

export interface Page {
  id: string;
  panels: Panel[];
}

export interface ScenarioData {
  title: string;
  chapterNumber: number; // NEW: Track episode number
  previousSynopsis: string; // NEW: Memory of previous episodes
  // Step 1
  charactersText: string; 
  // Step 2
  theme: string;
  // Step 3
  tone: string;
  colorMode: 'bw' | 'color'; 
  // Step 4
  universe: string;
  // Step 5
  ideas: string;
  // Step 6
  generalPlan: string;
  // Step 7
  keyEvents: string;
  // Step 8
  detailedPlot: string;
  // Step 9
  dialogues: string;
  // Step 10
  script: string;
  // Step 11
  coverDescription: string;
}

export interface Project {
  id: string;
  scenario: ScenarioData;
  pages: Page[];
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export type ViewState = 'dashboard' | 'scenario' | 'storyboard' | 'editor';

export const STEPS = [
  { id: 'characters', label: '1. Personnages' },
  { id: 'theme', label: '2. Thème' },
  { id: 'tone', label: '3. Ton du récit' },
  { id: 'universe', label: '4. Univers' },
  { id: 'ideas', label: '5. Idées & Inspirations' },
  { id: 'plan', label: '6. Plan Général' },
  { id: 'beats', label: '7. Temps Forts' },
  { id: 'development', label: '8. Développement' },
  { id: 'dialogue', label: '9. Dialogues' },
  { id: 'storyboard', label: '10. Story-Board' },
  { id: 'cover', label: '11. Couverture & Titre' },
];
