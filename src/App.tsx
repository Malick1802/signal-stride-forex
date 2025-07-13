import React from 'react';
import { HashRouter, Routes, Route } from "react-router-dom";

const App = () => {
  return (
    <div>
      <h1>Test App</h1>
      <HashRouter>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/test" element={<div>Test Page</div>} />
          <Route path="*" element={<div>Not Found</div>} />
        </Routes>
      </HashRouter>
    </div>
  );
};

export default App;