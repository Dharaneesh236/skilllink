import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { Navbar } from './components/Navbar';
import { Toast } from './components/Toast';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LiveEnginePage } from './pages/LiveEnginePage';
import { NotificationsPage } from './pages/NotificationsPage';

// Worker Pages
import { WorkerDashboardPage } from './pages/WorkerDashboardPage';
import { RecommendedJobsPage } from './pages/RecommendedJobsPage';
import { FindJobsPage } from './pages/FindJobsPage';
import { EarningPlanPage } from './pages/EarningPlanPage';
import { WorkerApplicationsPage } from './pages/WorkerApplicationsPage';
import { WorkerProfilePage } from './pages/WorkerProfilePage';

// Customer Pages
import { CustomerDashboardPage } from './pages/CustomerDashboardPage';
import { PostJobPage } from './pages/PostJobPage';
import { CustomerJobsPage } from './pages/CustomerJobsPage';
import { JobApplicantsPage } from './pages/JobApplicantsPage';
import { JobManagePage } from './pages/JobManagePage';

// Route guards
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: 'worker' | 'customer' }> = ({
  children,
  allowedRole,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'worker' ? '/worker/dashboard' : '/customer/dashboard'} replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/live-engine" element={<LiveEnginePage />} />

          {/* Worker Protected Routes */}
          <Route
            path="/worker/dashboard"
            element={
              <ProtectedRoute allowedRole="worker">
                <WorkerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/recommended"
            element={
              <ProtectedRoute allowedRole="worker">
                <RecommendedJobsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/jobs"
            element={
              <ProtectedRoute allowedRole="worker">
                <FindJobsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/earning-plan"
            element={
              <ProtectedRoute allowedRole="worker">
                <EarningPlanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/applications"
            element={
              <ProtectedRoute allowedRole="worker">
                <WorkerApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/profile"
            element={
              <ProtectedRoute allowedRole="worker">
                <WorkerProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Customer Protected Routes */}
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedRoute allowedRole="customer">
                <CustomerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/post-job"
            element={
              <ProtectedRoute allowedRole="customer">
                <PostJobPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/jobs"
            element={
              <ProtectedRoute allowedRole="customer">
                <CustomerJobsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/jobs/:id/applicants"
            element={
              <ProtectedRoute allowedRole="customer">
                <JobApplicantsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/jobs/:id/manage"
            element={
              <ProtectedRoute allowedRole="customer">
                <JobManagePage />
              </ProtectedRoute>
            }
          />

          {/* Notifications (Common) */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Realtime Toast */}
      <Toast />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} SkillLink - Flexible Micro-Employment Platform</span>
          <span className="text-slate-400">Zero-Cost Infrastructure • Explainable Matching Engine</span>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <AppContent />
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
