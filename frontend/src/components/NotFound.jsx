import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center"
  >
    <div className="mb-8 text-yellow-500 dark:text-yellow-400">
      <AlertTriangle className="w-16 h-16" strokeWidth={1.5} />
    </div>
    
    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-100 mb-4">
      404 - Page Not Found
    </h1>
    
    <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md">
      <p className="...">
        The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
      </p>

    </p>
    
    <Link
      to="/dashboard"
      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 flex items-center gap-2"
    >
      <span>Go to Dashboard</span>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
      </svg>
    </Link>
  </motion.div>
);

export default NotFound;