import React, { useState } from "react";
import { FaTwitter, FaLinkedin, FaGithub, FaPaperPlane } from "react-icons/fa";
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
    <footer className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 py-8 shadow-lg mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Copyright */}
          <div className="text-center md:text-left order-1 md:order-none">
            <p className="text-indigo-200 dark:text-indigo-300 text-sm">
              &copy; {new Date().getFullYear()} Sentiment-Driven Stock Prediction
            </p>
            <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1">
              {["Terms of Service", "Privacy Policy", "About Us"].map((item) => (
                <a key={item} href="#" className="text-indigo-300 dark:text-indigo-400 hover:text-white text-xs transition-colors">
                  {item}
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="w-full max-w-md order-3 md:order-none">
            <form onSubmit={handleSubscribe} className="flex flex-col items-center sm:flex-row gap-2">
              <div className="relative w-full">
                <label htmlFor="footer-email" className="sr-only">Email address</label>
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                  className={cn(
                    "w-full px-4 py-2 rounded-full border",
                    "border-gray-300 dark:border-gray-600 focus:outline-none",
                    "focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500",
                    "bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200"
                  )}
                  disabled={mutation.isPending}
                  aria-describedby="subscription-status"
                />
                <div id="subscription-status" aria-live="polite" className="absolute -bottom-5 left-0 right-0 text-center text-xs">
                  {subscriptionStatus === "success" && (
                    <span className="text-green-300">Subscribed successfully!</span>
                  )}
                  {subscriptionStatus === "error" && (
                    <span className="text-red-300">{errorMessage}</span>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={mutation.isPending}
                className={cn(
                  "flex items-center justify-center gap-2",
                  "px-4 py-2 rounded-full font-medium text-sm",
                  "bg-white text-indigo-700 hover:bg-indigo-50",
                  "dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700",
                  "transition-colors min-w-[120px]",
                  "disabled:opacity-70 disabled:cursor-not-allowed"
                )}
              >
                {mutation.isPending ? "Subscribing..." : <><FaPaperPlane size={14} /> Subscribe</>}
              </button>
            </form>
          </div>

          {/* Social Links */}
          <div className="flex gap-4 order-2 md:order-none">
            {[
              { icon: <FaTwitter size={20} />, label: "Twitter", url: "https://twitter.com" },
              { icon: <FaLinkedin size={20} />, label: "LinkedIn", url: "https://linkedin.com" },
              { icon: <FaGithub size={20} />, label: "GitHub", url: "https://github.com" },
            ].map((social) => (
              <a
                key={social.label}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="text-indigo-200 hover:text-white transition-colors"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;