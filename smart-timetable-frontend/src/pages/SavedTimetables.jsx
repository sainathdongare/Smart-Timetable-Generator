import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllSavedTimetablesList,
  deleteSavedTimetableById,
  getSavedTimetableById
} from "../api/timetableApi";
import "./LandingPage.css"; // Reuse some existing styling if possible, or inline styling

function SavedTimetables() {
  const [savedList, setSavedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTimetables();
  }, []);

  const fetchTimetables = async () => {
    try {
      setLoading(true);
      const data = await getAllSavedTimetablesList();
      
      const augmentedData = data.map(t => {
        let session = "Unknown Session";
        let semester = "Unknown Semester";
        try {
          if (t.timetableData) {
            const payload = JSON.parse(t.timetableData);
            if (payload.inputs) {
              session = payload.inputs.academicSession || session;
              semester = payload.inputs.academicSemester || semester;
            } else if (payload.masterData) {
              session = payload.masterData.academicSession || session;
              semester = payload.masterData.academicSemester || semester;
            }
          }
        } catch (e) {}
        return { ...t, session, semester };
      });
      
      setSavedList(augmentedData);
    } catch (err) {
      setError("Failed to load saved timetables.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const groupTimetables = (list) => {
    const grouped = {};
    list.forEach(t => {
      const key = `Session: ${t.session} | Sem: ${t.semester}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });
    return grouped;
  };

  const groupedSavedList = groupTimetables(savedList);

  const handleView = (id) => {
    navigate(`/master-timetable?snapshotId=${id}`);
  };

  const handleLoad = async (id) => {
    if (!window.confirm("Loading this timetable will replace the current timetable. Continue?")) {
      return;
    }
    
    try {
      const snapshot = await getSavedTimetableById(id);
      const payload = JSON.parse(snapshot.timetableData);
      
      if (payload.masterData) {
        localStorage.setItem("masterTimetableData", JSON.stringify(payload.masterData));
      }
      if (payload.inputs) {
        localStorage.setItem("customMasterPayload", JSON.stringify(payload.inputs));
      }
      
      alert("Timetable loaded successfully!");
      navigate("/master-timetable");
    } catch (err) {
      alert("Failed to load the saved timetable.");
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this saved timetable?")) {
      return;
    }

    try {
      await deleteSavedTimetableById(id);
      setSavedList(savedList.filter(t => t.id !== id));
    } catch (err) {
      alert("Failed to delete the saved timetable.");
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "900px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h2 style={{ color: "#1e3a8a", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", marginBottom: "20px" }}>
        💾 Saved Timetables
      </h2>
      
      {error && <div style={{ padding: "12px", background: "#fee2e2", color: "#b91c1c", borderRadius: "6px", marginBottom: "20px" }}>{error}</div>}

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading saved timetables...</p>
      ) : savedList.length === 0 ? (
        <div style={{ padding: "30px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", textAlign: "center", color: "#64748b" }}>
          No saved timetables found. Generate and save a timetable to see it here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
          {Object.entries(groupedSavedList).map(([groupKey, timetables]) => (
            <div key={groupKey}>
              <h3 style={{ color: "#334155", borderBottom: "1px solid #cbd5e1", paddingBottom: "5px", marginBottom: "15px", fontSize: "16px" }}>
                📅 {groupKey}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {timetables.map((timetable) => (
                  <div key={timetable.id} style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}>
                    <div>
                      <h3 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "18px" }}>{timetable.name}</h3>
                      <div style={{ fontSize: "13px", color: "#64748b" }}>
                        Saved: {new Date(timetable.createdAt).toLocaleString(undefined, {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: 'numeric', minute: '2-digit', hour12: true
                        })}
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button 
                        onClick={() => handleView(timetable.id)}
                        style={{
                          background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd",
                          padding: "8px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer"
                        }}>
                        👁️ View
                      </button>
                      <button 
                        onClick={() => handleLoad(timetable.id)}
                        style={{
                          background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0",
                          padding: "8px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer"
                        }}>
                        🔄 Load
                      </button>
                      <button 
                        onClick={() => handleDelete(timetable.id)}
                        style={{
                          background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca",
                          padding: "8px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer"
                        }}>
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SavedTimetables;
