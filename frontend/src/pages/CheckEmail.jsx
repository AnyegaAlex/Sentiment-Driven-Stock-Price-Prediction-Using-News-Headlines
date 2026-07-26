import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Radar } from 'lucide-react';

/**
 * CheckEmail Page – Shown after registration to instruct user to verify email.
 *
 * @component
 */
const CheckEmail = () => {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-black px-4 py-12"
      role="main"
      aria-labelledby="check-email-title"
    >
      <Card className="w-full max-w-md shadow-2xl border border-gray-800 bg-gray-900 transition-all duration-300">
        <CardHeader className="space-y-3 text-center pt-8 pb-4">
          <div className="flex items-center justify-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gray-800">
              <Radar className="h-8 w-8 text-gray-400" strokeWidth={1.8} />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              Tickflow Sentiment
            </span>
          </div>
          <CardTitle
            id="check-email-title"
            className="text-2xl font-bold text-white tracking-tight"
          >
            Check Your Email
          </CardTitle>
          <CardDescription className="text-gray-400 text-sm max-w-sm mx-auto">
            We've sent a verification link to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-gray-800">
              <Mail className="h-12 w-12 text-gray-400" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            Please check your inbox and click the verification link to activate your account.
          </p>
          <p className="text-xs text-gray-500">
            Didn't receive the email? Check your spam folder or{' '}
            <Link 
              to="/resend-verification" 
              className="text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              resend verification email
            </Link>
          </p>
          <Link to="/login">
            <Button 
              variant="outline" 
              className="w-full min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              Back to Login
            </Button>
          </Link>
          <div className="pt-4 border-t border-gray-800">
            <p className="text-[10px] text-gray-500">
              Need help?{' '}
              <a 
                href="mailto:support@tickflow.com" 
                className="text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Contact support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckEmail;