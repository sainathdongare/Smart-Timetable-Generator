import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminLogin() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || "/dashboard";

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your administrator username or email.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const result = login(username, password);
      if (result.success) {
        navigate(redirectPath, { replace: true });
      } else {
        setError(result.message);
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#ffffff",
      padding: "24px",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "460px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
        overflow: "hidden"
      }}>
        {/* Top Institutional Header Strip */}
        <div style={{
          background: "linear-gradient(135deg, #fef08a 0%, #fde047 50%, #eab308 100%)",
          padding: "22px 28px",
          textAlign: "center",
          borderBottom: "1px solid #facc15"
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
            <img
              src="/rit-logo.png"
              alt="Rajarambapu Institute of Technology Logo"
              style={{
                height: "64px",
                width: "auto",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
              }}
            />
          </div>
          <div style={{ fontSize: "11.5px", letterSpacing: "1.2px", textTransform: "uppercase", color: "#854d0e", fontWeight: 700 }}>
            K.E. Society's · Rajaramnagar
          </div>
          <h2 style={{ margin: "2px 0 3px", fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
            Rajarambapu Institute of Technology
          </h2>
          <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#78350f" }}>
            Department of Information Technology
          </div>
        </div>

        {/* Login Body */}
        <div style={{ padding: "32px 30px" }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <h1 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>
              Admin Portal Login
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
              Sign in to manage and configure the Department Timetable
            </p>
          </div>

          {error && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "20px",
              color: "#b91c1c",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username / Email Field */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{
                display: "block",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px"
              }}>
                Administrator Username or Email
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "15px",
                  color: "#94a3b8"
                }}>
                  👤
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your email or username"
                  autoComplete="username"
                  style={{
                    width: "100%",
                    padding: "11px 14px 11px 40px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#0f172a",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "all 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#eab308";
                    e.target.style.background = "#ffffff";
                    e.target.style.boxShadow = "0 0 0 3px rgba(250, 204, 21, 0.2)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#cbd5e1";
                    e.target.style.background = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#334155"
                }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    fontSize: "12px",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: 600
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "15px",
                  color: "#94a3b8"
                }}>
                  🔒
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    padding: "11px 14px 11px 40px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#0f172a",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "all 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#eab308";
                    e.target.style.background = "#ffffff";
                    e.target.style.boxShadow = "0 0 0 3px rgba(250, 204, 21, 0.2)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#cbd5e1";
                    e.target.style.background = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                background: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
                color: "#0f172a",
                border: "none",
                borderRadius: "8px",
                fontSize: "14.5px",
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(250, 204, 21, 0.35)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px"
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
            >
              {loading ? "Authenticating..." : "Sign In to Admin Dashboard →"}
            </button>
          </form>

          {/* Department Contact Footer */}
          <div style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #e2e8f0",
            textAlign: "center",
            fontSize: "11.5px",
            color: "#64748b"
          }}>
            <div>📞 Call us: +91 - 9975877454</div>
            <div style={{ marginTop: "3px" }}>
              ✉️ E-mail: <a href="mailto:reva.patil@ritindia.edu" style={{ color: "#854d0e", fontWeight: 700, textDecoration: "none" }}>reva.patil@ritindia.edu</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
