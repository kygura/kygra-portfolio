import { ReactNode, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import Footer from "./Footer";
import KeyBar from "./KeyBar";
import HelpOverlay from "./HelpOverlay";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { helpOpen, setHelpOpen } = useKeyboardNav();
  const { pathname } = useLocation();

  // A new route starts at the top of the sheet.
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation onHelp={() => setHelpOpen(true)} />
      <main className="flex-grow">
        {/* Only page content suspends — Navigation + Footer stay mounted
            when navigating to a lazily-loaded route. */}
        <Suspense fallback={<div className="min-h-[60vh]" />}>{children}</Suspense>
      </main>
      <Footer />
      <KeyBar />
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
};

export default Layout;
