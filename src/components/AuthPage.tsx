
import React, { useState } from 'react';
import { TrendingUp, ArrowLeft, Eye, EyeOff, CheckCircle, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthPageProps {
  onNavigate: (view: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onNavigate }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setSignupSuccess(false);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setError('Please check your email and click the confirmation link before signing in.');
          } else if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please check your credentials.');
          } else {
            setError(error.message);
          }
        }
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('User already registered')) {
            setError('An account with this email already exists. Please sign in instead.');
          } else {
            setError(error.message);
          }
        } else {
          setSignupSuccess(true);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Account Created!</h2>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-center justify-center space-x-2 bg-blue-500/20 p-3 rounded-lg">
                <Mail className="h-5 w-5 text-blue-400" />
                <span className="text-sm">Check your email for a confirmation link</span>
              </div>
              <p className="text-sm">
                We've sent a confirmation email to <strong className="text-white">{email}</strong>
              </p>
              <p className="text-sm">
                Click the link in the email to activate your account, then return here to sign in.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => {
                  setSignupSuccess(false);
                  setIsLogin(true);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
              >
                Go to Sign In
              </button>
              <button
                onClick={() => onNavigate('landing')}
                className="w-full py-3 bg-white/5 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
        <div className="flex items-center mb-8">
          <button
            onClick={() => onNavigate('landing')}
            className="mr-4 p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-emerald-400" />
            <span className="text-2xl font-bold text-white">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors pr-12"
                placeholder={isLogin ? "Enter your password" : "Create a password (min 6 characters)"}
                minLength={isLogin ? undefined : 6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Confirm your password"
                minLength={6}
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>

          <div className="text-center">
            <span className="text-gray-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSignupSuccess(false);
              }}
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
