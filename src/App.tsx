import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Console from "./console/Console";

// TEMPORARY (T3 sky harness): T4 removes this import and the /__sky route.
const SkyHarness = lazy(() => import("./orrery/sky/SkyHarness"));

// Route table per design/SPEC.md section 4.
const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Console route={{ section: "projects", reader: null }} />} />
      <Route path="/projects" element={<Console route={{ section: "projects", reader: null }} />} />
      <Route path="/projects/:slug" element={<Console route={{ section: "projects", reader: "dossier" }} />} />
      <Route path="/writings" element={<Console route={{ section: "notes", reader: null }} />} />
      <Route path="/writings/:slug" element={<Console route={{ section: "notes", reader: "post" }} />} />
      <Route path="/links" element={<Console route={{ section: "links", reader: null }} />} />
      <Route path="/now" element={<Console route={{ section: "now", reader: null }} />} />
      <Route path="/guestbook" element={<Console route={{ section: "log", reader: null }} />} />
      <Route path="/cv" element={<Console route={{ section: "links", reader: "cv" }} />} />
      <Route path="/about" element={<Console route={{ section: null, reader: "about" }} />} />
      <Route path="/artifacts" element={<Navigate to="/" replace />} />
      <Route path="/__sky" element={<Suspense fallback={null}><SkyHarness /></Suspense>} />
      <Route path="*" element={<Console route={{ section: "projects", reader: "404" }} />} />
    </Routes>
  </BrowserRouter>
);

export default App;
