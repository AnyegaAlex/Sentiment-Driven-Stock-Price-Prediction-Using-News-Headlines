import React, { useState } from 'react';
import PropTypes from 'prop-types';

const inputClass =
  'w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500';

/**
 * Asks for the user's first and last name during onboarding.
 * Both fields are optional so users can skip, but completing them
 * personalises the dashboard and account screens.
 */
const ProfileStep = ({ initial, onNext, onBack, onSkip, loading = false }) => {
  const [firstName, setFirstName] = useState(initial?.first_name || '');
  const [lastName, setLastName] = useState(initial?.last_name || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext({ first_name: firstName.trim(), last_name: lastName.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-left">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">What should we call you?</h2>
        <p className="text-sm sm:text-base text-gray-400">
          Your name appears on your account and in reports. You can change it later in Settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-gray-300">First name</span>
          <input
            type="text"
            autoComplete="given-name"
            maxLength={50}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Alex"
            className={inputClass}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-gray-300">Last name</span>
          <input
            type="text"
            autoComplete="family-name"
            maxLength={50}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Kamau"
            className={inputClass}
          />
        </label>
      </div>

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
            disabled={loading}
            className="min-h-[44px] rounded-lg bg-white px-8 py-3 text-base font-semibold text-black hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </form>
  );
};

ProfileStep.propTypes = {
  initial: PropTypes.shape({ first_name: PropTypes.string, last_name: PropTypes.string }),
  onNext: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onSkip: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default ProfileStep;
