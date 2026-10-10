import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Landing from './pages/Landing';
import AppWorkspace from './pages/AppWorkspace';

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppWorkspace />} />
        <Route path="/chat" element={<AppWorkspace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <div className="dotted-bg">
      <Router>
        <AnimatedRoutes />
      </Router>
    </div>
  );
}

export default App;
