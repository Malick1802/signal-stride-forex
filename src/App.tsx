
import React from "react";
import AppErrorBoundary from "./components/AppErrorBoundary";
import ProgressiveAppLoader from "./components/ProgressiveAppLoader";

// Import mobile app CSS
import './mobile-app.css';

const App = () => {
  console.log('🎯 App component rendering');
  
  return (
    <AppErrorBoundary>
      <ProgressiveAppLoader />
    </AppErrorBoundary>
  );
};

export default App;
