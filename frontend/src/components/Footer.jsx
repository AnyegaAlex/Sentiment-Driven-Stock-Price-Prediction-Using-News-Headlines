import { FaTwitter, FaLinkedin, FaGithub } from "react-icons/fa";

const Footer = () => {
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
              <a href="#" className="text-indigo-300 hover:text-white text-xs transition duration-300">
                Terms of Service
              </a>
              <span className="text-indigo-400">|</span>
              <a href="#" className="text-indigo-300 hover:text-white text-xs transition duration-300">
                Privacy Policy
              </a>
              <span className="text-indigo-400">|</span>
              <a href="#" className="text-indigo-300 hover:text-white text-xs transition duration-300">
                About Us
              </a>
            </div>
          </div>

          {/* Center Section - Social Media Links */}
          <div className="mt-4 md:mt-0 flex space-x-6">
            <a href="#" className="text-indigo-200 hover:text-white transition duration-300">
              <FaTwitter size={20} />
            </a>
            <a href="#" className="text-indigo-200 hover:text-white transition duration-300">
              <FaLinkedin size={20} />
            </a>
            <a href="#" className="text-indigo-200 hover:text-white transition duration-300">
              <FaGithub size={20} />
            </a>
          </div>

          {/* Right Section - Call to Action */}
          <div className="mt-6 md:mt-0">
            <a
              href="#"
              className="bg-white text-indigo-700 px-4 py-2 rounded-full font-semibold text-sm hover:bg-indigo-100 transition duration-300"
            >
              Subscribe to Newsletter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
