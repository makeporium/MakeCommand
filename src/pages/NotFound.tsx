
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="text-8xl font-bold text-cyan-400 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">System Not Found</h1>
        <p className="text-gray-400 mb-8">
          The requested neural pathway does not exist in our matrix.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild className="bg-cyan-600 hover:bg-cyan-700">
            <Link to="/dashboard">
              <Home size={20} className="mr-2" />
              Return to Base
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft size={20} className="mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
