
import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Stat {
  label: string;
  value: string | number;
  description: string;
}

const LandingPage = ({ onNavigate }) => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<Stat[]>([
    { label: 'Accuracy', value: '85-95%', description: 'Signal Win Rate' },
    { label: 'Signals Sent', value: '100+', description: 'Per Month' },
    { label: 'Average Pips', value: 500, description: 'Monthly Target' },
  ]);

  useEffect(() => {
    // Simulate fetching stats from an API
    setTimeout(() => {
      setStats([
        { label: 'Accuracy', value: '88-92%', description: 'Updated Signal Win Rate' },
        { label: 'Signals Sent', value: '120+', description: 'Per Month' },
        { label: 'Average Pips', value: 550, description: 'New Monthly Target' },
      ]);
    }, 3000);
  }, []);

  const handleAuthNavigation = async () => {
    // If user is already logged in, sign them out first to show fresh auth page
    if (user) {
      console.log('User already logged in, signing out to show fresh auth page');
      await signOut();
    }
    // Navigate to auth page
    onNavigate('auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <header className="p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-emerald-400" />
            <span className="text-2xl font-bold text-white">ForexSignals</span>
          </div>
          <div className="space-x-4">
            {user ? (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="px-6 py-2 text-white hover:text-emerald-400 transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleAuthNavigation}
                  className="px-6 py-2 text-white hover:text-emerald-400 transition-colors"
                >
                  Switch Account
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleAuthNavigation}
                  className="px-6 py-2 text-white hover:text-emerald-400 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={handleAuthNavigation}
                  className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-8">
            Unlock Your Trading Potential with AI-Powered Forex Signals
          </h1>
          <p className="text-xl text-gray-300 mb-12">
            Get high-probability forex signals, backed by advanced AI analysis, delivered straight to your inbox.
          </p>
          {!user && (
            <button
              onClick={handleAuthNavigation}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-lg text-lg hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Start Free Trial
            </button>
          )}
          {user && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-lg text-lg hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white/5 backdrop-blur-sm py-16 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-gray-400 text-sm uppercase tracking-wider mb-1">{stat.label}</div>
              <div className="text-gray-300">{stat.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">
              Why Choose ForexSignals?
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">AI-Powered Signals</h3>
                  <p className="text-gray-300">Our signals are generated using advanced AI algorithms that analyze market data to identify high-probability trading opportunities.</p>
                </div>
              </li>
              <li className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Real-Time Market Data</h3>
                  <p className="text-gray-300">Stay ahead of the curve with real-time market data and analysis, ensuring you never miss a profitable trade.</p>
                </div>
              </li>
              <li className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Expert Analysis</h3>
                  <p className="text-gray-300">Benefit from expert analysis and insights from our team of experienced forex traders, helping you make informed trading decisions.</p>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <img
              src="https://images.unsplash.com/photo-1614313293856-4043a93c07b6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1770&q=80"
              alt="Forex Trading Chart"
              className="rounded-2xl shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-8">
            Start Your 7-Day Free Trial
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Get unlimited access to premium forex signals. No credit card required.
          </p>
          {!user && (
            <button
              onClick={handleAuthNavigation}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-lg text-lg hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Start Free Trial
            </button>
          )}
          {user && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-lg text-lg hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
