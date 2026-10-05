import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { socket } from '../services/socket';

export default function Navbar() {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const up = () => setConnected(true);
    const down = () => setConnected(false);
    socket.on('connect', up);
    socket.on('disconnect', down);
    return () => {
      socket.off('connect', up);
      socket.off('disconnect', down);
    };
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link');

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <span className="brand">
          <span className="brand-dot" /> Network Monitor
        </span>
        <nav className="nav-links">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/devices" className={linkClass}>
            Devices
          </NavLink>
          <NavLink to="/alerts" className={linkClass}>
            Alerts
          </NavLink>
        </nav>
        <span className={`live ${connected ? 'live-on' : 'live-off'}`}>
          <span className="live-dot" /> {connected ? 'Live' : 'Disconnected'}
        </span>
      </div>
    </header>
  );
}
