import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("smartSched_sidebar_collapsed") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("smartSched_sidebar_collapsed", collapsed ? "true" : "false");
  }, [collapsed]);

  const toggleCollapse = () => {
    setCollapsed((prev) => !prev);
  };

  const closeMobile = () => {
    setMobileOpen(false);
  };

  const openMobile = () => {
    setMobileOpen(true);
  };

  return (
    <div className={`app ${collapsed ? "sidebar-is-collapsed" : ""}`}>
      {/* Mobile Top Bar */}
      <header className="mobile-top-bar">
        <button
          type="button"
          className="mobile-sidebar-toggle"
          onClick={openMobile}
          aria-label="Open navigation menu"
          title="Open Menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="mobile-brand">
          <span className="mobile-brand-title">SmartSched</span>
          <span className="mobile-brand-subtitle">· RIT IT</span>
        </div>

        <div style={{ width: 36 }} />
      </header>

      {/* Backdrop for Mobile Drawer */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Redesigned Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />

      {/* Main Content Area */}
      <div className="main-area">
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;