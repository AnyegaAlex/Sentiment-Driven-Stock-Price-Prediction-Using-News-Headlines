import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

// Values must match the backend choices on UserPreferences.
const GOALS = [
  { value: 'growth', label: 'Growth', description: 'Long-term capital appreciation.' },
  { value: 'income', label: 'Income', description: 'Regular income from dividends.' },
  { value: 'value', label: 'Value', description: 'Undervalued stocks with upside.' },
  { value: 'trading', label: 'Trading', description: 'Short-term opportunities.' },
  { value: 'retirement', label: 'Retirement', description: 'Build a portfolio for later life.' },
];

const RISK = [
  { value: 'conservative', label: 'Conservative', description: 'Protect capital first. Smaller swings, smaller gains.' },
  { value: 'moderate', label: 'Moderate', description: 'Balance growth against drawdowns.' },
  { value: 'aggressive', label: 'Aggressive', description: 'Accept large swings for higher upside.' },
];

const EXPERIENCE = [
  { value: 'beginner', label: 'Beginner', description: 'New to investing or trading.' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience with stocks.' },
  { value: 'advanced', label: 'Advanced', description: 'Experienced trader or analyst.' },
];

// Each answer carries a score from 0 (cautious) to 2 (risk-seeking).
const DRAWDOWN_QUESTION = {
  id: 'drawdown',
  question: 'If your portfolio fell 20% in a month, what would you most likely do?',
  options: [
    { label: 'Sell to limit further losses', score: 0 },
    { label: 'Hold and wait for a recovery', score: 1 },
    { label: 'Buy more at the lower price', score: 2 },
  ],
};

const HORIZON_QUESTION = {
  id: 'horizon',
  question: 'How long do you expect to keep this money invested?',
  options: [
    { label: 'Under 1 year', score: 0 },
    { label: '1 to 5 years', score: 1 },
    { label: 'More than 5 years', score: 2 },
  ],
};

const suggestRisk = (scores) => {
  if (scores.drawdown === undefined || scores.horizon === undefined) return null;
  const average = (scores.drawdown + scores.horizon) / 2;
  if (average < 0.75) return 'conservative';
  if (average < 1.5) return 'moderate';
  return 'aggressive';
};

const cardClass = (selected) =>
  `w-full text-left rounded-xl border p-4 min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 ${
    selected ? 'border-white bg-white/5 hover:border-gray-300' : 'border-gray-800 hover:border-gray-600'
  }`;

const InvestmentProfileStep = ({ initial, onNext, onBack, onSkip, loading = false, error = null }) => {
  const [answers, setAnswers] = useState({});
  const [goal, setGoal] = useState(initial?.investment_goal || null);
  const [risk, setRisk] = useState(initial?.risk_tolerance || null);
  const [experience, setExperience] = useState(initial?.experience_level || null);
  const [riskTouched, setRiskTouched] = useState(Boolean(initial?.risk_tolerance));

  const scores = useMemo(() => {
    const result = {};
    if (answers.drawdown !== undefined) result.drawdown = answers.drawdown;
    if (answers.horizon !== undefined) result.horizon = answers.horizon;
    return result;
  }, [answers]);

  const suggested = suggestRisk(scores);

  // Keep the suggestion in sync until the user picks a risk level themselves.
  const effectiveRisk = riskTouched ? risk : suggested || risk;

  const answerQuestion = (question, score) => {
    setAnswers((prev) => ({ ...prev, [question.id]: score }));
  };

  const canContinue = Boolean(goal && effectiveRisk && experience) && !loading;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canContinue) return;
    onNext({
      investment_goal: goal,
      risk_tolerance: effectiveRisk,
      experience_level: experience,
    });
  };

  const renderQuestion = (question) => (
    <fieldset key={question.id} className="space-y-3">
      <legend className="text-sm sm:text-base font-medium text-gray-200 mb-3">{question.question}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {question.options.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={answers[question.id] === option.score}
            onClick={() => answerQuestion(question, option.score)}
            className={`${cardClass(answers[question.id] === option.score)} text-sm`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );

  const renderCards = (items, selected, onSelect, name) => (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="radio"
          aria-checked={selected === item.value}
          onClick={() => onSelect(item.value)}
          className={cardClass(selected === item.value)}
        >
          <span className="block text-base font-semibold text-white">{item.label}</span>
          <span className="mt-1 block text-sm text-gray-400">{item.description}</span>
        </button>
      ))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-left">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">How do you invest?</h2>
        <p className="text-sm sm:text-base text-gray-400">
          This tunes the signals, risk warnings and watchlist suggestions you see. Change it anytime in Settings.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-gray-800 p-4 sm:p-6">
        <h3 className="text-base font-semibold text-white">Quick risk check</h3>
        {renderQuestion(DRAWDOWN_QUESTION)}
        {renderQuestion(HORIZON_QUESTION)}
        {suggested && (
          <p className="text-sm text-gray-300">
            Based on your answers, your risk appetite looks{' '}
            <span className="font-semibold text-white">{suggested}</span>. You can override it below.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-white">Risk appetite</h3>
        {renderCards(RISK, effectiveRisk, (value) => {
          setRisk(value);
          setRiskTouched(true);
        }, 'Risk appetite')}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-white">Primary goal</h3>
        {renderCards(GOALS, goal, setGoal, 'Primary goal')}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-white">Experience level</h3>
        {renderCards(EXPERIENCE, experience, setExperience, 'Experience level')}
      </section>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="min-h-[44px] px-4 text-sm text-gray-400 hover:text-white disabled:opacity-50"
        >
          Back
        </button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            className="min-h-[44px] px-4 text-sm text-gray-400 hover:text-white disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            type="submit"
            disabled={!canContinue}
            className="min-h-[44px] rounded-lg bg-white px-8 py-3 text-base font-semibold text-black hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </form>
  );
};

InvestmentProfileStep.propTypes = {
  initial: PropTypes.shape({
    investment_goal: PropTypes.string,
    risk_tolerance: PropTypes.string,
    experience_level: PropTypes.string,
  }),
  onNext: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onSkip: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
};

export default InvestmentProfileStep;
