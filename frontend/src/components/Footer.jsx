import React, { useState } from "react";
import { FaTwitter, FaLinkedin, FaGithub } from "react-icons/fa";
import axios from "axios";

const Footer = () => {
  // State for newsletter subscription
  const [email, setEmail] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState(null); // "success" or "error"
  const [errorMessage, setErrorMessage] = useState("");

  // Handle newsletter subscription submission
  const handleSubscribe = async (e) => {
    e.preventDefault();
    setSubscriptionStatus(null);
    setErrorMessage("");
    try {
      // Post to your backend subscription endpoint
      const response = await axios.post("/api/subscribe", { email });
      if (response.status === 200) {
        setSubscriptionStatus("success");
        setEmail("");
      } else {
        setSubscriptionStatus("error");
        setErrorMessage("Subscription failed. Please try again.");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      setSubscriptionStatus("error");
      setErrorMessage("Subscription failed. Please try again.");
    }
  };

  return (
    <footer className="bg-gradient-to-r from-blue-600 to-indigo-700 py-8 shadow-lg mt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Left Section - Copyright & Legal Links */}
          <div className="text-center md:text-left">
            <p className="text-indigo-200 text-sm">
              &copy; {new Date().getFullYear()} Sentiment-Driven Stock Prediction.
              All rights reserved.
            </p>
            <div className="mt-2 space-x-4">
              <a
                href="#"
                className="text-indigo-300 hover:text-white text-xs transition duration-300"
              >
                Terms of Service
              </a>
              <span className="text-indigo-400">|</span>
              <a
                href="#"
                className="text-indigo-300 hover:text-white text-xs transition duration-300"
              >
                Privacy Policy
              </a>
              <span className="text-indigo-400">|</span>
              <a
                href="#"
                className="text-indigo-300 hover:text-white text-xs transition duration-300"
              >
                About Us
              </a>
            </div>
          </div>

          {/* Center Section - Social Media Links */}
          <div className="mt-4 md:mt-0 flex space-x-6">
            <a
              href="https://twitter.com"
              aria-label="Twitter"
              className="text-indigo-200 hover:text-white transition duration-300"
            >
              <FaTwitter size={20} />
            </a>
            <a
              href="https://linkedin.com"
              aria-label="LinkedIn"
              className="text-indigo-200 hover:text-white transition duration-300"
            >
              <FaLinkedin size={20} />
            </a>
            <a
              href="https://github.com"
              aria-label="GitHub"
              className="text-indigo-200 hover:text-white transition duration-300"
            >
              <FaGithub size={20} />
            </a>
          </div>

          {/* Right Section - Newsletter Subscription */}
          <div className="mt-6 md:mt-0 w-full md:w-auto">
            <form
              onSubmit={handleSubscribe}
              className="flex flex-col sm:flex-row items-center"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full sm:w-auto mb-2 sm:mb-0 sm:mr-2"
              />
              <button
                type="submit"
                className="bg-white text-indigo-700 px-4 py-2 rounded-full font-semibold text-sm hover:bg-indigo-100 transition duration-300 w-full sm:w-auto"
              >
                Subscribe
              </button>
            </form>
            {subscriptionStatus === "success" && (
              <p className="mt-2 text-green-300 text-sm">
                Subscribed successfully!
              </p>
            )}
            {subscriptionStatus === "error" && (
              <p className="mt-2 text-red-300 text-sm">{errorMessage}</p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
