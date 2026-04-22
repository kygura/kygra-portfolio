import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import Footer from "./Footer";
import EditorialHeader from "./EditorialHeader";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isWritings = location.pathname.startsWith("/writings");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="w-full h-1.5 bg-destructive"></div>
      <Navigation />
      {isWritings && <EditorialHeader />}
      <main className="flex-grow">{children}</main>
      <div className="torn-top !bg-foreground scale-y-[-1]"></div>
      <Footer />
    </div>
  );
};

export default Layout;
