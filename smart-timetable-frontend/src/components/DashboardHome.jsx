import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ritDepartmentPreset } from "../data/ritDepartmentPreset";

function DashboardHome() {
  const { user } = useAuth();

  const [activeDetailSection, setActiveDetailSection] = useState("FACULTY"); // "FACULTY" | "CLASSROOM" | "LAB"
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState("ALL");

  const [inputsData, setInputsData] = useState(() => {
    try {
      const savedInputs = localStorage.getItem("customMasterPayload");
      if (savedInputs) return JSON.parse(savedInputs);
    } catch (e) {}
    return ritDepartmentPreset;
  });

  const [masterDataState, setMasterDataState] = useState(() => {
    try {
      const savedMaster = localStorage.getItem("masterTimetableData");
      if (savedMaster) return JSON.parse(savedMaster);
    } catch (e) {}
    return null;
  });

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
      const savedInputs = localStorage.getItem("customMasterPayload");
      if (savedInputs) {
        const parsed = JSON.parse(savedInputs);
        setInputsData(parsed);
      }
      const savedMaster = localStorage.getItem("masterTimetableData");
      if (savedMaster) {
        const parsedMst = JSON.parse(savedMaster);
        setMasterDataState(parsedMst);
        let facultyCount = (inputsData.faculties?.length) || 13;
        let labCount = (inputsData.rooms || []).filter((r) => r.type === "LAB").length || 6;
        let totalContactHours = 80;
        let conflictCount = 0;
        if (parsedMst.totalContactHours) {
          totalContactHours = (parsedMst.totalContactHours.SY || 0) + (parsedMst.totalContactHours.TY || 0) + (parsedMst.totalContactHours.BTECH || 0);
        }
        if (parsedMst.conflictLog) {
          conflictCount = parsedMst.conflictLog.length;
        }
        setMetrics({ facultyCount, labCount, totalContactHours, conflictCount });
      }
    } catch (e) {}
  }, []);

  const periodTimings = [
    "10:00 To 11:00",
    "11:00 To 12:00",
    "12:45 To 01:45",
    "01:45 To 02:45",
    "03:00 To 04:00",
    "04:00 To 05:00"
  ];

  const facultiesList = inputsData.faculties || ritDepartmentPreset.faculties || [];
  const roomsList = inputsData.rooms || ritDepartmentPreset.rooms || [];
  const classroomsList = roomsList.filter((r) => r.type === "CLASSROOM" || !r.type || r.type === "THEORY");
  const labsList = roomsList.filter((r) => r.type === "LAB");

  // Helper to extract clean uppercase alphanumeric faculty code
  const cleanCode = (c) => (c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Compute organized events for a faculty
  const getFacultyEvents = (faculty) => {
    const fCode = cleanCode(faculty.name || faculty.shortCode);
    const events = [];
    if (!masterDataState?.schedules) return events;

    const schedules = masterDataState.schedules;
    ["SY", "TY", "BTECH"].forEach((yr) => {
      const yrSched = schedules[yr] || [];
      yrSched.forEach((cell) => {
        if (!cell || !cell.course || cell.course === "—") return;
        // Check practical subEntries
        if (cell.subEntries && cell.subEntries.length > 0) {
          cell.subEntries.forEach((sub) => {
            if (cleanCode(sub.faculty) === fCode) {
              events.push({
                day: cell.day,
                period: cell.period,
                timing: periodTimings[cell.period - 1] || `P${cell.period}`,
                course: sub.course || cell.course,
                classYear: yr,
                type: "PRACTICAL LAB",
                batch: `Batch ${sub.batch}`,
                location: sub.location || cell.location || "Lab"
              });
            }
          });
        } else {
          // Theory
          if (cleanCode(cell.faculty) === fCode) {
            events.push({
              day: cell.day,
              period: cell.period,
              timing: periodTimings[cell.period - 1] || `P${cell.period}`,
              course: cell.course,
              classYear: yr,
              type: "THEORY LECTURE",
              batch: "Whole Class",
              location: cell.location || (yr === "SY" ? "CR-26" : yr === "TY" ? "CR-27" : "CR-212")
            });
          }
        }
      });
    });

    // Check FY external loads
    const extLoads = inputsData.externalLoads || [];
    extLoads.forEach((ext) => {
      if (cleanCode(ext.facultyCode) === fCode) {
        events.push({
          day: ext.day,
          period: ext.period,
          timing: typeof ext.period === "number" ? periodTimings[ext.period - 1] : ext.period,
          course: ext.loadType || "FY Load",
          classYear: "First Year (F.Y.)",
          type: "FY FIXED LOAD",
          batch: "FY Batch",
          location: "FY Classroom"
        });
      }
    });

    const dayOrder = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5 };
    events.sort((a, b) => {
      const da = dayOrder[a.day] || 99;
      const db = dayOrder[b.day] || 99;
      if (da !== db) return da - db;
      const pa = typeof a.period === "number" ? a.period : parseInt(a.period) || 0;
      const pb = typeof b.period === "number" ? b.period : parseInt(b.period) || 0;
      return pa - pb;
    });

    return events;
  };

  // Compute organized events for a Classroom
  const getClassroomEvents = (room) => {
    const roomName = (room.name || "").trim().toUpperCase();
    const events = [];
    if (!masterDataState?.schedules) return events;

    let targetYear = null;
    if (roomName.includes("26") || roomName.includes("105") || roomName.includes("SY")) targetYear = "SY";
    else if (roomName.includes("27") || roomName.includes("106") || roomName.includes("TY")) targetYear = "TY";
    else if (roomName.includes("212") || roomName.includes("107") || roomName.includes("BTECH")) targetYear = "BTECH";

    const schedules = masterDataState.schedules;
    ["SY", "TY", "BTECH"].forEach((yr) => {
      const yrSched = schedules[yr] || [];
      yrSched.forEach((cell) => {
        if (!cell || !cell.course || cell.course === "—") return;
        const cellLoc = (cell.location || "").trim().toUpperCase();
        const matchesLocation = cellLoc === roomName || (targetYear && yr === targetYear && (!cellLoc || cellLoc === roomName));
        if (matchesLocation && (!cell.subEntries || cell.subEntries.length === 0)) {
          events.push({
            day: cell.day,
            period: cell.period,
            timing: periodTimings[cell.period - 1] || `P${cell.period}`,
            course: cell.course,
            faculty: cell.faculty,
            classYear: yr,
            cellType: cell.cellType || "THEORY"
          });
        }
      });
    });

    const dayOrder = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5 };
    events.sort((a, b) => {
      const da = dayOrder[a.day] || 99;
      const db = dayOrder[b.day] || 99;
      if (da !== db) return da - db;
      return a.period - b.period;
    });

    return events;
  };

  // Compute organized events for a Laboratory
  const getLabEvents = (lab) => {
    const labName = (lab.name || "").trim().toUpperCase();
    const sessions = [];
    if (!masterDataState?.schedules) return sessions;

    const schedules = masterDataState.schedules;
    ["SY", "TY", "BTECH"].forEach((yr) => {
      const yrSched = schedules[yr] || [];
      yrSched.forEach((cell) => {
        if (!cell || !cell.subEntries || cell.subEntries.length === 0) return;
        const matchingBatches = cell.subEntries.filter((s) => (s.location || "").trim().toUpperCase() === labName);
        if (matchingBatches.length > 0) {
          sessions.push({
            day: cell.day,
            period: cell.period,
            timing: periodTimings[cell.period - 1] ? `${periodTimings[cell.period - 1]} & ${periodTimings[cell.period] || ""}` : `P${cell.period}-P${cell.period + 1}`,
            course: matchingBatches[0].course || cell.course || "Laboratory Practice",
            classYear: yr,
            batches: matchingBatches.map((b) => b.batch).join(", "),
            faculties: matchingBatches.map((b) => b.faculty).filter(Boolean).join(", ") || cell.faculty || "Faculty"
          });
        }
      });
    });

    const dayOrder = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5 };
    sessions.sort((a, b) => {
      const da = dayOrder[a.day] || 99;
      const db = dayOrder[b.day] || 99;
      if (da !== db) return da - db;
      return a.period - b.period;
    });

    return sessions;
  };

  return (
    <div className="dashboard" style={{ maxWidth: "1200px", margin: "0 auto", padding: "10px 0" }}>
      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, #fef08a 0%, #fde047 50%, #eab308 100%)",
        color: "#0f172a",
        padding: "26px 32px",
        borderRadius: "12px",
        marginBottom: "16px",
        boxShadow: "0 4px 14px rgba(202, 138, 4, 0.25)",
        border: "1px solid #facc15",
        textAlign: "center"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "135px 1fr 135px",
          alignItems: "center",
          gap: "16px"
        }}>
          {/* Left Side Logo */}
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
            <img
              src="/rit-logo.png"
              alt="Rajarambapu Institute of Technology Logo"
              style={{
                height: "128px",
                width: "auto",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)"
              }}
            />
          </div>

          {/* Centered Heading Content */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "13px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#854d0e", fontWeight: 700 }}>
              K.E. Society's
            </div>
            <h2 style={{ margin: "4px 0 6px", fontSize: "20px", fontWeight: 800, color: "#1e293b" }}>
              Rajarambapu Institute of Technology, Rajaramnagar
            </h2>
            <h1 style={{ margin: "6px 0 4px", fontSize: "30px", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.5px" }}>
              Department of Information Technology
            </h1>
            <div style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: 800, color: "#78350f" }}>
              Department Time Table
            </div>
          </div>

          {/* Right spacer to preserve perfect center alignment */}
          <div style={{ width: "135px" }} aria-hidden="true" />
        </div>
      </div>

      {/* Admin Personal Welcome Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "10px 18px",
        marginBottom: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        flexWrap: "wrap",
        gap: "10px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #facc15, #eab308)",
            color: "#0f172a",
            fontWeight: 800,
            fontSize: "12.5px",
            boxShadow: "0 1px 4px rgba(250, 204, 21, 0.4)"
          }}>
            {user?.avatar || "RP"}
          </span>
          <div>
            <span style={{ fontSize: "13px", color: "#64748b" }}>Personal Admin Session: </span>
            <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>{user?.name || "Prof. Reva Patil"}</strong>
            <span style={{
              marginLeft: "8px",
              padding: "2px 8px",
              background: "#fef9c3",
              color: "#854d0e",
              border: "1px solid #fde047",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 700
            }}>
              {user?.role || "Administrator"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
            <span>Active Session</span>
          </div>
        </div>
      </div>

      {/* 4 Interactive Information Cards (Faculty, Classroom, Laboratory, Workload) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px", marginBottom: "22px" }}>
        {/* Card 1: Faculty Information */}
        <div
          onClick={() => setActiveDetailSection("FACULTY")}
          style={{
            background: activeDetailSection === "FACULTY" ? "#eff6ff" : "#ffffff",
            padding: "18px 20px",
            borderRadius: "10px",
            border: activeDetailSection === "FACULTY" ? "2px solid #2563eb" : "1px solid #cbd5e1",
            boxShadow: activeDetailSection === "FACULTY" ? "0 4px 12px rgba(37, 99, 235, 0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "11.5px", color: activeDetailSection === "FACULTY" ? "#1e40af" : "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Faculty Information
            </span>
            <span style={{ fontSize: "18px" }}>👨‍🏫</span>
          </div>
          <h3 style={{ margin: "6px 0 2px", fontSize: "24px", color: "#1e3a8a", fontWeight: 800 }}>
            {facultiesList.length} Teachers
          </h3>
          <p style={{ margin: 0, fontSize: "12.5px", color: "#475569", lineHeight: "1.4" }}>
            With daily lecture caps & FY load tracking
          </p>
          <div style={{ marginTop: "10px", fontSize: "11.5px", fontWeight: 700, color: "#2563eb", display: "flex", alignItems: "center", gap: "4px" }}>
            <span>{activeDetailSection === "FACULTY" ? "▼ Viewing Events Organized" : "Inspect Events Organized →"}</span>
          </div>
        </div>

        {/* Card 2: Classroom Information */}
        <div
          onClick={() => setActiveDetailSection("CLASSROOM")}
          style={{
            background: activeDetailSection === "CLASSROOM" ? "#eff6ff" : "#ffffff",
            padding: "18px 20px",
            borderRadius: "10px",
            border: activeDetailSection === "CLASSROOM" ? "2px solid #2563eb" : "1px solid #cbd5e1",
            boxShadow: activeDetailSection === "CLASSROOM" ? "0 4px 12px rgba(37, 99, 235, 0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "11.5px", color: activeDetailSection === "CLASSROOM" ? "#1e40af" : "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Classroom Information
            </span>
            <span style={{ fontSize: "18px" }}>🏛️</span>
          </div>
          <h3 style={{ margin: "6px 0 2px", fontSize: "24px", color: "#1e3a8a", fontWeight: 800 }}>
            {classroomsList.length} Lecture Halls
          </h3>
          <p style={{ margin: 0, fontSize: "12.5px", color: "#475569", lineHeight: "1.4" }}>
            SY (CR-26), TY (CR-27) & B.Tech (CR-212)
          </p>
          <div style={{ marginTop: "10px", fontSize: "11.5px", fontWeight: 700, color: "#2563eb", display: "flex", alignItems: "center", gap: "4px" }}>
            <span>{activeDetailSection === "CLASSROOM" ? "▼ Viewing Events Organized" : "Inspect Events Organized →"}</span>
          </div>
        </div>

        {/* Card 3: Laboratory Information */}
        <div
          onClick={() => setActiveDetailSection("LAB")}
          style={{
            background: activeDetailSection === "LAB" ? "#eff6ff" : "#ffffff",
            padding: "18px 20px",
            borderRadius: "10px",
            border: activeDetailSection === "LAB" ? "2px solid #2563eb" : "1px solid #cbd5e1",
            boxShadow: activeDetailSection === "LAB" ? "0 4px 12px rgba(37, 99, 235, 0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "11.5px", color: activeDetailSection === "LAB" ? "#1e40af" : "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Laboratory Information
            </span>
            <span style={{ fontSize: "18px" }}>🔬</span>
          </div>
          <h3 style={{ margin: "6px 0 2px", fontSize: "24px", color: "#1e3a8a", fontWeight: 800 }}>
            {labsList.length} Practical Labs
          </h3>
          <p style={{ margin: 0, fontSize: "12.5px", color: "#475569", lineHeight: "1.4" }}>
            IL1 to IL{labsList.length} with 4-batch Latin square rotation
          </p>
          <div style={{ marginTop: "10px", fontSize: "11.5px", fontWeight: 700, color: "#2563eb", display: "flex", alignItems: "center", gap: "4px" }}>
            <span>{activeDetailSection === "LAB" ? "▼ Viewing Events Organized" : "Inspect Events Organized →"}</span>
          </div>
        </div>

        {/* Card 4: Total Contact Hours */}
        <Link
          to="/master-timetable?view=ALL"
          style={{
            background: metrics.conflictCount > 0 ? "#fff1f2" : "#ffffff",
            padding: "18px 20px",
            borderRadius: "10px",
            border: `1px solid ${metrics.conflictCount > 0 ? "#f87171" : "#cbd5e1"}`,
            boxShadow: metrics.conflictCount > 0 ? "0 2px 8px rgba(239, 68, 68, 0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
            textDecoration: "none",
            color: "inherit",
            display: "block",
            transition: "all 0.15s ease",
            cursor: "pointer"
          }}
          title="Open Master Timetable"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total Contact Hours
            </span>
            <span style={{ fontSize: "18px" }}>📊</span>
          </div>
          <h3 style={{ margin: "6px 0 2px", fontSize: "24px", color: metrics.conflictCount > 0 ? "#dc2626" : "#15803d", fontWeight: 800 }}>
            {metrics.totalContactHours} Periods
          </h3>
          <span style={{ fontSize: "12.5px", color: metrics.conflictCount > 0 ? "#dc2626" : "#166534", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
            {metrics.conflictCount === 0 ? "✓ 100% Conflict-Free Scheduling" : `⚠️ ${metrics.conflictCount} Clash(es) Detected`}
          </span>
          <div style={{ marginTop: "10px", fontSize: "11.5px", fontWeight: 700, color: "#2563eb" }}>
            Open Master Timetable →
          </div>
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

      {/* ========================================================================= */}
      {/* ACTUAL DETAILS & EVENTS ORGANIZED INTERACTIVE VIEWER */}
      {/* ========================================================================= */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: "12px",
        padding: "22px 24px",
        marginBottom: "28px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
      }}>
        {/* Navigation Tabs Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid #e2e8f0",
          paddingBottom: "14px",
          marginBottom: "18px",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "17.5px", fontWeight: 800, color: "#1e3a8a", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📅 Actual Details & Events Organized</span>
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>
              Live scheduled lectures, teacher teaching hours, classroom occupancies, and laboratory practical rotations
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveDetailSection("FACULTY")}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: activeDetailSection === "FACULTY" ? "none" : "1px solid #cbd5e1",
                background: activeDetailSection === "FACULTY" ? "#1e40af" : "#ffffff",
                color: activeDetailSection === "FACULTY" ? "#ffffff" : "#334155",
                fontWeight: 700,
                fontSize: "12.5px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              👨‍🏫 Faculty Information ({facultiesList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailSection("CLASSROOM")}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: activeDetailSection === "CLASSROOM" ? "none" : "1px solid #cbd5e1",
                background: activeDetailSection === "CLASSROOM" ? "#1e40af" : "#ffffff",
                color: activeDetailSection === "CLASSROOM" ? "#ffffff" : "#334155",
                fontWeight: 700,
                fontSize: "12.5px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              🏛️ Classroom Information ({classroomsList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailSection("LAB")}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: activeDetailSection === "LAB" ? "none" : "1px solid #cbd5e1",
                background: activeDetailSection === "LAB" ? "#1e40af" : "#ffffff",
                color: activeDetailSection === "LAB" ? "#ffffff" : "#334155",
                fontWeight: 700,
                fontSize: "12.5px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              🔬 Laboratory Information ({labsList.length})
            </button>
          </div>
        </div>

        {/* TAB 1: FACULTY INFORMATION & EVENTS ORGANIZED */}
        {activeDetailSection === "FACULTY" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155" }}>Filter Faculty:</span>
                <select
                  value={selectedFacultyFilter}
                  onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: 600,
                    background: "white",
                    color: "#0f172a"
                  }}
                >
                  <option value="ALL">All Faculty Members ({facultiesList.length})</option>
                  {facultiesList.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name} - {f.fullName || f.name} ({f.designation || "Assistant Professor"})
                    </option>
                  ))}
                </select>
              </div>

              <Link
                to="/master-timetable?view=FACULTY"
                style={{
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#1e40af",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                Open Full Personal Faculty Schedules Matrix →
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {facultiesList
                .filter((f) => selectedFacultyFilter === "ALL" || f.name === selectedFacultyFilter)
                .map((f) => {
                  const events = getFacultyEvents(f);
                  const theoryHours = events.filter((e) => e.type === "THEORY LECTURE").length;
                  const practicalHours = events.filter((e) => e.type === "PRACTICAL LAB").length * 2;
                  const fyHours = events.filter((e) => e.type === "FY FIXED LOAD").length * 2;
                  const totalHours = theoryHours + practicalHours + fyHours;

                  return (
                    <div
                      key={f.name}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        background: "#f8fafc",
                        padding: "16px 20px"
                      }}
                    >
                      {/* Teacher Header Bar */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: "#dbeafe",
                            color: "#1e40af",
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "13px"
                          }}>
                            {f.name}
                          </span>
                          <div>
                            <div style={{ fontSize: "14.5px", fontWeight: 800, color: "#0f172a" }}>
                              {f.fullName || f.name}
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                              {f.designation || "Assistant Professor"} {f.centralAuthority && f.centralAuthority !== "None" ? `• ${f.centralAuthority}` : ""}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            background: "#dcfce7",
                            color: "#166534",
                            fontWeight: 700,
                            fontSize: "12px",
                            border: "1px solid #86efac"
                          }}>
                            Total Load: <strong>{totalHours} hrs/wk</strong>
                          </span>
                          <span style={{ fontSize: "11.5px", color: "#475569" }}>
                            Theory: <strong>{theoryHours} hrs</strong> | Labs: <strong>{practicalHours} hrs</strong> | FY: <strong>{fyHours} hrs</strong>
                          </span>
                          <Link
                            to={`/master-timetable?view=FACULTY&faculty=${f.name}`}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "4px",
                              background: "#ffffff",
                              color: "#2563eb",
                              border: "1px solid #93c5fd",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              textDecoration: "none"
                            }}
                          >
                            View Timetable →
                          </Link>
                        </div>
                      </div>

                      {/* Actual Events Organized Table */}
                      {events.length === 0 ? (
                        <div style={{ padding: "14px", background: "#ffffff", borderRadius: "6px", border: "1px dashed #cbd5e1", fontSize: "12.5px", color: "#64748b", textAlign: "center" }}>
                          {masterDataState ? "No active events scheduled for this faculty member." : "Generate the timetable to view live organized period slots."}
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "6px", overflow: "hidden", fontSize: "12px" }}>
                            <thead>
                              <tr style={{ background: "#e2e8f0", color: "#334155", textAlign: "left" }}>
                                <th style={{ padding: "7px 10px" }}>Day</th>
                                <th style={{ padding: "7px 10px" }}>Period & Timing</th>
                                <th style={{ padding: "7px 10px" }}>Course / Subject Title</th>
                                <th style={{ padding: "7px 10px" }}>Class / Year</th>
                                <th style={{ padding: "7px 10px" }}>Event Type</th>
                                <th style={{ padding: "7px 10px" }}>Room / Lab Location</th>
                              </tr>
                            </thead>
                            <tbody>
                              {events.map((ev, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td style={{ padding: "7px 10px", fontWeight: 700, color: "#1e3a8a" }}>
                                    {ev.day}
                                  </td>
                                  <td style={{ padding: "7px 10px", color: "#475569", whiteSpace: "nowrap" }}>
                                    <strong>P{ev.period}</strong> ({ev.timing})
                                  </td>
                                  <td style={{ padding: "7px 10px", fontWeight: 600, color: "#0f172a" }}>
                                    {ev.course}
                                  </td>
                                  <td style={{ padding: "7px 10px", color: "#334155" }}>
                                    {ev.classYear}
                                  </td>
                                  <td style={{ padding: "7px 10px" }}>
                                    <span style={{
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontSize: "10.5px",
                                      fontWeight: 700,
                                      background: ev.type === "THEORY LECTURE" ? "#e0f2fe" : (ev.type === "PRACTICAL LAB" ? "#fef3c7" : "#f1f5f9"),
                                      color: ev.type === "THEORY LECTURE" ? "#0369a1" : (ev.type === "PRACTICAL LAB" ? "#92400e" : "#334155")
                                    }}>
                                      {ev.type} {ev.batch !== "Whole Class" ? `(${ev.batch})` : ""}
                                    </span>
                                  </td>
                                  <td style={{ padding: "7px 10px", fontWeight: 700, color: "#15803d" }}>
                                    📍 {ev.location}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 2: CLASSROOM INFORMATION & EVENTS ORGANIZED */}
        {activeDetailSection === "CLASSROOM" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ fontSize: "13px", color: "#475569" }}>
                Theory Lecture Classrooms allocated to <strong>S.Y., T.Y., and Final Year (B.Tech)</strong>
              </div>
              <Link
                to="/master-timetable?view=ROOM_MASTER"
                style={{
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#1e40af",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                Open Master Classroom Timetable Matrix →
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {classroomsList.map((room) => {
                const events = getClassroomEvents(room);
                let assignedClass = "General Theory";
                if (room.name.includes("26") || room.name.includes("105") || room.name.includes("SY")) assignedClass = "Second Year (S.Y. B.Tech) - Sem-III";
                else if (room.name.includes("27") || room.name.includes("106") || room.name.includes("TY")) assignedClass = "Third Year (T.Y. B.Tech) - Sem-V";
                else if (room.name.includes("212") || room.name.includes("107") || room.name.includes("BTECH")) assignedClass = "Final Year (B.Tech) - Sem-VII";

                return (
                  <div
                    key={room.name}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      background: "#f8fafc",
                      padding: "16px 20px"
                    }}
                  >
                    {/* Classroom Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          background: "#e0f2fe",
                          color: "#0369a1",
                          fontWeight: 800,
                          fontSize: "14px"
                        }}>
                          🏛️ {room.name}
                        </span>
                        <div>
                          <strong style={{ fontSize: "14.5px", color: "#0f172a" }}>{assignedClass}</strong>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            Seating Capacity: <strong>{room.capacity || 75} Students</strong> • Type: <strong>Lecture Hall</strong> • Floor: <strong>Second Floor</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          background: "#dcfce7",
                          color: "#166534",
                          fontWeight: 700,
                          fontSize: "12px",
                          border: "1px solid #86efac"
                        }}>
                          Scheduled Lectures: <strong>{events.length} Periods/Wk</strong>
                        </span>
                        <Link
                          to="/master-timetable?view=ROOM_MASTER"
                          style={{
                            padding: "4px 10px",
                            borderRadius: "4px",
                            background: "#ffffff",
                            color: "#2563eb",
                            border: "1px solid #93c5fd",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            textDecoration: "none"
                          }}
                        >
                          View Schedule →
                        </Link>
                      </div>
                    </div>

                    {/* Actual Events Organized */}
                    {events.length === 0 ? (
                      <div style={{ padding: "14px", background: "#ffffff", borderRadius: "6px", border: "1px dashed #cbd5e1", fontSize: "12.5px", color: "#64748b", textAlign: "center" }}>
                        {masterDataState ? "No lecture events organized in this classroom." : "Generate the timetable to view live classroom occupancy."}
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "6px", overflow: "hidden", fontSize: "12px" }}>
                          <thead>
                            <tr style={{ background: "#e2e8f0", color: "#334155", textAlign: "left" }}>
                              <th style={{ padding: "7px 10px" }}>Day</th>
                              <th style={{ padding: "7px 10px" }}>Period & Timing</th>
                              <th style={{ padding: "7px 10px" }}>Course Title</th>
                              <th style={{ padding: "7px 10px" }}>Faculty In-Charge</th>
                              <th style={{ padding: "7px 10px" }}>Attendee Class</th>
                            </tr>
                          </thead>
                          <tbody>
                            {events.map((ev, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "7px 10px", fontWeight: 700, color: "#1e3a8a" }}>
                                  {ev.day}
                                </td>
                                <td style={{ padding: "7px 10px", color: "#475569", whiteSpace: "nowrap" }}>
                                  <strong>P{ev.period}</strong> ({ev.timing})
                                </td>
                                <td style={{ padding: "7px 10px", fontWeight: 700, color: "#0f172a" }}>
                                  {ev.course}
                                </td>
                                <td style={{ padding: "7px 10px", fontWeight: 600, color: "#1e40af" }}>
                                  👨‍🏫 {ev.faculty || "—"}
                                </td>
                                <td style={{ padding: "7px 10px", color: "#334155" }}>
                                  {ev.classYear} IT
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: LABORATORY INFORMATION & EVENTS ORGANIZED */}
        {activeDetailSection === "LAB" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ fontSize: "13px", color: "#475569" }}>
                Computer Laboratories <strong>IL1 to IL6</strong> with 4-batch Latin Square practical rotation
              </div>
              <Link
                to="/master-timetable?view=LAB&lab=ALL"
                style={{
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#1e40af",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                Open Lab Master Timetable Matrix →
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {labsList.map((lab) => {
                const sessions = getLabEvents(lab);

                return (
                  <div
                    key={lab.name}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      background: "#f8fafc",
                      padding: "16px 20px"
                    }}
                  >
                    {/* Lab Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          background: "#fef3c7",
                          color: "#92400e",
                          fontWeight: 800,
                          fontSize: "14px"
                        }}>
                          🔬 {lab.name}
                        </span>
                        <div>
                          <strong style={{ fontSize: "14.5px", color: "#0f172a" }}>Information Technology Lab {lab.name}</strong>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            Capacity: <strong>{lab.capacity || 25} Systems</strong> • Setup: <strong>Core i7, Gigabit LAN, Linux/Windows Dual Boot</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          background: "#dcfce7",
                          color: "#166534",
                          fontWeight: 700,
                          fontSize: "12px",
                          border: "1px solid #86efac"
                        }}>
                          Scheduled Sessions: <strong>{sessions.length} Blocks ({sessions.length * 2} hrs/wk)</strong>
                        </span>
                        <Link
                          to={`/master-timetable?view=LAB&lab=${lab.name}`}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "4px",
                            background: "#ffffff",
                            color: "#2563eb",
                            border: "1px solid #93c5fd",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            textDecoration: "none"
                          }}
                        >
                          View Lab Grid →
                        </Link>
                      </div>
                    </div>

                    {/* Actual Events Organized */}
                    {sessions.length === 0 ? (
                      <div style={{ padding: "14px", background: "#ffffff", borderRadius: "6px", border: "1px dashed #cbd5e1", fontSize: "12.5px", color: "#64748b", textAlign: "center" }}>
                        {masterDataState ? "No active lab practical sessions assigned to this lab." : "Generate the timetable to view live computer laboratory sessions."}
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "6px", overflow: "hidden", fontSize: "12px" }}>
                          <thead>
                            <tr style={{ background: "#e2e8f0", color: "#334155", textAlign: "left" }}>
                              <th style={{ padding: "7px 10px" }}>Day</th>
                              <th style={{ padding: "7px 10px" }}>2-Hour Lab Block</th>
                              <th style={{ padding: "7px 10px" }}>Practical Course</th>
                              <th style={{ padding: "7px 10px" }}>Batches Scheduled</th>
                              <th style={{ padding: "7px 10px" }}>Supervising Faculty</th>
                              <th style={{ padding: "7px 10px" }}>Class Year</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessions.map((sess, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "7px 10px", fontWeight: 700, color: "#1e3a8a" }}>
                                  {sess.day}
                                </td>
                                <td style={{ padding: "7px 10px", color: "#475569", whiteSpace: "nowrap" }}>
                                  <strong>P{sess.period}-P{sess.period + 1}</strong> ({sess.timing})
                                </td>
                                <td style={{ padding: "7px 10px", fontWeight: 700, color: "#0f172a" }}>
                                  {sess.course}
                                </td>
                                <td style={{ padding: "7px 10px" }}>
                                  <span style={{ padding: "2px 7px", borderRadius: "4px", background: "#fef3c7", color: "#92400e", fontWeight: 700, fontSize: "11px" }}>
                                    Batch {sess.batches}
                                  </span>
                                </td>
                                <td style={{ padding: "7px 10px", fontWeight: 600, color: "#1e40af" }}>
                                  👨‍🏫 {sess.faculties}
                                </td>
                                <td style={{ padding: "7px 10px", color: "#334155" }}>
                                  {sess.classYear} IT
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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