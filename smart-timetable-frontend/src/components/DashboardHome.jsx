import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ritDepartmentPreset } from "../data/ritDepartmentPreset";

function DashboardHome() {
  const [metrics, setMetrics] = useState(() => {
    let facultyCount = ritDepartmentPreset.faculties?.length || 13;
    let labCount = (ritDepartmentPreset.rooms || []).filter((r) => r.type === "LAB").length || 6;
    let totalContactHours = 80;
    let conflictCount = 0;

    try {
      const savedInputs = localStorage.getItem("customMasterPayload");
      if (savedInputs) {
        const inp = JSON.parse(savedInputs);
        if (inp.faculties?.length) facultyCount = inp.faculties.length;
        if (inp.rooms?.length) {
          const labs = inp.rooms.filter((r) => r.type === "LAB");
          if (labs.length) labCount = labs.length;
        }
      }
      const savedMaster = localStorage.getItem("masterTimetableData");
      if (savedMaster) {
        const mst = JSON.parse(savedMaster);
        if (mst.totalContactHours) {
          totalContactHours = (mst.totalContactHours.SY || 0) + (mst.totalContactHours.TY || 0) + (mst.totalContactHours.BTECH || 0);
        }
        if (mst.conflictLog) {
          conflictCount = mst.conflictLog.length;
        }
      }
    } catch (e) {}

    return { facultyCount, labCount, totalContactHours, conflictCount };
  });

  useEffect(() => {
    try {
      let facultyCount = ritDepartmentPreset.faculties?.length || 13;
      let labCount = (ritDepartmentPreset.rooms || []).filter((r) => r.type === "LAB").length || 6;
      let totalContactHours = 80;
      let conflictCount = 0;

      const savedInputs = localStorage.getItem("customMasterPayload");
      if (savedInputs) {
        const inp = JSON.parse(savedInputs);
        if (inp.faculties?.length) facultyCount = inp.faculties.length;
        if (inp.rooms?.length) {
          const labs = inp.rooms.filter((r) => r.type === "LAB");
          if (labs.length) labCount = labs.length;
        }
      }
      const savedMaster = localStorage.getItem("masterTimetableData");
      if (savedMaster) {
        const mst = JSON.parse(savedMaster);
        if (mst.totalContactHours) {
          totalContactHours = (mst.totalContactHours.SY || 0) + (mst.totalContactHours.TY || 0) + (mst.totalContactHours.BTECH || 0);
        }
        if (mst.conflictLog) {
          conflictCount = mst.conflictLog.length;
        }
      }
      setMetrics({ facultyCount, labCount, totalContactHours, conflictCount });
    } catch (e) {}
  }, []);
  return (
    <div className="dashboard" style={{ maxWidth: "1200px", margin: "0 auto", padding: "10px 0" }}>
      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)",
        color: "white",
        padding: "28px 32px",
        borderRadius: "12px",
        marginBottom: "28px",
        boxShadow: "0 4px 14px rgba(30, 58, 138, 0.2)"
      }}>
        <div style={{ fontSize: "13px", letterSpacing: "1px", textTransform: "uppercase", opacity: 0.85, fontWeight: 700 }}>
          K.E. Society's · Rajarambapu Institute of Technology
        </div>
        <h1 style={{ margin: "6px 0 8px", fontSize: "26px", fontWeight: 800 }}>
          Department of Information Technology · Timetable Portal
        </h1>
        <p style={{ margin: 0, fontSize: "14.5px", opacity: 0.9, maxWidth: "750px", lineHeight: "1.5" }}>
          Autonomous multi-year timetable generator synchronizing <strong>Second Year (SY)</strong>, <strong>Third Year (TY)</strong>, <strong>Final Year (B.Tech)</strong>, and <strong>First-Year (FY) University Loads</strong> with zero teacher and classroom conflicts.
        </p>

        <div style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
          <Link
            to="/master-timetable?view=ALL"
            style={{
              background: "#ffffff",
              color: "#1e3a8a",
              fontWeight: 800,
              padding: "10px 22px",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "14px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            📊 Open Master Timetable →
          </Link>

          <Link
            to="/master-timetable?inputs=open"
            style={{
              background: "rgba(255,255,255,0.18)",
              color: "#ffffff",
              fontWeight: 700,
              padding: "10px 18px",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "14px",
              border: "1px solid rgba(255,255,255,0.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            ⚙️ Manage Department Inputs
          </Link>
        </div>
      </div>

      {/* Live System Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Academic Classes</span>
          <h3 style={{ margin: "6px 0 2px", fontSize: "24px", color: "#1e3a8a", fontWeight: 800 }}>3 Classes</h3>
          <span style={{ fontSize: "12.5px", color: "#475569" }}>SY (Sem-III) · TY (Sem-V) · B.Tech (Sem-VII)</span>
        </div>

        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Department Faculty</span>
          <h3 style={{ margin: "6px 0 2px", fontSize: "24px", color: "#1e3a8a", fontWeight: 800 }}>{metrics.facultyCount} Teachers</h3>
          <span style={{ fontSize: "12.5px", color: "#475569" }}>With daily lecture caps & FY load tracking</span>
        </div>

        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Computer Laboratories</span>
          <h3 style={{ margin: "6px 0 2px", fontSize: "24px", color: "#1e3a8a", fontWeight: 800 }}>{metrics.labCount} Labs</h3>
          <span style={{ fontSize: "12.5px", color: "#475569" }}>IL1 to IL{metrics.labCount} with 4-batch Latin Square rotation</span>
        </div>

        <Link
          to="/master-timetable?view=ALL&conflicts=open#conflicts-section"
          style={{
            background: metrics.conflictCount > 0 ? "#fff1f2" : "#ffffff",
            padding: "18px 20px",
            borderRadius: "10px",
            border: `1px solid ${metrics.conflictCount > 0 ? "#f87171" : "#e2e8f0"}`,
            boxShadow: metrics.conflictCount > 0 ? "0 2px 8px rgba(239, 68, 68, 0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
            textDecoration: "none",
            color: "inherit",
            display: "block",
            transition: "all 0.15s ease",
            cursor: "pointer"
          }}
          title={metrics.conflictCount > 0 ? "Click to view conflicts in Master Timetable" : "Click to view conflict diagnostics in Master Timetable"}
        >
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Contact Hours</span>
          <h3 style={{ margin: "6px 0 2px", fontSize: "24px", color: metrics.conflictCount > 0 ? "#dc2626" : "#15803d", fontWeight: 800 }}>{metrics.totalContactHours} Periods</h3>
          <span style={{ fontSize: "12.5px", color: metrics.conflictCount > 0 ? "#dc2626" : "#166534", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
            {metrics.conflictCount === 0 ? "✓ 100% Conflict-Free Scheduling" : `⚠️ ${metrics.conflictCount} Clash(es) Detected → View`}
          </span>
        </Link>
      </div>

      {/* Real-time Conflict Alert Banner on Dashboard */}
      {metrics.conflictCount > 0 && (
        <div style={{
          background: "#fff1f2",
          border: "1.5px solid #f87171",
          borderRadius: "10px",
          padding: "14px 20px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 2px 6px rgba(239, 68, 68, 0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>⚠️</span>
            <div>
              <strong style={{ color: "#991b1b", fontSize: "14px" }}>
                {metrics.conflictCount} Schedule Conflict{metrics.conflictCount > 1 ? "s" : ""} Detected in Timetable
              </strong>
              <div style={{ color: "#7f1d1d", fontSize: "12.5px", marginTop: "2px" }}>
                Double-booking or room collision detected. Click below to inspect the conflict log and resolve them.
              </div>
            </div>
          </div>
          <Link
            to="/master-timetable?view=ALL&conflicts=open#conflicts-section"
            style={{
              background: "#dc2626",
              color: "white",
              fontWeight: 700,
              fontSize: "13px",
              padding: "8px 16px",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 4px rgba(220, 38, 38, 0.3)"
            }}
          >
            🔍 Inspect Conflicts & Resolve →
          </Link>
        </div>
      )}

      {/* Perspective Quick-Launch Cards */}
      <h3 style={{ margin: "0 0 16px", color: "#1e3a8a", fontSize: "18px" }}>
        🚀 Department Perspectives & Navigation
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        {/* Card 1: Master View */}
        <Link
          to="/master-timetable?view=ALL"
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            textDecoration: "none",
            color: "inherit",
            transition: "all 0.15s ease",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
          }}
        >
          <div>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>📊</div>
            <h4 style={{ margin: "0 0 6px", color: "#1e3a8a", fontSize: "16px" }}>Master Class Timetable</h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
              Full institutional master matrix displaying SY, TY, and B.Tech side-by-side with synchronized period timings and lunch recesses.
            </p>
          </div>
          <span style={{ marginTop: "14px", fontSize: "13px", fontWeight: 700, color: "#2563eb" }}>
            View Master Schedule →
          </span>
        </Link>

        {/* Card 2: Student Class Timetables */}
        <Link
          to="/master-timetable?view=CLASS&class=SY"
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            textDecoration: "none",
            color: "inherit",
            transition: "all 0.15s ease",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
          }}
        >
          <div>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🎓</div>
            <h4 style={{ margin: "0 0 6px", color: "#1e3a8a", fontSize: "16px" }}>Student Class Timetables</h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
              Clean single-class views for SY, TY, and B.Tech with 2-hour continuous practical lab blocks, batch division chips, and faculty reference indexes.
            </p>
          </div>
          <span style={{ marginTop: "14px", fontSize: "13px", fontWeight: 700, color: "#2563eb" }}>
            View Class Schedules →
          </span>
        </Link>

        {/* Card 3: Faculty Schedules */}
        <Link
          to="/master-timetable?view=FACULTY"
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            textDecoration: "none",
            color: "inherit",
            transition: "all 0.15s ease",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
          }}
        >
          <div>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>👨‍🏫</div>
            <h4 style={{ margin: "0 0 6px", color: "#1e3a8a", fontSize: "16px" }}>Individual Faculty Schedules</h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
              Personal weekly timetables and workload analysis for all 13 teachers, showing core theory, lab batches, FY loads, and daily caps.
            </p>
          </div>
          <span style={{ marginTop: "14px", fontSize: "13px", fontWeight: 700, color: "#2563eb" }}>
            View Faculty Schedules →
          </span>
        </Link>

        {/* Card 4: Computer Labs Matrix */}
        <Link
          to="/master-timetable?view=LAB"
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            textDecoration: "none",
            color: "inherit",
            transition: "all 0.15s ease",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
          }}
        >
          <div>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔬</div>
            <h4 style={{ margin: "0 0 6px", color: "#1e3a8a", fontSize: "16px" }}>Computer Laboratory Matrix</h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
              Room occupancy tracker for IL1 to IL6. Inspect scheduled practical batches, utilization percentages, and open lab practice hours.
            </p>
          </div>
          <span style={{ marginTop: "14px", fontSize: "13px", fontWeight: 700, color: "#2563eb" }}>
            View Lab Matrices →
          </span>
        </Link>

        {/* Card 5: Department Inputs Hub */}
        <Link
          to="/master-timetable?inputs=open"
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            textDecoration: "none",
            color: "inherit",
            transition: "all 0.15s ease",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
          }}
        >
          <div>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>⚙️</div>
            <h4 style={{ margin: "0 0 6px", color: "#1e3a8a", fontSize: "16px" }}>Department Inputs & Settings</h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
              Unified management hub: configure faculty members, subjects, classrooms, coordinator lab courses, MDM fixed slots, and JSON backups.
            </p>
          </div>
          <span style={{ marginTop: "14px", fontSize: "13px", fontWeight: 700, color: "#2563eb" }}>
            Open Input Hub →
          </span>
        </Link>

        {/* Card 6: Official PDF Print */}
        <Link
          to="/master-timetable"
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            textDecoration: "none",
            color: "inherit",
            transition: "all 0.15s ease",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
          }}
        >
          <div>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🖨️</div>
            <h4 style={{ margin: "0 0 6px", color: "#1e3a8a", fontSize: "16px" }}>Official Print & PDF Export</h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
              One-click print and PDF generation formatted to institutional standards with official college headers, document metadata, and signature blocks.
            </p>
          </div>
          <span style={{ marginTop: "14px", fontSize: "13px", fontWeight: 700, color: "#2563eb" }}>
            Export Timetable →
          </span>
        </Link>
      </div>
    </div>
  );
}

export default DashboardHome;