import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLogin from "./pages/AdminLogin";
import MainLayout from "./layouts/MainLayout";
import DashboardHome from "./components/DashboardHome";
import MasterTimetable from "./pages/MasterTimetable";
import LandingPage from "./pages/LandingPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Landing / Welcome Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Public Authentication Route */}
          <Route path="/login" element={<AdminLogin />} />

          {/* Protected Application Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardHome />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master-timetable"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MasterTimetable />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Graceful Legacy Route Redirects */}
          <Route path="/configuration" element={<Navigate to="/master-timetable?inputs=open" replace />} />
          <Route path="/subjects" element={<Navigate to="/master-timetable?inputs=open&tab=SY" replace />} />
          <Route path="/faculty" element={<Navigate to="/master-timetable?view=FACULTY" replace />} />
          <Route path="/availability" element={<Navigate to="/master-timetable?view=FACULTY" replace />} />
          <Route path="/rooms" element={<Navigate to="/master-timetable?view=LAB" replace />} />
          <Route path="/batches" element={<Navigate to="/master-timetable?view=CLASS&class=SY" replace />} />
          <Route path="/fixed-slots" element={<Navigate to="/master-timetable?inputs=open&tab=FIXED" replace />} />
          <Route path="/generate-theory" element={<Navigate to="/master-timetable" replace />} />
          <Route path="/theory-preview" element={<Navigate to="/master-timetable" replace />} />
          <Route path="/conflicts" element={<Navigate to="/master-timetable" replace />} />
          <Route path="/practical-scheduling" element={<Navigate to="/master-timetable?inputs=open&tab=PRACTICALS" replace />} />
          <Route path="/final-timetable" element={<Navigate to="/master-timetable" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;