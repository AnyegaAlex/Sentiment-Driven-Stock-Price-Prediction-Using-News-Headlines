import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh]">
    <h1 className="text-4xl font-bold text-gray-800 mb-4">404 - Page Not Found</h1>
    <p className="text-gray-600 mb-6">
      The page you&apos;re looking for doesn&apos;t exist or has been moved.
    </p>
    <Link
      to="/dashboard"
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Go to Dashboard
    </Link>
  </div>
);

export default NotFound;