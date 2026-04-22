import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Writings from "./pages/Writings";
import Post from "./pages/Post";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";

import NotFound from "./pages/NotFound";
import Guestbook from "./pages/Guestbook";
import Artifacts from "./pages/Artifacts";
import CV from "./pages/CV";

import { Terminal } from "./components/Terminal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>

    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Terminal />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
