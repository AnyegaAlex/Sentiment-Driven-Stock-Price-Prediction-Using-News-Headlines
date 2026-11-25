import { Link } from 'react-router-dom';
import { ArrowLeft, Radar } from 'lucide-react';
import LegalDocumentBody from '@/components/legal/LegalDocumentBody';
import termsDocument from '@/legal/documents/terms.json';

const Terms = () => {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link 
          to="/" 
          className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gray-800">
            <Radar className="h-8 w-8 text-gray-400" strokeWidth={1.8} />
          </div>
          <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
        </div>
        
        <div className="prose max-w-none prose-headings:text-white prose-p:text-gray-400 prose-a:text-gray-400 hover:prose-a:text-white prose-strong:text-gray-300 prose-strong:font-semibold">
          <p className="text-gray-500">Version {termsDocument.version}</p>
          
          <LegalDocumentBody document={termsDocument} />
        </div>
      </div>
    </div>
  );
};

export default Terms;