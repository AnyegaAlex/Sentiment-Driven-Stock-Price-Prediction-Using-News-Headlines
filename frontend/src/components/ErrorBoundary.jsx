import React from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends React.Component {
  state = { hasError: false, errorInfo: null };

  static getDerivedStateFromError(error) {
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
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-700 mb-4">
            Error: {this.state.errorInfo?.error?.toString()}
          </p>
          <p className="text-red-700 mb-4">
            Stack: {this.state.errorInfo?.componentStack}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
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
