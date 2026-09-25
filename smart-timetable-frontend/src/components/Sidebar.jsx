import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";

// Crisp modern SVG vector icons
function BrandIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function MasterTimetableIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="10" y1="4" x2="10" y2="22" />
      <line x1="17" y1="10" x2="17" y2="22" />
    </svg>
  );
}

function ClassTimetablesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function FacultyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="6" y1="8" x2="10" y2="8" />
    </svg>
  );
}

function ManageInputsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function PortalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}



const NAV_GROUPS = [
  {
    title: "MAIN",
    items: [
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: DashboardIcon,
        match: (path) => path === "/dashboard",
      },
    ],
  },
  {
    title: "DEPARTMENT SCHEDULES",
    items: [
      {
        to: "/master-timetable?view=ALL",
        label: "Master Class Timetable",
        icon: MasterTimetableIcon,
        match: (path, search) =>
          path === "/master-timetable" &&
          !search.includes("inputs=open") &&
          (search.includes("view=ALL") || !search || search === ""),
      },
      {
        to: "/master-timetable?view=CLASS&class=SY",
        label: "Class Timetables (SY/TY/BTech)",
        icon: ClassTimetablesIcon,
        match: (path, search) =>
          path === "/master-timetable" &&
          !search.includes("inputs=open") &&
          search.includes("view=CLASS"),
      },
      {
        to: "/master-timetable?view=FACULTY",
        label: "Faculty Weekly Schedules",
        icon: FacultyIcon,
        match: (path, search) =>
          path === "/master-timetable" &&
          !search.includes("inputs=open") &&
          search.includes("view=FACULTY"),
      },
      {
        to: "/master-timetable?view=LAB",
        label: "Computer Labs Matrix (IL1–IL6)",
        icon: LabIcon,
        match: (path, search) =>
          path === "/master-timetable" &&
          !search.includes("inputs=open") &&
          search.includes("view=LAB"),
      },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      {
        to: "/master-timetable?inputs=open",
        label: "Manage Department Inputs",
        icon: ManageInputsIcon,
        isManage: true,
        match: (path, search) =>
          path === "/master-timetable" && search.includes("inputs=open"),
      },
    ],
  },
  {
    title: "PORTAL",
    items: [
      {
        to: "/",
        label: "Welcome Page",
        icon: PortalIcon,
        isPortal: true,
        match: (path) => path === "/",
      },
    ],
  },
];

function Sidebar({
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) {
  const location = useLocation();
  const path = location.pathname;
  const search = location.search;

  return (
    <aside
      className={`sidebar ${collapsed ? "is-collapsed" : ""} ${
        mobileOpen ? "mobile-open" : ""
      }`}
      aria-label="Sidebar Navigation"
    >
      {/* Brand Header */}
      <div className="sidebar-header">
        <Link
          to="/dashboard"
          className="sidebar-brand"
          title="SmartSched Dashboard"
          onClick={onCloseMobile}
        >
          <div className="brand-icon-box">
            <BrandIcon />
          </div>
          <div className="brand-info-wrap">
            <h1 className="brand-title">SmartSched</h1>
            <p className="brand-subtitle">RIT Department of IT</p>
          </div>
        </Link>

        {/* Desktop Collapse Toggle */}
        {onToggleCollapse && (
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        )}

      </div>

      {/* Navigation Groups */}
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="nav-group">
            <div className="nav-section-label">{group.title}</div>
            {group.items.map((item) => {
              const active = item.match(path, search);
              const Icon = item.icon;
              let itemClass = "sidebar-nav-item";
              if (active) itemClass += " nav-active";
              if (item.isManage) itemClass += " nav-manage";
              if (item.isPortal) itemClass += " nav-portal";

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={itemClass}
                  data-tooltip={item.label}
                  title={collapsed ? item.label : undefined}
                  onClick={onCloseMobile}
                >
                  <span className="item-icon">
                    <Icon />
                  </span>
                  <span className="item-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Area */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-text">
          <div className="sidebar-footer-title">
            <span
              className="sidebar-footer-status-dot"
              title="System Operational"
            />
            <span>SmartSched</span>
          </div>
          <div className="sidebar-footer-sub">Smart Timetable Generator</div>
        </div>

        {collapsed && (
          <span
            className="sidebar-footer-status-dot"
            title="SmartSched Online"
            style={{ margin: "auto" }}
          />
        )}
      </div>
    </aside>
  );
}

export default Sidebar;