import React, { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductReviewPage from "./pages/ProductReview";
import Review from "./pages/Review";
import Upload from "./pages/Upload";
import Duplicates from "./pages/Duplicates";
import Ask from "./pages/Ask";
import Settings from "./pages/Settings";
import Help from "./pages/Help";

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

const App: React.FC = () => {
  const hash = useHashRoute();

  // Simple hash-based routing
  const parts = hash.slice(2).split('/');
  const page = parts[0];
  const param = parts[1];

  if (page === 'products' && param) {
    // This is a simplified way to pass the ID.
    // In a real app, you'd use a proper routing library like react-router-dom
    // to handle this more elegantly.
    return <ProductReviewPage />;
  }

  switch (hash) {
    case "#/review":
      return <Review />;
    case "#/upload":
      return <Upload />;
    case "#/duplicates":
      return <Duplicates />;
    case "#/ask":
      return <Ask />;
    case "#/settings":
      return <Settings />;
    case "#/help":
      return <Help />;
    case "#/products":
      return <Products />;
    case "#/":
    default:
      return <Dashboard />;
  }
}

export default App;