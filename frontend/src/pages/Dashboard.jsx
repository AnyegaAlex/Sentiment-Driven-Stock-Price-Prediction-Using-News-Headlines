import PropTypes from 'prop-types';
import NewsList from "../components/NewsList";
import PredictionForm from "../components/PredictionForm";
import ErrorBoundary from "../components/ErrorBoundary";

const Dashboard = ({ 
  stockSymbol = 'IBM', 
  newsData = [], 
  setNewsData = () => {} 
}) => {
  return (
    <main className="container mx-auto px-4 py-8 grid gap-6 md:grid-cols-2">
      <section className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Latest News for {stockSymbol}
        </h2>
        <ErrorBoundary>
          <NewsList 
            stockSymbol={stockSymbol}
            newsData={newsData}
            setNewsData={setNewsData}
          />
        </ErrorBoundary>
      </section>

      <section className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Predict Stock Movement
        </h2>
        <PredictionForm />
      </section>
    </main>
  );
};

Dashboard.propTypes = {
  stockSymbol: PropTypes.string,
  newsData: PropTypes.array,
  setNewsData: PropTypes.func
};

export default Dashboard;
