import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      lastErrorTime: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      error,
      lastErrorTime: Date.now() 
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary Caught:', error, errorInfo.componentStack);
    this.setState({ 
      errorInfo,
      error 
    });
    
    // TODO: Add error logging service here
    // logErrorToService(error, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null 
    });
  };

  handleFullReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          role="alert"
          aria-live="assertive"
          className={cn(
            "p-6 rounded-lg border shadow-sm max-w-2xl mx-auto my-8",
            "bg-red-50/80 dark:bg-red-900/20",
            "border-red-200 dark:border-red-800"
          )}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <AlertTriangle 
              className="w-12 h-12 text-red-500 dark:text-red-400" 
              aria-hidden="true"
            />
            <div>
              <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
                Something went wrong
              </h2>
              <p className="text-red-700 dark:text-red-300 mb-1">
                {this.state.error?.toString() || "Unknown error"}
              </p>
              {this.state.errorInfo?.componentStack && (
                <details className="mt-3 text-left">
                  <summary className="text-sm text-red-600 dark:text-red-400 cursor-pointer">
                    Technical details
                  </summary>
                  <pre className="mt-2 p-2 bg-white/50 dark:bg-black/20 text-xs overflow-x-auto rounded">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="gap-2 bg-red-100 hover:bg-red-200 dark:bg-red-800/30 dark:hover:bg-red-800/50"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </Button>
              <Button
                variant="destructive"
                onClick={this.handleFullReload}
                className="gap-2"
              >
                Reload page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  // Optional: Add resetKeys prop for advanced error recovery
  // resetKeys: PropTypes.arrayOf(PropTypes.any)
};

export default ErrorBoundary;