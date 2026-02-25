import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import RegisterOrganizer from './pages/auth/RegisterOrganizer';
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
import OrgLayout from './layouts/OrgLayout';
import OrgDashboard from './pages/org/Dashboard';
import CreateOrg from './pages/org/CreateOrg';
import OrgDetail from './pages/org/OrgDetail';
import CreateOrgSession from './pages/org/CreateOrgSession';
import OrgSessionDetail from './pages/org/OrgSessionDetail';
import OrgLiveSession from './pages/org/OrgLiveSession';
import PublicJoin from './pages/public/PublicJoin';
import PublicStatus from './pages/public/PublicStatus';
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
    if (user.role === 'student') return <Navigate to="/student" replace />;
    if (user.role === 'organizer') return <Navigate to="/org" replace />;
    return <Navigate to="/admin" replace />;
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
      {/* Organizer routes */}
      <Route
        path="/org"
        element={
          <ProtectedRoute allowedRoles={['organizer']}>
            <OrgLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OrgDashboard />} />
        <Route path="new" element={<CreateOrg />} />
        <Route path=":slug/sessions/new" element={<CreateOrgSession />} />
        <Route path=":slug/sessions/:id/live" element={<OrgLiveSession />} />
        <Route path=":slug/sessions/:id" element={<OrgSessionDetail />} />
        <Route path=":slug" element={<OrgDetail />} />
      </Route>

      {/* Public (no auth) routes */}
      <Route path="/register/organizer" element={<RegisterOrganizer />} />
      <Route path="/q/:joinCode/status" element={<PublicStatus />} />
      <Route path="/q/:joinCode" element={<PublicJoin />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
