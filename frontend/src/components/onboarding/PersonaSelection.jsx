import React from 'react';
import { Button } from '@/components/ui/button';
import { User, Brain, Code, Briefcase, GraduationCap } from 'lucide-react';

const personas = [
  { id: 'trader', label: 'Trader', icon: User, description: 'Focus on real-time sentiment and trade signals.' },
  { id: 'researcher', label: 'Quant Researcher', icon: Brain, description: 'Analyse historical data and model accuracy.' },
  { id: 'developer', label: 'Developer', icon: Code, description: 'Integrate sentiment into your own applications.' },
  { id: 'analyst', label: 'Financial Analyst', icon: Briefcase, description: 'Support investment theses with sentiment data.' },
  { id: 'student', label: 'Student', icon: GraduationCap, description: 'Learn about NLP in finance.' },
];

const PersonaSelection = ({ onSelect, onSkip }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
      What is your primary focus?
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {personas.map((persona) => (
        <button
          key={persona.id}
          onClick={() => onSelect(persona.id)}
          className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-600 dark:hover:border-blue-400 transition text-left flex items-start gap-4"
        >
          <persona.icon className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">{persona.label}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{persona.description}</div>
          </div>
        </button>
      ))}
    </div>
    <div className="text-center mt-4">
      <Button variant="ghost" onClick={onSkip}>Skip</Button>
    </div>
  </div>
);

export default PersonaSelection;