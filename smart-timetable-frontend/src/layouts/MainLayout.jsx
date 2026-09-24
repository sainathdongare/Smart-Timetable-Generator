import Sidebar from "../components/Sidebar";

function MainLayout({ children }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="main-area">
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;