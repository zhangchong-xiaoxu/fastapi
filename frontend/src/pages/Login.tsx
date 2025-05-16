import React, { useState } from 'react';
import './Login.css';

interface LoginProps {
  mode: 'login' | 'signup';
  setIsLoggedIn: (loggedIn: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ mode, setIsLoggedIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const payload = { username, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'An error occurred');
      }

      // alert(`${mode === 'login' ? 'Login' : 'Sign-up'} successful!`);
      const data = await response.json();
      
      // Store the token in local storage
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('isAdmin', data.is_admin ? 'true' : 'false');
      setIsLoggedIn(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <h1>{mode === 'login' ? 'Welcome Back!' : 'Create an Account'}</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {mode === 'signup' && (
          <div className="form-group">
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        )}
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="submit-button">
          {mode === 'login' ? 'Login' : 'Sign Up'}
        </button>
      </form>
      <p className="switch-mode">
        {mode === 'login' ? (
          <a href="/signup">Don't have an account? Sign up</a>
        ) : (
          <a href="/login">Already have an account? Login</a>
        )}
      </p>
    </div>
  );
};

export default Login;
