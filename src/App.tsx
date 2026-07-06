import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import { Terminal } from "./components/Terminal";

const Writings = lazy(() => import("./pages/Writings"));
const Post = lazy(() => import("./pages/Post"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Guestbook = lazy(() => import("./pages/Guestbook"));
const Artifacts = lazy(() => import("./pages/Artifacts"));
import SmoothScroll from "./components/SmoothScroll";
import CustomCursor from "./components/CustomCursor";
import ScrollProgress from "./components/ScrollProgress";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SmoothScroll>
          <CustomCursor />
          <ScrollProgress />
          <Terminal />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </SmoothScroll>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
