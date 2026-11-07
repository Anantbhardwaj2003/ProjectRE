import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './auth/Login';
import ListingDashboard from './pages/LisitngDashboard';
import PropertyManager from './pages/PropertyManager';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/listingdashboard" element={<ListingDashboard />} />
          <Route path="/dashboard" element={<ListingDashboard />} />
          <Route path="/propertymanager" element={<PropertyManager />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}