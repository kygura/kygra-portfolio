import { ReactNode, Suspense } from "react";
import Navigation from "./Navigation";
import Footer from "./Footer";
import PageTransition from "./PageTransition";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <a className="skip-link" href="#main">Skip to content</a>
      <Navigation />
      <main id="main" tabIndex={-1} className="flex-grow outline-none">
        {/* Only page content suspends — Navigation + Footer stay mounted
            when navigating to a lazily-loaded route. */}
        <Suspense fallback={<div className="min-h-[60vh]" />}>
          <PageTransition>{children}</PageTransition>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
