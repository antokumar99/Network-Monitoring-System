import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Alerts from './pages/Alerts';
import Dashboard from './pages/Dashboard';
import DeviceDetails from './pages/DeviceDetails';
import Devices from './pages/Devices';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/devices/:id" element={<DeviceDetails />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="*" element={<div className="page empty">Page not found.</div>} />
        </Routes>
      </main>
    </>
  );
}
