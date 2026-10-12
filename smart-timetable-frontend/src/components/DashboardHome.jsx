import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ritDepartmentPreset } from "../data/ritDepartmentPreset";
import * as XLSX from "xlsx";

function DashboardHome() {
  const { user } = useAuth();

  const [activeDetailSection, setActiveDetailSection] = useState("FACULTY"); // "FACULTY" | "CLASSROOM" | "LAB"
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState("ALL");
  const [editingFacultyId, setEditingFacultyId] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: "", initials: "", designation: "", empId: "", role: "" });

  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editRoomForm, setEditRoomForm] = useState({ name: "", capacity: 75, type: "CLASSROOM", floor: "" });

  const [inputsData, setInputsData] = useState(() => {
    try {
      const savedInputs = localStorage.getItem("customMasterPayload");
      if (savedInputs) return JSON.parse(savedInputs);
    } catch (e) { }
    return ritDepartmentPreset;
  });

  const [masterDataState, setMasterDataState] = useState(() => {
    try {
      const savedMaster = localStorage.getItem("masterTimetableData");
      if (savedMaster) return JSON.parse(savedMaster);
    } catch (e) { }
    return null;
  });

  const [metrics, setMetrics] = useState(() => {
    let facultyCount = ritDepartmentPreset.faculties?.length || 13;
    let labCount = (ritDepartmentPreset.rooms || []).filter((r) => r.type === "LAB").length || 6;
    let totalContactHours = 80;
    let conflictCount = 0;

    try {
      const savedInputs = localStorage.getItem("customMasterPayload");
      if (savedInputs) {
        const inp = JSON.parse(savedInputs);
        if (inp.faculties?.length) facultyCount = inp.faculties.length;
        if (inp.rooms?.length) {
          const labs = inp.rooms.filter((r) => r.type === "LAB");
          if (labs.length) labCount = labs.length;
        }
      }
      const savedMaster = localStorage.getItem("masterTimetableData");
      if (savedMaster) {
        const mst = JSON.parse(savedMaster);
        if (mst.totalContactHours) {
          totalContactHours = (mst.totalContactHours.SY || 0) + (mst.totalContactHours.TY || 0) + (mst.totalContactHours.BTECH || 0);
        }
        if (mst.conflictLog) {
          conflictCount = mst.conflictLog.length;
        }
      }
    } catch (e) { }

    return { facultyCount, labCount, totalContactHours, conflictCount };
  });

  useEffect(() => {
    try {
      const savedInputs = localStorage.getItem("customMasterPayload");
      if (savedInputs) {
        const parsed = JSON.parse(savedInputs);
        setInputsData(parsed);
      }
      const savedMaster = localStorage.getItem("masterTimetableData");
      if (savedMaster) {
        const parsedMst = JSON.parse(savedMaster);
        setMasterDataState(parsedMst);
        let facultyCount = (inputsData.faculties?.length) || 13;
        let labCount = (inputsData.rooms || []).filter((r) => r.type === "LAB").length || 6;
        let totalContactHours = 80;
        let conflictCount = 0;
        if (parsedMst.totalContactHours) {
          totalContactHours = (parsedMst.totalContactHours.SY || 0) + (parsedMst.totalContactHours.TY || 0) + (parsedMst.totalContactHours.BTECH || 0);
        }
        if (parsedMst.conflictLog) {
          conflictCount = parsedMst.conflictLog.length;
        }
        setMetrics({ facultyCount, labCount, totalContactHours, conflictCount });
      }
    } catch (e) { }
  }, []);

  const handleAddNewRoom = (defaultType = "CLASSROOM") => {
    setEditingRoomId("NEW_" + defaultType);
    setEditRoomForm({ name: "", capacity: 75, type: defaultType, floor: "" });
  };

  const handleSaveRoom = (roomId) => {
    const currentRooms = [...(inputsData.rooms || ritDepartmentPreset.rooms)];

    if (roomId.startsWith("NEW_")) {
      if (!editRoomForm.name.trim()) {
        alert("Room name is required.");
        return;
      }
      const newRoom = {
        name: editRoomForm.name.trim(),
        capacity: parseInt(editRoomForm.capacity, 10) || 75,
        type: editRoomForm.type,
        floor: editRoomForm.floor || ""
      };
      if (currentRooms.some(r => r.name.toLowerCase() === newRoom.name.toLowerCase())) {
        alert("A room with this name already exists!");
        return;
      }
      currentRooms.unshift(newRoom);
    } else {
      const idx = currentRooms.findIndex(r => r.name === roomId);
      if (idx >= 0) {
        currentRooms[idx] = { ...currentRooms[idx], name: editRoomForm.name.trim(), capacity: parseInt(editRoomForm.capacity, 10) || 75, floor: editRoomForm.floor };
      }
    }

    const newInputs = { ...inputsData, rooms: currentRooms };
    setInputsData(newInputs);
    localStorage.setItem("customMasterPayload", JSON.stringify(newInputs));
    setEditingRoomId(null);
  };

  const handleAddNewFaculty = () => {
    setEditingFacultyId("NEW");
    setEditForm({ fullName: "", initials: "", designation: "", empId: "", role: "" });
  };

  const handleSaveFaculty = (facultyNameCode) => {
    const currentFaculties = [...(inputsData.faculties || ritDepartmentPreset.faculties)];

    if (facultyNameCode === "NEW") {
      if (!editForm.fullName.trim()) {
        alert("Faculty name is required.");
        return;
      }
      const words = editForm.fullName.replace(/Dr\.|Mr\.|Mrs\.|Prof\./gi, "").trim().split(/[\s.]+/);
      const shortcode = editForm.initials.trim() || words.map(w => w?.[0] || '').join('').substring(0, 3).toUpperCase();
      const newFaculty = {
        id: Date.now(),
        name: shortcode || `F${Date.now()}`,
        fullName: editForm.fullName,
        designation: editForm.designation || "Assistant Professor",
        empId: editForm.empId || "",
        role: editForm.role || "",
        targetLoad: 0,
        fyLoad: 0,
        ugLoad: 0,
        pgLoad: 0,
        centralAuthority: "None"
      };
      currentFaculties.unshift(newFaculty);
    } else {
      const idx = currentFaculties.findIndex(f => f.name === facultyNameCode);
      if (idx >= 0) {
        currentFaculties[idx] = {
          ...currentFaculties[idx],
          fullName: editForm.fullName,
          name: editForm.initials.trim() || currentFaculties[idx].name,
          designation: editForm.designation,
          empId: editForm.empId,
          role: editForm.role
        };
      }
    }

    const newInputs = { ...inputsData, faculties: currentFaculties };
    setInputsData(newInputs);
    localStorage.setItem("customMasterPayload", JSON.stringify(newInputs));
    setEditingFacultyId(null);
  };

  const handleDeleteFaculty = (facultyNameCode) => {
    if (window.confirm("Are you sure you want to delete this faculty member?")) {
      const currentFaculties = [...(inputsData.faculties || ritDepartmentPreset.faculties)];
      const updatedFaculties = currentFaculties.filter(f => f.name !== facultyNameCode);
      const newInputs = { ...inputsData, faculties: updatedFaculties };
      setInputsData(newInputs);
      localStorage.setItem("customMasterPayload", JSON.stringify(newInputs));
    }
  };

  const handleDeleteRoom = (roomId) => {
    if (window.confirm("Are you sure you want to delete this room/lab?")) {
      const currentRooms = [...(inputsData.rooms || ritDepartmentPreset.rooms)];
      const updatedRooms = currentRooms.filter(r => r.name !== roomId);
      const newInputs = { ...inputsData, rooms: updatedRooms };
      setInputsData(newInputs);
      localStorage.setItem("customMasterPayload", JSON.stringify(newInputs));
    }
  };

  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const dataBuffer = evt.target.result;
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        console.log("Parsed Excel Data:", data);

        const getVal = (row, ...keys) => {
          for (const k of keys) {
            const matchKey = Object.keys(row).find(rk => String(rk).trim().toLowerCase() === k.toLowerCase());
            if (matchKey !== undefined && row[matchKey] !== undefined) return String(row[matchKey]).trim();
          }
          return null;
        };

        const newFaculties = data.map((row, index) => {
          return {
            id: Date.now() + index,
            fullName: getVal(row, "staff name", "name", "teacher name", "faculty name"),
            empId: getVal(row, "emp id", "employee id", "empid", "id") || "",
            designation: getVal(row, "designation", "post", "title") || "Assistant Professor",
            targetLoad: parseInt(getVal(row, "target load", "total", "load") || 0, 10),
            fyLoad: parseInt(getVal(row, "fy load", "fy") || 0, 10),
            ugLoad: parseInt(getVal(row, "ug load", "ug total", "ug") || 0, 10),
            pgLoad: parseInt(getVal(row, "pg load", "pg total", "pg") || 0, 10),
            centralAuthority: "None"
          };
        }).filter(f => f.fullName);

        if (newFaculties.length === 0) {
          alert("No valid faculty data found. Please ensure the Excel sheet has a 'Staff Name' column.");
          return;
        }

        const currentFaculties = [...(inputsData.faculties || ritDepartmentPreset.faculties)];

        newFaculties.forEach(nf => {
          const existingIdx = currentFaculties.findIndex(cf => (cf.fullName || "").toLowerCase() === nf.fullName.toLowerCase() || (cf.name && cf.name === nf.name));
          if (existingIdx >= 0) {
            currentFaculties[existingIdx] = { ...currentFaculties[existingIdx], ...nf, name: currentFaculties[existingIdx].name };
          } else {
            const words = nf.fullName.replace(/Dr\.|Mr\.|Mrs\.|Prof\./gi, "").trim().split(/[\s.]+/);
            const shortcode = words.map(w => w?.[0] || '').join('').substring(0, 3).toUpperCase();
            nf.name = shortcode || `F${Date.now()}`;
            currentFaculties.push(nf);
          }
        });

        const newInputs = { ...inputsData, faculties: currentFaculties };
        setInputsData(newInputs);
        localStorage.setItem("customMasterPayload", JSON.stringify(newInputs));
        alert("Faculty data imported successfully! " + newFaculties.length + " records processed.");
      } catch (err) {
        console.error(err);
        alert("Error parsing Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  const roomFileInputRef = useRef(null);

  const handleRoomFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const dataBuffer = evt.target.result;
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const getVal = (row, ...keys) => {
          for (const k of keys) {
            const matchKey = Object.keys(row).find(rk => String(rk).trim().toLowerCase() === k.toLowerCase());
            if (matchKey !== undefined && row[matchKey] !== undefined) return String(row[matchKey]).trim();
          }
          return null;
        };

        const newRooms = data.map(row => {
          return {
            name: getVal(row, "room name", "name", "room", "lab name") || "",
            capacity: parseInt(getVal(row, "capacity", "seats", "size") || 75, 10),
            type: (getVal(row, "type", "room type") || "CLASSROOM").toUpperCase().includes("LAB") ? "LAB" : "CLASSROOM",
            floor: getVal(row, "floor", "location") || ""
          };
        }).filter(r => r.name);

        const currentRooms = [...(inputsData.rooms || ritDepartmentPreset.rooms)];

        newRooms.forEach(nr => {
          const existingIdx = currentRooms.findIndex(cr => cr.name.toLowerCase() === nr.name.toLowerCase());
          if (existingIdx >= 0) {
            currentRooms[existingIdx] = { ...currentRooms[existingIdx], ...nr };
          } else {
            currentRooms.push(nr);
          }
        });

        const newInputs = { ...inputsData, rooms: currentRooms };
        setInputsData(newInputs);
        localStorage.setItem("customMasterPayload", JSON.stringify(newInputs));
        alert("Room data imported successfully! " + newRooms.length + " records processed.");
      } catch (err) {
        console.error(err);
        alert("Error parsing Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  const periodTimings = [
    "10:00 To 11:00",
    "11:00 To 12:00",
    "12:45 To 01:45",
    "01:45 To 02:45",
    "03:00 To 04:00",
    "04:00 To 05:00"
  ];

  const facultiesList = (inputsData.faculties || ritDepartmentPreset.faculties || []).map(f => {
    const presetF = ritDepartmentPreset.faculties.find(pf => pf.name === f.name);
    return presetF ? { ...presetF, ...f, targetLoad: presetF.targetLoad, fyLoad: presetF.fyLoad, ugLoad: presetF.ugLoad, pgLoad: presetF.pgLoad } : f;
  });
  const roomsList = inputsData.rooms || ritDepartmentPreset.rooms || [];
  const classroomsList = roomsList.filter((r) => r.type === "CLASSROOM" || !r.type || r.type === "THEORY");
  const labsList = roomsList.filter((r) => r.type === "LAB");

  // Helper to extract clean uppercase alphanumeric faculty code
  const cleanCode = (c) => (c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Compute organized events for a faculty
  const getFacultyEvents = (faculty) => {
    const fCode = cleanCode(faculty.name || faculty.shortCode);
    const events = [];
    if (!masterDataState?.schedules) return events;

    const schedules = masterDataState.schedules;
    ["SY", "TY", "BTECH"].forEach((yr) => {
      const yrSched = schedules[yr] || [];
      yrSched.forEach((cell) => {
        if (!cell || !cell.course || cell.course === "—") return;
        // Check practical subEntries
        if (cell.subEntries && cell.subEntries.length > 0) {
          cell.subEntries.forEach((sub) => {
            if (cleanCode(sub.faculty) === fCode) {
              events.push({
                day: cell.day,
                period: cell.period,
                timing: periodTimings[cell.period - 1] || `P${cell.period}`,
                course: sub.course || cell.course,
                classYear: yr,
                type: "PRACTICAL LAB",
                batch: `Batch ${sub.batch}`,
                location: sub.location || cell.location || "Lab"
              });
            }
          });
        } else {
          // Theory
          if (cleanCode(cell.faculty) === fCode) {
            events.push({
              day: cell.day,
              period: cell.period,
              timing: periodTimings[cell.period - 1] || `P${cell.period}`,
              course: cell.course,
              classYear: yr,
              type: "THEORY LECTURE",
              batch: "Whole Class",
              location: cell.location || (yr === "SY" ? "CR-26" : yr === "TY" ? "CR-27" : "CR-212")
            });
          }
        }
      });
    });

    // Check FY external loads
    const extLoads = inputsData.externalLoads || [];
    extLoads.forEach((ext) => {
      if (cleanCode(ext.facultyCode) === fCode) {
        events.push({
          day: ext.day,
          period: ext.period,
          timing: typeof ext.period === "number" ? periodTimings[ext.period - 1] : ext.period,
          course: ext.loadType || "FY Load",
          classYear: "First Year (F.Y.)",
          type: "FY FIXED LOAD",
          batch: "FY Batch",
          location: "FY Classroom"
        });
      }
    });

    const dayOrder = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5 };
    events.sort((a, b) => {
      const da = dayOrder[a.day] || 99;
      const db = dayOrder[b.day] || 99;
      if (da !== db) return da - db;
      const pa = typeof a.period === "number" ? a.period : parseInt(a.period) || 0;
      const pb = typeof b.period === "number" ? b.period : parseInt(b.period) || 0;
      return pa - pb;
    });

    return events;
  };

  // Compute organized events for a Classroom
  const getClassroomEvents = (room) => {
    const roomName = (room.name || "").trim().toUpperCase();
    const events = [];
    if (!masterDataState?.schedules) return events;

    let targetYear = null;
    if (roomName.includes("26") || roomName.includes("105") || roomName.includes("SY")) targetYear = "SY";
    else if (roomName.includes("27") || roomName.includes("106") || roomName.includes("TY")) targetYear = "TY";
    else if (roomName.includes("212") || roomName.includes("107") || roomName.includes("BTECH")) targetYear = "BTECH";

    const schedules = masterDataState.schedules;
    ["SY", "TY", "BTECH"].forEach((yr) => {
      const yrSched = schedules[yr] || [];
      yrSched.forEach((cell) => {
        if (!cell || !cell.course || cell.course === "—") return;
        const cellLoc = (cell.location || "").trim().toUpperCase();
        const matchesLocation = cellLoc === roomName || (targetYear && yr === targetYear && (!cellLoc || cellLoc === roomName));
        if (matchesLocation && (!cell.subEntries || cell.subEntries.length === 0)) {
          events.push({
            day: cell.day,
            period: cell.period,
            timing: periodTimings[cell.period - 1] || `P${cell.period}`,
            course: cell.course,
            faculty: cell.faculty,
            classYear: yr,
            cellType: cell.cellType || "THEORY"
          });
        }
      });
    });

    const dayOrder = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5 };
    events.sort((a, b) => {
      const da = dayOrder[a.day] || 99;
      const db = dayOrder[b.day] || 99;
      if (da !== db) return da - db;
      return a.period - b.period;
    });

    return events;
  };

  // Compute organized events for a Laboratory
  const getLabEvents = (lab) => {
    const labName = (lab.name || "").trim().toUpperCase();
    const sessions = [];
    if (!masterDataState?.schedules) return sessions;

    const schedules = masterDataState.schedules;
    ["SY", "TY", "BTECH"].forEach((yr) => {
      const yrSched = schedules[yr] || [];
      yrSched.forEach((cell) => {
        if (!cell || !cell.subEntries || cell.subEntries.length === 0) return;
        const matchingBatches = cell.subEntries.filter((s) => (s.location || "").trim().toUpperCase() === labName);
        if (matchingBatches.length > 0) {
          sessions.push({
            day: cell.day,
            period: cell.period,
            timing: periodTimings[cell.period - 1] ? `${periodTimings[cell.period - 1]} & ${periodTimings[cell.period] || ""}` : `P${cell.period}-P${cell.period + 1}`,
            course: matchingBatches[0].course || cell.course || "Laboratory Practice",
            classYear: yr,
            batches: matchingBatches.map((b) => b.batch).join(", "),
            faculties: matchingBatches.map((b) => b.faculty).filter(Boolean).join(", ") || cell.faculty || "Faculty"
          });
        }
      });
    });

    const dayOrder = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5 };
    sessions.sort((a, b) => {
      const da = dayOrder[a.day] || 99;
      const db = dayOrder[b.day] || 99;
      if (da !== db) return da - db;
      return a.period - b.period;
    });

    return sessions;
  };

  return (
    <div className="dashboard" style={{ maxWidth: "1200px", margin: "0 auto", padding: "10px 0" }}>
      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, #fef08a 0%, #fde047 50%, #eab308 100%)",
        color: "#0f172a",
        padding: "26px 32px",
        borderRadius: "12px",
        marginBottom: "16px",
        boxShadow: "0 4px 14px rgba(202, 138, 4, 0.25)",
        border: "1px solid #facc15",
        textAlign: "center"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "135px 1fr 135px",
          alignItems: "center",
          gap: "16px"
        }}>
          {/* Left Side Logo */}
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
            <img
              src="/rit-logo.png"
              alt="Rajarambapu Institute of Technology Logo"
              style={{
                height: "128px",
                width: "auto",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)"
              }}
            />
          </div>

          {/* Centered Heading Content */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "13px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#854d0e", fontWeight: 700 }}>
              K.E. Society's
            </div>
            <h2 style={{ margin: "4px 0 6px", fontSize: "20px", fontWeight: 800, color: "#1e293b" }}>
              Rajarambapu Institute of Technology, Rajaramnagar
            </h2>
            <h1 style={{ margin: "6px 0 4px", fontSize: "30px", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.5px" }}>
              Department of Information Technology
            </h1>
            <div style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: 800, color: "#78350f" }}>
              Department Time Table
            </div>
          </div>

          {/* Right spacer to preserve perfect center alignment */}
          <div style={{ width: "135px" }} aria-hidden="true" />
        </div>
      </div>

      {/* 4 Interactive Information Cards (Faculty, Classroom, Laboratory, Workload) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px", marginBottom: "22px" }}>
        {/* Card 1: Faculty Information */}
        <div
          onClick={() => setActiveDetailSection("FACULTY")}
          style={{
            background: activeDetailSection === "FACULTY" ? "#eff6ff" : "#ffffff",
            padding: "18px 20px",
            borderRadius: "10px",
            border: activeDetailSection === "FACULTY" ? "2px solid #2563eb" : "1px solid #cbd5e1",
            boxShadow: activeDetailSection === "FACULTY" ? "0 4px 12px rgba(37, 99, 235, 0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "11.5px", color: activeDetailSection === "FACULTY" ? "#1e40af" : "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Faculty Information
            </span>
            <span style={{ fontSize: "18px" }}>👨‍🏫</span>
          </div>
          <h3 style={{ margin: "6px 0 2px", fontSize: "24px", color: "#1e3a8a", fontWeight: 800 }}>
            {facultiesList.length} Teachers
          </h3>
        </div>

        {/* Card 2: Classroom Information */}
        <div
          onClick={() => setActiveDetailSection("CLASSROOM")}
          style={{
            background: activeDetailSection === "CLASSROOM" ? "#eff6ff" : "#ffffff",
            padding: "18px 20px",
            borderRadius: "10px",
            border: activeDetailSection === "CLASSROOM" ? "2px solid #2563eb" : "1px solid #cbd5e1",
            boxShadow: activeDetailSection === "CLASSROOM" ? "0 4px 12px rgba(37, 99, 235, 0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "11.5px", color: activeDetailSection === "CLASSROOM" ? "#1e40af" : "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Classroom Information
            </span>
            <span style={{ fontSize: "18px" }}>🏛️</span>
          </div>
          <h3 style={{ margin: "6px 0 2px", fontSize: "24px", color: "#1e3a8a", fontWeight: 800 }}>
            {classroomsList.length} Lecture Halls
          </h3>
        </div>

        {/* Card 3: Laboratory Information */}
        <div
          onClick={() => setActiveDetailSection("LAB")}
          style={{
            background: activeDetailSection === "LAB" ? "#eff6ff" : "#ffffff",
            padding: "18px 20px",
            borderRadius: "10px",
            border: activeDetailSection === "LAB" ? "2px solid #2563eb" : "1px solid #cbd5e1",
            boxShadow: activeDetailSection === "LAB" ? "0 4px 12px rgba(37, 99, 235, 0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "11.5px", color: activeDetailSection === "LAB" ? "#1e40af" : "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Laboratory Information
            </span>
            <span style={{ fontSize: "18px" }}>🔬</span>
          </div>
          <h3 style={{ margin: "6px 0 2px", fontSize: "24px", color: "#1e3a8a", fontWeight: 800 }}>
            {labsList.length} Practical Labs
          </h3>
        </div>


      </div>

      {/* Real-time Conflict Alert Banner on Dashboard */}
      {metrics.conflictCount > 0 && (
        <div style={{
          background: "#fff1f2",
          border: "1.5px solid #f87171",
          borderRadius: "10px",
          padding: "14px 20px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 2px 6px rgba(239, 68, 68, 0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>⚠️</span>
            <div>
              <strong style={{ color: "#991b1b", fontSize: "14px" }}>
                {metrics.conflictCount} Schedule Conflict{metrics.conflictCount > 1 ? "s" : ""} Detected in Timetable
              </strong>
              <div style={{ color: "#7f1d1d", fontSize: "12.5px", marginTop: "2px" }}>
                Double-booking or room collision detected. Click below to inspect the conflict log and resolve them.
              </div>
            </div>
          </div>
          <Link
            to="/master-timetable?view=ALL&conflicts=open#conflicts-section"
            style={{
              background: "#dc2626",
              color: "white",
              fontWeight: 700,
              fontSize: "13px",
              padding: "8px 16px",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 4px rgba(220, 38, 38, 0.3)"
            }}
          >
            🔍 Inspect Conflicts & Resolve →
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTUAL DETAILS & EVENTS ORGANIZED INTERACTIVE VIEWER */}
      {/* ========================================================================= */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: "12px",
        padding: "22px 24px",
        marginBottom: "28px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
      }}>


        {/* TAB 1: FACULTY INFORMATION & EVENTS ORGANIZED */}
        {activeDetailSection === "FACULTY" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: "14px", gap: "10px" }}>
              <div></div>
              <span style={{ fontSize: "16px", color: "#475569", fontWeight: 700, textAlign: "center" }}>Faculty Details</span>
              <div className="no-print" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: "#2563eb", color: "white", padding: "6px 14px", borderRadius: "6px", border: "none", fontSize: "12.5px", fontWeight: "bold", cursor: "pointer", marginLeft: "8px", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 1px 3px rgba(37,99,235,0.2)" }}
                >
                  <span style={{ fontSize: "14px" }}>📥</span> Import Excel
                </button>
                <button
                  onClick={handleAddNewFaculty}
                  style={{ background: "#16a34a", color: "white", padding: "6px 14px", borderRadius: "6px", border: "none", fontSize: "12.5px", fontWeight: "bold", cursor: "pointer", marginLeft: "4px", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 1px 3px rgba(22,163,74,0.2)" }}
                >
                  <span style={{ fontSize: "14px" }}>➕</span> Add Faculty
                </button>
                <button
                  onClick={() => window.print()}
                  style={{ background: "#475569", color: "white", padding: "6px 14px", borderRadius: "6px", border: "none", fontSize: "12.5px", fontWeight: "bold", cursor: "pointer", marginLeft: "4px", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 1px 3px rgba(71,85,105,0.2)" }}
                >
                  <span style={{ fontSize: "14px" }}>🖨️</span> Print Sheet
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto", marginTop: "10px" }}>
              <datalist id="role-suggestions">
                <option value="H.O.D." />
                <option value="Class Teacher" />
                <option value="TPO" />
                <option value="TPC" />
                <option value="Coordinator" />
              </datalist>
              <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#1e293b", textAlign: "left", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "14px 20px", fontWeight: 800, fontSize: "14px" }}>Staff Name</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, fontSize: "14px" }}>Initials</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, fontSize: "14px" }}>EMP ID</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, fontSize: "14px" }}>Designation</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, fontSize: "14px" }}>Role</th>
                    <th className="no-print" style={{ padding: "14px 20px", fontWeight: 800, fontSize: "14px", width: "120px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                {editingFacultyId === "NEW" && (
                  <tbody>
                    <tr style={{ background: "#fef3c7" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <input
                          value={editForm.fullName}
                          onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                          placeholder="e.g. Prof. J. Doe"
                          style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "13.5px", outline: "none", background: "white" }}
                        />
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <input
                          value={editForm.initials}
                          onChange={(e) => setEditForm({ ...editForm, initials: e.target.value })}
                          placeholder="e.g. JD"
                          style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "13.5px", outline: "none", background: "white" }}
                        />
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <input
                          value={editForm.empId}
                          onChange={(e) => setEditForm({ ...editForm, empId: e.target.value })}
                          placeholder="e.g. EMP123"
                          style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "13.5px", outline: "none", background: "white" }}
                        />
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <input
                          value={editForm.designation}
                          onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                          placeholder="e.g. Assistant Professor"
                          style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "13px", outline: "none", background: "white" }}
                        />
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <input
                          list="role-suggestions"
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          placeholder="e.g. Class Teacher"
                          style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "13px", outline: "none", background: "white" }}
                        />
                      </td>
                      <td className="no-print" style={{ padding: "14px 20px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button onClick={() => handleSaveFaculty("NEW")} style={{ background: "#d97706", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Add</button>
                          <button onClick={() => setEditingFacultyId(null)} style={{ background: "#9ca3af", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                )}
                {(() => {
                  const getLevel = (desig) => {
                    const d = (desig || "").toUpperCase();
                    if (d.includes("H.O.D") || d.includes("HOD")) return { rank: 1, label: "Head of Department (H.O.D)" };
                    if (d === "PROFESSOR" || (d.includes("PROFESSOR") && !d.includes("ASSISTANT") && !d.includes("ASSOCIATE"))) return { rank: 2, label: "Professors" };
                    if (d.includes("ASSOCIATE PROF")) return { rank: 3, label: "Associate Professors" };
                    if (d.includes("ASSISTANT PROF")) return { rank: 4, label: "Assistant Professors" };
                    if (d.includes("TA") || d.includes("TEACHING ASSISTANT")) return { rank: 5, label: "Teaching Assistants" };
                    return { rank: 6, label: "Other Faculty" };
                  };

                  const filtered = facultiesList.filter((f) => selectedFacultyFilter === "ALL" || f.name === selectedFacultyFilter);
                  const groups = {};
                  filtered.forEach(f => {
                    const lvl = getLevel(f.designation);
                    if (!groups[lvl.label]) groups[lvl.label] = { rank: lvl.rank, items: [] };
                    groups[lvl.label].items.push(f);
                  });

                  return Object.entries(groups)
                    .sort((a, b) => a[1].rank - b[1].rank)
                    .map(([groupLabel, groupData]) => (
                      <tbody key={groupLabel}>
                        <tr style={{ background: "#e2e8f0" }}>
                          <td colSpan="6" style={{ padding: "8px 20px", fontWeight: 800, color: "#1e3a8a", fontSize: "12.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {groupLabel}
                          </td>
                        </tr>
                        {groupData.items.map((f, idx) => (
                          <tr key={f.name} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                            <td style={{ padding: "14px 20px", fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                              {editingFacultyId === f.name ? (
                                <input
                                  value={editForm.fullName}
                                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                                  style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #94a3b8", fontSize: "13.5px", outline: "none" }}
                                />
                              ) : (
                                f.fullName || f.name
                              )}
                            </td>
                            <td style={{ padding: "14px 20px", color: "#334155", fontWeight: 700, fontSize: "13px" }}>
                              {editingFacultyId === f.name ? (
                                <input
                                  value={editForm.initials}
                                  onChange={(e) => setEditForm({ ...editForm, initials: e.target.value })}
                                  style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #94a3b8", fontSize: "13px", outline: "none" }}
                                />
                              ) : (
                                f.name || "—"
                              )}
                            </td>
                            <td style={{ padding: "14px 20px", color: "#334155", fontWeight: 500, fontSize: "13px" }}>
                              {editingFacultyId === f.name ? (
                                <input
                                  value={editForm.empId}
                                  onChange={(e) => setEditForm({ ...editForm, empId: e.target.value })}
                                  style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #94a3b8", fontSize: "13px", outline: "none" }}
                                />
                              ) : (
                                f.empId || "—"
                              )}
                            </td>
                            <td style={{ padding: "14px 20px", color: "#334155", fontWeight: 500, fontSize: "13px" }}>
                              {editingFacultyId === f.name ? (
                                <input
                                  value={editForm.designation}
                                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                                  style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #94a3b8", fontSize: "13px", outline: "none" }}
                                />
                              ) : (
                                f.designation || "Assistant Professor"
                              )}
                            </td>
                            <td style={{ padding: "14px 20px", color: "#334155", fontWeight: 500, fontSize: "13px" }}>
                              {editingFacultyId === f.name ? (
                                <input
                                  list="role-suggestions"
                                  value={editForm.role}
                                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                  placeholder="e.g. Class Teacher"
                                  style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #94a3b8", fontSize: "13px", outline: "none" }}
                                />
                              ) : (
                                f.role || "—"
                              )}
                            </td>
                            <td className="no-print" style={{ padding: "14px 20px", textAlign: "center" }}>
                              {editingFacultyId === f.name ? (
                                <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                  <button onClick={() => handleSaveFaculty(f.name)} style={{ background: "#22c55e", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Save</button>
                                  <button onClick={() => setEditingFacultyId(null)} style={{ background: "#64748b", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Cancel</button>
                                </div>
                              ) : (
                                <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                  <button
                                    onClick={() => { setEditingFacultyId(f.name); setEditForm({ fullName: f.fullName || f.name, initials: f.name, designation: f.designation || "Assistant Professor", empId: f.empId || "", role: f.role || "" }); }}
                                    style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "4px", padding: "6px 16px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFaculty(f.name)}
                                    style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "4px", padding: "6px 16px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    ));
                })()}
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: CLASSROOM INFORMATION & EVENTS ORGANIZED */}
        {activeDetailSection === "CLASSROOM" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <span style={{ fontSize: "13px", color: "#475569", fontWeight: 600 }}>Manage Theory Classrooms</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <input type="file" accept=".xlsx, .xls, .csv" ref={roomFileInputRef} style={{ display: "none" }} onChange={handleRoomFileUpload} />
                <button onClick={() => roomFileInputRef.current?.click()} style={{ background: "#2563eb", color: "white", padding: "6px 14px", borderRadius: "6px", border: "none", fontSize: "12.5px", fontWeight: "bold", cursor: "pointer", marginLeft: "8px", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 1px 3px rgba(37,99,235,0.2)" }}>
                  <span style={{ fontSize: "14px" }}>📥</span> Import Excel
                </button>
                <button onClick={() => handleAddNewRoom("CLASSROOM")} style={{ background: "#16a34a", color: "white", padding: "6px 14px", borderRadius: "6px", border: "none", fontSize: "12.5px", fontWeight: "bold", cursor: "pointer", marginLeft: "4px", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 1px 3px rgba(22,163,74,0.2)" }}>
                  <span style={{ fontSize: "14px" }}>➕</span> Add Classroom
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto", marginTop: "10px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#1e293b", textAlign: "left", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "14px 20px", fontWeight: 800, fontSize: "14px" }}>Classroom Name</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, fontSize: "14px" }}>Seating Capacity</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, fontSize: "14px", width: "120px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                {editingRoomId === "NEW_CLASSROOM" && (
                  <tbody>
                    <tr style={{ background: "#fef3c7" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <input value={editRoomForm.name} onChange={(e) => setEditRoomForm({ ...editRoomForm, name: e.target.value })} placeholder="e.g. CR-26" style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "13.5px", outline: "none", background: "white" }} />
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <input type="number" value={editRoomForm.capacity} onChange={(e) => setEditRoomForm({ ...editRoomForm, capacity: e.target.value })} placeholder="e.g. 75" style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "13px", outline: "none", background: "white" }} />
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button onClick={() => handleSaveRoom("NEW_CLASSROOM")} style={{ background: "#d97706", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Add</button>
                          <button onClick={() => setEditingRoomId(null)} style={{ background: "#9ca3af", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                )}
                <tbody>
                  {classroomsList.map((room, idx) => (
                    <tr key={room.name} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                      <td style={{ padding: "14px 20px", fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                        {editingRoomId === room.name ? (
                          <input value={editRoomForm.name} onChange={(e) => setEditRoomForm({ ...editRoomForm, name: e.target.value })} style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #94a3b8", fontSize: "13.5px", outline: "none" }} />
                        ) : room.name}
                      </td>
                      <td style={{ padding: "14px 20px", color: "#334155", fontWeight: 500, fontSize: "13px" }}>
                        {editingRoomId === room.name ? (
                          <input type="number" value={editRoomForm.capacity} onChange={(e) => setEditRoomForm({ ...editRoomForm, capacity: e.target.value })} style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #94a3b8", fontSize: "13px", outline: "none" }} />
                        ) : `${room.capacity || 75} Seats`}
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "center" }}>
                        {editingRoomId === room.name ? (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button onClick={() => handleSaveRoom(room.name)} style={{ background: "#22c55e", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Save</button>
                            <button onClick={() => setEditingRoomId(null)} style={{ background: "#64748b", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button onClick={() => { setEditingRoomId(room.name); setEditRoomForm({ name: room.name, capacity: room.capacity || 75, type: "CLASSROOM", floor: room.floor || "" }); }} style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "4px", padding: "6px 16px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Edit</button>
                            <button onClick={() => handleDeleteRoom(room.name)} style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "4px", padding: "6px 16px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LABORATORY INFORMATION & EVENTS ORGANIZED */}
        {activeDetailSection === "LAB" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <span style={{ fontSize: "13px", color: "#475569", fontWeight: 600 }}>Manage Computer Laboratories</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <input type="file" accept=".xlsx, .xls, .csv" ref={roomFileInputRef} style={{ display: "none" }} onChange={handleRoomFileUpload} />
                <button onClick={() => roomFileInputRef.current?.click()} style={{ background: "#2563eb", color: "white", padding: "6px 14px", borderRadius: "6px", border: "none", fontSize: "12.5px", fontWeight: "bold", cursor: "pointer", marginLeft: "8px", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 1px 3px rgba(37,99,235,0.2)" }}>
                  <span style={{ fontSize: "14px" }}>📥</span> Import Excel
                </button>
                <button onClick={() => handleAddNewRoom("LAB")} style={{ background: "#16a34a", color: "white", padding: "6px 14px", borderRadius: "6px", border: "none", fontSize: "12.5px", fontWeight: "bold", cursor: "pointer", marginLeft: "4px", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 1px 3px rgba(22,163,74,0.2)" }}>
                  <span style={{ fontSize: "14px" }}>➕</span> Add Lab
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto", marginTop: "10px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#1e293b", textAlign: "left", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "14px 20px", fontWeight: 800, fontSize: "14px" }}>Laboratory Name</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, fontSize: "14px" }}>PC Count / Capacity</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, fontSize: "14px", width: "120px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                {editingRoomId === "NEW_LAB" && (
                  <tbody>
                    <tr style={{ background: "#fef3c7" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <input value={editRoomForm.name} onChange={(e) => setEditRoomForm({ ...editRoomForm, name: e.target.value })} placeholder="e.g. IL1" style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "13.5px", outline: "none", background: "white" }} />
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <input type="number" value={editRoomForm.capacity} onChange={(e) => setEditRoomForm({ ...editRoomForm, capacity: e.target.value })} placeholder="e.g. 24" style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #d97706", fontSize: "13px", outline: "none", background: "white" }} />
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button onClick={() => handleSaveRoom("NEW_LAB")} style={{ background: "#d97706", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Add</button>
                          <button onClick={() => setEditingRoomId(null)} style={{ background: "#9ca3af", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                )}
                <tbody>
                  {labsList.map((lab, idx) => (
                    <tr key={lab.name} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                      <td style={{ padding: "14px 20px", fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                        {editingRoomId === lab.name ? (
                          <input value={editRoomForm.name} onChange={(e) => setEditRoomForm({ ...editRoomForm, name: e.target.value })} style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #94a3b8", fontSize: "13.5px", outline: "none" }} />
                        ) : lab.name}
                      </td>
                      <td style={{ padding: "14px 20px", color: "#334155", fontWeight: 500, fontSize: "13px" }}>
                        {editingRoomId === lab.name ? (
                          <input type="number" value={editRoomForm.capacity} onChange={(e) => setEditRoomForm({ ...editRoomForm, capacity: e.target.value })} style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #94a3b8", fontSize: "13px", outline: "none" }} />
                        ) : `${lab.capacity || 24} PCs`}
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "center" }}>
                        {editingRoomId === lab.name ? (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button onClick={() => handleSaveRoom(lab.name)} style={{ background: "#22c55e", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Save</button>
                            <button onClick={() => setEditingRoomId(null)} style={{ background: "#64748b", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button onClick={() => { setEditingRoomId(lab.name); setEditRoomForm({ name: lab.name, capacity: lab.capacity || 24, type: "LAB", floor: lab.floor || "" }); }} style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "4px", padding: "6px 16px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Edit</button>
                            <button onClick={() => handleDeleteRoom(lab.name)} style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "4px", padding: "6px 16px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}

export default DashboardHome;