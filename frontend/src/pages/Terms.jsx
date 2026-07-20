import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Radar } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="flex items-center gap-3 mb-6">
          <Radar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
        </div>
        
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-500 dark:text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2>Acceptance of Terms</h2>
          <p>By using Tickflow Sentiment, you agree to these terms and conditions.</p>
          
          <h2>Use of Service</h2>
          <p>You may use the service for personal and commercial purposes in accordance with these terms.</p>
          
          <h2>Intellectual Property</h2>
          <p>All content and code in Tickflow Sentiment is open-source under the MIT License.</p>
          
          <h2>Disclaimer</h2>
          <p>This platform provides AI-powered financial intelligence for informational purposes only. It is not financial advice.</p>
          
          <h2>Limitation of Liability</h2>
          <p>Tickflow Capital is not liable for any decisions made based on the information provided.</p>
          
          <h2>Contact Us</h2>
          <p>For any questions, please contact us at <a href="mailto:legal@tickflow.com">legal@tickflow.com</a>.</p>
        </div>
      </div>
    </div>
  );
};

export default Terms;