
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import LoginForm from '../components/LoginForm';
import SignupForm from '../components/SignupForm';
import LandingPage from '../components/LandingPage';

const Index = () => {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('landing');

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('forexUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setCurrentView('dashboard');
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('forexUser', JSON.stringify(userData));
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('forexUser');
    setCurrentView('landing');
  };

  if (currentView === 'landing') {
    return <LandingPage onNavigate={setCurrentView} />;
  }

  if (currentView === 'login') {
    return <LoginForm onLogin={handleLogin} onNavigate={setCurrentView} />;
  }

  if (currentView === 'signup') {
    return <SignupForm onSignup={handleLogin} onNavigate={setCurrentView} />;
  }

  if (currentView === 'dashboard' && user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return <LandingPage onNavigate={setCurrentView} />;
};

export default Index;
