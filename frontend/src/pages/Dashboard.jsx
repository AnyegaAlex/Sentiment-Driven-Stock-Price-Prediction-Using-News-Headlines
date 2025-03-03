// src/pages/Dashboard.jsx
import { useParams } from "react-router-dom";
import PropTypes from "prop-types";
import NewsList from "../components/NewsList";
import ErrorBoundary from "../components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import useFetchNews from "../hooks/useFetchNews";
import DashboardCards from "../components/cards/DashboardCards";

const Dashboard = ({ stockSymbol = "IBM" }) => {
  // Get dynamic symbol from the URL if provided.
  const { symbol } = useParams();
  // Use the URL symbol if available; otherwise, use the provided stockSymbol prop.
  const currentSymbol = symbol || stockSymbol;

  // Fetch news data for the current symbol using a custom hook.
  // Renaming the returned newsData to "fetchedNews" to avoid conflicts.
  const { newsData: fetchedNews, loading, error, refetch } = useFetchNews(currentSymbol);

  return (
    <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid grid-cols-1 gap-6">
        {/* Dashboard Cards: Metrics such as sentiment and price prediction */}
        <DashboardCards symbol={currentSymbol} />

        {/* News Section */}
        <section
          className="bg-white rounded-lg shadow p-4 sm:p-6"
          aria-labelledby="news-section-heading"
        >
          <h2
            id="news-section-heading"
            className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4"
          >
            Latest News for {currentSymbol}
          </h2>
          <ErrorBoundary>
            {error ? (
              <Alert variant="destructive" className="my-4">
                <AlertTitle>Error Loading News</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <button
                  onClick={refetch}
                  className="mt-2 px-3 py-1 bg-red-500 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  Retry
                </button>
              </Alert>
            ) : loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                {fetchedNews.length === 0 ? (
                  <p className="text-gray-600">No news available at the moment.</p>
                ) : (
                  <NewsList news={fetchedNews} />
                )}
              </>
            )}
          </ErrorBoundary>
        </section>
      </div>
    </main>
  );
};

Dashboard.propTypes = {
  stockSymbol: PropTypes.string,
};

export default Dashboard;
