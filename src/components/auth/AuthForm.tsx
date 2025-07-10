
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';

export const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        toast.success('Account created! Check your email to verify.');
      } else {
        await signIn(email, password);
        toast.success('Welcome back!');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-gray-900/50 border border-cyan-500/30 p-6 md:p-8 rounded-2xl backdrop-blur-sm max-w-md w-full">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 mb-2">NEXUS</h1>
          <p className="text-gray-400 text-sm md:text-base">Your Personal Command Center</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800/50 border-cyan-500/30 text-white placeholder-gray-400 focus:border-cyan-400 h-12 md:h-auto text-base"
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800/50 border-cyan-500/30 text-white placeholder-gray-400 focus:border-cyan-400 h-12 md:h-auto text-base"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 md:py-3 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 text-base h-12 md:h-auto active:scale-95"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm md:text-base active:scale-95 p-2"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};
