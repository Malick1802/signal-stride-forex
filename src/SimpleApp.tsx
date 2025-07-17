import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MinimalPage from "./pages/MinimalPage";

const SimpleApp = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MinimalPage />} />
        <Route path="*" element={<div>Page not found</div>} />
      </Routes>
    </BrowserRouter>
  );
};

export default SimpleApp;