import { Link } from "react-router-dom";
import "./LandingPage.css";

function LandingPage() {
  return (
    <div className="landing-page">
      {/* 1. HEADER */}
      <header className="landing-header">
        <div className="landing-nav-container">
          <Link to="/" className="landing-logo">
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
