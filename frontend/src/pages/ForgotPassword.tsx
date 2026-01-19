import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="auth-card">
      <h1>Reset password</h1>
      <p>Request a reset token (logged on the server for now).</p>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        {error && <div className="error">{error}</div>}
        {sent && <div className="success">Reset token generated. Check server logs.</div>}
        <button className="btn primary" type="submit">
          Send reset link
        </button>
      </form>
      <div className="auth-links">
        <Link to="/login">Back to login</Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
