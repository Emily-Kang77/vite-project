import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '~/components/LoginForm';
import { RegisterForm } from '~/components/RegisterForm';
import { useAuth } from '~/contexts/AuthContext';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (token: string, user: any) => {
    login(token, user);
    navigate('/chat');
  };

  const handleRegister = (token: string, user: any) => {
    register(token, user);
    navigate('/chat');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Chat App
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        {isLogin ? (
          <LoginForm 
            onLogin={handleLogin}
            onSwitchToRegister={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm 
            onRegister={handleRegister}
            onSwitchToLogin={() => setIsLogin(true)}
          />
        )}
      </div>
    </div>
  );
} 