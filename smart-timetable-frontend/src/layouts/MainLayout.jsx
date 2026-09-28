import { useState } from "react";
import Sidebar from "../components/Sidebar";
import TopContactBar from "../components/TopContactBar";

function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-container" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Static institutional contact & session line matching RIT portal */}
      <TopContactBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      <div className="app" style={{ flex: 1, display: "flex" }}>
        {sidebarOpen && <Sidebar />}
        <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
          <main className="content">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default MainLayout;