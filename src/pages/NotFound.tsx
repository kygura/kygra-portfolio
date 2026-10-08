import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="sheet page">
        <div className="session">
          <span className="session__num">Sheet <em>—</em></span>
          <h2>Sheet not found</h2>
        </div>
        <section className="plate notfound">
          <h1>404</h1>
          <p className="page-lede">Nothing is drawn at {location.pathname}.</p>
          <Link to="/"><kbd>1</kbd>Return home</Link>
        </section>
      </div>
    </Layout>
  );
};

export default NotFound;
