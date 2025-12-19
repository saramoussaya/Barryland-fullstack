import React, { Suspense, lazy } from 'react';
import PageSkeleton from '../components/PageSkeleton';
import { Routes, Route, Navigate } from 'react-router-dom';
const AuthPage = lazy(() => import('../pages/AuthPage'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'));
const VerifyOtpPage = lazy(() => import('../pages/VerifyOtpPage'));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const HomePage = lazy(() => import('../pages/HomePage'));
const PropertyDetailPage = lazy(() => import('../pages/PropertyDetailPage'));
const SearchPage = lazy(() => import('../pages/SearchPage'));
const CreatePropertyPage = lazy(() => import('../pages/CreatePropertyPage'));
import PrivateRoute from '../components/PrivateRoute';
import AdminRoute from '../components/AdminRoute';
import { useAuth } from '../contexts/AuthContext';

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
      {/* Routes publiques */}
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/property/:id" element={<PropertyDetailPage />} />
      <Route 
        path="/create-property" 
        element={
          <PrivateRoute>
            <CreatePropertyPage />
          </PrivateRoute>
        } 
      />
      
      {/* Route d'authentification */}
      <Route 
        path="/auth" 
        element={
          user ? (user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />) : <AuthPage />
        } 
      />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
  <Route path="/auth/verify-otp" element={<VerifyOtpPage />} />
  <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      {/* Routes protégées */}
      <Route
        path="/dashboard/*"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      
      {/* Routes Admin */}
      <Route
        path="/admin/*"
        element={
          <PrivateRoute>
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          </PrivateRoute>
        }
      />

      {/* Redirection par défaut */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
