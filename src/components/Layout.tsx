import { ReactNode, Suspense } from "react";
import Navigation from "./Navigation";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="sheet">
      <Navigation />
      <main>
        {/* Only page content suspends — masthead and colophon stay mounted
            when navigating to a lazily-loaded route. */}
        <Suspense fallback={<div style={{ minHeight: "60vh" }} />}>{children}</Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
