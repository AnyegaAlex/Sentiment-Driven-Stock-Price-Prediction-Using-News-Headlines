import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/services/api";
import { cn } from "@/lib/utils";

const subscribe = async (email) => {
  const response = await api.post("/subscribe", { email });
  return response.data;
};

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

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

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email) return;
    mutation.mutate(email);
  };

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 py-8 px-4 mt-auto bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Copyright and Links */}
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              &copy; {new Date().getFullYear()} Sentiment-Driven Stock Prediction
            </p>
            <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 text-sm">
              <a 
                href="https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
              >
                GitHub
              </a>
              <a 
                href="https://linkedin.com/in/anyega-alex-kamau" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
              >
                LinkedIn
              </a>
              <a 
                href="mailto:anyega.alex.kamau@gmail.com"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
              >
                Contact
              </a>
              <a 
                href="/api/docs/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
              >
                API Docs
              </a>
            </div>
          </div>

          {/* Newsletter Subscription */}
          <div className="w-full max-w-md">
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
              <div className="relative w-full">
                <label htmlFor="footer-email" className="sr-only">Email address</label>
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                <div id="subscription-status" aria-live="polite" className="absolute -bottom-5 left-0 right-0 text-center text-xs">
                  {subscriptionStatus === "success" && (
                    <span className="text-green-600 dark:text-green-400">Subscribed successfully!</span>
                  )}
                  {subscriptionStatus === "error" && (
                    <span className="text-red-600 dark:text-red-400">{errorMessage}</span>
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
              >
                {mutation.isPending ? "Subscribing..." : "Subscribe"}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-6 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>MIT License</span>
          <div className="flex gap-4">
            <span>Live Demo:</span>
            <a 
              href="https://sentiment-driven-stock-price-predic.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gray-900 dark:hover:text-gray-100 transition"
            >
              Frontend
            </a>
            <a 
              href="https://sentiment-driven-stock-price-prediction.onrender.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gray-900 dark:hover:text-gray-100 transition"
            >
              Backend
            </a>
            <a 
              href="https://huggingface.co/spaces/AnyegaAlex/stock-prediction-analytics" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gray-900 dark:hover:text-gray-100 transition"
            >
              LSTM Model
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;