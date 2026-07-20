import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Radar } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="flex items-center gap-3 mb-6">
          <Radar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
        </div>
        
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-500 dark:text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2>Information We Collect</h2>
          <p>We collect information you provide directly, such as your name, email address, and payment information.</p>
          
          <h2>How We Use Your Information</h2>
          <p>We use your information to provide, maintain, and improve our services, and to communicate with you.</p>
          
          <h2>Data Security</h2>
          <p>We implement appropriate technical and organizational measures to protect your personal information.</p>
          
          <h2>Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal information at any time.</p>
          
          <h2>Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@tickflow.com">privacy@tickflow.com</a>.</p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;