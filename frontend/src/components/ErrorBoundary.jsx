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
            "p-6 rounded-lg border max-w-2xl mx-auto my-8",
            "border-red-400 bg-red-400/10"
          )}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <AlertTriangle 
              className="w-12 h-12 text-red-400" 
              aria-hidden="true"
            />
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-400 mb-1">
                {this.state.error?.toString() || "An unexpected error occurred."}
              </p>
              {this.state.errorInfo?.componentStack && (
                <details className="mt-3 text-left">
                  <summary className="text-sm text-gray-400 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded px-2 py-1 transition-colors">
                    Technical details
                  </summary>
                  <pre className="mt-2 p-2 bg-black/50 text-xs overflow-x-auto rounded border border-gray-800 text-gray-400">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="gap-2 min-h-[44px] border border-red-400 text-red-400 hover:bg-red-400/20 hover:text-white focus-visible:ring-gray-500 focus-visible:ring-offset-black"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </Button>
              <Button
                onClick={this.handleFullReload}
                className="gap-2 min-h-[44px] bg-white text-black hover:bg-gray-200 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
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