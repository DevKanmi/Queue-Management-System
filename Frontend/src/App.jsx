import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import StudentLayout from './layouts/StudentLayout';
import StudentDashboard from './pages/student/Dashboard';
import QueueStatus from './pages/student/QueueStatus';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import CreateSession from './pages/admin/CreateSession';
import SessionDetail from './pages/admin/SessionDetail';
import LiveSession from './pages/admin/LiveSession';
import Analytics from './pages/admin/Analytics';
import Platform from './pages/admin/Platform';
import LoadingScreen from './components/LoadingScreen';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'student' ? '/student' : '/admin'} replace />;
  }
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="queue/:sessionId" element={<QueueStatus />} />
      </Route>
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['dept_admin', 'lecturer', 'superadmin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="sessions/new" element={<CreateSession />} />
        <Route path="sessions/:id" element={<SessionDetail />} />
        <Route path="sessions/:id/live" element={<LiveSession />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="platform" element={<Platform />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
