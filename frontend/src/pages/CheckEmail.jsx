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
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-12"
      role="main"
      aria-labelledby="check-email-title"
    >
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm transition-all duration-300">
        <CardHeader className="space-y-3 text-center pt-8 pb-4">
          <div className="flex items-center justify-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20">
              <Radar className="h-8 w-8 text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Tickflow Sentiment
            </span>
          </div>
          <CardTitle
            id="check-email-title"
            className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight"
          >
            Check Your Email
          </CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
            We've sent a verification link to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Mail className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Please check your inbox and click the verification link to activate your account.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Didn't receive the email? Check your spam folder or{' '}
            <Link to="/resend-verification" className="text-blue-600 hover:underline">
              resend verification email
            </Link>
          </p>
          <Link to="/login">
            <Button variant="outline" className="w-full">
              Back to Login
            </Button>
          </Link>
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Need help?{' '}
              <a href="mailto:support@tickflow.com" className="text-blue-600 hover:underline">
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