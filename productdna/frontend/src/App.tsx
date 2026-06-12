import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import ProductDetail from "./pages/ProductDetail";
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

export default function App() {
  const hash = useHashRoute();

  switch (hash) {
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
    case "#/product":
      return <ProductDetail />;
    case "#/":
    default:
      return <Dashboard />;
  }
}
