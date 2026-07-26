import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { User, Brain, Code, Briefcase, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

const personas = [
  { 
    id: 'trader', 
    label: 'Trader', 
    icon: User, 
    description: 'Real-time sentiment and trade signals' 
  },
  { 
    id: 'researcher', 
    label: 'Quant Researcher', 
    icon: Brain, 
    description: 'Historical data analysis and model accuracy' 
  },
  { 
    id: 'developer', 
    label: 'Developer', 
    icon: Code, 
    description: 'Integrate sentiment into applications' 
  },
  { 
    id: 'analyst', 
    label: 'Financial Analyst', 
    icon: Briefcase, 
    description: 'Sentiment data for investment theses' 
  },
  { 
    id: 'student', 
    label: 'Student', 
    icon: GraduationCap, 
    description: 'Learn NLP in finance' 
  },
];

const propTypes = {
  /** Function to call with selected persona ID */
  onSelect: PropTypes.func.isRequired,
  /** Function to call when skipping */
  onSkip: PropTypes.func.isRequired,
  /** Whether a loading action is in progress */
  isLoading: PropTypes.bool,
  /** Currently selected persona (for controlled mode) */
  selectedPersona: PropTypes.string,
};

const PersonaSelection = ({ 
  onSelect, 
  onSkip, 
  isLoading = false,
  selectedPersona = null,
}) => {
  const [selected, setSelected] = useState(selectedPersona);

  const handleSelect = (id) => {
    setSelected(id);
  };

  const handleContinue = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className="space-y-6 bg-black">
      <h2 className="text-2xl font-bold text-white text-center">
        What is your primary focus?
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {personas.map((persona) => (
          <button
            key={persona.id}
            onClick={() => handleSelect(persona.id)}
            className={cn(
              'p-4 border-2 rounded-xl transition-all text-left flex items-start gap-4',
              'hover:border-gray-600',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
              selected === persona.id
                ? 'border-white bg-gray-800'
                : 'border-gray-800'
            )}
            disabled={isLoading}
            aria-pressed={selected === persona.id}
          >
            <persona.icon className={cn(
              'h-6 w-6 flex-shrink-0 mt-1',
              selected === persona.id
                ? 'text-white'
                : 'text-gray-500'
            )} />
            <div>
              <div className="font-semibold text-white">
                {persona.label}
              </div>
              <div className="text-sm text-gray-400">
                {persona.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-4 pt-4">
        <Button
          onClick={handleContinue}
          disabled={!selected || isLoading}
          size="lg"
          className="min-h-[44px] bg-white text-black hover:bg-gray-200 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={isLoading}
          className="min-h-[44px] text-gray-400 hover:text-white hover:bg-gray-800 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
        >
          Skip
        </Button>
      </div>
    </div>
  );
};

PersonaSelection.propTypes = propTypes;

export default PersonaSelection;