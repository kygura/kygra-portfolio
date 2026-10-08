import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import SmoothScroll from "./components/SmoothScroll";
import TerminalHost from "./components/TerminalHost";

// Toast viewports render nothing until something fires a toast, and only
// two lazily-routed pages ever do — no reason to ship them up front.
const Toaster = lazy(() =>
  import("@/components/ui/toaster").then((m) => ({ default: m.Toaster }))
);
const Sonner = lazy(() =>
  import("@/components/ui/sonner").then((m) => ({ default: m.Toaster }))
);

const Writings = lazy(() => import("./pages/Writings"));
const Post = lazy(() => import("./pages/Post"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Guestbook = lazy(() => import("./pages/Guestbook"));
const Artifacts = lazy(() => import("./pages/Artifacts"));
const CV = lazy(() => import("./pages/CV"));

const queryClient = new QueryClient();

const page = (node: React.ReactNode) => <Layout>{node}</Layout>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Suspense fallback={null}>
      <Toaster />
      <Sonner />
    </Suspense>
    <BrowserRouter>
      <SmoothScroll>
        <TerminalHost />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/writings" element={page(<Writings />)} />
            <Route path="/writings/:slug" element={page(<Post />)} />
            <Route path="/artifacts" element={page(<Artifacts />)} />
            <Route path="/projects" element={page(<Projects />)} />
            <Route path="/projects/:slug" element={page(<ProjectDetail />)} />
            <Route path="/guestbook" element={page(<Guestbook />)} />
            <Route path="/cv" element={page(<CV />)} />
            <Route path="*" element={page(<NotFound />)} />
          </Routes>
        </Suspense>
      </SmoothScroll>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
