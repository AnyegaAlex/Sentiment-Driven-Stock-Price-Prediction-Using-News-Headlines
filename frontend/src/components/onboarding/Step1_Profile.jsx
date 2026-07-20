// pages/Onboarding/Step1_Profile.jsx
/**
 * Step 1 of the onboarding flow.
 * Collects the user's nickname, full name, and a short bio.
 *
 * Nickname is required; the rest are optional.
 * All fields are stored in the parent's formData state.
 */

import React from 'react';

const Step1_Profile = ({ formData, setFormData }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Tell us about yourself
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        This helps us personalise your experience.
      </p>

      <div className="space-y-4">
        {/* Nickname – required */}
        <div>
          <label
            htmlFor="nickname"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Nickname <span className="text-red-500">*</span>
          </label>
          <input
            id="nickname"
            type="text"
            value={formData.nickname}
            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
            placeholder="e.g., StockWatcher, CryptoGuru"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            This will be shown on your profile and predictions.
          </p>
        </div>

        {/* Full Name – optional */}
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Your full name"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Bio – optional */}
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Bio (optional)
          </label>
          <textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell us a bit about your trading journey..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          />
        </div>
      </div>
    </div>
  );
};

export default Step1_Profile;