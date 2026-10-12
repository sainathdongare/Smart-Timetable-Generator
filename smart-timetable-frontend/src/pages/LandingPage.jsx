import { Link } from "react-router-dom";
import "./LandingPage.css";

function LandingPage() {
  return (
    <div className="landing-page">
      {/* 1. HEADER */}
      <header className="landing-header">
        <div className="landing-nav-container">
          <Link to="/" className="landing-logo">
            <div className="landing-logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2.5" y="3.5" width="19" height="18" rx="3.5" fill="#ffffff" stroke="#bfdbfe" strokeWidth="1" />
                <path d="M2.5 8C2.5 6.067 4.067 4.5 6 4.5H18C19.933 4.5 21.5 6.067 21.5 8V9H2.5V8Z" fill="#1d4ed8" />
                <rect x="6.5" y="2" width="2" height="4" rx="1" fill="#ffffff" />
                <rect x="15.5" y="2" width="2" height="4" rx="1" fill="#ffffff" />
                <rect x="5.5" y="11.5" width="3.5" height="2.5" rx="0.75" fill="#2563eb" />
                <rect x="10.25" y="11.5" width="3.5" height="2.5" rx="0.75" fill="#93c5fd" />
                <rect x="15" y="11.5" width="3.5" height="2.5" rx="0.75" fill="#38bdf8" />
                <rect x="5.5" y="15.5" width="3.5" height="2.5" rx="0.75" fill="#cbd5e1" />
                <rect x="10.25" y="15.5" width="3.5" height="2.5" rx="0.75" fill="#1d4ed8" />
                <rect x="15" y="15.5" width="3.5" height="2.5" rx="0.75" fill="#60a5fa" />
              </svg>
            </div>
            <div className="landing-logo-text">
              <span className="landing-brand-name">Academic Time Table </span>
              <span className="landing-brand-subtitle">Department Of IT</span>
            </div>
          </Link>

          <div className="landing-header-right">
            <img
              src="/rit-logo.png"
              alt="RIT Logo"
              className="landing-rit-logo"
            />
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="landing-hero" id="hero">
        <div className="hero-inner-container">
          <div className="hero-pill-badge">
            <span className="dot" />
            <span>Autonomous Academic Scheduling · Minimum Clashes</span>
          </div>

          <h1 className="hero-title">
            Smarter Timetables. Simpler Scheduling.
          </h1>

          <p className="hero-description">
            Generate, manage and organize academic timetables for department of IT of RIT.
          </p>

          <div className="hero-cta-group">
            <Link to="/dashboard" className="btn-primary-hero">
              Get Started →
            </Link>
          </div>
        </div>
      </section>


      {/* 3. FOOTER */}
      <footer className="landing-footer">
        <div className="footer-bottom-copy">
          © 2026 SmartSched · Department of Information Technology · All Rights Reserved
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
