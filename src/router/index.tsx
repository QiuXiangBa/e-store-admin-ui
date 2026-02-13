import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { getPermissionInfo } from '../api/admin';

const AdminLayout = lazy(() => import('../layout/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const DashboardPage = lazy(() => import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const BrandPage = lazy(() => import('../pages/product/BrandPage').then((m) => ({ default: m.BrandPage })));
const CategoryPage = lazy(() => import('../pages/product/CategoryPage').then((m) => ({ default: m.CategoryPage })));
const CommentPage = lazy(() => import('../pages/product/CommentPage').then((m) => ({ default: m.CommentPage })));
const PropertyPage = lazy(() => import('../pages/product/PropertyPage').then((m) => ({ default: m.PropertyPage })));
const PropertyValuePage = lazy(() =>
  import('../pages/product/PropertyValuePage').then((m) => ({ default: m.PropertyValuePage }))
);
const SpuFormPage = lazy(() => import('../pages/product/SpuFormPage').then((m) => ({ default: m.SpuFormPage })));
const SpuPage = lazy(() => import('../pages/product/SpuPage').then((m) => ({ default: m.SpuPage })));

function RouteLoading() {
  return (
    <Box
      sx={{
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <CircularProgress size={28} />
    </Box>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('admin_token');
  const [checking, setChecking] = useState(Boolean(token));
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setValid(false);
      return;
    }
    setChecking(true);
    void getPermissionInfo()
      .then(() => {
        setValid(true);
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');
        setValid(false);
      })
      .finally(() => {
        setChecking(false);
      });
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (checking) {
    return <RouteLoading />;
  }
  if (!valid) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function AppRouter() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="product/brand" element={<BrandPage />} />
          <Route path="product/category" element={<CategoryPage />} />
          <Route path="product/property" element={<PropertyPage />} />
          <Route path="product/property-values" element={<PropertyValuePage />} />
          <Route path="product/comment" element={<CommentPage />} />
          <Route path="product/spu" element={<SpuPage />} />
          <Route path="product/spu/new" element={<SpuFormPage />} />
          <Route path="product/spu/:id/edit" element={<SpuFormPage />} />
          <Route path="product/spu/:id" element={<SpuFormPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
