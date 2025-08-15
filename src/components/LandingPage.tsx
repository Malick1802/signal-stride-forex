
import React, { useState, useEffect } from 'react';
import { TrendingUp, Star, Users, Shield, TrendingDown, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import heroTradingImage from '@/assets/hero-trading.jpg';
import aiSignalsImage from '@/assets/ai-signals.jpg';
import mobileAlertsImage from '@/assets/mobile-alerts.jpg';
import riskManagementImage from '@/assets/risk-management.jpg';
import expertAnalysisImage from '@/assets/expert-analysis.jpg';

interface Stat {
  label: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

const LandingPage = ({ onNavigate }: LandingPageProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stat[]>([
    { 
      label: 'Accuracy', 
      value: '85-95%', 
      description: 'Signal Win Rate',
      icon: TrendingUp,
      color: 'text-emerald-400'
    },
    { 
      label: 'Active Users', 
      value: '2.5K+', 
      description: 'Traders Worldwide',
      icon: Users,
      color: 'text-blue-400'
    },
    { 
      label: 'Monthly Pips', 
      value: '500+', 
      description: 'Average Target',
      icon: Star,
      color: 'text-yellow-400'
    },
  ]);

  const features = [
    {
      icon: TrendingUp,
      title: 'AI-Powered Signals',
      description: 'Advanced algorithms analyze market data to identify high-probability trading opportunities in real-time.',
      color: 'bg-emerald-500/20 text-emerald-400',
      image: aiSignalsImage
    },
    {
      icon: Clock,
      title: 'Real-Time Alerts',
      description: 'Get instant notifications on your mobile device when new signals are available.',
      color: 'bg-blue-500/20 text-blue-400',
      image: mobileAlertsImage
    },
    {
      icon: Shield,
      title: 'Risk Management',
      description: 'Every signal includes stop-loss and take-profit levels to help manage your trading risk.',
      color: 'bg-purple-500/20 text-purple-400',
      image: riskManagementImage
    },
    {
      icon: Users,
      title: 'Expert Analysis',
      description: 'Benefit from insights of experienced forex traders and market analysts.',
      color: 'bg-orange-500/20 text-orange-400',
      image: expertAnalysisImage
    }
  ];

  useEffect(() => {
    // Simulate live stats update
    const interval = setInterval(() => {
      setStats(prev => prev.map(stat => {
        if (stat.label === 'Active Users') {
          const baseValue = 2500;
          const variation = Math.floor(Math.random() * 100);
          return { ...stat, value: `${((baseValue + variation) / 1000).toFixed(1)}K+` };
        }
        return stat;
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleAuthNavigation = () => {
    onNavigate('auth');
  };

  const handleDashboardNavigation = () => {
    onNavigate('dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Mobile-First Header */}
      <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-lg border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">ForexAlert</span>
              <div className="text-xs text-emerald-400 font-medium">Pro</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {user ? (
              <>
                <Button
                  onClick={handleDashboardNavigation}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-emerald-400 hover:bg-white/10"
                >
                  Dashboard
                </Button>
                <Button
                  onClick={handleAuthNavigation}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Switch
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleAuthNavigation}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-emerald-400 hover:bg-white/10"
                >
                  Sign In
                </Button>
                <Button
                  onClick={handleAuthNavigation}
                  size="sm"
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:shadow-lg hover:shadow-emerald-500/25"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - Mobile Optimized */}
      <section className="relative px-4 pt-16 pb-12 sm:pt-12 text-center overflow-hidden">
        {/* Hero Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroTradingImage} 
            alt="Professional forex trading workspace" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/70 to-slate-800/80"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Live Status Indicator */}
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-emerald-500/30">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-400 text-sm font-medium">Live Trading Signals</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            AI-Powered Forex Signals
            <span className="block text-emerald-400 mt-2">For Mobile Traders</span>
          </h1>
          
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Get high-probability forex signals with real-time notifications, advanced analysis, and expert insights - all optimized for mobile trading.
          </p>

          {!user ? (
            <Button
              onClick={handleAuthNavigation}
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:shadow-lg hover:shadow-emerald-500/25 text-lg px-8 py-4 rounded-xl backdrop-blur-sm"
            >
              Start Free Trial
            </Button>
          ) : (
            <Button
              onClick={handleDashboardNavigation}
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:shadow-lg hover:shadow-emerald-500/25 text-lg px-8 py-4 rounded-xl backdrop-blur-sm"
            >
              Open Dashboard
            </Button>
          )}
        </div>
      </section>

      {/* Stats Section - Mobile Cards */}
      <section className="px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <Card key={index} className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-200">
                  <CardContent className="p-6 text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-4`}>
                      <IconComponent className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-2">{stat.value}</div>
                    <div className="text-gray-400 text-sm uppercase tracking-wider mb-1">{stat.label}</div>
                    <div className="text-gray-300 text-sm">{stat.description}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section - Mobile Grid */}
      <section className="px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Why Choose ForexAlert Pro?
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Everything you need for successful mobile forex trading in one powerful app.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-200 overflow-hidden group">
                  <CardContent className="p-0">
                    {/* Feature Image */}
                    <div className="relative h-32 overflow-hidden">
                      <img 
                        src={feature.image} 
                        alt={feature.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className={`absolute top-4 left-4 inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.color} backdrop-blur-sm`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                    </div>
                    
                    {/* Feature Content */}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                      <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section - Mobile Optimized */}
      <section className="relative px-4 py-16 overflow-hidden">
        {/* CTA Background with subtle overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroTradingImage} 
            alt="Trading success background" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/60 to-blue-900/60"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 backdrop-blur-md border-emerald-500/20 border-2">
            <CardContent className="p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Ready to Start Trading?
              </h2>
              <p className="text-gray-300 mb-8 text-lg">
                Join thousands of successful traders. Start your free trial today.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {!user ? (
                  <>
                    <Button
                      onClick={handleAuthNavigation}
                      size="lg"
                      className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:shadow-lg hover:shadow-emerald-500/25 text-lg px-8 py-4 rounded-xl w-full sm:w-auto backdrop-blur-sm"
                    >
                      Start Free Trial
                    </Button>
                    <div className="text-gray-400 text-sm">
                      No credit card required • 7-day free trial
                    </div>
                  </>
                ) : (
                  <Button
                    onClick={handleDashboardNavigation}
                    size="lg"
                    className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:shadow-lg hover:shadow-emerald-500/25 text-lg px-8 py-4 rounded-xl w-full sm:w-auto backdrop-blur-sm"
                  >
                    Go to Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-lg font-bold text-white">ForexAlert Pro</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2024 ForexAlert Pro. Professional forex trading signals for mobile traders.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
