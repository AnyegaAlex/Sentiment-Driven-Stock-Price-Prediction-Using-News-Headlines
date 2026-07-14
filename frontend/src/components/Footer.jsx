/**
 * Footer Component
 * 
 * Displays the application footer with:
 * - Copyright information
 * - Social and documentation links (GitHub, LinkedIn, Contact, API Docs)
 * - Email subscription form for updates
 * - Live demo links (Frontend, Backend, LSTM Model)
 * - MIT License notice
 * 
 * Features:
 * - Responsive layout (stacked on mobile, row on desktop)
 * - Form validation for email subscription
 * - Loading states during subscription
 * - Success/error feedback messages
 * - Dark mode support
 * - Accessible form with ARIA labels
 */

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import apiClient from "@/services/client"; // ✅ Changed from api
import { cn } from "@/lib/utils";

// ============================================================================
// Constants
// ============================================================================

/**
 * Year for copyright notice
 */
const CURRENT_YEAR = new Date().getFullYear();

/**
 * Social and documentation links configuration
 */
const FOOTER_LINKS = [
  {
    label: "GitHub",
    url: "https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines",
    external: true,
  },
  {
    label: "LinkedIn",
    url: "https://linkedin.com/in/anyega-alex-kamau",
    external: true,
  },
  {
    label: "Contact",
    url: "mailto:anyega.alex.kamau@gmail.com",
    external: true,
  },
  {
    label: "API Docs",
    url: "https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/",
    external: true,
  },
];

/**
 * Live demo links configuration
 */
const DEMO_LINKS = [
  {
    label: "Frontend",
    url: "https://sentiment-driven-stock-price-predic.vercel.app/",
  },
  {
    label: "Backend",
    url: "https://sentiment-driven-stock-price-prediction.onrender.com",
  },
  {
    label: "LSTM Model",
    url: "https://huggingface.co/spaces/AnyegaAlex/stock-prediction-analytics",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Subscribe API call
 * 
 * @param {string} email - User's email address
 * @returns {Promise} API response
 */
const subscribe = async (email) => {
  const response = await apiClient.post("/subscribe/", { email });
  return response;
};

// ============================================================================
// Component Definition
// ============================================================================

/**
 * Footer Component
 * 
 * @returns {JSX.Element} Rendered footer
 */
const Footer = () => {
  // --- State ---
  const [email, setEmail] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // --- Mutations ---
  const mutation = useMutation({
    mutationFn: subscribe,
    onSuccess: () => {
      setSubscriptionStatus("success");
      setEmail("");
    },
    onError: (error) => {
      setSubscriptionStatus("error");
      setErrorMessage(error.message || "Subscription failed. Please try again.");
    },
  });

  // --- Handlers ---
  const handleSubscribe = (event) => {
    event.preventDefault();
    if (!email) return;
    mutation.mutate(email);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <footer
      className="border-t border-gray-200 dark:border-gray-800 py-8 px-4 mt-auto bg-white dark:bg-gray-900"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-6xl mx-auto">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Copyright and Links Section */}
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              &copy; {CURRENT_YEAR} Sentiment-Driven Stock Prediction
            </p>
            <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 text-sm">
              {FOOTER_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter Subscription Form */}
          <div className="w-full max-w-md">
            <form
              onSubmit={handleSubscribe}
              className="flex flex-col sm:flex-row gap-2"
              aria-label="Email subscription form"
            >
              <div className="relative w-full">
                <label htmlFor="footer-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Subscribe for updates"
                  required
                  className={cn(
                    "w-full px-4 py-2 rounded-md border",
                    "border-gray-300 dark:border-gray-600 focus:outline-none",
                    "focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
                    "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200",
                    "text-sm"
                  )}
                  disabled={mutation.isPending}
                  aria-describedby="subscription-status"
                />
                
                {/* Subscription Status Messages */}
                <div
                  id="subscription-status"
                  aria-live="polite"
                  className="absolute -bottom-5 left-0 right-0 text-center text-xs"
                >
                  {subscriptionStatus === "success" && (
                    <span className="text-green-600 dark:text-green-400">
                      Subscribed successfully!
                    </span>
                  )}
                  {subscriptionStatus === "error" && (
                    <span className="text-red-600 dark:text-red-400">
                      {errorMessage}
                    </span>
                  )}
                </div>
              </div>
              
              <button
                type="submit"
                disabled={mutation.isPending}
                className={cn(
                  "px-4 py-2 rounded-md font-medium text-sm",
                  "bg-blue-600 text-white hover:bg-blue-700",
                  "dark:bg-blue-500 dark:hover:bg-blue-600",
                  "transition-colors whitespace-nowrap",
                  "disabled:opacity-70 disabled:cursor-not-allowed"
                )}
                aria-label={mutation.isPending ? "Subscribing..." : "Subscribe to updates"}
              >
                {mutation.isPending ? "Subscribing..." : "Subscribe"}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-6 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>MIT License</span>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
            <span>Live Demo:</span>
            {DEMO_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900 dark:hover:text-gray-100 transition"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;