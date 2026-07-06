import { ReactNode, Suspense } from "react";
import Navigation from "./Navigation";
import Footer from "./Footer";
import PageTransition from "./PageTransition";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-grow">
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
