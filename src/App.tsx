import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Index from './pages/Index';

const App = () => {
  return (
    <BrowserRouter>
      <Index />
    </BrowserRouter>
  );
};

export default App;