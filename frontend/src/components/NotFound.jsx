import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center bg-black"
  >
    <div className="mb-8 text-gray-400">
      <AlertTriangle className="w-16 h-16" strokeWidth={1.5} />
    </div>

    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
      404 - Page Not Found
    </h1>

    <p className="text-lg text-gray-400 mb-8 max-w-md">
      The page you're looking for doesn't exist or has been moved.
    </p>

    <Link
      to="/dashboard"
      className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] bg-white text-black hover:bg-gray-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <span>Go to Dashboard</span>
      <ArrowRight className="h-5 w-5" />
    </Link>
  </motion.div>
);

export default NotFound;