import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { AIAssistant } from './components/AIAssistant';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Members } from './pages/Members';
import { JoinUs } from './pages/JoinUs';
import { Login } from './pages/Login';
import { Events } from './pages/Events';
import { News } from './pages/News';
import { Store } from './pages/Store';
import { Gallery } from './pages/Gallery';
import { Profile } from './pages/Profile';
import { Chat } from './pages/Chat';
import { AdminDashboard } from './pages/AdminDashboard';
import { useHeartbeat } from './hooks/useHeartbeat';
import '@/App.css';

function AppInner() {
  useHeartbeat();
  return (
    <div className="App min-h-screen flex flex-col bg-darknet-bg">
      <Navigation />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/members" element={<Members />} />
          <Route path="/events" element={<Events />} />
          <Route path="/news" element={<News />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/store" element={<Store />} />
          <Route path="/join" element={<JoinUs />} />
          <Route path="/login" element={<Login />} />
          <Route path="/chat" element={<Chat />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
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
      <AIAssistant />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
