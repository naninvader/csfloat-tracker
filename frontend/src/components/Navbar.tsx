import { NavLink } from 'react-router-dom';
import { useAuth } from './AuthProvider';

const Navbar = () => {
  const { token, setToken } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar__brand">CS2 Suite</div>
      {token && (
        <nav className="navbar__links">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
          <NavLink to="/charts">Charts</NavLink>
          <NavLink to="/import">Import</NavLink>
        </nav>
      )}
      <div className="navbar__actions">
        {token ? (
          <button className="btn secondary" onClick={() => setToken(null)}>
            Log out
          </button>
        ) : (
          <NavLink to="/login" className="btn secondary">
            Log in
          </NavLink>
        )}
      </div>
    </header>
  );
};

export default Navbar;
