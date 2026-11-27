import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

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
              &#9679;
            </span>
            Sweety
          </NavLink>

          {user ? (
            <nav className="nav-links" aria-label="Main navigation">
              <NavLink to="/" end>
                Dashboard
              </NavLink>
              <NavLink to="/reports">Reports</NavLink>
            </nav>
          ) : null}

          <div className="nav-user">
            {user ? (
              <>
                <span className="muted">{user.name}</span>
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
