import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-6">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <AlertTriangle className="h-16 w-16 text-brand-500" />
        </div>

        <h1 className="text-7xl font-bold mb-4">404</h1>

        <h2 className="text-2xl font-semibold mb-2">
          Page Not Found
        </h2>

        <p className="text-slate-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex gap-3 justify-center">
          <Link
            to="/dashboard"
            className="btn btn-primary"
          >
            Go to Dashboard
          </Link>

          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}