import { Link } from 'react-router-dom';
import { useAuth } from '~/contexts/AuthContext';

export default function Home() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Chat App
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time messaging with authentication
          </p>
        </div>

        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <p className="text-gray-700 dark:text-gray-300">
                Welcome back, <span className="font-semibold">{user?.username}</span>!
              </p>
            </div>
            <div className="space-y-3">
              <Link 
                to="/chat" 
                className="block w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Go to Chat
              </Link>
              <button
                onClick={logout}
                className="block w-full p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Link 
              to="/auth" 
              className="block w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Login or Register
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
