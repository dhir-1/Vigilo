import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LocationProvider } from "@/context/LocationContext";

// Pages
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import RoutePlanner from "./pages/RoutePlanner.jsx";
import ReportCrime from "./pages/ReportCrime.jsx";
import MyReports from "./pages/MyReports.jsx";
import ReportDetail from "./pages/ReportDetail.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import PublicProfile from "./pages/PublicProfile.jsx";
import LegalPage from "./pages/LegalPage.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import VerifyQueue from "./pages/admin/VerifyQueue.jsx";
import ReviewReport from "./pages/admin/ReviewReportPage.jsx";

// Loading spinner shown while verifying token on app load
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-primary-glow animate-pulse overflow-hidden">
          <img src="/logo.png" alt="Vigilo Logo" className="w-full h-full object-contain p-2" />
        </div>
        <p className="text-sm text-muted-foreground">Loading Vigilo...</p>
      </div>
    </div>
  );
}

// Protected Route wrapper - requires authentication
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
}

// Admin Route wrapper - requires admin role
function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/privacy-policy" element={<LegalPage />} />
      <Route path="/terms-of-service" element={<LegalPage />} />
      <Route path="/cookie-policy" element={<LegalPage />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/route-planner" element={<ProtectedRoute><RoutePlanner /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><ReportCrime /></ProtectedRoute>} />
      <Route path="/my-reports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
      <Route path="/my-reports/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/user/:userId" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/verify" element={<AdminRoute><VerifyQueue /></AdminRoute>} />
      <Route path="/admin/verify/:id" element={<AdminRoute><ReviewReport /></AdminRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <TooltipProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
