import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

function TopContactBar({ sidebarOpen, onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "linear-gradient(135deg, #fef08a 0%, #fde047 50%, #eab308 100%)",
        color: "#0f172a",
        height: "38px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        fontSize: "12.5px",
        fontWeight: 600,
        borderBottom: "1px solid #eab308",
        boxShadow: "0 2px 5px rgba(202, 138, 4, 0.2)",
        userSelect: "none"
      }}
    >
      {/* Left Section: Hamburger Toggle + Contact Information */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "nowrap", overflow: "hidden" }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Collapse navigation sidebar" : "Expand navigation sidebar"}
          style={{
            background: "rgba(15, 23, 42, 0.08)",
            border: "none",
            borderRadius: "4px",
            color: "#0f172a",
            fontSize: "16px",
            lineHeight: 1,
            padding: "5px 8px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s ease"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(15, 23, 42, 0.16)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(15, 23, 42, 0.08)")}
        >
          ☰
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", whiteSpace: "nowrap", fontSize: "12px", letterSpacing: "0.2px" }}>
          {/* Phone contact without landline */}
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "13px" }}>📞</span>
            <span>
              Call us :{" "}
              <a
                href="tel:+919975877454"
                style={{ color: "#0f172a", textDecoration: "none", fontWeight: 700 }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              >
                +91 - 9975877454
              </a>
            </span>
          </span>

          <span style={{ color: "#854d0e", opacity: 0.6 }}>|</span>

          {/* Email contact */}
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "13px" }}>✉</span>
            <span>
              E-mail :{" "}
              <a
                href="mailto:reva.patil@ritindia.edu"
                style={{ color: "#0f172a", textDecoration: "none", fontWeight: 700 }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              >
                reva.patil@ritindia.edu
              </a>
            </span>
          </span>
        </div>
      </div>

      {/* Right Section: Notifications + User Profile Menu */}
      <div
        ref={dropdownRef}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          position: "relative",
          flexShrink: 0
        }}
      >
        {/* Notification Bell */}
        <button
          type="button"
          title="Notifications"
          style={{
            background: "none",
            border: "none",
            color: "#0f172a",
            fontSize: "14px",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: "4px",
            display: "inline-flex",
            alignItems: "center"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(15, 23, 42, 0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          🔔
        </button>

        {/* User Info Trigger */}
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            background: dropdownOpen ? "rgba(15, 23, 42, 0.15)" : "rgba(255, 255, 255, 0.7)",
            border: "1px solid rgba(133, 77, 14, 0.35)",
            borderRadius: "16px",
            color: "#0f172a",
            padding: "3px 10px 3px 12px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            transition: "all 0.15s ease",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = dropdownOpen ? "rgba(15, 23, 42, 0.15)" : "rgba(255, 255, 255, 0.7)")}
        >
          <span>{user?.name || "Reva Patil"}</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "#0f172a",
              color: "#fde047",
              fontSize: "11px",
              fontWeight: 800
            }}
          >
            👤
          </span>
          <span style={{ fontSize: "10px", color: "#0f172a", opacity: 0.85, transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
            ▾
          </span>
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 6px)",
              width: "240px",
              background: "#ffffff",
              borderRadius: "10px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e2e8f0",
              color: "#0f172a",
              padding: "12px 14px",
              zIndex: 1001,
              animation: "fadeIn 0.15s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "13px",
                  flexShrink: 0
                }}
              >
                {user?.avatar || "RP"}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontWeight: 800, fontSize: "13px", color: "#0f172a", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                  {user?.name || "Prof. Reva Patil"}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                  {user?.email || "reva.patil@ritindia.edu"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "inline-block",
                padding: "2px 8px",
                background: "#fef9c3",
                color: "#854d0e",
                border: "1px solid #fde047",
                borderRadius: "12px",
                fontSize: "10.5px",
                fontWeight: 700,
                marginBottom: "10px"
              }}
            >
              {user?.role || "Administrator"} · Dept. of IT
            </div>

            <hr style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: "8px 0 10px" }} />

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "background 0.15s ease"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fee2e2")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fef2f2")}
            >
              🚪 Sign Out / Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default TopContactBar;
