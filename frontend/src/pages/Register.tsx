import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../components/AuthProvider';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setToken(data.token);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="auth-card">
      <h1>Create account</h1>
      <p>Track CSFloat prices in your CS2 Suite dashboards.</p>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" type="submit">
          Register
        </button>
      </form>
      <div className="auth-links">
        <Link to="/login">Already have an account?</Link>
      </div>
    </div>
  );
};

export default Register;
