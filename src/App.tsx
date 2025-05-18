import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { AuthProvider, useSupabaseAuth } from "./hooks/useSupabaseAuth";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import TakeAttendance from "./pages/Attendance/TakeAttendance";
import ConfirmAttendance from "./pages/Attendance/ConfirmAttendance";
import AttendanceReport from "./pages/Attendance/AttendanceReport";
import ManageUsers from "./pages/Users/ManageUsers";
import ManageSubjects from "./pages/Subjects/ManageSubjects";
import ManageClasses from "./pages/Classes/ManageClasses";
import InstitutionSettings from "./pages/Settings/InstitutionSettings";
import { ProtectedFirstAccessRoute } from "./routes/ProtectedFirstAccessRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Route Guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useSupabaseAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

// Auth wrapper to provide context
const AuthWrapper = () => (
  <Routes>
    {/* Rotas públicas */}
    <Route path="/login" element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/first-access" element={<ProtectedFirstAccessRoute />} />
    
    {/* Rotas protegidas dentro do Layout */}
    <Route path="/" element={
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    }>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="profile" element={<Profile />} />
      
      {/* Rotas de presença */}
      <Route path="attendance">
        <Route index element={<AttendanceReport />} />
        <Route path="take" element={<TakeAttendance />} />
        <Route path="take/:classId" element={<TakeAttendance />} />
        <Route path="confirm" element={<ConfirmAttendance />} />
        <Route path="confirm/:classId" element={<ConfirmAttendance />} />
        <Route path=":classId" element={<AttendanceReport />} />
      </Route>
      
      <Route path="users" element={<ManageUsers />} />
      <Route path="subjects" element={<ManageSubjects />} />
      <Route path="classes" element={<ManageClasses />} />
      <Route path="settings" element={<InstitutionSettings />} />
      
      <Route path="*" element={<NotFound />} />
    </Route>
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <AuthWrapper />
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
