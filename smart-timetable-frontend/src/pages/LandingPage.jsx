import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LandingPage.css";

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleScrollTo = (sectionId) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="landing-page">
      {/* 1. HEADER */}
      <header className="landing-header">
        <div className="landing-nav-container">
          <Link to="/" className="landing-logo">
            <div className="landing-logo-icon">📅</div>
            <div className="landing-logo-text">
              <span className="landing-brand-name">SmartSched</span>
              <span className="landing-brand-subtitle">Smart Timetable Generator</span>
            </div>
          </Link>

          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>

          <nav className={`landing-nav-links ${mobileMenuOpen ? "open" : ""}`}>
            <span className="landing-nav-link" onClick={() => handleScrollTo("features")}>
              Features
            </span>
            <span className="landing-nav-link" onClick={() => handleScrollTo("how-it-works")}>
              How It Works
            </span>
            <span className="landing-nav-link" onClick={() => handleScrollTo("preview")}>
              Overview
            </span>
            <Link to="/dashboard" className="landing-nav-btn">
              Open Dashboard →
            </Link>
          </nav>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="landing-hero">
        <div className="hero-glow-bg" />

        <div className="hero-pill-badge">
          <span className="dot" />
          <span>Autonomous Academic Scheduling · 0 Clashes Guaranteed</span>
        </div>

        <h1 className="hero-title">
          Create <span className="hero-title-gradient">Smarter</span> Timetables
        </h1>

        <p className="hero-description">
          Generate organized and conflict-free college timetables quickly and efficiently.
        </p>

        <div className="hero-cta-group">
          <Link to="/dashboard" className="btn-primary-hero">
            Get Started →
          </Link>
          <button
            type="button"
            onClick={() => handleScrollTo("how-it-works")}
            className="btn-secondary-hero"
          >
            See How It Works
          </button>
        </div>

        {/* Hero Interactive Preview Card */}
        <div id="preview" className="hero-preview-container">
          <div className="preview-browser-header">
            <div className="browser-controls">
              <span className="control-dot red" />
              <span className="control-dot yellow" />
              <span className="control-dot green" />
            </div>
            <div className="browser-address">
              🔒 smartsched.app/master-timetable?view=ALL
            </div>
            <div className="browser-status-badge">
              ✓ 0 Conflicts · All Years Synchronized
            </div>
          </div>

          <div className="preview-body">
            <div className="preview-meta-row">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <strong style={{ fontSize: "14px", color: "#1e3a8a" }}>Department of Information Technology</strong>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Academic Year 2026–27</span>
              </div>
              <div className="preview-badge-group">
                <span className="mini-badge sy">SY (CR-27)</span>
                <span className="mini-badge ty">TY (CR-26)</span>
                <span className="mini-badge btech">B.Tech (CR-212)</span>
              </div>
            </div>

            <div className="preview-timetable-grid">
              <div className="grid-cell header">Time</div>
              <div className="grid-cell header">Monday</div>
              <div className="grid-cell header">Tuesday</div>
              <div className="grid-cell header">Wednesday</div>
              <div className="grid-cell header">Thursday</div>

              {/* Row 1 */}
              <div className="grid-cell time-label">10:00 - 11:00</div>
              <div className="grid-cell slot-lecture">
                <span className="slot-code">SY: DS</span>
                <span className="slot-meta">Prof. SUM · CR-27</span>
              </div>
              <div className="grid-cell slot-lab">
                <span className="slot-code">BTECH: FTWD Lab</span>
                <span className="slot-meta">Prof. MAV · IL3</span>
              </div>
              <div className="grid-cell slot-lecture">
                <span className="slot-code">TY: OS</span>
                <span className="slot-meta">Dr. ACA · CR-26</span>
              </div>
              <div className="grid-cell slot-fixed">
                <span className="slot-code">SY: MDM-I</span>
                <span className="slot-meta">Prof. PTS · CR-27</span>
              </div>

              {/* Row 2 */}
              <div className="grid-cell time-label">11:00 - 12:00</div>
              <div className="grid-cell slot-lecture">
                <span className="slot-code">TY: CN</span>
                <span className="slot-meta">Prof. TNK · CR-26</span>
              </div>
              <div className="grid-cell slot-lecture">
                <span className="slot-code">BTECH: CC</span>
                <span className="slot-meta">Prof. DTM · CR-212</span>
              </div>
              <div className="grid-cell slot-lab">
                <span className="slot-code">SY: ITTT Lab</span>
                <span className="slot-meta">Prof. DBC · IL2</span>
              </div>
              <div className="grid-cell slot-lecture">
                <span className="slot-code">BTECH: IS</span>
                <span className="slot-meta">Prof. MNM · CR-212</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="landing-stats-strip">
        <div className="stats-grid">
          <div>
            <div className="stat-item-number">3 Classes</div>
            <div className="stat-item-label">SY, TY & B.Tech Multi-Year Synchronized</div>
          </div>
          <div>
            <div className="stat-item-number">0 Clashes</div>
            <div className="stat-item-label">Verified Real-Time Constraint Engine</div>
          </div>
          <div>
            <div className="stat-item-number">Latin Square</div>
            <div className="stat-item-label">4-Batch Computer Lab Rotation (IL1–IL6)</div>
          </div>
          <div>
            <div className="stat-item-number">1-Click Swaps</div>
            <div className="stat-item-label">In-Place Quick Slot Editor & Instant Undo</div>
          </div>
        </div>
      </div>

      {/* 3. FEATURES SECTION */}
      <section id="features" className="landing-features-section">
        <div className="section-header-block">
          <span className="section-tag-pill">Core Capabilities</span>
          <h2 className="section-heading-main">Everything Needed for College Scheduling</h2>
          <p className="section-subtext">
            Designed specifically for engineering departments to eliminate scheduling bottlenecks, teacher clashes, and manual spreadsheet errors.
          </p>
        </div>

        <div className="features-card-grid">
          {/* Card 1 */}
          <div className="feature-card-item">
            <div className="feature-icon-badge blue">⚡</div>
            <h3 className="feature-card-title">Automatic Timetable Generation</h3>
            <p className="feature-card-desc">
              Generate timetables based on subjects, faculty, batches, rooms and scheduling constraints.
            </p>
          </div>

          {/* Card 2 */}
          <div className="feature-card-item">
            <div className="feature-icon-badge emerald">🛡️</div>
            <h3 className="feature-card-title">Conflict-Free Scheduling</h3>
            <p className="feature-card-desc">
              Reduce clashes between classes, faculty and available time slots.
            </p>
          </div>

          {/* Card 3 */}
          <div className="feature-card-item">
            <div className="feature-icon-badge amber">⚙️</div>
            <h3 className="feature-card-title">Easy Configuration</h3>
            <p className="feature-card-desc">
              Configure timetable inputs and modify them before generating the final timetable.
            </p>
          </div>

          {/* Card 4 */}
          <div className="feature-card-item">
            <div className="feature-icon-badge indigo">📊</div>
            <h3 className="feature-card-title">Flexible Timetable Management</h3>
            <p className="feature-card-desc">
              View and manage the generated timetable in an organized interface.
            </p>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="landing-workflow-section">
        <div className="section-header-block">
          <span className="section-tag-pill">Workflow</span>
          <h2 className="section-heading-main">How It Works</h2>
          <p className="section-subtext">
            Three simple steps to transform complex academic constraints into a conflict-free master timetable.
          </p>
        </div>

        <div className="workflow-steps-grid">
          {/* Step 1 */}
          <div className="workflow-step-card">
            <div className="step-indicator-row">
              <div className="step-number-bubble">1</div>
              <span className="step-icon-tag">📝</span>
            </div>
            <h3 className="workflow-step-title">Step 1 — Configure</h3>
            <p className="workflow-step-desc">
              Enter subjects, faculty, rooms and scheduling requirements.
            </p>
          </div>

          {/* Step 2 */}
          <div className="workflow-step-card">
            <div className="step-indicator-row">
              <div className="step-number-bubble">2</div>
              <span className="step-icon-tag">🧠</span>
            </div>
            <h3 className="workflow-step-title">Step 2 — Generate</h3>
            <p className="workflow-step-desc">
              Generate the timetable automatically using the configured information.
            </p>
          </div>

          {/* Step 3 */}
          <div className="workflow-step-card">
            <div className="step-indicator-row">
              <div className="step-number-bubble">3</div>
              <span className="step-icon-tag">🔍</span>
            </div>
            <h3 className="workflow-step-title">Step 3 — Review</h3>
            <p className="workflow-step-desc">
              Review and modify the generated timetable as required.
            </p>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION */}
      <section className="landing-cta-section">
        <div className="landing-cta-card">
          <h2 className="cta-heading">Ready to create your timetable?</h2>
          <p className="cta-subtext">
            Streamline your department's scheduling process today with automated, conflict-free generation.
          </p>
          <Link to="/dashboard" className="btn-cta-action">
            Start Scheduling →
          </Link>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="landing-footer">
        <div className="footer-content-inner">
          <div className="footer-brand-info">
            <span className="footer-brand-name">SmartSched — Smart Timetable Generator</span>
            <span className="footer-tagline">Built for smarter academic scheduling.</span>
          </div>

          <div className="footer-nav-links">
            <Link to="/dashboard" className="footer-nav-link">Dashboard</Link>
            <Link to="/master-timetable?view=ALL" className="footer-nav-link">Master Timetable</Link>
            <Link to="/master-timetable?inputs=open" className="footer-nav-link">Department Inputs</Link>
            <span className="footer-nav-link" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ cursor: "pointer" }}>
              Back to Top ↑
            </span>
          </div>
        </div>

        <div className="footer-bottom-copy">
          © 2026 SmartSched · Department of Information Technology · All Rights Reserved
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
