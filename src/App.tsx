import { BrowserRouter, Route, Routes } from "react-router-dom";
import Console from "./console/Console";

// One shell for every path (SPEC 4): Console parses the URL itself (orrery/routes), so the Sky and the
// store stay mounted across navigation. `/artifacts` redirects inside Console via parseRoute().redirect.
const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="*" element={<Console />} />
    </Routes>
  </BrowserRouter>
);

export default App;
