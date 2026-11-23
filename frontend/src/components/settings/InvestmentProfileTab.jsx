import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';

const DEFAULT_VALUES = {
  investment_goal: 'growth',
  risk_tolerance: 'moderate',
  experience_level: 'beginner',
};

const FIELDS = [
  {
    name: 'investment_goal',
    label: 'Primary investment goal',
    description: 'What matters most in your investment research?',
    options: [
      ['growth', 'Long-term growth'],
      ['income', 'Income'],
      ['value', 'Value'],
      ['trading', 'Active trading'],
      ['retirement', 'Retirement'],
    ],
  },
  {
    name: 'risk_tolerance',
    label: 'Risk tolerance',
    description: 'How comfortable are you with market volatility?',
    options: [
      ['conservative', 'Conservative'],
      ['moderate', 'Moderate'],
      ['aggressive', 'Aggressive'],
    ],
  },
  {
    name: 'experience_level',
    label: 'Experience level',
    description: 'How would you describe your investing experience?',
    options: [
      ['beginner', 'Beginner'],
      ['intermediate', 'Intermediate'],
      ['advanced', 'Advanced'],
    ],
  },
];

const readValues = (preferences) => ({
  investment_goal: preferences?.investment_goal || DEFAULT_VALUES.investment_goal,
  risk_tolerance: preferences?.risk_tolerance || DEFAULT_VALUES.risk_tolerance,
  experience_level: preferences?.experience_level || DEFAULT_VALUES.experience_level,
});

const InvestmentProfileTab = ({ preferences, onSave, isSaving, saveStatus }) => {
  const savedValues = useMemo(() => readValues(preferences), [preferences]);
  const [form, setForm] = useState(savedValues);

  useEffect(() => {
    setForm(savedValues);
  }, [savedValues]);

  const hasChanges = FIELDS.some(({ name }) => form[name] !== savedValues[name]);
  const saving = isSaving || saveStatus?.type === 'saving';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasChanges || saving) return;
    await onSave(form);
  };

  return (
    <Card className="border border-gray-800 bg-gray-900">
      <CardHeader>
        <CardTitle className="text-white">Investment Profile</CardTitle>
        <CardDescription className="text-gray-400">
          These preferences shape how your research is presented. They do not predict returns or guarantee outcomes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {FIELDS.map((field) => (
            <div key={field.name} className="space-y-2">
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-200">
                {field.label}
              </label>
              <select
                id={field.name}
                name={field.name}
                value={form[field.name]}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  [field.name]: event.target.value,
                }))}
                disabled={saving}
                className="min-h-[46px] w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-white focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {field.options.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">{field.description}</p>
            </div>
          ))}

          {saveStatus?.type === 'success' && (
            <p role="status" className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Your investment profile has been saved.
            </p>
          )}
          {saveStatus?.type === 'error' && (
            <p role="alert" className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {saveStatus.message || 'Your changes could not be saved. Try again.'}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={!hasChanges || saving}
              className="min-h-[44px] bg-white text-black hover:bg-gray-200 disabled:opacity-50"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm(savedValues)}
              disabled={!hasChanges || saving}
              className="min-h-[44px] border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Discard changes
            </Button>
          </div>
          {hasChanges && !saving && (
            <p className="text-sm text-amber-300" role="status">You have unsaved changes.</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

InvestmentProfileTab.propTypes = {
  preferences: PropTypes.shape({
    investment_goal: PropTypes.string,
    risk_tolerance: PropTypes.string,
    experience_level: PropTypes.string,
  }),
  onSave: PropTypes.func.isRequired,
  isSaving: PropTypes.bool,
  saveStatus: PropTypes.shape({
    type: PropTypes.string,
    message: PropTypes.string,
  }),
};

export default InvestmentProfileTab;
