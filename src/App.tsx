import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Suspense fallback={null}>
      <Toaster />
      <Sonner />
    </Suspense>
    <BrowserRouter>
      <TerminalHost />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/writings"
            element={
              <Layout>
                <Writings />
              </Layout>
            }
          />
          <Route
            path="/writings/:slug"
            element={
              <Layout>
                <Post />
              </Layout>
            }
          />
          <Route
            path="/artifacts"
            element={
              <Layout>
                <Artifacts />
              </Layout>
            }
          />
          <Route
            path="/projects"
            element={
              <Layout>
                <Projects />
              </Layout>
            }
          />
          <Route
            path="/projects/:slug"
            element={
              <Layout>
                <ProjectDetail />
              </Layout>
            }
          />
          <Route
            path="/guestbook"
            element={
              <Layout>
                <Guestbook />
              </Layout>
            }
          />
          <Route
            path="/cv"
            element={
              <Layout>
                <CV />
              </Layout>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
