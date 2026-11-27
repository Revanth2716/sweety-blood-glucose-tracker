import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Logo from './Logo.jsx';

/**
 * The page frame: the navigation bar and the current page.
 */
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  /**
   * @param {import('react').MouseEvent<HTMLButtonElement>} event
   */
  function handleLogout(event) {
    event.preventDefault();
    logout();
    navigate('/login');
  }

  return (
    <div className="app">
      <header className="nav">
        <div className="nav-inner">
          <NavLink to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <Logo size={20} />
            </span>
            <span className="gradient-text">Sweety</span>
          </NavLink>

          {user ? (
            <nav className="nav-links" aria-label="Main navigation">
              <NavLink to="/" end>
                Dashboard
              </NavLink>
              <NavLink to="/reports">Reports</NavLink>
              {user.role === 'doctor' ? <NavLink to="/care">Patients</NavLink> : null}
              <NavLink to="/settings">Settings</NavLink>
            </nav>
          ) : (
            <nav className="nav-links" aria-label="Main navigation" />
          )}

          <div className="nav-user">
            {user ? (
              <>
                <span className="user-chip">
                  <span className="live-dot" aria-hidden="true" />
                  <span>{user.name}</span>
                </span>
                <button type="button" className="button small ghost" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <NavLink to="/login" className="button small ghost">
                Log in
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>

      <footer className="footer">
        <p className="muted">Sweety - blood glucose tracker. Built for the Kenpath assignment.</p>
      </footer>
    </div>
  );
}
