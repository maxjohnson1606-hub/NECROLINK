import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Members } from './pages/Members';
import { JoinUs } from './pages/JoinUs';
import { Login } from './pages/Login';
import { Events } from './pages/Events';
import { News } from './pages/News';
import { Store } from './pages/Store';
import { AdminDashboard } from './pages/AdminDashboard';
import '@/App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App min-h-screen flex flex-col bg-darknet-bg">
          <Navigation />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/members" element={<Members />} />
              <Route path="/events" element={<Events />} />
              <Route path="/news" element={<News />} />
              <Route path="/store" element={<Store />} />
              <Route path="/join" element={<JoinUs />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
