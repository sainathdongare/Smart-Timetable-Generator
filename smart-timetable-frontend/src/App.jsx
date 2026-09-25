import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import DashboardHome from "./components/DashboardHome";
import MasterTimetable from "./pages/MasterTimetable";
import LandingPage from "./pages/LandingPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing / Welcome Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Dashboard & Core Timetable Application Routes */}
        <Route
          path="/dashboard"
          element={
            <MainLayout>
              <DashboardHome />
            </MainLayout>
          }
        />
        <Route
          path="/master-timetable"
          element={
            <MainLayout>
              <MasterTimetable />
            </MainLayout>
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
    </BrowserRouter>
  );
}

export default App;