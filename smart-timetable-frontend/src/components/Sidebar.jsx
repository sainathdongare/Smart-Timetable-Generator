import { Link, useLocation } from "react-router-dom";

function Sidebar() {
  const location = useLocation();
  const search = location.search;
  const path = location.pathname;

  const isActive = (targetPath, targetSearch = "") => {
    if (path !== targetPath) return false;
    if (!targetSearch) return !search || search === "";
    return search.includes(targetSearch);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>Smart Timetable</h2>
        <p>RIT Department of IT</p>
      </div>

      <nav className="sidebar-nav">
        <Link
          to="/"
          className={path === "/" ? "nav-active" : ""}
        >
          🏠 Dashboard
        </Link>

        <div className="nav-section">DEPARTMENT SCHEDULES</div>

        <Link
          to="/master-timetable?view=ALL"
          className={
            path === "/master-timetable" && (search.includes("view=ALL") || !search)
              ? "nav-active"
              : ""
          }
        >
          📊 Master Class Timetable
        </Link>

        <Link
          to="/master-timetable?view=CLASS&class=SY"
          className={isActive("/master-timetable", "view=CLASS") ? "nav-active" : ""}
        >
          🎓 Class Timetables (SY/TY/BTech)
        </Link>

        <Link
          to="/master-timetable?view=FACULTY"
          className={isActive("/master-timetable", "view=FACULTY") ? "nav-active" : ""}
        >
          👨‍🏫 Faculty Weekly Schedules
        </Link>

        <Link
          to="/master-timetable?view=LAB"
          className={isActive("/master-timetable", "view=LAB") ? "nav-active" : ""}
        >
          🔬 Computer Labs Matrix (IL1–IL6)
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
    </aside>
  );
}

export default Sidebar;