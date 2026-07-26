import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { api } from '@/services/api';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import TfcLogo from '@/assets/Primary Icon White.svg'; 

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'idle' | 'sent' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setErrorMessage('');

    try {
      await api.post('/auth/password-reset/', { email });
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <Card className="w-full max-w-md shadow-xl border border-gray-800 bg-gray-900">
          <CardHeader className="text-center pt-8">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Check Your Email</CardTitle>
            <CardDescription className="text-gray-400">
              If an account exists with this email, you'll receive a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500 text-center">
              Didn't receive anything? Check your spam folder or try again.
            </p>
            <Button 
              variant="outline" 
              className="w-full min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
              onClick={() => setStatus(null)}
            >
              Try Again
            </Button>
            <Link to="/login" className="block">
              <Button variant="ghost" className="w-full min-h-[44px] text-gray-400 hover:text-white hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <Card className="w-full max-w-md shadow-xl border border-gray-800 bg-gray-900">
        <CardHeader className="text-center pt-8">
          {/* Logo & Brand Name */}
          <div className="flex flex-col items-center mb-4">
            <img
              src={TfcLogo}
              alt="TFC"
              className="h-14 w-14 mb-2 opacity-80"
            />
            <span className="text-lg font-semibold text-white tracking-tight">
              Tickflow Intelligence
            </span>
            <span className="text-[10px] text-gray-500 mt-0.5 tracking-wide">
              Hybrid LSTM + FinBERT Stock Intelligence
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-white">Reset Password</CardTitle>
          <CardDescription className="text-gray-400">
            Enter your email address and we'll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-h-[44px] bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500"
            />
            {status === 'error' && (
              <Alert variant="destructive" className="border-red-400 bg-red-400/10 text-red-400">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="ml-2 text-red-400">{errorMessage}</span>
              </Alert>
            )}
            <Button 
              type="submit" 
              className="w-full min-h-[44px] bg-white text-black hover:bg-gray-200 focus:ring-gray-500 focus:ring-offset-black"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link 
              to="/login" 
              className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;