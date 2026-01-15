
import React, { useState } from 'react';

interface LoginViewProps {
  onSuccess: () => void;
  onBack: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onSuccess, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'gogigi' && password === 'GoGigi1') {
      onSuccess();
    } else {
      setError('Invalid credentials.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md bg-card-dark p-8 rounded-2xl border border-border-dark shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary text-background-dark shadow-neon">
            <span className="material-symbols-outlined text-3xl font-bold">admin_panel_settings</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">Admin Login</h2>
        <p className="text-text-muted text-center text-sm mb-8">Access the backend to manage quizzes and cyclists.</p>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Username</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-input-dark border-none rounded-xl text-white px-4 py-3 focus:ring-2 focus:ring-primary/50"
              placeholder="admin"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-input-dark border-none rounded-xl text-white px-4 py-3 focus:ring-2 focus:ring-primary/50"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-400 text-xs mt-1 text-center font-medium">{error}</p>}
          <button 
            type="submit"
            className="mt-4 w-full bg-primary text-background-dark font-bold py-4 rounded-xl shadow-neon hover:shadow-neon-strong transition-all active:scale-95"
          >
            Sign In
          </button>
        </form>
        
        <button 
          onClick={onBack}
          className="mt-6 w-full text-text-muted hover:text-white transition-colors text-sm font-medium"
        >
          Cancel and return to game
        </button>
      </div>
    </div>
  );
};

export default LoginView;
