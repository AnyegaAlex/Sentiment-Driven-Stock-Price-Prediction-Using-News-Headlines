import React from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends React.Component {
  state = { hasError: false, errorInfo: null };

  // Rename the parameter to _error to indicate it's intentionally unused.
  static getDerivedStateFromError(_error) {
    // Update state so the next render shows the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Capture error details and log them.
    this.setState({ 
      errorInfo: {
        error,
        componentStack: errorInfo.componentStack
      }
    });
    console.error("Component Error:", error, errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorInfo: null });
    // Optionally, trigger a full page reload:
    // window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          role="alert" 
          className="p-4 bg-red-50 rounded-lg border border-red-200 max-w-md mx-auto mt-4"
        >
          <h2 className="text-xl sm:text-lg font-semibold text-red-800 mb-2">
            Oops! Something went wrong.
          </h2>
          <p className="text-red-700 mb-2">
            {this.state.errorInfo?.error?.toString() || "An unknown error occurred."}
          </p>
          <p className="text-red-700 mb-4">
            Please try again or contact support if the problem persists.
          </p>
          <button
            onClick={this.handleRetry}
            className="w-full sm:w-auto px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

export default ErrorBoundary;
