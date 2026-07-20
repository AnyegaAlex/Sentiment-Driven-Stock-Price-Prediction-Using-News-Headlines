// pages/Onboarding/Step2_Preferences.jsx
import React from 'react';

const Step2_Preferences = ({ formData, setFormData }) => {
  const goals = [
    { value: 'growth', label: 'Growth', description: 'Focus on long‑term capital appreciation.' },
    { value: 'income', label: 'Income', description: 'Generate regular income from dividends.' },
    { value: 'value', label: 'Value', description: 'Look for undervalued stocks with potential.' },
    { value: 'trading', label: 'Trading', description: 'Active short‑term opportunities.' },
    { value: 'retirement', label: 'Retirement', description: 'Build a portfolio for retirement.' },
  ];

  const riskLevels = [
    { value: 'conservative', label: 'Conservative', description: 'Low risk, stable returns.' },
    { value: 'moderate', label: 'Moderate', description: 'Balanced risk and reward.' },
    { value: 'aggressive', label: 'Aggressive', description: 'High risk, high reward.' },
  ];

  const experienceLevels = [
    { value: 'beginner', label: 'Beginner', description: 'New to investing.' },
    { value: 'intermediate', label: 'Intermediate', description: 'Some experience with stocks.' },
    { value: 'advanced', label: 'Advanced', description: 'Experienced trader or analyst.' },
  ];

  const personaChoices = [
    { value: 'trader', label: 'Trader', description: 'Active, short‑term focused.' },
    { value: 'researcher', label: 'Quant Researcher', description: 'Data‑driven, deep analysis.' },
    { value: 'developer', label: 'Developer', description: 'Building on our APIs.' },
    { value: 'analyst', label: 'Financial Analyst', description: 'Professional investment analysis.' },
    { value: 'student', label: 'Student', description: 'Learning about markets and AI.' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Your investment style
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        These help us tailor the content and recommendations you see.
      </p>

      <div className="space-y-6">
        {/* Investment Goal */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Investment Goal <span className="text-red-500">*</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {goals.map((goal) => (
              <button
                key={goal.value}
                type="button"
                onClick={() => setFormData({ ...formData, investmentGoal: goal.value })}
                className={`p-4 text-left rounded-lg border-2 transition-all ${
                  formData.investmentGoal === goal.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-white">{goal.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{goal.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Risk Tolerance */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Risk Tolerance <span className="text-red-500">*</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {riskLevels.map((risk) => (
              <button
                key={risk.value}
                type="button"
                onClick={() => setFormData({ ...formData, riskTolerance: risk.value })}
                className={`p-4 text-center rounded-lg border-2 transition-all ${
                  formData.riskTolerance === risk.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-white">{risk.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{risk.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Experience Level */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Experience Level <span className="text-red-500">*</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {experienceLevels.map((exp) => (
              <button
                key={exp.value}
                type="button"
                onClick={() => setFormData({ ...formData, experienceLevel: exp.value })}
                className={`p-4 text-center rounded-lg border-2 transition-all ${
                  formData.experienceLevel === exp.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-white">{exp.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{exp.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Persona */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your role <span className="text-red-500">*</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {personaChoices.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setFormData({ ...formData, persona: p.value })}
                className={`p-4 text-left rounded-lg border-2 transition-all ${
                  formData.persona === p.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-white">{p.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{p.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step2_Preferences;