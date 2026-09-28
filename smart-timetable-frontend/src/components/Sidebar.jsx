import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const search = location.search;
  const path = location.pathname;

  const isActive = (targetPath, targetSearch = "") => {
    if (path !== targetPath) return false;
    if (!targetSearch) return !search || search === "";
    const targetParams = new URLSearchParams(targetSearch);
    const currentParams = new URLSearchParams(search);
    for (const [key, val] of targetParams.entries()) {
      if (currentParams.get(key) !== val) return false;
    }
    return true;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img
          src="/rit-logo.png"
          alt="RIT Logo"
          style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "contain", flexShrink: 0 }}
        />
        <div>
          <h2 style={{ fontSize: "15px", lineHeight: "1.2", margin: "0 0 2px" }}>Academic Time Table</h2>
          <p>RIT Department of IT</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <Link
          to="/dashboard"
          className={path === "/dashboard" ? "nav-active" : ""}
        >
          🏠 Dashboard
        </Link>

        <div className="nav-section">CLASS SCHEDULES</div>

        <Link
          to="/master-timetable?view=ALL"
          className={
            path === "/master-timetable" && (search.includes("view=ALL") || !search)
              ? "nav-active"
              : ""
          }
        >
          📊 Master Class Time Table
        </Link>

        <Link
          to="/master-timetable?view=CLASS&class=SY"
          className={isActive("/master-timetable", "view=CLASS&class=SY") ? "nav-active" : ""}
        >
          🎓 Second Year
        </Link>

        <Link
          to="/master-timetable?view=CLASS&class=TY"
          className={isActive("/master-timetable", "view=CLASS&class=TY") ? "nav-active" : ""}
        >
          🎓 Third Year
        </Link>

        <Link
          to="/master-timetable?view=CLASS&class=BTECH"
          className={isActive("/master-timetable", "view=CLASS&class=BTECH") ? "nav-active" : ""}
        >
          🎓 Final year
        </Link>

        <div className="nav-section">FACULTY & WORKLOAD</div>

        <Link
          to="/master-timetable?view=LOAD_SHEET"
          className={isActive("/master-timetable", "view=LOAD_SHEET") ? "nav-active" : ""}
        >
          📋 Total Staff Load Sheet
        </Link>

        <Link
          to="/master-timetable?view=FACULTY_MASTER"
          className={isActive("/master-timetable", "view=FACULTY_MASTER") ? "nav-active" : ""}
        >
          👨‍🏫 Master Personal faculty Time Table
        </Link>

        <Link
          to="/master-timetable?view=FACULTY"
          className={isActive("/master-timetable", "view=FACULTY") && !search.includes("view=FACULTY_MASTER") ? "nav-active" : ""}
        >
          👤 Personal Faculty Time Table
        </Link>

        <div className="nav-section">CLASSROOM SCHEDULES</div>

        <Link
          to="/master-timetable?view=ROOM_MASTER"
          className={isActive("/master-timetable", "view=ROOM_MASTER") ? "nav-active" : ""}
        >
          🏛️ Master Classroom Time Table
        </Link>

        <Link
          to="/master-timetable?view=ROOM"
          className={isActive("/master-timetable", "view=ROOM") && !search.includes("view=ROOM_MASTER") ? "nav-active" : ""}
        >
          🚪 Personal Classroom Time Table
        </Link>

        <div className="nav-section">LABORATORY SCHEDULES</div>

        <Link
          to="/master-timetable?view=LAB&lab=ALL"
          className={search.includes("view=LAB") && (search.includes("lab=ALL") || !search.includes("lab=")) ? "nav-active" : ""}
        >
          🔬 Lab Master Time Table
        </Link>

        <Link
          to="/master-timetable?view=LAB&lab=IL1"
          className={search.includes("view=LAB") && search.includes("lab=") && !search.includes("lab=ALL") ? "nav-active" : ""}
        >
          💻 Lab Personal Time Table
        </Link>

        <div className="nav-section">MANAGEMENT</div>

        <Link
          to="/master-timetable?inputs=open"
          className={
            "nav-manage" +
            (isActive("/master-timetable", "inputs=open") ? " nav-active" : "")
          }
        >
          ⚙️ Manage Department Inputs
        </Link>
      </nav>

      {/* Admin User Profile & Sign Out */}
      {user && (
        <div style={{
          padding: "16px 14px",
          borderTop: "1px solid #1e293b",
          marginTop: "auto",
          background: "rgba(15, 23, 42, 0.6)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <div style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              {user.avatar || "A"}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.name}
              </div>
              <div style={{ fontSize: "11px", color: "#facc15", fontWeight: 600 }}>
                {user.role}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: "7px 10px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ef4444";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
              e.currentTarget.style.color = "#fca5a5";
            }}
          >
            <span>🚪</span> Logout
          </button>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
