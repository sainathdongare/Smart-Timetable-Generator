import { useState, useEffect, Fragment } from "react";
import { useSearchParams } from "react-router-dom";
import {
  generateMasterTimetable,
  saveMasterTimetable,
  getLatestMasterTimetable,
  getAllMasterTimetables,
  deleteMasterTimetable
} from "../api/timetableApi";
import { ritDepartmentPreset } from "../data/ritDepartmentPreset";
import {
  exportPersonalTimetableToExcel,
  exportClassTimetableToExcel,
  exportMasterDepartmentToExcel
} from "../utils/excelExport";

export const FACULTY_DESIGNATIONS = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Teaching Assistant",
  "Lab Attendant"
];

export const CENTRAL_AUTHORITIES = [
  "None",
  "HOD",
  "TPO",
  "TPC"
];

function MasterTimetable() {
  const [searchParams, setSearchParams] = useSearchParams();
  let rawView = searchParams.get("view") || "ALL";
  if (rawView === "CLASS_MASTER") rawView = "ALL";
  const initialView = rawView;
  const initialClass = searchParams.get("class") || "SY";
  const initialLab = (searchParams.get("view") === "LAB_MASTER" || searchParams.get("lab") === "ALL") ? "ALL" : (searchParams.get("lab") || "ALL");
  const initialRoom = searchParams.get("room") || "CR-27";
  const initialInputsOpen = searchParams.get("inputs") === "open";
  const initialInputTab = searchParams.get("tab") || "SY";

  const [masterData, setMasterData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState(initialView); // "ALL", "CLASS", "FACULTY", "FACULTY_MASTER", "LOAD_SHEET", "ROOM_MASTER", "ROOM", "LAB"
  const [selectedClassYear, setSelectedClassYear] = useState(initialClass); // "SY", "TY", "BTECH"
  const [selectedFaculty, setSelectedFaculty] = useState("SUM");
  const [selectedLab, setSelectedLab] = useState(initialLab); // "ALL", "IL1", "IL2", "IL3", "IL4", "IL5", "IL6"
  const [selectedRoom, setSelectedRoom] = useState(initialRoom); // "CR-27", "CR-26", "CR-212"
  const [facultyMasterDay, setFacultyMasterDay] = useState("ALL"); // "ALL", "MONDAY", "TUESDAY", etc.
  const [academicSession, setAcademicSession] = useState("2026-27");
  const [academicSemester, setAcademicSemester] = useState("PART-I"); // "PART-I" (Odd) or "PART-II" (Even)
  const [facultyPrintViewMode, setFacultyPrintViewMode] = useState("OFFICIAL"); // "OFFICIAL" (Exact RIT image layout) or "MODERN"
  const [classPrintViewMode, setClassPrintViewMode] = useState("OFFICIAL"); // "OFFICIAL" (Exact RIT image layout) or "MODERN"
  const [conflictLog, setConflictLog] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Database Persistence state
  const [savingToDb, setSavingToDb] = useState(false);
  const [dbTimetables, setDbTimetables] = useState([]);
  const [showDbModal, setShowDbModal] = useState(false);
  const [customSaveName, setCustomSaveName] = useState("");

  // Synchronize view and inputs when URL search params change
  useEffect(() => {
    let v = searchParams.get("view");
    if (v === "CLASS_MASTER") {
      if (selectedView !== "ALL") setSelectedView("ALL");
    } else if (v === "LAB_MASTER") {
      if (selectedView !== "LAB") setSelectedView("LAB");
      if (selectedLab !== "ALL") setSelectedLab("ALL");
    } else if (v && v !== selectedView) {
      setSelectedView(v);
    }
    const c = searchParams.get("class");
    if (c && c !== selectedClassYear) setSelectedClassYear(c);
    const l = searchParams.get("lab");
    if (l && l !== selectedLab) setSelectedLab(l);
    const r = searchParams.get("room");
    if (r && r !== selectedRoom) setSelectedRoom(r);
    const inp = searchParams.get("inputs");
    if (inp === "open") setShowInputManager(true);
    else if (inp !== "open" && v) setShowInputManager(false);
    const tab = searchParams.get("tab");
    if (tab && tab !== activeInputTab) setActiveInputTab(tab);

    const conf = searchParams.get("conflicts");
    const diag = searchParams.get("diagnostics");
    if (conf === "open" || conf === "true" || diag === "open" || diag === "true") {
      setShowDiagnostics(true);
      setTimeout(() => {
        const el = document.getElementById("conflicts-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [searchParams]);

  // Interactive Period Swapping state
  const [swapModeEnabled, setSwapModeEnabled] = useState(false);
  const [swapSource, setSwapSource] = useState(null); // { year, day, period, cell }
  const [swapHover, setSwapHover] = useState(null);   // { year, day, period, cell }
  const [swapAlert, setSwapAlert] = useState(null);   // { type: 'success' | 'error' | 'info', text: string }
  const [originalSchedules, setOriginalSchedules] = useState(null);
  const [hasManualAdjustments, setHasManualAdjustments] = useState(() => {
    return localStorage.getItem("timetableHasManualAdjustments") === "true";
  });
  const [swapHistory, setSwapHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("timetableSwapHistory");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  // In-Place Quick Edit Slot state (edit faculty/location directly from timetable cells)
  const [quickEditModal, setQuickEditModal] = useState({
    isOpen: false,
    mode: "THEORY", // "THEORY" | "PRACTICAL" | "EXTERNAL" | "EMPTY" | "FIXED"
    year: "SY",
    day: "MONDAY",
    period: 1,
    period2: null,
    periodLabel: "P1",
    course: "",
    faculty: "",
    location: "",
    cellType: "THEORY",
    subEntries: [],
    externalType: "",
    externalDesc: ""
  });
  
  // Custom Inputs Manager state
  const [showInputManager, setShowInputManager] = useState(initialInputsOpen);
  const [activeInputTab, setActiveInputTab] = useState(initialInputTab); // "FACULTY", "ROOMS", "SY", "TY", "BTECH", "PRACTICALS", "FIXED", "EXT"

  const [inputs, setInputs] = useState(() => {
    const saved = localStorage.getItem("customMasterPayload");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.version === ritDepartmentPreset.version) {
          return parsed;
        }
      } catch (e) {}
    }
    return JSON.parse(JSON.stringify(ritDepartmentPreset));
  });

  // Helper forms state
  const [newFacultyName, setNewFacultyName] = useState("");
  const [newFacultyFullName, setNewFacultyFullName] = useState("");
  const [newFacultyMaxLectures, setNewFacultyMaxLectures] = useState(4);
  const [newFacultyDesignation, setNewFacultyDesignation] = useState("Assistant Professor");
  const [newFacultyAuthority, setNewFacultyAuthority] = useState("None");

  // New Year / Semester Setup Modal state
  const [newYearModalOpen, setNewYearModalOpen] = useState(false);
  const [newYearSetupSession, setNewYearSetupSession] = useState("2026-27");
  const [newYearSetupSemester, setNewYearSetupSemester] = useState("PART-I");
  const [newYearSetupScope, setNewYearSetupScope] = useState("ALL"); // "ALL", "SY", "TY", "BTECH"
  const [customSessionInput, setCustomSessionInput] = useState("");
  const [showCustomSessionField, setShowCustomSessionField] = useState(false);
  const [availableSessions, setAvailableSessions] = useState(() => {
    try {
      const saved = localStorage.getItem("rit_available_sessions");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ["2026-27", "2025-26", "2024-25", "2023-24"];
  });

  // Save state
  const [lastSavedTime, setLastSavedTime] = useState(() => {
    return localStorage.getItem("rit_last_saved_time") || null;
  });
  const [saveStatusMessage, setSaveStatusMessage] = useState(null); // { type: 'success'|'info'|'error', text: '' }
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Faculty Reassignment & Safe Deletion state
  const [reassignSource, setReassignSource] = useState("");
  const [reassignTarget, setReassignTarget] = useState("");
  const [showReassignPanel, setShowReassignPanel] = useState(false);
  const [reassignFeedback, setReassignFeedback] = useState(null); // { type: 'success'|'error', text: '' }

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [facultyToDelete, setFacultyToDelete] = useState(null);
  const [deleteReplacement, setDeleteReplacement] = useState("");

  // Edit Faculty Details Modal state
  const [editingFacultyModal, setEditingFacultyModal] = useState({
    isOpen: false,
    originalCode: "",
    name: "",
    fullName: "",
    designation: "Assistant Professor",
    centralAuthority: "None",
    maxDailyLectures: 4
  });

  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState("THEORY");
  
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubPeriods, setNewSubPeriods] = useState(3);
  const [newSubFaculty, setNewSubFaculty] = useState("");

  // Practicals state
  const [newPracYear, setNewPracYear] = useState("SY");
  const [newPracBatch, setNewPracBatch] = useState("I1");
  const [newPracSubject, setNewPracSubject] = useState("");
  const [newPracFaculty, setNewPracFaculty] = useState("");
  const [newPracRoom, setNewPracRoom] = useState("IL1");
  const [newPracDay, setNewPracDay] = useState("MONDAY");
  const [newPracPeriod, setNewPracPeriod] = useState("P1-P2");
  const [pracFilterYear, setPracFilterYear] = useState("ALL");

  // Coordinator Lab Courses state
  const [labCourseYear, setLabCourseYear] = useState("SY");
  const [newLabCode, setNewLabCode] = useState("");
  const [newLabName, setNewLabName] = useState("");
  const [newLabFaculty, setNewLabFaculty] = useState("");
  const [newLabFaculties, setNewLabFaculties] = useState([]);
  const [newLabBatchMap, setNewLabBatchMap] = useState({ I1: "", I2: "", I3: "", I4: "" });
  const [newLabRoom, setNewLabRoom] = useState("IL1");
  const [editingLabCourse, setEditingLabCourse] = useState(null); // { yearKey, index, code, name, faculties, batchFacultyMap, preferredRoom }

  // Fixed Slots state
  const [newFixedYear, setNewFixedYear] = useState("SY");
  const [newFixedCourse, setNewFixedCourse] = useState("");
  const [newFixedDay, setNewFixedDay] = useState("MONDAY");
  const [newFixedPeriod, setNewFixedPeriod] = useState(1);
  const [newFixedFaculty, setNewFixedFaculty] = useState("");
  const [newFixedRoom, setNewFixedRoom] = useState("");
  const [fixedFilterYear, setFixedFilterYear] = useState("ALL");

  // External University FY Loads state
  const [newExtType, setNewExtType] = useState("FY-EEDP");
  const [newExtFaculty, setNewExtFaculty] = useState("");
  const [newExtDay, setNewExtDay] = useState("MONDAY");
  const [newExtPeriod, setNewExtPeriod] = useState("P1-P2");
  const [newExtDesc, setNewExtDesc] = useState("");

  // Faculty Unavailability / Leaves state
  const [newUnavailFaculty, setNewUnavailFaculty] = useState("");
  const [newUnavailDay, setNewUnavailDay] = useState("MONDAY");
  const [newUnavailPeriod, setNewUnavailPeriod] = useState(1);
  const [newUnavailReason, setNewUnavailReason] = useState("");

  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  const periods = [1, 2, 3, 4, 5, 6];
  const periodTimings = [
    "10:00 To 11:00",
    "11:00 To 12:00",
    "12:45 To 01:45",
    "01:45 To 02:45",
    "03:00 To 04:00",
    "04:00 To 05:00"
  ];

  // Helper to extract faculty codes from a cell
  const extractCellFaculties = (cell) => {
    if (!cell) return [];
    const set = new Set();
    if (cell.subEntries && cell.subEntries.length > 0) {
      cell.subEntries.forEach((sub) => {
        if (sub.faculty) {
          sub.faculty.split(/[/,\s]+/).forEach((f) => f.trim() && set.add(f.trim().toUpperCase()));
        }
      });
    } else if (cell.faculty) {
      cell.faculty.split(/[/,\s]+/).forEach((f) => f.trim() && set.add(f.trim().toUpperCase()));
    }
    return Array.from(set);
  };

  // Helper to extract room codes from a cell
  const extractCellRooms = (cell) => {
    if (!cell) return [];
    const set = new Set();
    if (cell.subEntries && cell.subEntries.length > 0) {
      cell.subEntries.forEach((sub) => {
        if (sub.location) {
          sub.location.split(/[/,\s]+/).forEach((r) => r.trim() && set.add(r.trim().toUpperCase()));
        }
      });
    } else if (cell.location) {
      cell.location.split(/[/,\s]+/).forEach((r) => r.trim() && set.add(r.trim().toUpperCase()));
    }
    return Array.from(set);
  };

  // Helper to extract periods array from an external load entry (supports 2-hr slots and 1-hr slots)
  const getExternalLoadPeriods = (ext) => {
    if (!ext) return [];
    if (Array.isArray(ext.periods) && ext.periods.length > 0) return ext.periods.map(Number);
    const k = String(ext.slotKey || ext.period || "").toUpperCase();
    if (k === "P1-P2" || (k.includes("10") && k.includes("12"))) return [1, 2];
    if (k === "P3-P4" || k.includes("12.45") || k.includes("12:45") || k.includes("2.45")) return [3, 4];
    if (k === "P5-P6" || (k.includes("3") && k.includes("5"))) return [5, 6];
    if (ext.period && ext.period2) return [Number(ext.period), Number(ext.period2)];
    if (ext.period) {
      const p = Number(ext.period);
      return isNaN(p) ? [1] : [p];
    }
    return [1];
  };

  // Helper to format slot display for external load
  const formatExternalLoadSlot = (ext) => {
    if (!ext) return "";
    const pList = getExternalLoadPeriods(ext);
    if (pList.length === 2) {
      if (pList[0] === 1 && pList[1] === 2) return "10:00 AM - 12:00 PM (P1-P2: 2h)";
      if (pList[0] === 3 && pList[1] === 4) return "12:45 PM - 02:45 PM (P3-P4: 2h)";
      if (pList[0] === 5 && pList[1] === 6) return "03:00 PM - 05:00 PM (P5-P6: 2h)";
      return `P${pList[0]}-P${pList[1]} (2h)`;
    }
    const p = pList[0] || Number(ext.period) || 1;
    const timing = periodTimings && periodTimings[p - 1] ? ` (${periodTimings[p - 1]})` : "";
    return `Period ${p}${timing}`;
  };

  // Helper to normalize externalLoads to Map format { "FY-EEDP": [], "FY-PPS": [], "FY-PCC": [] }
  const toExternalLoadsMap = (raw) => {
    const defaultMap = { "FY-EEDP": [], "FY-PPS": [], "FY-PCC": [] };
    if (!raw) return defaultMap;
    if (Array.isArray(raw)) {
      raw.forEach((item) => {
        const type = item.loadType || "FY-PCC";
        if (!defaultMap[type]) defaultMap[type] = [];
        defaultMap[type].push(item);
      });
      return defaultMap;
    }
    return { ...defaultMap, ...raw };
  };

  // Comprehensive Live Schedule Auditor & Diagnostics Engine
  const computeLiveDiagnostics = (schedules, extLoads, facultyUnavailability = []) => {
    const liveDiagnostics = [];
    const liveConflicts = [];
    const yearKeys = ["SY", "TY", "BTECH"];
    const daysList = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

    if (!schedules) return { liveDiagnostics, liveConflicts };

    const normExtLoads = toExternalLoadsMap(extLoads);

    for (const day of daysList) {
      for (let period = 1; period <= 6; period++) {
        const facultyAssignments = new Map();
        const roomAssignments = new Map();

        // 1. Audit External University FY Loads
        for (const [extType, loadList] of Object.entries(normExtLoads)) {
          if (!Array.isArray(loadList)) continue;
          const match = loadList.find((ext) => ext.day === day && getExternalLoadPeriods(ext).includes(period));
          if (match && match.facultyCode) {
            const cleanF = match.facultyCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (cleanF) {
              const list = facultyAssignments.get(cleanF) || [];
              const durNote = getExternalLoadPeriods(match).length > 1 ? "2h FY slot" : "FY load";
              list.push({
                source: `External ${extType} (${match.description || durNote})`,
                year: "FY",
                faculty: match.facultyCode,
                course: extType
              });
              facultyAssignments.set(cleanF, list);
            }
          }
        }

        // 2. Audit Faculty Unavailability / Leaves
        if (Array.isArray(facultyUnavailability)) {
          for (const un of facultyUnavailability) {
            const fCode = un.faculty?.name || un.facultyCode || "";
            if (fCode && un.day === day && Number(un.period) === period) {
              const cleanF = fCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
              if (cleanF) {
                const list = facultyAssignments.get(cleanF) || [];
                list.push({
                  source: `Off-Slot / Leave (${un.reason || "Scheduled Leave"})`,
                  year: "LEAVE",
                  faculty: fCode,
                  course: "Leave / Off-Slot",
                  isLeave: true
                });
                facultyAssignments.set(cleanF, list);
              }
            }
          }
        }

        // 3. Audit Department Classes (SY, TY, BTECH)
        for (const yr of yearKeys) {
          const cell = schedules[yr]?.find((c) => c.day === day && c.period === period);
          if (!cell || !cell.course || cell.course === "—") continue;

          // Check if cell has parallel batches (subEntries)
          if (cell.subEntries && cell.subEntries.length > 0) {
            for (const sub of cell.subEntries) {
              if (sub.faculty) {
                const facs = sub.faculty.split(/[/,\s]+/).map((f) => f.trim().toUpperCase()).filter(Boolean);
                for (const f of facs) {
                  const cleanF = f.replace(/[^A-Z0-9]/g, "");
                  if (!cleanF) continue;
                  const list = facultyAssignments.get(cleanF) || [];
                  list.push({
                    source: `${yr} Batch ${sub.batch} (${sub.course || "Lab"})`,
                    year: yr,
                    batch: sub.batch,
                    faculty: f,
                    course: sub.course || "Lab"
                  });
                  facultyAssignments.set(cleanF, list);
                }
              }

              if (sub.location) {
                const rooms = sub.location.split(/[/,\s]+/).map((r) => r.trim().toUpperCase()).filter(Boolean);
                for (const r of rooms) {
                  const cleanR = r.replace(/[^A-Z0-9]/g, "");
                  if (!cleanR) continue;
                  const list = roomAssignments.get(cleanR) || [];
                  list.push({
                    source: `${yr} Batch ${sub.batch} (${sub.course || "Lab"})`,
                    year: yr,
                    batch: sub.batch,
                    room: r,
                    course: sub.course || "Lab"
                  });
                  roomAssignments.set(cleanR, list);
                }
              }
            }
          } else {
            // Standard cell (Theory / Fixed / etc.)
            if (cell.faculty) {
              const facs = cell.faculty.split(/[/,\s]+/).map((f) => f.trim().toUpperCase()).filter(Boolean);
              for (const f of facs) {
                const cleanF = f.replace(/[^A-Z0-9]/g, "");
                if (!cleanF) continue;
                const list = facultyAssignments.get(cleanF) || [];
                list.push({
                  source: `${yr} (${cell.course || "Class"})`,
                  year: yr,
                  faculty: f,
                  course: cell.course || "Class"
                });
                facultyAssignments.set(cleanF, list);
              }
            }

            if (cell.location) {
              const rooms = cell.location.split(/[/,\s]+/).map((r) => r.trim().toUpperCase()).filter(Boolean);
              for (const r of rooms) {
                const cleanR = r.replace(/[^A-Z0-9]/g, "");
                if (!cleanR) continue;
                const list = roomAssignments.get(cleanR) || [];
                list.push({
                  source: `${yr} (${cell.course || "Class"})`,
                  year: yr,
                  room: r,
                  course: cell.course || "Class"
                });
                roomAssignments.set(cleanR, list);
              }
            }
          }
        }

        // 4. Evaluate Faculty Clashes
        for (const [, assignments] of facultyAssignments.entries()) {
          if (assignments.length > 1) {
            const facultyName = assignments[0].faculty;
            const sources = assignments.map((a) => a.source).join(" AND ");
            const hasLeave = assignments.some((a) => a.isLeave);

            const type = hasLeave ? "FACULTY_LEAVE_VIOLATION" : "TEACHER_DOUBLE_BOOKED";
            const severity = "ERROR";
            const entity = `${day} P${period} - Prof. ${facultyName}`;
            const message = hasLeave
              ? `Faculty '${facultyName}' is scheduled during an approved Leave / Off-Slot on ${day} Period ${period}. Conflicting slots: ${sources}.`
              : `Faculty '${facultyName}' was double-booked in multiple simultaneous sessions on ${day} Period ${period}: ${sources}.`;
            const suggestion = hasLeave
              ? `Reschedule the lecture or change the assigned teacher to respect faculty off-slot.`
              : `Reassign one of the conflicting batches or lectures to another available faculty.`;

            liveDiagnostics.push({
              type,
              severity,
              entity,
              message,
              suggestion
            });

            liveConflicts.push(`Teacher Clash at ${day} P${period}: Prof. ${facultyName} is double-booked across ${sources}`);
          }
        }

        // 5. Evaluate Room Clashes
        for (const [, assignments] of roomAssignments.entries()) {
          if (assignments.length > 1) {
            const roomName = assignments[0].room;
            const sources = assignments.map((a) => a.source).join(" AND ");

            liveDiagnostics.push({
              type: "ROOM_DOUBLE_BOOKED",
              severity: "ERROR",
              entity: `${day} P${period} - Room ${roomName}`,
              message: `Room/Lab '${roomName}' is booked for multiple simultaneous sessions on ${day} Period ${period}: ${sources}.`,
              suggestion: `Assign an alternate available classroom or laboratory.`
            });

            liveConflicts.push(`Room Clash at ${day} P${period}: Room ${roomName} is double-booked across ${sources}`);
          }
        }
      }
    }

    return { liveDiagnostics, liveConflicts };
  };

  // Auto-generate or restore saved master timetable on mount
  useEffect(() => {
    const savedMaster = localStorage.getItem("masterTimetableData");
    const hasAdjustments = localStorage.getItem("timetableHasManualAdjustments") === "true";
    if (savedMaster) {
      try {
        const parsed = JSON.parse(savedMaster);
        if (parsed?.schedules && Object.keys(parsed.schedules).length > 0) {
          if (parsed.externalLoads) {
            parsed.externalLoads = toExternalLoadsMap(parsed.externalLoads);
          }
          // Real-time audit on mount to clear any stale warnings
          const { liveDiagnostics, liveConflicts } = computeLiveDiagnostics(
            parsed.schedules,
            parsed.externalLoads,
            inputs?.facultyUnavailability
          );
          parsed.diagnostics = liveDiagnostics;
          parsed.conflictLog = liveConflicts;
          localStorage.setItem("masterTimetableData", JSON.stringify(parsed));

          setMasterData(parsed);
          setOriginalSchedules(JSON.parse(JSON.stringify(parsed.schedules)));
          setHasManualAdjustments(hasAdjustments);
          setConflictLog(liveConflicts);
          setDiagnostics(liveDiagnostics);
          return;
        }
      } catch (e) {}
    }
    handleGenerate(inputs, true);
  }, []);

  // Synchronize department inputs into existing schedules (updating faculty, rooms, batches while preserving swapped period slots)
  const syncInputsWithSchedules = (currentSchedules, currentInputs) => {
    if (!currentSchedules || !currentInputs) return currentSchedules;

    const updated = JSON.parse(JSON.stringify(currentSchedules));
    const yearKeys = ["SY", "TY", "BTECH"];

    yearKeys.forEach((yr) => {
      const classList = updated[yr];
      if (!classList) return;

      const yData = currentInputs.yearData?.[yr];
      if (!yData) return;

      const subjectsList = yData.subjects || [];
      const labCoursesList = yData.labCourses || [];
      const practicalsList = yData.practicals || [];
      const fixedSlotsList = yData.fixedSlots || [];
      const defaultRoom = currentInputs.classroomMapping?.[yr] || yData.defaultRoom || (yr === "SY" ? "CR-27" : (yr === "TY" ? "CR-26" : "CR-212"));

      classList.forEach((cell) => {
        if (!cell || !cell.course || cell.course === "—") return;

        // 1. PRACTICAL LAB SESSIONS
        if (cell.cellType === "PRACTICAL" || (cell.subEntries && cell.subEntries.length > 0)) {
          if (cell.subEntries && cell.subEntries.length > 0) {
            const cellBlockStr = (cell.period === 1 || cell.period === 2)
              ? "P1-P2"
              : (cell.period === 3 || cell.period === 4)
              ? "P3-P4"
              : "P5-P6";

            cell.subEntries = cell.subEntries.map((sub) => {
              let updatedFac = sub.faculty;
              let updatedLoc = sub.location;
              let updatedCourse = sub.course;

              // Priority 1: Match practical from practicalsList matching day, period, and batch
              const slotPrac = practicalsList.find(
                (pr) => pr.day === cell.day && pr.period === cellBlockStr && pr.batch === sub.batch
              );
              if (slotPrac) {
                if (slotPrac.practical) updatedCourse = slotPrac.practical;
                if (slotPrac.faculty) updatedFac = slotPrac.faculty;
                if (slotPrac.room) updatedLoc = slotPrac.room;
              } else {
                // Priority 2: Check labCourses for batchFacultyMap or general faculty
                const matchedLab = labCoursesList.find(
                  (lc) => (lc.code && lc.code.trim().toUpperCase() === sub.course?.trim().toUpperCase()) ||
                          (lc.name && lc.name.trim().toUpperCase() === sub.course?.trim().toUpperCase())
                );
                if (matchedLab) {
                  if (matchedLab.batchFacultyMap && matchedLab.batchFacultyMap[sub.batch]) {
                    updatedFac = matchedLab.batchFacultyMap[sub.batch];
                  } else if (matchedLab.faculty) {
                    updatedFac = matchedLab.faculty;
                  }
                  if (matchedLab.preferredRoom) {
                    updatedLoc = matchedLab.preferredRoom;
                  }
                }

                // Priority 3: Fallback practicals list for batch + practical course match
                const matchedPrac = practicalsList.find(
                  (pr) => pr.batch === sub.batch &&
                          ((pr.practical && pr.practical.trim().toUpperCase() === sub.course?.trim().toUpperCase()) ||
                           (pr.subject && pr.subject.trim().toUpperCase() === sub.course?.trim().toUpperCase()))
                );
                if (matchedPrac) {
                  if (matchedPrac.faculty) updatedFac = matchedPrac.faculty;
                  if (matchedPrac.room) updatedLoc = matchedPrac.room;
                }
              }

              return {
                ...sub,
                course: updatedCourse,
                faculty: updatedFac,
                location: updatedLoc
              };
            });

            // Recompute top-level summary course, faculty and location strings
            const allCourses = Array.from(new Set(cell.subEntries.map((s) => s.course).filter(Boolean)));
            const allFacs = Array.from(new Set(cell.subEntries.map((s) => s.faculty).filter(Boolean)));
            const allLocs = Array.from(new Set(cell.subEntries.map((s) => s.location).filter(Boolean)));
            if (allCourses.length > 0) cell.course = allCourses.join(" / ");
            cell.faculty = allFacs.join(", ");
            cell.location = allLocs.join(", ");
          }
          return;
        }

        // 2. FIXED SLOTS (MDM, OE, MENTORING, CAPSTONE, ETC.)
        const matchedFixed = fixedSlotsList.find(
          (fs) => fs.day === cell.day && fs.period === cell.period
        ) || fixedSlotsList.find(
          (fs) => (fs.courseName && fs.courseName.trim().toUpperCase() === cell.course.trim().toUpperCase()) ||
                  (fs.subjectCode && fs.subjectCode.trim().toUpperCase() === cell.course.trim().toUpperCase())
        );
        if (matchedFixed && (cell.cellType !== "THEORY" || matchedFixed.courseName?.toUpperCase().includes(cell.course.toUpperCase()) || (matchedFixed.day === cell.day && matchedFixed.period === cell.period))) {
          if (matchedFixed.day === cell.day && matchedFixed.period === cell.period && matchedFixed.courseName) {
            cell.course = matchedFixed.courseName;
          }
          if (matchedFixed.facultyName !== undefined) cell.faculty = matchedFixed.facultyName;
          if (matchedFixed.room !== undefined) cell.location = matchedFixed.room;
          return;
        }

        // 3. THEORY SUBJECTS
        const cleanCourse = cell.course.trim().toUpperCase();
        const matchedSub = subjectsList.find(
          (s) => (s.code && s.code.trim().toUpperCase() === cleanCourse) ||
                 (s.name && s.name.trim().toUpperCase() === cleanCourse)
        );

        if (matchedSub) {
          if (matchedSub.faculty?.name) {
            cell.faculty = matchedSub.faculty.name;
          }
          cell.location = defaultRoom;
        }
      });
    });

    return updated;
  };

  // Recompute conflict diagnostics across all classes
  const computeScheduleDiagnostics = (schedules, extLoads, facultyUnavailability) => {
    return computeLiveDiagnostics(schedules, extLoads, facultyUnavailability || inputs?.facultyUnavailability).liveConflicts;
  };

  const handleGenerate = async (payloadToUse = null, forceFresh = false) => {
    const dataToSend = payloadToUse || inputs;

    // If the user has made manual swaps and is not explicitly asking for fresh backend regeneration:
    if (!forceFresh && (hasManualAdjustments || swapHistory.length > 0) && masterData?.schedules) {
      setLoading(true);
      try {
        const currentSchedules = masterData.schedules;
        const syncedSchedules = syncInputsWithSchedules(currentSchedules, dataToSend);

        const computedHours = {
          SY: (syncedSchedules.SY || []).filter((c) => c.course && c.course !== "—").length,
          TY: (syncedSchedules.TY || []).filter((c) => c.course && c.course !== "—").length,
          BTECH: (syncedSchedules.BTECH || []).filter((c) => c.course && c.course !== "—").length
        };

        const normExternalMap = toExternalLoadsMap(dataToSend.externalLoads || masterData?.externalLoads);
        const { liveDiagnostics, liveConflicts } = computeLiveDiagnostics(
          syncedSchedules,
          normExternalMap,
          dataToSend.facultyUnavailability
        );

        const updatedMaster = {
          ...masterData,
          schedules: syncedSchedules,
          externalLoads: normExternalMap,
          totalContactHours: computedHours,
          conflictLog: liveConflicts,
          diagnostics: liveDiagnostics
        };

        setMasterData(updatedMaster);
        setConflictLog(liveConflicts);
        setDiagnostics(liveDiagnostics);
        localStorage.setItem("masterTimetableData", JSON.stringify(updatedMaster));
        localStorage.setItem("customMasterPayload", JSON.stringify(dataToSend));
        setSwapSource(null);
        setSwapHover(null);
        setSwapAlert({
          type: "success",
          text: "✓ Updated timetable with new department inputs while keeping all your period swaps intact!"
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    const totalSubjects = (dataToSend?.yearData?.SY?.subjects?.length || 0) +
                          (dataToSend?.yearData?.TY?.subjects?.length || 0) +
                          (dataToSend?.yearData?.BTECH?.subjects?.length || 0);
    if (totalSubjects === 0 && (dataToSend?.faculties?.length || 0) === 0) {
      alert("Department configuration is currently blank. Please add faculty members and subjects before generating a timetable.");
      return;
    }

    setLoading(true);
    try {
      const payloadToSend = JSON.parse(JSON.stringify(dataToSend));
      if (Array.isArray(payloadToSend.externalLoads)) {
        const flattenedExt = [];
        payloadToSend.externalLoads.forEach((ext) => {
          const pList = getExternalLoadPeriods(ext);
          if (pList.length > 1) {
            pList.forEach((p) => {
              flattenedExt.push({
                loadType: ext.loadType,
                facultyCode: ext.facultyCode,
                day: ext.day,
                period: p,
                description: ext.description
              });
            });
          } else {
            flattenedExt.push({
              loadType: ext.loadType,
              facultyCode: ext.facultyCode,
              day: ext.day,
              period: pList[0] || Number(ext.period) || 1,
              description: ext.description
            });
          }
        });
        payloadToSend.externalLoads = flattenedExt;
      }

      const res = await generateMasterTimetable(payloadToSend);
      // Run live audit to verify constraints against the generated schedules
      const { liveDiagnostics, liveConflicts } = computeLiveDiagnostics(
        res.schedules,
        dataToSend.externalLoads || res.externalLoads,
        dataToSend.facultyUnavailability
      );
      res.diagnostics = liveDiagnostics;
      res.conflictLog = liveConflicts;
      setMasterData(res);
      setOriginalSchedules(JSON.parse(JSON.stringify(res.schedules || {})));
      setHasManualAdjustments(false);
      setSwapHistory([]);
      localStorage.removeItem("timetableSwapHistory");
      localStorage.setItem("timetableHasManualAdjustments", "false");
      setSwapSource(null);
      setSwapHover(null);
      setConflictLog(liveConflicts);
      setDiagnostics(liveDiagnostics);
      localStorage.setItem("masterTimetableData", JSON.stringify(res));
      localStorage.setItem("customMasterPayload", JSON.stringify(dataToSend));
      setSwapAlert({
        type: "success",
        text: "✓ Successfully generated fresh 3-Year Master Timetable!"
      });
    } catch (err) {
      console.error("Failed to generate master timetable:", err);
      alert("Failed to connect to backend server. Make sure Spring Boot is running on port 8080.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetToPreset = () => {
    const clone = JSON.parse(JSON.stringify(ritDepartmentPreset));
    setInputs(clone);
    localStorage.setItem("customMasterPayload", JSON.stringify(clone));
    localStorage.removeItem("timetableSwapHistory");
    localStorage.setItem("timetableHasManualAdjustments", "false");
    setSwapHistory([]);
    setHasManualAdjustments(false);
    handleGenerate(clone, true);
  };

  const handleResetToBlank = () => {
    const isConfirmed = window.confirm(
      "⚠️ Erase All Department Inputs?\n\nThis will clear all faculties, theory subjects, lab courses, practicals, fixed slots, external loads, and off-slots, allowing you to start fresh and enter brand new data from scratch.\n\nAre you sure you want to proceed?"
    );
    if (!isConfirmed) return;

    const blankPayload = {
      version: "BLANK-FRESH",
      config: {
        year: "",
        branch: "IT",
        workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        periodsPerDay: 6,
        periodTimings: [
          "10:00 To 11:00",
          "11:00 To 12:00",
          "12:45 To 01:45",
          "01:45 To 02:45",
          "03:00 To 04:00",
          "04:00 To 05:00"
        ]
      },
      faculties: [],
      rooms: [
        { id: 1, name: "CR-27", type: "THEORY", defaultForYear: "SY" },
        { id: 2, name: "CR-26", type: "THEORY", defaultForYear: "TY" },
        { id: 3, name: "CR-212", type: "THEORY", defaultForYear: "BTECH" },
        { id: 4, name: "IL1", type: "LAB" },
        { id: 5, name: "IL2", type: "LAB" },
        { id: 6, name: "IL3", type: "LAB" },
        { id: 7, name: "IL4", type: "LAB" },
        { id: 8, name: "IL5", type: "LAB" },
        { id: 9, name: "IL6", type: "LAB" }
      ],
      classroomMapping: {
        SY: "CR-27",
        TY: "CR-26",
        BTECH: "CR-212"
      },
      externalLoads: [],
      facultyUnavailability: [],
      yearData: {
        SY: {
          year: "SY",
          branch: "IT",
          defaultRoom: "CR-27",
          subjects: [],
          fixedSlots: [],
          labCourses: [],
          practicals: []
        },
        TY: {
          year: "TY",
          branch: "IT",
          defaultRoom: "CR-26",
          subjects: [],
          fixedSlots: [],
          labCourses: [],
          practicals: []
        },
        BTECH: {
          year: "BTECH",
          branch: "IT",
          defaultRoom: "CR-212",
          subjects: [],
          fixedSlots: [],
          labCourses: [],
          practicals: []
        }
      }
    };

    setInputs(blankPayload);
    localStorage.setItem("customMasterPayload", JSON.stringify(blankPayload));
    localStorage.removeItem("timetableSwapHistory");
    localStorage.setItem("timetableHasManualAdjustments", "false");
    setSwapHistory([]);
    setHasManualAdjustments(false);

    // Build empty timetable grid
    const emptySchedules = { SY: [], TY: [], BTECH: [] };
    days.forEach((day) => {
      periods.forEach((period) => {
        ["SY", "TY", "BTECH"].forEach((yr) => {
          emptySchedules[yr].push({
            day,
            period,
            course: "—",
            faculty: "",
            location: "",
            type: "EMPTY",
            subEntries: []
          });
        });
      });
    });

    const emptyMaster = {
      schedules: emptySchedules,
      externalLoads: {},
      totalContactHours: { SY: 0, TY: 0, BTECH: 0 },
      conflictLog: [],
      diagnostics: []
    };
    setMasterData(emptyMaster);
    setOriginalSchedules(JSON.parse(JSON.stringify(emptySchedules)));
    localStorage.setItem("masterTimetableData", JSON.stringify(emptyMaster));
    setConflictLog([]);
    setDiagnostics([]);
    setSwapSource(null);
    setSwapHover(null);
    setSelectedFaculty("");

    setSwapAlert({
      type: "success",
      text: "🧹 All department inputs erased! You now have a blank timetable and can enter fresh data."
    });
  };

  // Setup New Academic Year / Semester: Import Faculty, Courses, Classrooms & Labs from benchmark, clear allotments
  const handleExecuteNewYearSetup = (scopeOverride = null, sessionOverride = null, semesterOverride = null) => {
    const scope = scopeOverride || newYearSetupScope;
    let finalSession = sessionOverride || newYearSetupSession;
    if (showCustomSessionField && customSessionInput.trim()) {
      finalSession = customSessionInput.trim();
      if (!availableSessions.includes(finalSession)) {
        const nextSessions = [finalSession, ...availableSessions];
        setAvailableSessions(nextSessions);
        localStorage.setItem("rit_available_sessions", JSON.stringify(nextSessions));
      }
    }
    const finalSemester = semesterOverride || newYearSetupSemester;

    const source = (inputs?.faculties && inputs.faculties.length > 0) ? inputs : ritDepartmentPreset;

    // 1. Keep Faculty Details (codes, full names, designations, central roles, daily caps)
    const cleanFaculties = (source.faculties || []).map((f) => ({
      id: f.id || Date.now(),
      name: f.name,
      fullName: f.fullName || f.name,
      designation: f.designation || "Assistant Professor",
      centralAuthority: f.centralAuthority || "None",
      maxDailyLectures: f.maxDailyLectures || 4
    }));

    // 2. Keep Rooms & Labs
    const cleanRooms = (source.rooms || ritDepartmentPreset.rooms || []).map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      defaultForYear: r.defaultForYear
    }));

    // 3. Keep courses, classrooms and lab structures, but CLEAR teacher allotments for new semester
    const cleanYearData = {};
    ["SY", "TY", "BTECH"].forEach((yr) => {
      const yrSource = source.yearData?.[yr] || ritDepartmentPreset.yearData?.[yr];
      if (!yrSource) return;

      const shouldCleanThisYear = (scope === "ALL" || scope === yr);

      if (shouldCleanThisYear) {
        // Theory subjects: keep code, name, weekly periods, but clear assigned faculty
        const cleanSubjects = (yrSource.subjects || []).map((sub) => ({
          id: sub.id,
          code: sub.code,
          name: sub.name,
          type: sub.type || "THEORY",
          weeklyPeriods: Number(sub.weeklyPeriods) || 3,
          faculty: null // Cleared for fresh semester allocation
        }));

        // Lab courses: keep code, name, preferredRoom, batches, but clear assigned faculties
        const cleanLabCourses = (yrSource.labCourses || []).map((lc) => ({
          code: lc.code,
          name: lc.name,
          preferredRoom: lc.preferredRoom,
          faculty: "",
          faculties: [],
          batchFacultyMap: {}
        }));

        // Practicals template: keep day, period, batch, practical, room, but clear faculty
        const cleanPracticals = (yrSource.practicals || []).map((pr) => ({
          day: pr.day,
          period: pr.period,
          batch: pr.batch,
          practical: pr.practical,
          room: pr.room,
          faculty: "" // Cleared for fresh semester allocation
        }));

        cleanYearData[yr] = {
          year: yrSource.year || yr,
          branch: yrSource.branch || "IT",
          defaultRoom: yrSource.defaultRoom || (yr === "SY" ? "CR-27" : (yr === "TY" ? "CR-26" : "CR-212")),
          classroom: yrSource.classroom || (yr === "SY" ? "CR-27" : (yr === "TY" ? "CR-26" : "CR-212")),
          classCoordinator: yrSource.classCoordinator || "",
          subjects: cleanSubjects,
          labCourses: cleanLabCourses,
          practicals: cleanPracticals,
          fixedSlots: []
        };
      } else {
        cleanYearData[yr] = JSON.parse(JSON.stringify(yrSource));
      }
    });

    const cleanPayload = {
      version: `${finalSession}-${finalSemester}-CONFIG`,
      config: {
        year: "",
        branch: "IT",
        workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        periodsPerDay: 6,
        periodTimings: periodTimings || ritDepartmentPreset.config.periodTimings
      },
      faculties: cleanFaculties,
      rooms: cleanRooms,
      yearData: cleanYearData,
      facultyUnavailability: [],
      externalLoads: []
    };

    setInputs(cleanPayload);
    localStorage.setItem("customMasterPayload", JSON.stringify(cleanPayload));
    localStorage.setItem(`payload_${finalSession}_${finalSemester}`, JSON.stringify(cleanPayload));

    setAcademicSession(finalSession);
    setAcademicSemester(finalSemester);

    // Clear old schedules & swap history
    setMasterData(null);
    localStorage.removeItem("timetableSwapHistory");
    localStorage.setItem("timetableHasManualAdjustments", "false");
    setSwapHistory([]);
    setHasManualAdjustments(false);
    setConflictLog([]);
    setDiagnostics([]);

    setNewYearModalOpen(false);
    setShowCustomSessionField(false);
    setCustomSessionInput("");

    // Open drawer to the target year tab
    setIsInputsDrawerOpen(true);
    if (scope === "SY") setActiveInputTab("SY");
    else if (scope === "TY") setActiveInputTab("TY");
    else if (scope === "BTECH") setActiveInputTab("BTECH");
    else setActiveInputTab("SY");

    const scopeText = scope === "ALL" ? "All 3 Years (SY, TY, BTech)" : (scope === "SY" ? "Second Year (S.E.)" : (scope === "TY" ? "Third Year (T.E.)" : "Final Year"));
    setSwapAlert({
      type: "success",
      text: `✨ Successfully configured for ${finalSession} / ${finalSemester}! Imported Faculty details, Courses, Classrooms & Labs for ${scopeText}. Previous teacher allotments are cleared so you can allot subjects fresh and calculate load.`
    });
  };

  // Reset teacher allocations for a single year (e.g. SY / SE)
  const handleResetYearFacultyAllotments = (yearKey) => {
    const yearLabel = yearKey === "SY" ? "Second Year (S.E. / S.Y.)" : (yearKey === "TY" ? "Third Year (T.E. / T.Y.)" : "Final Year (B.Tech)");
    const isConfirmed = window.confirm(
      `Clear Faculty Allotments for ${yearLabel}?\n\n` +
      `✓ All Courses, weekly lecture hours, practical labs, batches, and classroom (CR-${yearKey === "SY" ? "27" : (yearKey === "TY" ? "26" : "212")}) will be KEPT.\n` +
      `✗ Assigned faculty on ${yearLabel} theory & lab courses will be CLEARED to unassigned.\n\n` +
      `This allows you to allot subjects and faculties fresh for that semester and calculate load accurately.\n\nAre you sure?`
    );
    if (!isConfirmed) return;

    const yrSource = inputs.yearData?.[yearKey];
    if (!yrSource) return;

    const cleanSubjects = (yrSource.subjects || []).map((sub) => ({
      ...sub,
      faculty: null
    }));

    const cleanLabCourses = (yrSource.labCourses || []).map((lc) => ({
      ...lc,
      faculty: "",
      faculties: [],
      batchFacultyMap: {}
    }));

    const cleanPracticals = (yrSource.practicals || []).map((pr) => ({
      ...pr,
      faculty: ""
    }));

    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [yearKey]: {
          ...yrSource,
          subjects: cleanSubjects,
          labCourses: cleanLabCourses,
          practicals: cleanPracticals,
          fixedSlots: []
        }
      }
    };

    setInputs(updated);
    localStorage.setItem("customMasterPayload", JSON.stringify(updated));
    setSwapAlert({
      type: "success",
      text: `✓ Cleared teacher allotments for ${yearLabel}. Courses & classroom preserved. You can now allot faculty below!`
    });
  };

  // --- Database Persistence Handlers ---
  const handleSaveToDb = async () => {
    if (!masterData) {
      alert("Please generate a timetable first before saving to the database.");
      return;
    }
    const defaultName = `${masterData.department || "Department"} - ${masterData.academicYear || "Timetable"} (${new Date().toLocaleDateString()})`;
    const nameToSave = customSaveName.trim() || defaultName;

    setSavingToDb(true);
    try {
      const savedRecord = await saveMasterTimetable(masterData, nameToSave);
      setSwapAlert({
        type: "success",
        text: `✓ Saved successfully to database as "${savedRecord.name || nameToSave}" (ID #${savedRecord.id})!`
      });
      setCustomSaveName("");
    } catch (err) {
      console.error("Failed to save to database:", err);
      setSwapAlert({
        type: "error",
        text: `Failed to save to database: ${err.message}`
      });
    } finally {
      setSavingToDb(false);
    }
  };

  const handleOpenDbModal = async () => {
    setShowDbModal(true);
    try {
      const list = await getAllMasterTimetables();
      setDbTimetables(list || []);
    } catch (err) {
      console.error("Failed to fetch saved timetables:", err);
    }
  };

  const handleLoadSaved = (record) => {
    try {
      const parsed = JSON.parse(record.timetableJson);
      if (parsed && parsed.schedules) {
        if (parsed.externalLoads) {
          parsed.externalLoads = toExternalLoadsMap(parsed.externalLoads);
        }
        const { liveDiagnostics, liveConflicts } = computeLiveDiagnostics(
          parsed.schedules,
          parsed.externalLoads,
          inputs?.facultyUnavailability
        );
        parsed.diagnostics = liveDiagnostics;
        parsed.conflictLog = liveConflicts;
        setMasterData(parsed);
        setOriginalSchedules(JSON.parse(JSON.stringify(parsed.schedules)));
        setConflictLog(liveConflicts);
        setDiagnostics(liveDiagnostics);
        setHasManualAdjustments(false);
        setSwapHistory([]);
        localStorage.setItem("masterTimetableData", JSON.stringify(parsed));
        localStorage.setItem("timetableHasManualAdjustments", "false");
        localStorage.removeItem("timetableSwapHistory");
        setShowDbModal(false);
        setSwapAlert({
          type: "success",
          text: `✓ Loaded timetable "${record.name}" from database successfully!`
        });
      }
    } catch (err) {
      alert("Failed to load saved timetable data: " + err.message);
    }
  };

  const handleDeleteSaved = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this saved timetable from the database?")) return;
    try {
      await deleteMasterTimetable(id);
      setDbTimetables((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert("Failed to delete timetable: " + err.message);
    }
  };

  // Helper to compute all assignments for a faculty across SY, TY, B.Tech, practicals, fixed, and FY
  const getFacultyAssignments = (facultyCode) => {
    if (!facultyCode) return { theorySubjects: [], labCourses: [], practicals: [], fixedSlots: [], externalLoads: [], totalTheoryHours: 0, totalLabHours: 0, totalFixedHours: 0, totalExternalHours: 0, totalHours: 0, totalActiveCount: 0 };
    const norm = facultyCode.trim().toUpperCase();
    const theorySubjects = [];
    const labCourses = [];
    const practicals = [];
    const fixedSlots = [];
    const externalLoads = [];

    ["SY", "TY", "BTECH"].forEach((yr) => {
      const yData = inputs?.yearData?.[yr];
      if (!yData) return;

      (yData.subjects || []).forEach((sub) => {
        if ((sub.faculty?.name || "").trim().toUpperCase() === norm) {
          theorySubjects.push({
            year: yr,
            code: sub.code,
            name: sub.name || sub.code,
            weeklyPeriods: Number(sub.weeklyPeriods) || 3
          });
        }
      });

      (yData.labCourses || []).forEach((lc) => {
        const assignedBatches = [];
        if (lc.batchFacultyMap) {
          Object.entries(lc.batchFacultyMap).forEach(([b, f]) => {
            if ((f || "").trim().toUpperCase() === norm) assignedBatches.push(b);
          });
        }
        const isAssigned = (lc.faculty || "").trim().toUpperCase() === norm ||
          (Array.isArray(lc.faculties) && lc.faculties.some(f => (f || "").trim().toUpperCase() === norm)) ||
          assignedBatches.length > 0;

        if (isAssigned) {
          labCourses.push({
            year: yr,
            code: lc.code,
            name: lc.name || lc.code,
            room: lc.preferredRoom,
            batches: assignedBatches.length > 0 ? assignedBatches : ["All"]
          });
        }
      });

      (yData.practicals || []).forEach((pr) => {
        if ((pr.faculty || "").trim().toUpperCase() === norm) {
          practicals.push({
            year: yr,
            day: pr.day,
            period: pr.period,
            batch: pr.batch,
            practical: pr.practical,
            room: pr.room
          });
        }
      });

      (yData.fixedSlots || []).forEach((fs) => {
        const facs = (fs.facultyName || "").split(/[/,\s]+/).map((f) => f.trim().toUpperCase()).filter(Boolean);
        if (facs.includes(norm)) {
          fixedSlots.push({
            year: yr,
            day: fs.day,
            period: fs.period,
            course: fs.courseName,
            room: fs.room
          });
        }
      });
    });

    (inputs?.externalLoads || []).forEach((ext) => {
      if ((ext.facultyCode || "").trim().toUpperCase() === norm) {
        const pList = getExternalLoadPeriods(ext);
        externalLoads.push({
          day: ext.day,
          period: ext.period,
          periods: pList,
          loadType: ext.loadType,
          description: ext.description,
          hours: pList.length
        });
      }
    });

    const totalTheoryHours = theorySubjects.reduce((sum, s) => sum + s.weeklyPeriods, 0);
    const totalLabHours = practicals.length > 0 ? practicals.length : (labCourses.length * 2);
    const totalFixedHours = fixedSlots.length;
    const totalExternalHours = externalLoads.reduce((sum, ext) => sum + (ext.hours || 1), 0);
    const totalHours = totalTheoryHours + totalLabHours + totalFixedHours + totalExternalHours;
    const totalActiveCount = theorySubjects.length + labCourses.length + practicals.length + fixedSlots.length + externalLoads.length;

    return {
      theorySubjects,
      labCourses,
      practicals,
      fixedSlots,
      externalLoads,
      totalTheoryHours,
      totalLabHours,
      totalFixedHours,
      totalExternalHours,
      totalHours,
      totalActiveCount
    };
  };

  // Add Faculty handler
  const handleAddFaculty = (e) => {
    e.preventDefault();
    if (!newFacultyName.trim()) return;
    const name = newFacultyName.trim().toUpperCase();
    if (inputs.faculties.some((f) => f.name === name)) {
      alert("Faculty code already exists!");
      return;
    }
    const updated = {
      ...inputs,
      faculties: [
        ...inputs.faculties,
        {
          id: Date.now(),
          name,
          fullName: newFacultyFullName.trim() || name,
          maxDailyLectures: Number(newFacultyMaxLectures) || 4,
          designation: newFacultyDesignation || "Assistant Professor",
          centralAuthority: newFacultyAuthority || "None"
        }
      ]
    };
    setInputs(updated);
    localStorage.setItem("customMasterPayload", JSON.stringify(updated));
    setNewFacultyName("");
    setNewFacultyFullName("");
    setNewFacultyMaxLectures(4);
    setNewFacultyDesignation("Assistant Professor");
    setNewFacultyAuthority("None");
    setReassignFeedback({
      type: "success",
      text: `Faculty ${name} (${newFacultyDesignation}${newFacultyAuthority !== "None" ? " - " + newFacultyAuthority : ""}) added successfully! Assign subjects to them below or transfer existing load.`
    });
  };

  // Update existing faculty designation, authority, full name, or max lectures inline
  const handleUpdateFaculty = (facultyCode, field, value) => {
    const updatedFaculties = (inputs.faculties || []).map((f) => {
      if (f.name === facultyCode) {
        return { ...f, [field]: value };
      }
      return f;
    });
    const updated = { ...inputs, faculties: updatedFaculties };
    setInputs(updated);
    localStorage.setItem("customMasterPayload", JSON.stringify(updated));
  };

  // Open Edit Faculty Modal
  const handleOpenEditFacultyModal = (faculty) => {
    if (!faculty) return;
    setEditingFacultyModal({
      isOpen: true,
      originalCode: faculty.name,
      name: faculty.name,
      fullName: faculty.fullName || faculty.name,
      designation: faculty.designation || "Assistant Professor",
      centralAuthority: faculty.centralAuthority || "None",
      maxDailyLectures: faculty.maxDailyLectures || 4
    });
  };

  // Save Faculty Details (Code, Full Name, Designation, Authority, Daily Cap) with automatic cascade
  const handleSaveFacultyDetails = (e) => {
    if (e) e.preventDefault();
    const { originalCode, name, fullName, designation, centralAuthority, maxDailyLectures } = editingFacultyModal;
    const cleanNewCode = (name || "").trim().toUpperCase();
    const cleanOldCode = (originalCode || "").trim().toUpperCase();

    if (!cleanNewCode) {
      alert("Faculty Short Code cannot be empty.");
      return;
    }

    // Check if new code conflicts with another faculty
    if (cleanNewCode !== cleanOldCode) {
      const exists = (inputs.faculties || []).some((f) => f.name.toUpperCase() === cleanNewCode);
      if (exists) {
        alert(`A faculty with code "${cleanNewCode}" already exists. Please choose a unique code.`);
        return;
      }
    }

    // Clone inputs
    const updatedInputs = JSON.parse(JSON.stringify(inputs));

    // 1. Update faculties list
    updatedInputs.faculties = (updatedInputs.faculties || []).map((f) => {
      if (f.name.toUpperCase() === cleanOldCode) {
        return {
          ...f,
          name: cleanNewCode,
          fullName: (fullName || cleanNewCode).trim(),
          designation: designation || "Assistant Professor",
          centralAuthority: centralAuthority || "None",
          maxDailyLectures: Number(maxDailyLectures) || 4
        };
      }
      return f;
    });

    // 2. If code changed, cascade update across all courses, practicals, labs, and fixed slots
    if (cleanNewCode !== cleanOldCode) {
      const yearKeys = ["SY", "TY", "BTECH"];
      yearKeys.forEach((yr) => {
        const yData = updatedInputs.yearData?.[yr];
        if (!yData) return;

        // Theory courses
        if (yData.subjects) {
          yData.subjects.forEach((s) => {
            if (s.faculty && s.faculty.trim().toUpperCase() === cleanOldCode) {
              s.faculty = cleanNewCode;
            }
          });
        }

        // Lab courses
        if (yData.labCourses) {
          yData.labCourses.forEach((lc) => {
            if (lc.faculty && lc.faculty.trim().toUpperCase() === cleanOldCode) {
              lc.faculty = cleanNewCode;
            }
            if (Array.isArray(lc.faculties)) {
              lc.faculties = lc.faculties.map((f) => (f.trim().toUpperCase() === cleanOldCode ? cleanNewCode : f));
            }
            if (lc.batchFacultyMap) {
              Object.keys(lc.batchFacultyMap).forEach((b) => {
                if (lc.batchFacultyMap[b] && lc.batchFacultyMap[b].trim().toUpperCase() === cleanOldCode) {
                  lc.batchFacultyMap[b] = cleanNewCode;
                }
              });
            }
          });
        }

        // Practicals
        if (yData.practicals) {
          yData.practicals.forEach((pr) => {
            if (pr.faculty && pr.faculty.trim().toUpperCase() === cleanOldCode) {
              pr.faculty = cleanNewCode;
            }
          });
        }

        // Fixed slots
        if (yData.fixedSlots) {
          yData.fixedSlots.forEach((fs) => {
            if (fs.facultyName && fs.facultyName.trim().toUpperCase() === cleanOldCode) {
              fs.facultyName = cleanNewCode;
            }
          });
        }
      });

      // Faculty Unavailability
      if (updatedInputs.facultyUnavailability) {
        updatedInputs.facultyUnavailability.forEach((un) => {
          if (un.facultyCode && un.facultyCode.trim().toUpperCase() === cleanOldCode) {
            un.facultyCode = cleanNewCode;
          }
          if (un.faculty?.name && un.faculty.name.trim().toUpperCase() === cleanOldCode) {
            un.faculty.name = cleanNewCode;
          }
        });
      }

      // External loads
      if (updatedInputs.externalLoads) {
        updatedInputs.externalLoads.forEach((ext) => {
          if (ext.facultyCode && ext.facultyCode.trim().toUpperCase() === cleanOldCode) {
            ext.facultyCode = cleanNewCode;
          }
        });
      }

      // 3. Update masterData schedules if generated
      if (masterData && masterData.schedules) {
        const updatedMaster = JSON.parse(JSON.stringify(masterData));
        yearKeys.forEach((yr) => {
          const classList = updatedMaster.schedules?.[yr];
          if (!classList) return;
          classList.forEach((cell) => {
            if (cell.faculty) {
              const parts = cell.faculty.split(/([/,\s]+)/);
              cell.faculty = parts
                .map((p) => (p.trim().toUpperCase() === cleanOldCode ? cleanNewCode : p))
                .join("");
            }
            if (cell.subEntries && cell.subEntries.length > 0) {
              cell.subEntries.forEach((sub) => {
                if (sub.faculty) {
                  const subParts = sub.faculty.split(/([/,\s]+)/);
                  sub.faculty = subParts
                    .map((p) => (p.trim().toUpperCase() === cleanOldCode ? cleanNewCode : p))
                    .join("");
                }
              });
              const allFacs = Array.from(new Set(cell.subEntries.map((s) => s.faculty).filter(Boolean)));
              cell.faculty = allFacs.join(", ");
            }
          });
        });

        // External loads in masterData
        if (updatedMaster.externalLoads) {
          const extMap = toExternalLoadsMap(updatedMaster.externalLoads);
          Object.keys(extMap).forEach((key) => {
            if (Array.isArray(extMap[key])) {
              extMap[key].forEach((item) => {
                if (item.facultyCode && item.facultyCode.trim().toUpperCase() === cleanOldCode) {
                  item.facultyCode = cleanNewCode;
                }
              });
            }
          });
          updatedMaster.externalLoads = extMap;
        }

        setMasterData(updatedMaster);
        localStorage.setItem("masterTimetableData", JSON.stringify(updatedMaster));
      }

      // If selectedFaculty in Faculty view was oldCode, update it
      if (selectedFaculty && selectedFaculty.trim().toUpperCase() === cleanOldCode) {
        setSelectedFaculty(cleanNewCode);
      }
    }

    setInputs(updatedInputs);
    localStorage.setItem("customMasterPayload", JSON.stringify(updatedInputs));

    setEditingFacultyModal({
      isOpen: false,
      originalCode: "",
      name: "",
      fullName: "",
      designation: "Assistant Professor",
      centralAuthority: "None",
      maxDailyLectures: 4
    });

    setReassignFeedback({
      type: "success",
      text: `✓ Faculty details for "${cleanNewCode}" updated successfully!`
    });
  };

  // 1-Click Reassign & Replace Faculty Across Entire Timetable
  const handleReplaceFaculty = (sourceCode, targetCode, shouldDeleteSource = false) => {
    if (!sourceCode || !targetCode) {
      setReassignFeedback({ type: "error", text: "Please select both source and replacement faculty." });
      return;
    }
    if (sourceCode === targetCode) {
      setReassignFeedback({ type: "error", text: "Source and replacement faculty cannot be the same." });
      return;
    }

    const sNorm = sourceCode.trim().toUpperCase();
    const tNorm = targetCode.trim().toUpperCase();
    const targetFacultyObj = inputs.faculties.find((f) => f.name.toUpperCase() === tNorm);
    const targetDisplayName = targetFacultyObj ? targetFacultyObj.name : tNorm;

    let theoryTransferred = 0;
    let labTransferred = 0;
    let practicalsTransferred = 0;
    let fixedTransferred = 0;
    let externalTransferred = 0;

    const newYearData = JSON.parse(JSON.stringify(inputs.yearData || {}));

    ["SY", "TY", "BTECH"].forEach((yr) => {
      if (!newYearData[yr]) return;

      if (newYearData[yr].subjects) {
        newYearData[yr].subjects = newYearData[yr].subjects.map((sub) => {
          if ((sub.faculty?.name || "").trim().toUpperCase() === sNorm) {
            theoryTransferred++;
            return {
              ...sub,
              faculty: {
                id: targetFacultyObj ? targetFacultyObj.id : Date.now(),
                name: targetDisplayName
              }
            };
          }
          return sub;
        });
      }

      if (newYearData[yr].labCourses) {
        newYearData[yr].labCourses = newYearData[yr].labCourses.map((lc) => {
          let modified = false;
          let newFac = lc.faculty;
          let newFaculties = Array.isArray(lc.faculties) ? [...lc.faculties] : [];
          let newBatchMap = lc.batchFacultyMap ? { ...lc.batchFacultyMap } : {};

          if ((lc.faculty || "").trim().toUpperCase() === sNorm) {
            newFac = targetDisplayName;
            modified = true;
          }
          if (newFaculties.some((f) => (f || "").trim().toUpperCase() === sNorm)) {
            newFaculties = newFaculties.map((f) => (f || "").trim().toUpperCase() === sNorm ? targetDisplayName : f);
            modified = true;
          }
          if (lc.batchFacultyMap) {
            Object.keys(newBatchMap).forEach((b) => {
              if ((newBatchMap[b] || "").trim().toUpperCase() === sNorm) {
                newBatchMap[b] = targetDisplayName;
                modified = true;
              }
            });
          }
          if (modified) {
            labTransferred++;
            return {
              ...lc,
              faculty: newFac,
              faculties: newFaculties,
              batchFacultyMap: newBatchMap
            };
          }
          return lc;
        });
      }

      if (newYearData[yr].practicals) {
        newYearData[yr].practicals = newYearData[yr].practicals.map((pr) => {
          if ((pr.faculty || "").trim().toUpperCase() === sNorm) {
            practicalsTransferred++;
            return { ...pr, faculty: targetDisplayName };
          }
          return pr;
        });
      }

      if (newYearData[yr].fixedSlots) {
        newYearData[yr].fixedSlots = newYearData[yr].fixedSlots.map((fs) => {
          if (fs.facultyName) {
            const regex = new RegExp(`\\b${sNorm}\\b`, "gi");
            if (regex.test(fs.facultyName)) {
              fixedTransferred++;
              return {
                ...fs,
                facultyName: fs.facultyName.replace(regex, targetDisplayName)
              };
            }
          }
          return fs;
        });
      }
    });

    const newExternalLoads = (inputs.externalLoads || []).map((ext) => {
      if ((ext.facultyCode || "").trim().toUpperCase() === sNorm) {
        externalTransferred++;
        return {
          ...ext,
          facultyCode: targetDisplayName,
          description: (ext.description || "").replace(new RegExp(`\\b${sNorm}\\b`, "gi"), targetDisplayName)
        };
      }
      return ext;
    });

    let newFaculties = [...inputs.faculties];
    if (shouldDeleteSource) {
      newFaculties = newFaculties.filter((f) => f.name.toUpperCase() !== sNorm);
    }

    const updatedInputs = {
      ...inputs,
      faculties: newFaculties,
      yearData: newYearData,
      externalLoads: newExternalLoads
    };

    setInputs(updatedInputs);
    localStorage.setItem("customMasterPayload", JSON.stringify(updatedInputs));
    handleGenerate(updatedInputs);

    const totalMoved = theoryTransferred + labTransferred + practicalsTransferred + fixedTransferred + externalTransferred;
    const msg = `Successfully transferred ${totalMoved} assignment(s) (${theoryTransferred} theory, ${labTransferred + practicalsTransferred} lab, ${fixedTransferred} fixed, ${externalTransferred} FY load) from ${sNorm} to ${tNorm}! Timetable re-generated with 0 conflicts.`;
    setReassignFeedback({ type: "success", text: msg });
    setReassignSource("");
    setReassignTarget("");
  };

  // Safe Faculty Deletion Request Handler
  const handleRequestDeleteFaculty = (facultyName) => {
    const assignments = getFacultyAssignments(facultyName);
    if (assignments.totalActiveCount > 0) {
      setFacultyToDelete(facultyName);
      setDeleteReplacement("");
      setDeleteModalOpen(true);
    } else {
      if (window.confirm(`Are you sure you want to delete ${facultyName}? This faculty has 0 active teaching hours assigned.`)) {
        const updated = {
          ...inputs,
          faculties: inputs.faculties.filter((f) => f.name !== facultyName)
        };
        setInputs(updated);
        localStorage.setItem("customMasterPayload", JSON.stringify(updated));
        handleGenerate(updated);
      }
    }
  };

  const handleDeleteFaculty = (name) => {
    handleRequestDeleteFaculty(name);
  };

  // Add Room handler
  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const name = newRoomName.trim().toUpperCase();
    if (inputs.rooms.some((r) => r.name === name)) {
      alert("Room already exists!");
      return;
    }
    const updated = {
      ...inputs,
      rooms: [...inputs.rooms, { id: Date.now(), name, type: newRoomType }]
    };
    setInputs(updated);
    setNewRoomName("");
  };

  const handleDeleteRoom = (name) => {
    const updated = {
      ...inputs,
      rooms: inputs.rooms.filter((r) => r.name !== name)
    };
    setInputs(updated);
  };

  // Add Subject handler for SY, TY, or BTECH
  const handleAddSubject = (yearKey, e) => {
    e.preventDefault();
    if (!newSubCode.trim() || !newSubFaculty) {
      alert("Please enter subject code and select faculty.");
      return;
    }
    const code = newSubCode.trim().toUpperCase();
    const currentSubjects = inputs.yearData[yearKey]?.subjects || [];
    if (currentSubjects.some((s) => s.code === code)) {
      alert(`Subject ${code} already exists for ${yearKey}!`);
      return;
    }

    const newSub = {
      id: Date.now(),
      code,
      name: newSubName.trim() || code,
      type: "THEORY",
      weeklyPeriods: Number(newSubPeriods) || 3,
      faculty: { id: Date.now(), name: newSubFaculty }
    };

    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [yearKey]: {
          ...inputs.yearData[yearKey],
          subjects: [...currentSubjects, newSub]
        }
      }
    };
    setInputs(updated);
    setNewSubCode("");
    setNewSubName("");
  };

  const handleDeleteSubject = (yearKey, code) => {
    const currentSubjects = inputs.yearData[yearKey]?.subjects || [];
    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [yearKey]: {
          ...inputs.yearData[yearKey],
          subjects: currentSubjects.filter((s) => s.code !== code)
        }
      }
    };
    setInputs(updated);
  };

  const handleUpdateSubject = (yearKey, index, field, value) => {
    const currentSubjects = [...(inputs.yearData[yearKey]?.subjects || [])];
    if (!currentSubjects[index]) return;

    const current = { ...currentSubjects[index] };
    if (field === "faculty") {
      const facultyObj = value ? (inputs.faculties.find((f) => f.name === value) || { name: value }) : null;
      current.faculty = facultyObj;
    } else if (field === "weeklyPeriods") {
      current.weeklyPeriods = Math.max(1, parseInt(value, 10) || 1);
    } else if (field === "code") {
      current.code = value.trim().toUpperCase();
    } else {
      current[field] = value;
    }
    currentSubjects[index] = current;

    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [yearKey]: {
          ...inputs.yearData[yearKey],
          subjects: currentSubjects
        }
      }
    };
    setInputs(updated);
    localStorage.setItem("customMasterPayload", JSON.stringify(updated));
  };

  const handleDeleteSubjectByIndex = (yearKey, index) => {
    const currentSubjects = inputs.yearData[yearKey]?.subjects || [];
    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [yearKey]: {
          ...inputs.yearData[yearKey],
          subjects: currentSubjects.filter((_, idx) => idx !== index)
        }
      }
    };
    setInputs(updated);
  };

  // Lab Course handlers
  const handleAddLabFaculty = (facName) => {
    if (!facName) return;
    if (newLabFaculties.includes(facName)) return;
    const next = [...newLabFaculties, facName];
    setNewLabFaculties(next);
    // Auto-balance batches across next faculties
    const currentBatches = (inputs.yearData[labCourseYear]?.batches && inputs.yearData[labCourseYear].batches.length > 0)
      ? inputs.yearData[labCourseYear].batches.map((b) => b.name)
      : ["I1", "I2", "I3", "I4"];
    const nextMap = { ...newLabBatchMap };
    currentBatches.forEach((batch, idx) => {
      nextMap[batch] = next[idx % next.length];
    });
    setNewLabBatchMap(nextMap);
    setNewLabFaculty("");
  };

  const handleRemoveLabFaculty = (facName) => {
    const next = newLabFaculties.filter((f) => f !== facName);
    setNewLabFaculties(next);
    const currentBatches = (inputs.yearData[labCourseYear]?.batches && inputs.yearData[labCourseYear].batches.length > 0)
      ? inputs.yearData[labCourseYear].batches.map((b) => b.name)
      : ["I1", "I2", "I3", "I4"];
    const nextMap = { ...newLabBatchMap };
    currentBatches.forEach((batch, idx) => {
      if (nextMap[batch] === facName || !next.includes(nextMap[batch])) {
        nextMap[batch] = next.length > 0 ? next[idx % next.length] : "";
      }
    });
    setNewLabBatchMap(nextMap);
  };

  const handleBatchFacultyChange = (batch, facName) => {
    setNewLabBatchMap((prev) => ({
      ...prev,
      [batch]: facName
    }));
  };

  const handleAddLabCourse = (e) => {
    e.preventDefault();
    const effectiveFaculties = newLabFaculties.length > 0 ? newLabFaculties : (newLabFaculty ? [newLabFaculty] : []);
    if (!newLabCode.trim() || effectiveFaculties.length === 0) {
      alert("Please enter Lab Subject Code and select at least one assigned teacher.");
      return;
    }
    const code = newLabCode.trim().toUpperCase();
    const currentLabCourses = inputs.yearData[labCourseYear]?.labCourses || [];
    if (currentLabCourses.some((c) => c.code === code)) {
      alert(`Lab course ${code} already exists for ${labCourseYear}!`);
      return;
    }

    const currentBatches = (inputs.yearData[labCourseYear]?.batches && inputs.yearData[labCourseYear].batches.length > 0)
      ? inputs.yearData[labCourseYear].batches.map((b) => b.name)
      : ["I1", "I2", "I3", "I4"];
    const finalBatchMap = {};
    currentBatches.forEach((batch, idx) => {
      finalBatchMap[batch] = newLabBatchMap[batch] || effectiveFaculties[idx % effectiveFaculties.length];
    });

    const newCourse = {
      code,
      name: newLabName.trim() || `${code} Lab`,
      faculty: effectiveFaculties[0],
      faculties: effectiveFaculties,
      batchFacultyMap: finalBatchMap,
      preferredRoom: newLabRoom
    };
    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [labCourseYear]: {
          ...inputs.yearData[labCourseYear],
          labCourses: [...currentLabCourses, newCourse]
        }
      }
    };
    setInputs(updated);
    setNewLabCode("");
    setNewLabName("");
    setNewLabFaculty("");
    setNewLabFaculties([]);
    setNewLabBatchMap({ I1: "", I2: "", I3: "", I4: "" });
  };

  const handleDeleteLabCourse = (yearKey, index) => {
    const currentLabCourses = inputs.yearData[yearKey]?.labCourses || [];
    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [yearKey]: {
          ...inputs.yearData[yearKey],
          labCourses: currentLabCourses.filter((_, idx) => idx !== index)
        }
      }
    };
    setInputs(updated);
  };

  const handleStartEditLabCourse = (yearKey, index) => {
    const course = inputs.yearData[yearKey]?.labCourses?.[index];
    if (!course) return;
    const currentBatches = (inputs.yearData[yearKey]?.batches && inputs.yearData[yearKey].batches.length > 0)
      ? inputs.yearData[yearKey].batches.map((b) => b.name)
      : ["I1", "I2", "I3", "I4"];

    const initialFaculties = Array.isArray(course.faculties) && course.faculties.length > 0
      ? [...course.faculties]
      : (course.faculty ? [course.faculty] : []);

    const initialBatchMap = course.batchFacultyMap ? { ...course.batchFacultyMap } : {};
    currentBatches.forEach((batch, idx) => {
      if (!initialBatchMap[batch] && initialFaculties.length > 0) {
        initialBatchMap[batch] = initialFaculties[idx % initialFaculties.length];
      }
    });

    setEditingLabCourse({
      yearKey,
      index,
      code: course.code,
      name: course.name || `${course.code} Lab`,
      faculties: initialFaculties,
      batchFacultyMap: initialBatchMap,
      preferredRoom: course.preferredRoom || "IL1"
    });
  };

  const handleSaveEditedLabCourse = (e) => {
    e.preventDefault();
    if (!editingLabCourse) return;
    const { yearKey, index, code, name, faculties, batchFacultyMap, preferredRoom } = editingLabCourse;
    if (faculties.length === 0) {
      alert("Please select at least one teacher for this lab course.");
      return;
    }

    const currentLabCourses = inputs.yearData[yearKey]?.labCourses || [];
    const currentBatches = (inputs.yearData[yearKey]?.batches && inputs.yearData[yearKey].batches.length > 0)
      ? inputs.yearData[yearKey].batches.map((b) => b.name)
      : ["I1", "I2", "I3", "I4"];

    const finalBatchMap = {};
    currentBatches.forEach((batch, idx) => {
      finalBatchMap[batch] = batchFacultyMap[batch] || faculties[idx % faculties.length];
    });

    const updatedCourse = {
      code,
      name,
      faculty: faculties[0],
      faculties,
      batchFacultyMap: finalBatchMap,
      preferredRoom
    };

    const nextLabCourses = currentLabCourses.map((lc, i) => (i === index ? updatedCourse : lc));

    // Synchronize active practicals in this year matching this course
    const currentPracticals = inputs.yearData[yearKey]?.practicals || [];
    const nextPracticals = currentPracticals.map((pr) => {
      if (pr.practical === code && finalBatchMap[pr.batch]) {
        return {
          ...pr,
          faculty: finalBatchMap[pr.batch]
        };
      }
      return pr;
    });

    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [yearKey]: {
          ...inputs.yearData[yearKey],
          labCourses: nextLabCourses,
          practicals: nextPracticals
        }
      }
    };

    setInputs(updated);
    localStorage.setItem("customMasterPayload", JSON.stringify(updated));
    setEditingLabCourse(null);
  };

  const autoGenerate4BatchPracticals = (yearKey) => {
    const currentYearData = inputs.yearData[yearKey] || {};
    const labCourses = currentYearData.labCourses || [];
    if (labCourses.length === 0) {
      alert(`Please configure at least 1 Lab Subject for ${yearKey} first!`);
      return;
    }

    const batchNames = (currentYearData.batches && currentYearData.batches.length > 0)
      ? currentYearData.batches.map((b) => b.name)
      : ["I1", "I2", "I3", "I4"];

    const candidateBlocks = [
      { name: "P1-P2", p1: 1, p2: 2 },
      { name: "P3-P4", p1: 3, p2: 4 },
      { name: "P5-P6", p1: 5, p2: 6 }
    ];
    const availableDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    const labRooms = inputs.rooms.filter((r) => r.type === "LAB").map((r) => r.name);
    const defaultLabRooms = labRooms.length > 0 ? labRooms : ["IL1", "IL2", "IL3", "IL4", "IL5", "IL6"];

    const numCourses = labCourses.length;
    const numBatches = batchNames.length;
    const generated = [];

    const fixedSlots = currentYearData.fixedSlots || [];
    const isSlotBlockedByFixed = (day, p) => {
      return fixedSlots.some(
        (fs) => fs.day?.toUpperCase() === day.toUpperCase() && Number(fs.period) === Number(p)
      );
    };

    // Helper to check if a teacher is occupied elsewhere in this time slot
    const isTeacherOccupiedElsewhere = (teacher, day, p1, p2) => {
      if (!teacher) return false;
      const tNorm = teacher.trim().toUpperCase();
      // 1. Check external loads (supporting 2-hour and 1-hour slots)
      const extMatch = (inputs.externalLoads || []).some(
        (ext) => (ext.facultyCode || "").trim().toUpperCase() === tNorm &&
          ext.day?.toUpperCase() === day.toUpperCase() &&
          getExternalLoadPeriods(ext).some((p) => p === p1 || p === p2)
      );
      if (extMatch) return true;
      // 2. Check fixed slots across all classes
      for (const yr of ["SY", "TY", "BTECH"]) {
        const yrFixed = inputs.yearData?.[yr]?.fixedSlots || [];
        const match = yrFixed.some((fs) => {
          if (fs.day?.toUpperCase() !== day.toUpperCase()) return false;
          if (Number(fs.period) !== p1 && Number(fs.period) !== p2) return false;
          const facs = (fs.facultyName || "").split(/[/,\s]+/).map((f) => f.trim().toUpperCase());
          return facs.includes(tNorm);
        });
        if (match) return true;
      }
      return false;
    };

    const allFacultyNames = (inputs.faculties || []).map((f) => f.name);
    const usedDays = new Set();
    const clashSubstitutions = [];

    // For each lab course cIdx, find a distinct day with an available 2-hour block (4 courses -> 4 days, 2 courses -> 2 days)
    for (let cIdx = 0; cIdx < numCourses; cIdx++) {
      let assignedDay = null;
      let assignedBlock = null;

      for (const day of availableDays) {
        if (usedDays.has(day)) continue;

        for (const blk of candidateBlocks) {
          if (!isSlotBlockedByFixed(day, blk.p1) && !isSlotBlockedByFixed(day, blk.p2)) {
            assignedDay = day;
            assignedBlock = blk;
            break;
          }
        }
        if (assignedDay) break;
      }

      // Fallback: search any remaining day first with a free 2-hour block
      if (!assignedDay) {
        for (const day of availableDays) {
          if (usedDays.size < availableDays.length && usedDays.has(day)) continue;
          for (const blk of candidateBlocks) {
            if (!isSlotBlockedByFixed(day, blk.p1) && !isSlotBlockedByFixed(day, blk.p2)) {
              assignedDay = day;
              assignedBlock = blk;
              break;
            }
          }
          if (assignedDay) break;
        }
      }

      if (!assignedDay || !assignedBlock) {
        assignedDay = availableDays[cIdx % availableDays.length];
        assignedBlock = candidateBlocks[cIdx % candidateBlocks.length];
      }

      usedDays.add(assignedDay);

      // Track teachers and rooms assigned to batches in this specific session
      const sessionAssignedTeachers = [];
      const sessionAssignedRooms = [];

      for (let bIdx = 0; bIdx < numBatches; bIdx++) {
        const batch = batchNames[bIdx];
        // Latin Square permutation: each batch gets every subject exactly once across the week!
        const sIdx = (bIdx + cIdx) % numCourses;
        const course = labCourses[sIdx];

        // 1. Resolve Faculty with zero collision guarantee
        let faculty = course.batchFacultyMap?.[batch] ||
          (Array.isArray(course.faculties) && course.faculties.length > 0 ? course.faculties[bIdx % course.faculties.length] : course.faculty) || "";

        const fNorm = faculty.trim().toUpperCase();
        const hasSessionClash = fNorm && sessionAssignedTeachers.map((t) => t.trim().toUpperCase()).includes(fNorm);
        const hasExternalClash = fNorm && isTeacherOccupiedElsewhere(faculty, assignedDay, assignedBlock.p1, assignedBlock.p2);

        if (hasSessionClash || hasExternalClash) {
          // Hard constraint: a teacher cannot teach two batches at once or teach while busy elsewhere!
          // Auto-substitute with an available non-conflicting teacher
          let candidate = (course.faculties || []).find((f) => {
            const cNorm = f.trim().toUpperCase();
            return !sessionAssignedTeachers.map((t) => t.trim().toUpperCase()).includes(cNorm) &&
              !isTeacherOccupiedElsewhere(f, assignedDay, assignedBlock.p1, assignedBlock.p2);
          });
          if (!candidate) {
            candidate = allFacultyNames.find((f) => {
              const cNorm = f.trim().toUpperCase();
              return !sessionAssignedTeachers.map((t) => t.trim().toUpperCase()).includes(cNorm) &&
                !isTeacherOccupiedElsewhere(f, assignedDay, assignedBlock.p1, assignedBlock.p2);
            });
          }
          if (candidate) {
            clashSubstitutions.push({
              day: assignedDay,
              period: assignedBlock.name,
              batch,
              course: course.code,
              original: faculty,
              substituted: candidate
            });
            faculty = candidate;
          }
        }
        if (faculty) sessionAssignedTeachers.push(faculty);

        // 2. Resolve Room with zero collision guarantee
        let room = course.batchRoomMap?.[batch] || course.preferredRoom || defaultLabRooms[bIdx % defaultLabRooms.length];
        const rNorm = (room || "").trim().toUpperCase();
        if (!room || sessionAssignedRooms.map((r) => r.trim().toUpperCase()).includes(rNorm)) {
          // Pick next available lab room
          const freeRoom = defaultLabRooms.find(
            (dr) => !sessionAssignedRooms.map((r) => r.trim().toUpperCase()).includes(dr.trim().toUpperCase())
          );
          if (freeRoom) room = freeRoom;
        }
        if (room) sessionAssignedRooms.push(room);

        generated.push({
          day: assignedDay,
          period: assignedBlock.name,
          batch,
          practical: course.code,
          faculty,
          room
        });
      }
    }

    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [yearKey]: {
          ...inputs.yearData[yearKey],
          practicals: generated
        }
      }
    };
    setInputs(updated);
    localStorage.setItem("customMasterPayload", JSON.stringify(updated));
    handleGenerate(updated, true);
  };

  // Add Practical handler
  const handleAddPractical = (e) => {
    e.preventDefault();
    if (!newPracBatch.trim() || !newPracSubject.trim() || !newPracFaculty) {
      alert("Please enter batch, practical subject, and select faculty.");
      return;
    }
    const practicalObj = {
      day: newPracDay,
      period: newPracPeriod,
      batch: newPracBatch.trim().toUpperCase(),
      practical: newPracSubject.trim().toUpperCase(),
      faculty: newPracFaculty,
      room: newPracRoom
    };
    const currentList = inputs.yearData[newPracYear]?.practicals || [];
    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [newPracYear]: {
          ...inputs.yearData[newPracYear],
          practicals: [...currentList, practicalObj]
        }
      }
    };
    setInputs(updated);
    setNewPracSubject("");
  };

  const handleDeletePractical = (yearKey, index) => {
    const currentList = inputs.yearData[yearKey]?.practicals || [];
    const updatedList = currentList.filter((_, idx) => idx !== index);
    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [yearKey]: {
          ...inputs.yearData[yearKey],
          practicals: updatedList
        }
      }
    };
    setInputs(updated);
  };

  // Add Fixed Slot handler
  const handleAddFixedSlot = (e) => {
    e.preventDefault();
    if (!newFixedCourse.trim()) {
      alert("Please enter course/slot name (e.g. MDM, Mentoring, OE).");
      return;
    }
    const fixedObj = {
      day: newFixedDay,
      period: Number(newFixedPeriod),
      courseName: newFixedCourse.trim(),
      facultyName: newFixedFaculty.trim(),
      room: newFixedRoom.trim()
    };
    const currentSlots = inputs.yearData[newFixedYear]?.fixedSlots || [];
    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [newFixedYear]: {
          ...inputs.yearData[newFixedYear],
          fixedSlots: [...currentSlots, fixedObj]
        }
      }
    };
    setInputs(updated);
    setNewFixedCourse("");
    setNewFixedFaculty("");
    setNewFixedRoom("");
  };

  const handleDeleteFixedSlot = (yearKey, index) => {
    const currentSlots = inputs.yearData[yearKey]?.fixedSlots || [];
    const updatedSlots = currentSlots.filter((_, idx) => idx !== index);
    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [yearKey]: {
          ...inputs.yearData[yearKey],
          fixedSlots: updatedSlots
        }
      }
    };
    setInputs(updated);
  };

  const handleUpdateFixedSlot = (yearKey, index, field, value) => {
    const currentSlots = [...(inputs.yearData[yearKey]?.fixedSlots || [])];
    if (!currentSlots[index]) return;

    const updatedSlot = {
      ...currentSlots[index],
      [field]: field === "period" ? Number(value) : value
    };
    currentSlots[index] = updatedSlot;

    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [yearKey]: {
          ...inputs.yearData[yearKey],
          fixedSlots: currentSlots
        }
      }
    };
    setInputs(updated);
  };

  const getFixedSlotClashInfo = (fs, yearKey, currentIdx) => {
    if (!fs || !fs.day || !fs.period) return null;
    const pNum = Number(fs.period);
    const day = fs.day.toUpperCase();

    // 1. Check external FY load clash (same day, period, and teacher)
    if (fs.facultyName && inputs.externalLoads) {
      const faculties = fs.facultyName.split(/[/,\s]+/).map((f) => f.trim().toUpperCase()).filter(Boolean);
      for (const ext of inputs.externalLoads) {
        if (ext.day?.toUpperCase() === day && Number(ext.period) === pNum) {
          if (faculties.includes(ext.facultyCode?.toUpperCase())) {
            return {
              type: "FY_CLASH",
              text: `⚠️ FY Clash: ${ext.facultyCode} is busy teaching ${ext.type || ext.description || "FY"}`,
              isError: false
            };
          }
        }
      }
    }

    // 2. Check duplicate fixed slot in SAME class on same day & period
    const sameYearSlots = inputs.yearData[yearKey]?.fixedSlots || [];
    const duplicateSlot = sameYearSlots.find(
      (s, idx) => idx !== currentIdx && s.day?.toUpperCase() === day && Number(s.period) === pNum
    );
    if (duplicateSlot) {
      return {
        type: "DUP_SLOT",
        text: `❌ Duplicate: ${duplicateSlot.courseName} already placed on ${day} P${pNum}`,
        isError: true
      };
    }

    // 3. Check cross-class clash (same teacher or same classroom at same time in other classes)
    for (const yr of ["SY", "TY", "BTECH"]) {
      if (yr === yearKey) continue;
      const otherSlots = inputs.yearData[yr]?.fixedSlots || [];
      const clash = otherSlots.find(
        (s) => s.day?.toUpperCase() === day && Number(s.period) === pNum
      );
      if (clash) {
        if (fs.facultyName && clash.facultyName) {
          const f1 = fs.facultyName.split(/[/,\s]+/).map((f) => f.trim().toUpperCase()).filter(Boolean);
          const f2 = clash.facultyName.split(/[/,\s]+/).map((f) => f.trim().toUpperCase()).filter(Boolean);
          const common = f1.filter((f) => f2.includes(f));
          if (common.length > 0) {
            return {
              type: "FAC_CLASH",
              text: `⚠️ Teacher Clash with ${yr}: ${common.join(", ")} is in ${clash.courseName}`,
              isError: false
            };
          }
        }
        if (fs.room && clash.room && fs.room.trim().toUpperCase() === clash.room.trim().toUpperCase()) {
          return {
            type: "ROOM_CLASH",
            text: `⚠️ Room Clash with ${yr}: ${fs.room} is booked for ${clash.courseName}`,
            isError: false
          };
        }
      }
    }

    return { type: "OK", text: "✅ Open Slot", isError: false };
  };

  // Add External University FY Load handler
  const handleAddExternalLoad = (e) => {
    e.preventDefault();
    if (!newExtFaculty) {
      alert("Please select faculty code.");
      return;
    }
    let pList = [1];
    if (newExtPeriod === "P1-P2") pList = [1, 2];
    else if (newExtPeriod === "P3-P4") pList = [3, 4];
    else if (newExtPeriod === "P5-P6") pList = [5, 6];
    else pList = [Number(newExtPeriod) || 1];

    const extObj = {
      loadType: newExtType,
      facultyCode: newExtFaculty,
      day: newExtDay,
      period: pList[0],
      period2: pList[1] || null,
      periods: pList,
      slotKey: String(newExtPeriod),
      hours: pList.length,
      description: newExtDesc.trim() || `${newExtFaculty}-${newExtType}`
    };
    const currentLoads = inputs.externalLoads || [];
    const updated = {
      ...inputs,
      externalLoads: [...currentLoads, extObj]
    };
    setInputs(updated);
    setNewExtDesc("");
  };

  const handleDeleteExternalLoad = (index) => {
    const currentLoads = inputs.externalLoads || [];
    const updatedLoads = currentLoads.filter((_, idx) => idx !== index);
    const updated = {
      ...inputs,
      externalLoads: updatedLoads
    };
    setInputs(updated);
  };

  // Add Faculty Unavailability / Leave handler
  const handleAddUnavailability = (e) => {
    e.preventDefault();
    const fac = newUnavailFaculty || inputs.faculties?.[0]?.name;
    if (!fac) {
      alert("Please select a faculty member.");
      return;
    }

    const list = inputs.facultyUnavailability || [];
    const exists = list.some(
      (u) => (u.faculty?.name === fac || u.facultyCode === fac) && u.day === newUnavailDay && u.period === Number(newUnavailPeriod)
    );
    if (exists) {
      alert(`Prof. ${fac} already has an off-slot locked on ${newUnavailDay} P${newUnavailPeriod}.`);
      return;
    }

    const newItem = {
      faculty: { name: fac },
      facultyCode: fac,
      day: newUnavailDay,
      period: Number(newUnavailPeriod),
      reason: newUnavailReason.trim() || "Faculty Off-Slot / Leave"
    };

    const nextInputs = {
      ...inputs,
      facultyUnavailability: [...list, newItem]
    };
    setInputs(nextInputs);
    localStorage.setItem("customMasterPayload", JSON.stringify(nextInputs));
    setNewUnavailReason("");
  };

  const handleDeleteUnavailability = (index) => {
    const list = inputs.facultyUnavailability || [];
    const updated = list.filter((_, i) => i !== index);
    const nextInputs = {
      ...inputs,
      facultyUnavailability: updated
    };
    setInputs(nextInputs);
    localStorage.setItem("customMasterPayload", JSON.stringify(nextInputs));
  };

  // Update default classroom for a year
  const handleUpdateDefaultRoom = (yearKey, roomName) => {
    const updated = {
      ...inputs,
      yearData: {
        ...inputs.yearData,
        [yearKey]: {
          ...inputs.yearData[yearKey],
          defaultRoom: roomName
        }
      }
    };
    setInputs(updated);
  };

  // JSON Export & Import
  const handleExportJson = () => {
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inputs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonStr);
    downloadAnchor.setAttribute("download", "department_timetable_config.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.yearData || !parsed.faculties || !parsed.rooms) {
          alert("Invalid configuration file format. Missing required fields.");
          return;
        }
        setInputs(parsed);
        handleGenerate(parsed);
        alert("Configuration imported and timetable re-generated successfully!");
      } catch (err) {
        alert("Failed to parse JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // =========================================================================
  // SAVE SYSTEM (PERSIST ALL DEPARTMENT DATA & TIMETABLES)
  // =========================================================================
  const handleSaveAllData = (silent = false) => {
    try {
      const now = new Date();
      const formattedDate = now.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      // 1. Save all department inputs (faculties, rooms, yearData for SY, TY, BTECH, fixed slots, FY external loads, unavailabilities)
      localStorage.setItem("customMasterPayload", JSON.stringify(inputs));

      // 2. Save master generated timetable if available
      if (masterData) {
        localStorage.setItem("masterTimetableData", JSON.stringify(masterData));
      }

      // 3. Save period swap history and adjustment flags
      localStorage.setItem("timetableSwapHistory", JSON.stringify(swapHistory || []));
      localStorage.setItem("timetableHasManualAdjustments", hasManualAdjustments ? "true" : "false");

      // 4. Save timestamp
      localStorage.setItem("rit_last_saved_time", formattedDate);
      setLastSavedTime(formattedDate);

      // 5. Sync to backend database if timetable is generated
      if (masterData) {
        try {
          saveMasterTimetable(masterData, `Department Timetable Saved (${formattedDate})`).catch(() => {});
        } catch (e) {}
      }

      setSaveStatusMessage({
        type: "success",
        text: `💾 All department data, faculty allotments, and timetables successfully saved at ${formattedDate}!`
      });
      setTimeout(() => setSaveStatusMessage(null), 6000);

      if (!silent) {
        setSwapAlert({
          type: "success",
          text: `✓ All changes successfully saved! (${formattedDate})`
        });
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save: " + err.message);
    }
  };

  const handleReloadSavedData = () => {
    const savedInputs = localStorage.getItem("customMasterPayload");
    if (!savedInputs) {
      alert("No previously saved data found in your browser.");
      return;
    }
    if (!window.confirm("Reload data from your last saved point?\n\nThis will restore all faculty allotments, courses, rooms, and schedule states from the last saved state.")) {
      return;
    }

    try {
      // 1. Restore inputs
      const parsedInputs = JSON.parse(savedInputs);
      setInputs(parsedInputs);

      // 2. Restore master data
      const savedMaster = localStorage.getItem("masterTimetableData");
      if (savedMaster) {
        const parsedMaster = JSON.parse(savedMaster);
        if (parsedMaster.externalLoads) {
          parsedMaster.externalLoads = toExternalLoadsMap(parsedMaster.externalLoads);
        }
        const { liveDiagnostics, liveConflicts } = computeLiveDiagnostics(
          parsedMaster.schedules,
          parsedMaster.externalLoads,
          parsedInputs.facultyUnavailability
        );
        parsedMaster.diagnostics = liveDiagnostics;
        parsedMaster.conflictLog = liveConflicts;
        setMasterData(parsedMaster);
        setOriginalSchedules(JSON.parse(JSON.stringify(parsedMaster.schedules || {})));
        setConflictLog(liveConflicts);
        setDiagnostics(liveDiagnostics);
      }

      // 3. Restore swaps
      const savedSwaps = localStorage.getItem("timetableSwapHistory");
      if (savedSwaps) {
        setSwapHistory(JSON.parse(savedSwaps));
      }
      const hasAdj = localStorage.getItem("timetableHasManualAdjustments") === "true";
      setHasManualAdjustments(hasAdj);

      const savedTime = localStorage.getItem("rit_last_saved_time");
      if (savedTime) setLastSavedTime(savedTime);

      setSaveStatusMessage({
        type: "success",
        text: `✓ Successfully reloaded all data from last saved point (${savedTime || "Saved State"})!`
      });
      setTimeout(() => setSaveStatusMessage(null), 5000);
      setSwapAlert({
        type: "success",
        text: `✓ Reloaded all data from last saved point!`
      });
    } catch (err) {
      console.error("Reload error:", err);
      alert("Failed to reload saved data: " + err.message);
    }
  };

  // Check if a faculty is busy at a given slot outside of a specified class
  const isFacultyBusyAt = (facultyCode, day, period, excludeYear) => {
    if (!facultyCode || !masterData) return null;
    const cleanF = facultyCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

    // Check other year schedules
    const otherYears = ["SY", "TY", "BTECH"].filter((y) => y !== excludeYear);
    for (const yr of otherYears) {
      const cell = masterData.schedules?.[yr]?.find((c) => c.day === day && c.period === period);
      if (cell) {
        const faculties = extractCellFaculties(cell);
        for (const f of faculties) {
          if (f.replace(/[^A-Z0-9]/g, "") === cleanF) {
            return `${yr} (${cell.course || "Class"})`;
          }
        }
      }
    }

    // Check faculty unavailability / leaves
    if (inputs?.facultyUnavailability && Array.isArray(inputs.facultyUnavailability)) {
      for (const un of inputs.facultyUnavailability) {
        const fCode = un.faculty?.name || un.facultyCode || "";
        if (fCode.toUpperCase().replace(/[^A-Z0-9]/g, "") === cleanF && un.day === day && un.period === period) {
          return `Faculty Leave / Off-Slot (${fCode})`;
        }
      }
    }

    // Check external FY loads
    if (masterData.externalLoads) {
      const extMap = toExternalLoadsMap(masterData.externalLoads);
      for (const [extType, loadList] of Object.entries(extMap)) {
        if (!Array.isArray(loadList)) continue;
        const match = loadList.find((ext) => ext.day === day && ext.period === period);
        if (match && match.facultyCode) {
          if (match.facultyCode.toUpperCase().replace(/[^A-Z0-9]/g, "") === cleanF) {
            return `${extType} (${match.description || "FY Load"})`;
          }
        }
      }
    }

    return null;
  };

  // Check if a room is occupied at a given slot outside of a specified class
  const isRoomOccupiedAt = (roomCode, day, period, excludeYear) => {
    if (!roomCode || !masterData) return null;
    const cleanR = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const otherYears = ["SY", "TY", "BTECH"].filter((y) => y !== excludeYear);
    for (const yr of otherYears) {
      const cell = masterData.schedules?.[yr]?.find((c) => c.day === day && c.period === period);
      if (cell) {
        const rooms = extractCellRooms(cell);
        for (const r of rooms) {
          if (r.replace(/[^A-Z0-9]/g, "") === cleanR) {
            return `${yr} (${cell.course || "Class"})`;
          }
        }
      }
    }
    return null;
  };

  const getCell = (year, day, period) => {
    if (!masterData || !masterData.schedules || !masterData.schedules[year]) {
      return null;
    }
    return masterData.schedules[year].find(
      (c) => c.day === day && c.period === period
    );
  };

  // Get 2-hour period block: [1, 2], [3, 4], or [5, 6]
  const getBlockPeriods = (period) => {
    if (period === 1 || period === 2) return [1, 2];
    if (period === 3 || period === 4) return [3, 4];
    if (period === 5 || period === 6) return [5, 6];
    return [period, period];
  };

  // Check if a slot belongs to a practical 2-hour lab block
  const isPracticalInBlock = (year, day, period) => {
    if (!year || !day || !period) return false;
    const [p1, p2] = getBlockPeriods(period);
    const cell1 = getCell(year, day, p1);
    const cell2 = getCell(year, day, p2);
    return (
      cell1?.cellType === "PRACTICAL" ||
      cell2?.cellType === "PRACTICAL" ||
      (cell1?.subEntries && cell1.subEntries.length > 0) ||
      (cell2?.subEntries && cell2.subEntries.length > 0)
    );
  };

  // Validate swap between source and target
  const validateSwap = (source, target) => {
    if (!source || !target) return { valid: false, reason: "Select a slot to swap" };
    if (source.year !== target.year) {
      return { valid: false, reason: `Can only swap slots within the same class (${source.year})` };
    }

    const isTwoHr = isPracticalInBlock(source.year, source.day, source.period) || 
                    isPracticalInBlock(target.year, target.day, target.period);

    if (isTwoHr) {
      const [s1, s2] = getBlockPeriods(source.period);
      const [t1, t2] = getBlockPeriods(target.period);

      if (source.day === target.day && s1 === t1) {
        return { valid: false, reason: "Same 2-hour block selected" };
      }

      // Check all 4 cell movements:
      // (source.day, s1) -> (target.day, t1)
      // (source.day, s2) -> (target.day, t2)
      // (target.day, t1) -> (source.day, s1)
      // (target.day, t2) -> (source.day, s2)
      const srcCell1 = getCell(source.year, source.day, s1);
      const srcCell2 = getCell(source.year, source.day, s2);
      const tgtCell1 = getCell(target.year, target.day, t1);
      const tgtCell2 = getCell(target.year, target.day, t2);

      const moves = [
        { cell: srcCell1, fromDay: source.day, fromP: s1, toDay: target.day, toP: t1 },
        { cell: srcCell2, fromDay: source.day, fromP: s2, toDay: target.day, toP: t2 },
        { cell: tgtCell1, fromDay: target.day, fromP: t1, toDay: source.day, toP: s1 },
        { cell: tgtCell2, fromDay: target.day, fromP: t2, toDay: source.day, toP: s2 }
      ];

      for (const m of moves) {
        if (!m.cell) continue;
        const facs = extractCellFaculties(m.cell);
        for (const f of facs) {
          const busyWhere = isFacultyBusyAt(f, m.toDay, m.toP, source.year);
          if (busyWhere) {
            return {
              valid: false,
              reason: `Teacher Clash: Prof. ${f} is already teaching in ${busyWhere} on ${m.toDay} P${m.toP}!`
            };
          }
        }
        const rooms = extractCellRooms(m.cell);
        for (const r of rooms) {
          const occWhere = isRoomOccupiedAt(r, m.toDay, m.toP, source.year);
          if (occWhere) {
            return {
              valid: false,
              reason: `Room Clash: ${r} is occupied by ${occWhere} on ${m.toDay} P${m.toP}!`
            };
          }
        }
      }

      // Continuous Teaching check:
      // Build a simulated list for source.year with both periods swapped
      const classSchedule = masterData.schedules?.[source.year] || [];
      const sim = classSchedule.map(c => ({ ...c }));
      const iS1 = sim.findIndex(c => c.day === source.day && c.period === s1);
      const iS2 = sim.findIndex(c => c.day === source.day && c.period === s2);
      const iT1 = sim.findIndex(c => c.day === target.day && c.period === t1);
      const iT2 = sim.findIndex(c => c.day === target.day && c.period === t2);

      if (iS1 !== -1 && iT1 !== -1) {
        const tmpC = sim[iS1].course, tmpF = sim[iS1].faculty, tmpL = sim[iS1].location, tmpT = sim[iS1].cellType, tmpS = sim[iS1].subEntries;
        sim[iS1].course = sim[iT1].course; sim[iS1].faculty = sim[iT1].faculty; sim[iS1].location = sim[iT1].location; sim[iS1].cellType = sim[iT1].cellType; sim[iS1].subEntries = sim[iT1].subEntries;
        sim[iT1].course = tmpC; sim[iT1].faculty = tmpF; sim[iT1].location = tmpL; sim[iT1].cellType = tmpT; sim[iT1].subEntries = tmpS;
      }
      if (iS2 !== -1 && iT2 !== -1) {
        const tmpC = sim[iS2].course, tmpF = sim[iS2].faculty, tmpL = sim[iS2].location, tmpT = sim[iS2].cellType, tmpS = sim[iS2].subEntries;
        sim[iS2].course = sim[iT2].course; sim[iS2].faculty = sim[iT2].faculty; sim[iS2].location = sim[iT2].location; sim[iS2].cellType = sim[iT2].cellType; sim[iS2].subEntries = sim[iT2].subEntries;
        sim[iT2].course = tmpC; sim[iT2].faculty = tmpF; sim[iT2].location = tmpL; sim[iT2].cellType = tmpT; sim[iT2].subEntries = tmpS;
      }

      // Check affected days for continuous theory teaching (excluding across Lunch & Tea breaks)
      const daysToCheck = Array.from(new Set([source.day, target.day]));
      const backToBackPairs = [[1, 2], [3, 4], [5, 6]];
      for (const d of daysToCheck) {
        for (const [pA, pB] of backToBackPairs) {
          const cA = sim.find(c => c.day === d && c.period === pA);
          const cB = sim.find(c => c.day === d && c.period === pB);
          if (cA && cB && cA.cellType !== "PRACTICAL" && cB.cellType !== "PRACTICAL") {
            const facsA = extractCellFaculties(cA).map(x => x.toUpperCase().replace(/[^A-Z0-9]/g, ""));
            const facsB = extractCellFaculties(cB).map(x => x.toUpperCase().replace(/[^A-Z0-9]/g, ""));
            const common = facsA.filter(x => facsB.includes(x));
            if (common.length > 0) {
              return {
                valid: false,
                reason: `Continuous Teaching: Swapping causes Prof. ${common[0]} to teach back-to-back theory lectures in ${source.year} on ${d} (P${pA} & P${pB})!`
              };
            }
          }
        }
      }

      const isSrcPrac = isPracticalInBlock(source.year, source.day, source.period);
      const isTgtPrac = isPracticalInBlock(target.year, target.day, target.period);
      const descSrc = isSrcPrac ? "2-Hour Lab Block" : `[${srcCell1?.course || "Empty"} & ${srcCell2?.course || "Empty"}]`;
      const descTgt = isTgtPrac ? "2-Hour Lab Block" : `[${tgtCell1?.course || "Empty"} & ${tgtCell2?.course || "Empty"}]`;

      return { valid: true, reason: `✓ 0 Conflicts! Safe to swap ${descSrc} (${source.day} P${s1}-P${s2}) ⟷ ${descTgt} (${target.day} P${t1}-P${t2}).` };
    }

    // Standard 1-period theory swap
    if (source.day === target.day && source.period === target.period) {
      return { valid: false, reason: "Same slot selected" };
    }

    // Check source cell moving to target slot
    const sourceFaculties = extractCellFaculties(source.cell);
    for (const f of sourceFaculties) {
      const busyWhere = isFacultyBusyAt(f, target.day, target.period, source.year);
      if (busyWhere) {
        return {
          valid: false,
          reason: `Teacher Clash: Prof. ${f} is already teaching in ${busyWhere} on ${target.day} P${target.period}!`
        };
      }
    }

    const sourceRooms = extractCellRooms(source.cell);
    for (const r of sourceRooms) {
      const occWhere = isRoomOccupiedAt(r, target.day, target.period, source.year);
      if (occWhere) {
        return {
          valid: false,
          reason: `Room Clash: ${r} is occupied by ${occWhere} on ${target.day} P${target.period}!`
        };
      }
    }

    // Check target cell moving to source slot
    const targetFaculties = extractCellFaculties(target.cell);
    for (const f of targetFaculties) {
      const busyWhere = isFacultyBusyAt(f, source.day, source.period, target.year);
      if (busyWhere) {
        return {
          valid: false,
          reason: `Teacher Clash: Prof. ${f} is already teaching in ${busyWhere} on ${source.day} P${source.period}!`
        };
      }
    }

    const targetRooms = extractCellRooms(target.cell);
    for (const r of targetRooms) {
      const occWhere = isRoomOccupiedAt(r, source.day, source.period, target.year);
      if (occWhere) {
        return {
          valid: false,
          reason: `Room Clash: ${r} is occupied by ${occWhere} on ${source.day} P${source.period}!`
        };
      }
    }

    // Continuous teaching check for 1-period swap using simulation
    const classSchedule = masterData.schedules?.[source.year] || [];
    const sim = classSchedule.map(c => ({ ...c }));
    const iSrc = sim.findIndex(c => c.day === source.day && c.period === source.period);
    const iTgt = sim.findIndex(c => c.day === target.day && c.period === target.period);

    if (iSrc !== -1 && iTgt !== -1) {
      const tmpC = sim[iSrc].course, tmpF = sim[iSrc].faculty, tmpL = sim[iSrc].location, tmpT = sim[iSrc].cellType, tmpS = sim[iSrc].subEntries;
      sim[iSrc].course = sim[iTgt].course; sim[iSrc].faculty = sim[iTgt].faculty; sim[iSrc].location = sim[iTgt].location; sim[iSrc].cellType = sim[iTgt].cellType; sim[iSrc].subEntries = sim[iTgt].subEntries;
      sim[iTgt].course = tmpC; sim[iTgt].faculty = tmpF; sim[iTgt].location = tmpL; sim[iTgt].cellType = tmpT; sim[iTgt].subEntries = tmpS;
    }

    const daysToCheck = Array.from(new Set([source.day, target.day]));
    const backToBackPairs = [[1, 2], [3, 4], [5, 6]];
    for (const d of daysToCheck) {
      for (const [pA, pB] of backToBackPairs) {
        const cA = sim.find(c => c.day === d && c.period === pA);
        const cB = sim.find(c => c.day === d && c.period === pB);
        if (cA && cB && cA.cellType !== "PRACTICAL" && cB.cellType !== "PRACTICAL") {
          const facsA = extractCellFaculties(cA).map(x => x.toUpperCase().replace(/[^A-Z0-9]/g, ""));
          const facsB = extractCellFaculties(cB).map(x => x.toUpperCase().replace(/[^A-Z0-9]/g, ""));
          const common = facsA.filter(x => facsB.includes(x));
          if (common.length > 0) {
            return {
              valid: false,
              reason: `Continuous Teaching: Moving this theory lecture causes Prof. ${common[0]} to teach back-to-back theory lectures in ${source.year} on ${d} (P${pA} & P${pB})!`
            };
          }
        }
      }
    }

    return { valid: true, reason: "✓ 0 Conflicts! 100% safe to swap." };
  };

  // Execute swap
  const executeSwap = (source, target) => {
    const val = validateSwap(source, target);
    if (!val.valid) {
      setSwapAlert({ type: "error", text: val.reason });
      return;
    }

    const yr = source.year;
    const currentList = masterData.schedules[yr] || [];
    const isTwoHr = isPracticalInBlock(source.year, source.day, source.period) || 
                    isPracticalInBlock(target.year, target.day, target.period);

    // Save snapshot of current schedules and inputs before applying swap for step-by-step (1-by-1) revert
    const prevSnapshot = {
      schedules: JSON.parse(JSON.stringify(masterData.schedules)),
      inputs: JSON.parse(JSON.stringify(inputs))
    };
    const nextHistory = [...swapHistory, prevSnapshot];
    setSwapHistory(nextHistory);
    localStorage.setItem("timetableSwapHistory", JSON.stringify(nextHistory));
    setHasManualAdjustments(true);
    localStorage.setItem("timetableHasManualAdjustments", "true");

    const updatedList = JSON.parse(JSON.stringify(currentList));

    if (isTwoHr) {
      const [s1, s2] = getBlockPeriods(source.period);
      const [t1, t2] = getBlockPeriods(target.period);

      const iS1 = updatedList.findIndex(c => c.day === source.day && c.period === s1);
      const iS2 = updatedList.findIndex(c => c.day === source.day && c.period === s2);
      const iT1 = updatedList.findIndex(c => c.day === target.day && c.period === t1);
      const iT2 = updatedList.findIndex(c => c.day === target.day && c.period === t2);

      if (iS1 === -1 || iS2 === -1 || iT1 === -1 || iT2 === -1) {
        setSwapAlert({ type: "error", text: "One or more slots not found in schedule." });
        return;
      }

      const cS1 = updatedList[iS1];
      const cS2 = updatedList[iS2];
      const cT1 = updatedList[iT1];
      const cT2 = updatedList[iT2];

      const sDesc1 = cS1.course && cS1.course !== "—" ? cS1.course : "Empty";
      const sDesc2 = cS2.course && cS2.course !== "—" ? cS2.course : "Empty";
      const tDesc1 = cT1.course && cT1.course !== "—" ? cT1.course : "Empty";
      const tDesc2 = cT2.course && cT2.course !== "—" ? cT2.course : "Empty";

      const isSrcPrac = isPracticalInBlock(source.year, source.day, source.period);
      const isTgtPrac = isPracticalInBlock(target.year, target.day, target.period);

      const srcLabel = isSrcPrac ? `2-Hour Lab Block (${sDesc1})` : `[${sDesc1} & ${sDesc2}]`;
      const tgtLabel = isTgtPrac ? `2-Hour Lab Block (${tDesc1})` : `[${tDesc1} & ${tDesc2}]`;

      const swapTwo = (c1, c2) => {
        const tmpC = c1.course;
        const tmpF = c1.faculty;
        const tmpL = c1.location;
        const tmpT = c1.cellType;
        const tmpS = c1.subEntries;

        c1.course = c2.course;
        c1.faculty = c2.faculty;
        c1.location = c2.location;
        c1.cellType = c2.cellType;
        c1.subEntries = c2.subEntries;

        c2.course = tmpC;
        c2.faculty = tmpF;
        c2.location = tmpL;
        c2.cellType = tmpT;
        c2.subEntries = tmpS;
      };

      swapTwo(cS1, cT1);
      swapTwo(cS2, cT2);

      // Atomically synchronize practicals and fixedSlots inside department inputs
      const nextInputs = JSON.parse(JSON.stringify(inputs));
      const yrData = nextInputs.yearData?.[yr];
      if (yrData) {
        const srcPeriodStr = s1 === 1 ? "P1-P2" : (s1 === 3 ? "P3-P4" : "P5-P6");
        const tgtPeriodStr = t1 === 1 ? "P1-P2" : (t1 === 3 ? "P3-P4" : "P5-P6");

        if (yrData.practicals) {
          yrData.practicals = yrData.practicals.map((pr) => {
            if (pr.day === source.day && pr.period === srcPeriodStr) {
              return { ...pr, day: target.day, period: tgtPeriodStr };
            }
            if (pr.day === target.day && pr.period === tgtPeriodStr) {
              return { ...pr, day: source.day, period: srcPeriodStr };
            }
            return pr;
          });
        }

        if (yrData.fixedSlots) {
          yrData.fixedSlots = yrData.fixedSlots.map((fs) => {
            if (fs.day === source.day && fs.period === s1) {
              return { ...fs, day: target.day, period: t1 };
            }
            if (fs.day === source.day && fs.period === s2) {
              return { ...fs, day: target.day, period: t2 };
            }
            if (fs.day === target.day && fs.period === t1) {
              return { ...fs, day: source.day, period: s1 };
            }
            if (fs.day === target.day && fs.period === t2) {
              return { ...fs, day: source.day, period: s2 };
            }
            return fs;
          });
        }
      }

      const candidateSchedules = {
        ...masterData.schedules,
        [yr]: updatedList
      };
      const { liveDiagnostics, liveConflicts } = computeLiveDiagnostics(
        candidateSchedules,
        masterData.externalLoads,
        nextInputs.facultyUnavailability
      );

      const updatedMaster = {
        ...masterData,
        schedules: candidateSchedules,
        diagnostics: liveDiagnostics,
        conflictLog: liveConflicts
      };

      setInputs(nextInputs);
      localStorage.setItem("customMasterPayload", JSON.stringify(nextInputs));

      setMasterData(updatedMaster);
      setDiagnostics(liveDiagnostics);
      setConflictLog(liveConflicts);
      localStorage.setItem("masterTimetableData", JSON.stringify(updatedMaster));
      setSwapSource(null);
      setSwapHover(null);
      setSwapAlert({
        type: "success",
        text: `✓ Successfully swapped ${source.year}: ${srcLabel} (${source.day} P${s1}-P${s2}) ⟷ ${tgtLabel} (${target.day} P${t1}-P${t2}) without conflicts!`
      });
      return;
    }

    const srcIdx = currentList.findIndex((c) => c.day === source.day && c.period === source.period);
    const tgtIdx = currentList.findIndex((c) => c.day === target.day && c.period === target.period);

    if (srcIdx === -1 || tgtIdx === -1) {
      setSwapAlert({ type: "error", text: "Slot not found in schedule." });
      return;
    }

    const srcCell = updatedList[srcIdx];
    const tgtCell = updatedList[tgtIdx];

    const tempCourse = srcCell.course;
    const tempFaculty = srcCell.faculty;
    const tempLocation = srcCell.location;
    const tempType = srcCell.cellType;
    const tempSubs = srcCell.subEntries;

    srcCell.course = tgtCell.course;
    srcCell.faculty = tgtCell.faculty;
    srcCell.location = tgtCell.location;
    srcCell.cellType = tgtCell.cellType;
    srcCell.subEntries = tgtCell.subEntries;

    tgtCell.course = tempCourse;
    tgtCell.faculty = tempFaculty;
    tgtCell.location = tempLocation;
    tgtCell.cellType = tempType;
    tgtCell.subEntries = tempSubs;

    // Atomically synchronize fixedSlots inside department inputs for 1-period swap
    const nextInputs = JSON.parse(JSON.stringify(inputs));
    const yrData = nextInputs.yearData?.[yr];
    if (yrData) {
      if (yrData.fixedSlots) {
        yrData.fixedSlots = yrData.fixedSlots.map((fs) => {
          if (fs.day === source.day && fs.period === source.period) {
            return { ...fs, day: target.day, period: target.period };
          }
          if (fs.day === target.day && fs.period === target.period) {
            return { ...fs, day: source.day, period: source.period };
          }
          return fs;
        });
      }
    }

    const candidateSchedules = {
      ...masterData.schedules,
      [yr]: updatedList
    };
    const { liveDiagnostics, liveConflicts } = computeLiveDiagnostics(
      candidateSchedules,
      masterData.externalLoads,
      nextInputs.facultyUnavailability
    );

    const updatedMaster = {
      ...masterData,
      schedules: candidateSchedules,
      diagnostics: liveDiagnostics,
      conflictLog: liveConflicts
    };

    setInputs(nextInputs);
    localStorage.setItem("customMasterPayload", JSON.stringify(nextInputs));

    setMasterData(updatedMaster);
    setDiagnostics(liveDiagnostics);
    setConflictLog(liveConflicts);
    localStorage.setItem("masterTimetableData", JSON.stringify(updatedMaster));
    setSwapSource(null);
    setSwapHover(null);
    setSwapAlert({
      type: "success",
      text: `✓ Successfully swapped ${source.year}: [${tempCourse || "Empty"} (${source.day} P${source.period})] ⟷ [${tgtCell.course || "Empty"} (${target.day} P${target.period})] without conflicts!`
    });
  };

  // Step-by-step undo: reverts only 1 swap per click
  const handleUndoSwap = () => {
    if (!swapHistory || swapHistory.length === 0) return;

    // Pop the most recent schedule snapshot
    const lastSnapshot = swapHistory[swapHistory.length - 1];
    const remainingHistory = swapHistory.slice(0, -1);

    const snapshotSchedules = lastSnapshot.schedules || lastSnapshot;
    const snapshotInputs = lastSnapshot.inputs || inputs;

    const restoredSchedules = syncInputsWithSchedules(snapshotSchedules, snapshotInputs);
    const normExt = toExternalLoadsMap(snapshotInputs.externalLoads || masterData?.externalLoads);
    const { liveDiagnostics, liveConflicts } = computeLiveDiagnostics(
      restoredSchedules,
      normExt,
      snapshotInputs.facultyUnavailability
    );

    const restoredMaster = {
      ...masterData,
      schedules: restoredSchedules,
      externalLoads: normExt,
      diagnostics: liveDiagnostics,
      conflictLog: liveConflicts
    };

    setMasterData(restoredMaster);
    setDiagnostics(liveDiagnostics);
    setConflictLog(liveConflicts);
    localStorage.setItem("masterTimetableData", JSON.stringify(restoredMaster));
    if (lastSnapshot.inputs) {
      setInputs(snapshotInputs);
      localStorage.setItem("customMasterPayload", JSON.stringify(snapshotInputs));
    }
    setSwapHistory(remainingHistory);
    localStorage.setItem("timetableSwapHistory", JSON.stringify(remainingHistory));

    const stillHasSwaps = remainingHistory.length > 0;
    setHasManualAdjustments(stillHasSwaps);
    localStorage.setItem("timetableHasManualAdjustments", stillHasSwaps ? "true" : "false");

    setSwapSource(null);
    setSwapHover(null);
    setSwapAlert({
      type: "info",
      text: stillHasSwaps
        ? `↩ Reverted 1 swap. (${remainingHistory.length} previous swap${remainingHistory.length === 1 ? "" : "s"} remaining)`
        : "↩ Reverted swap back to initial schedule."
    });
  };

  const handleRevertChanges = handleUndoSwap;

  const handleRevertAllChanges = () => {
    if (swapHistory.length === 0 && !originalSchedules) return;
    const baseSnapshot = swapHistory.length > 0 ? swapHistory[0] : null;
    const baseSchedule = baseSnapshot?.schedules || baseSnapshot || originalSchedules;
    const baseInputs = baseSnapshot?.inputs || JSON.parse(JSON.stringify(ritDepartmentPreset));

    const baseSchedulesObj = JSON.parse(JSON.stringify(baseSchedule));
    const normExt = toExternalLoadsMap(baseInputs.externalLoads || masterData?.externalLoads);
    const { liveDiagnostics, liveConflicts } = computeLiveDiagnostics(
      baseSchedulesObj,
      normExt,
      baseInputs.facultyUnavailability
    );

    const restored = {
      ...masterData,
      schedules: baseSchedulesObj,
      externalLoads: normExt,
      diagnostics: liveDiagnostics,
      conflictLog: liveConflicts
    };
    setMasterData(restored);
    setDiagnostics(liveDiagnostics);
    setConflictLog(liveConflicts);
    localStorage.setItem("masterTimetableData", JSON.stringify(restored));
    if (baseSnapshot?.inputs) {
      setInputs(baseInputs);
      localStorage.setItem("customMasterPayload", JSON.stringify(baseInputs));
    }
    setHasManualAdjustments(false);
    localStorage.setItem("timetableHasManualAdjustments", "false");
    setSwapHistory([]);
    localStorage.removeItem("timetableSwapHistory");
    setSwapSource(null);
    setSwapHover(null);
    setSwapAlert({ type: "success", text: "Reverted all manual adjustments back to initial generated schedule!" });
  };

  // Open in-place Quick Edit Modal for timetable cell
  const openBlockEditor = (year, day, period, cell) => {
    if (swapModeEnabled) return;

    const isPrac = isPracticalInBlock(year, day, period);
    if (isPrac) {
      const [p1, p2] = getBlockPeriods(period);
      const cell1 = getCell(year, day, p1);
      const cell2 = getCell(year, day, p2);
      const primaryCell = cell1 || cell2 || cell;

      let subs = [];
      if (primaryCell?.subEntries && primaryCell.subEntries.length > 0) {
        subs = JSON.parse(JSON.stringify(primaryCell.subEntries));
      } else {
        subs = ["I1", "I2", "I3", "I4"].map((b) => ({
          batch: b,
          course: primaryCell?.course && primaryCell.course !== "—" ? primaryCell.course : "Lab",
          faculty: primaryCell?.faculty || "",
          location: primaryCell?.location || "IL1"
        }));
      }

      setQuickEditModal({
        isOpen: true,
        mode: "PRACTICAL",
        year,
        day,
        period: p1,
        period2: p2,
        periodLabel: `P${p1}-P${p2}`,
        course: primaryCell?.course || "Practical Lab",
        faculty: primaryCell?.faculty || "",
        location: primaryCell?.location || "",
        cellType: "PRACTICAL",
        subEntries: subs,
        externalType: "",
        externalDesc: ""
      });
    } else {
      const isEmpty = !cell || !cell.course || cell.course === "—";
      const isFixed = ["MDM", "OE", "MENTORING", "CAPSTONE"].includes(cell?.cellType);
      const defaultLoc = cell?.location || getClassroom(year);

      setQuickEditModal({
        isOpen: true,
        mode: isEmpty ? "EMPTY" : (isFixed ? "FIXED" : "THEORY"),
        year,
        day,
        period,
        period2: null,
        periodLabel: `P${period}`,
        course: isEmpty ? "" : (cell?.course || ""),
        faculty: cell?.faculty || "",
        location: defaultLoc,
        cellType: isEmpty ? "THEORY" : (cell?.cellType || "THEORY"),
        subEntries: [],
        externalType: "",
        externalDesc: ""
      });
    }
  };

  const openExternalLoadEditor = (loadType, day, period) => {
    if (swapModeEnabled) return;
    const extMap = toExternalLoadsMap(masterData?.externalLoads || inputs.externalLoads);
    const list = extMap[loadType] || [];
    const match = list.find((e) => e.day === day && e.period === period);

    setQuickEditModal({
      isOpen: true,
      mode: "EXTERNAL",
      year: "FY",
      day,
      period,
      period2: null,
      periodLabel: `P${period}`,
      course: loadType,
      faculty: match?.facultyCode || "",
      location: "FY Classroom",
      cellType: "EXTERNAL",
      subEntries: [],
      externalType: loadType,
      externalDesc: match?.description || ""
    });
  };

  const handleSubEntryChange = (batchIndex, field, value) => {
    setQuickEditModal((prev) => {
      const updatedSubs = [...prev.subEntries];
      updatedSubs[batchIndex] = {
        ...updatedSubs[batchIndex],
        [field]: value
      };
      return {
        ...prev,
        subEntries: updatedSubs
      };
    });
  };

  const handleClearSlot = () => {
    const { year, day, period, period2, mode } = quickEditModal;

    const prevSnapshot = {
      schedules: JSON.parse(JSON.stringify(masterData?.schedules || {})),
      inputs: JSON.parse(JSON.stringify(inputs))
    };
    const nextHistory = [...swapHistory, prevSnapshot];
    setSwapHistory(nextHistory);
    localStorage.setItem("timetableSwapHistory", JSON.stringify(nextHistory));
    setHasManualAdjustments(true);
    localStorage.setItem("timetableHasManualAdjustments", "true");

    let updatedSchedules = JSON.parse(JSON.stringify(masterData?.schedules || {}));
    let updatedInputs = JSON.parse(JSON.stringify(inputs));

    if (mode === "EXTERNAL") {
      const currentExt = updatedInputs.externalLoads || [];
      const filtered = currentExt.filter(
        (ext) => !(ext.loadType === quickEditModal.externalType && ext.day === day && Number(ext.period) === Number(period))
      );
      updatedInputs.externalLoads = filtered;
      const newExtMap = toExternalLoadsMap(filtered);
      const { liveDiagnostics, liveConflicts } = computeLiveDiagnostics(
        updatedSchedules,
        newExtMap,
        updatedInputs.facultyUnavailability
      );
      const updatedMaster = {
        ...masterData,
        externalLoads: newExtMap,
        conflictLog: liveConflicts,
        diagnostics: liveDiagnostics
      };
      setMasterData(updatedMaster);
      setInputs(updatedInputs);
      setConflictLog(liveConflicts);
      setDiagnostics(liveDiagnostics);
      localStorage.setItem("masterTimetableData", JSON.stringify(updatedMaster));
      localStorage.setItem("customMasterPayload", JSON.stringify(updatedInputs));
      setQuickEditModal((prev) => ({ ...prev, isOpen: false }));
      setSwapAlert({
        type: "info",
        text: `✓ Cleared external load ${quickEditModal.externalType} on ${day} Period ${period}.`
      });
      return;
    }

    const yearSched = updatedSchedules[year] || [];
    const clearSlotAtPeriod = (p) => {
      const idx = yearSched.findIndex((c) => c.day === day && c.period === p);
      if (idx !== -1) {
        yearSched[idx] = {
          day,
          period: p,
          course: "—",
          faculty: "",
          location: "",
          cellType: "THEORY",
          subEntries: null
        };
      }
    };

    clearSlotAtPeriod(period);
    if (period2) clearSlotAtPeriod(period2);
    updatedSchedules[year] = yearSched;

    // Remove from fixedSlots or practicals if matched
    if (updatedInputs.yearData?.[year]) {
      const yrData = updatedInputs.yearData[year];
      if (yrData.fixedSlots) {
        yrData.fixedSlots = yrData.fixedSlots.filter(
          (fs) => !(fs.day === day && (fs.period === period || fs.period === period2))
        );
      }
      if (yrData.practicals && period2) {
        const cellBlockStr = (period === 1 || period === 2) ? "P1-P2" : (period === 3 || period === 4) ? "P3-P4" : "P5-P6";
        yrData.practicals = yrData.practicals.filter(
          (pr) => !(pr.day === day && pr.period === cellBlockStr)
        );
      }
    }

    const normExtLoads = toExternalLoadsMap(updatedInputs.externalLoads || masterData?.externalLoads);
    const { liveDiagnostics, liveConflicts } = computeLiveDiagnostics(
      updatedSchedules,
      normExtLoads,
      updatedInputs.facultyUnavailability
    );

    const computedHours = {
      SY: (updatedSchedules.SY || []).filter((c) => c.course && c.course !== "—").length,
      TY: (updatedSchedules.TY || []).filter((c) => c.course && c.course !== "—").length,
      BTECH: (updatedSchedules.BTECH || []).filter((c) => c.course && c.course !== "—").length
    };

    const updatedMaster = {
      ...masterData,
      schedules: updatedSchedules,
      externalLoads: normExtLoads,
      totalContactHours: computedHours,
      conflictLog: liveConflicts,
      diagnostics: liveDiagnostics
    };

    setMasterData(updatedMaster);
    setInputs(updatedInputs);
    setConflictLog(liveConflicts);
    setDiagnostics(liveDiagnostics);
    localStorage.setItem("masterTimetableData", JSON.stringify(updatedMaster));
    localStorage.setItem("customMasterPayload", JSON.stringify(updatedInputs));
    setQuickEditModal((prev) => ({ ...prev, isOpen: false }));
    setSwapAlert({
      type: "info",
      text: `✓ Cleared slot on ${day} Period ${period}. Slot is now empty.`
    });
  };

  const handleSaveQuickEdit = (e) => {
    if (e) e.preventDefault();
    const { mode, year, day, period, period2, course, faculty, location, cellType, subEntries, externalType, externalDesc } = quickEditModal;

    // Snapshot current state for 1-click revert / undo
    const prevSnapshot = {
      schedules: JSON.parse(JSON.stringify(masterData?.schedules || {})),
      inputs: JSON.parse(JSON.stringify(inputs))
    };
    const nextHistory = [...swapHistory, prevSnapshot];
    setSwapHistory(nextHistory);
    localStorage.setItem("timetableSwapHistory", JSON.stringify(nextHistory));
    setHasManualAdjustments(true);
    localStorage.setItem("timetableHasManualAdjustments", "true");

    let updatedSchedules = JSON.parse(JSON.stringify(masterData?.schedules || {}));
    let updatedInputs = JSON.parse(JSON.stringify(inputs));

    if (mode === "EXTERNAL") {
      const currentExt = updatedInputs.externalLoads || [];
      const filtered = currentExt.filter(
        (ext) => !(ext.loadType === externalType && ext.day === day && Number(ext.period) === Number(period))
      );
      if (faculty) {
        filtered.push({
          loadType: externalType,
          facultyCode: faculty,
          day,
          period: Number(period),
          description: externalDesc || `${faculty}-${externalType}`
        });
      }
      updatedInputs.externalLoads = filtered;
      const newExtMap = toExternalLoadsMap(filtered);
      const { liveDiagnostics, liveConflicts } = computeLiveDiagnostics(
        updatedSchedules,
        newExtMap,
        updatedInputs.facultyUnavailability
      );
      const updatedMaster = {
        ...masterData,
        externalLoads: newExtMap,
        conflictLog: liveConflicts,
        diagnostics: liveDiagnostics
      };
      setMasterData(updatedMaster);
      setInputs(updatedInputs);
      setConflictLog(liveConflicts);
      setDiagnostics(liveDiagnostics);
      localStorage.setItem("masterTimetableData", JSON.stringify(updatedMaster));
      localStorage.setItem("customMasterPayload", JSON.stringify(updatedInputs));
      setQuickEditModal((prev) => ({ ...prev, isOpen: false }));
      setSwapAlert({
        type: "success",
        text: `✓ Updated external FY load ${externalType} on ${day} Period ${period} (${faculty})!`
      });
      return;
    }

    if (mode === "PRACTICAL") {
      const p1 = period;
      const p2 = period2 || (period + 1);
      const cellBlockStr = (p1 === 1 || p1 === 2) ? "P1-P2" : (p1 === 3 || p1 === 4) ? "P3-P4" : "P5-P6";

      const allCourses = Array.from(new Set(subEntries.map((s) => s.course).filter(Boolean)));
      const allFacs = Array.from(new Set(subEntries.map((s) => s.faculty).filter(Boolean)));
      const allLocs = Array.from(new Set(subEntries.map((s) => s.location).filter(Boolean)));

      const summaryCourse = allCourses.length > 0 ? allCourses.join(" / ") : "Practical Lab";
      const summaryFaculty = allFacs.join(", ");
      const summaryLocation = allLocs.join(", ");

      const yearSched = updatedSchedules[year] || [];
      const idx1 = yearSched.findIndex((c) => c.day === day && c.period === p1);
      const idx2 = yearSched.findIndex((c) => c.day === day && c.period === p2);

      const updateCellObj = (c) => ({
        ...c,
        course: summaryCourse,
        faculty: summaryFaculty,
        location: summaryLocation,
        cellType: "PRACTICAL",
        subEntries: JSON.parse(JSON.stringify(subEntries))
      });

      if (idx1 !== -1) yearSched[idx1] = updateCellObj(yearSched[idx1]);
      if (idx2 !== -1) yearSched[idx2] = updateCellObj(yearSched[idx2]);
      updatedSchedules[year] = yearSched;

      // Synchronize into inputs.yearData[year].practicals
      if (updatedInputs.yearData?.[year]) {
        const yrData = updatedInputs.yearData[year];
        if (!yrData.practicals) yrData.practicals = [];

        subEntries.forEach((sub) => {
          const pIdx = yrData.practicals.findIndex(
            (pr) => pr.day === day && pr.period === cellBlockStr && pr.batch === sub.batch
          );
          if (pIdx !== -1) {
            yrData.practicals[pIdx] = {
              ...yrData.practicals[pIdx],
              practical: sub.course,
              faculty: sub.faculty,
              room: sub.location
            };
          } else {
            yrData.practicals.push({
              day,
              period: cellBlockStr,
              batch: sub.batch,
              practical: sub.course,
              faculty: sub.faculty,
              room: sub.location
            });
          }
        });
      }
    } else {
      // THEORY, FIXED, or EMPTY
      const yearSched = updatedSchedules[year] || [];
      const idx = yearSched.findIndex((c) => c.day === day && c.period === period);
      const updatedCell = {
        day,
        period,
        course: course || "—",
        faculty: faculty || "",
        location: location || "",
        cellType: cellType || "THEORY",
        subEntries: null
      };

      if (idx !== -1) {
        yearSched[idx] = updatedCell;
      } else {
        yearSched.push(updatedCell);
      }
      updatedSchedules[year] = yearSched;

      // Synchronize into inputs
      if (updatedInputs.yearData?.[year]) {
        const yrData = updatedInputs.yearData[year];
        const isFixedType = ["MDM", "OE", "MENTORING", "CAPSTONE"].includes(cellType);

        if (isFixedType && yrData.fixedSlots) {
          const fsIdx = yrData.fixedSlots.findIndex((fs) => fs.day === day && fs.period === period);
          if (fsIdx !== -1) {
            yrData.fixedSlots[fsIdx] = {
              ...yrData.fixedSlots[fsIdx],
              courseName: course,
              facultyName: faculty,
              room: location
            };
          } else {
            yrData.fixedSlots.push({
              day,
              period,
              courseName: course,
              facultyName: faculty,
              room: location
            });
          }
        } else if (yrData.subjects) {
          const sub = yrData.subjects.find((s) => s.code === course || s.name === course);
          if (sub) {
            const facObj = (updatedInputs.faculties || []).find((f) => f.name === faculty);
            sub.faculty = facObj || { id: 999, name: faculty };
          }
        }
      }
    }

    const computedHours = {
      SY: (updatedSchedules.SY || []).filter((c) => c.course && c.course !== "—").length,
      TY: (updatedSchedules.TY || []).filter((c) => c.course && c.course !== "—").length,
      BTECH: (updatedSchedules.BTECH || []).filter((c) => c.course && c.course !== "—").length
    };

    const normExtLoads = toExternalLoadsMap(updatedInputs.externalLoads || masterData?.externalLoads);
    const { liveDiagnostics, liveConflicts } = computeLiveDiagnostics(
      updatedSchedules,
      normExtLoads,
      updatedInputs.facultyUnavailability
    );

    const updatedMaster = {
      ...masterData,
      schedules: updatedSchedules,
      externalLoads: normExtLoads,
      totalContactHours: computedHours,
      conflictLog: liveConflicts,
      diagnostics: liveDiagnostics
    };

    setMasterData(updatedMaster);
    setInputs(updatedInputs);
    setConflictLog(liveConflicts);
    setDiagnostics(liveDiagnostics);
    localStorage.setItem("masterTimetableData", JSON.stringify(updatedMaster));
    localStorage.setItem("customMasterPayload", JSON.stringify(updatedInputs));

    setQuickEditModal((prev) => ({ ...prev, isOpen: false }));
    setSwapAlert({
      type: "success",
      text: `✓ Updated ${year} [${course || "Slot"}] on ${day} P${period}: Faculty [${faculty || "None"}] & Room [${location || "None"}] saved!`
    });
  };

  const handleCellClick = (year, day, period, cell) => {
    if (!swapModeEnabled) {
      openBlockEditor(year, day, period, cell);
      return;
    }

    if (!swapSource) {
      const isPrac = isPracticalInBlock(year, day, period);
      const [p1, p2] = getBlockPeriods(period);
      const chosenP = isPrac ? p1 : period;
      const chosenCell = getCell(year, day, chosenP) || cell;
      setSwapSource({ year, day, period: chosenP, cell: chosenCell });
      setSwapAlert({
        type: "info",
        text: isPrac
          ? `Selected ${year} [2-Hour Lab Block (${chosenCell?.course && chosenCell.course !== "—" ? chosenCell.course : "Lab"}) on ${day} P${p1}-P${p2}]. Now click target 2-hour slot in ${year} to swap with.`
          : `Selected ${year} [${cell?.course && cell.course !== "—" ? cell.course : "Empty"} on ${day} Period ${period}]. Now click target slot in ${year} to swap.`
      });
    } else {
      const isTwoHr = isPracticalInBlock(swapSource.year, swapSource.day, swapSource.period) || 
                      isPracticalInBlock(year, day, period);
      if (isTwoHr) {
        const [s1] = getBlockPeriods(swapSource.period);
        const [t1] = getBlockPeriods(period);
        if (swapSource.year === year && swapSource.day === day && s1 === t1) {
          setSwapSource(null);
          setSwapHover(null);
          setSwapAlert({ type: "info", text: "2-Hour block selection canceled." });
          return;
        }
      } else {
        if (swapSource.year === year && swapSource.day === day && swapSource.period === period) {
          setSwapSource(null);
          setSwapHover(null);
          setSwapAlert({ type: "info", text: "Slot selection canceled." });
          return;
        }
      }
      executeSwap(swapSource, { year, day, period, cell });
    }
  };

  const handleCellMouseEnter = (year, day, period, cell) => {
    if (swapModeEnabled && swapSource && swapSource.year === year) {
      const isTwoHr = isPracticalInBlock(swapSource.year, swapSource.day, swapSource.period) || 
                      isPracticalInBlock(year, day, period);
      if (isTwoHr) {
        const [s1] = getBlockPeriods(swapSource.period);
        const [t1] = getBlockPeriods(period);
        if (!(swapSource.day === day && s1 === t1)) {
          setSwapHover({ year, day, period, cell });
        }
      } else {
        if (!(swapSource.day === day && swapSource.period === period)) {
          setSwapHover({ year, day, period, cell });
        }
      }
    }
  };

  const handleCellMouseLeave = () => {
    if (swapHover) setSwapHover(null);
  };

  const getCellSwapStyle = (year, day, period) => {
    if (!swapModeEnabled) return {};

    // Check if cell is the selected source
    if (swapSource && swapSource.year === year && swapSource.day === day) {
      const isSrcPrac = isPracticalInBlock(swapSource.year, swapSource.day, swapSource.period);
      if (isSrcPrac) {
        const [s1, s2] = getBlockPeriods(swapSource.period);
        if (period === s1 || period === s2) {
          return {
            outline: "3px solid #2563eb",
            outlineOffset: "-2px",
            background: "#eff6ff",
            cursor: "pointer"
          };
        }
      } else if (swapSource.period === period) {
        return {
          outline: "3px solid #2563eb",
          outlineOffset: "-2px",
          background: "#eff6ff",
          cursor: "pointer"
        };
      }
    }

    // Check if cell is in hovered target block
    if (swapSource && swapSource.year === year && swapHover && swapHover.year === year && swapHover.day === day) {
      const isTwoHr = isPracticalInBlock(swapSource.year, swapSource.day, swapSource.period) ||
                      isPracticalInBlock(swapHover.year, swapHover.day, swapHover.period);
      if (isTwoHr) {
        const [t1, t2] = getBlockPeriods(swapHover.period);
        if (period === t1 || period === t2) {
          const check = validateSwap(swapSource, swapHover);
          return {
            outline: check.valid ? "3px solid #16a34a" : "3px solid #dc2626",
            outlineOffset: "-2px",
            background: check.valid ? "#dcfce7" : "#fee2e2",
            cursor: check.valid ? "pointer" : "not-allowed"
          };
        }
      } else if (swapHover.period === period) {
        const check = validateSwap(swapSource, swapHover);
        return {
          outline: check.valid ? "3px solid #16a34a" : "3px solid #dc2626",
          outlineOffset: "-2px",
          background: check.valid ? "#dcfce7" : "#fee2e2",
          cursor: check.valid ? "pointer" : "not-allowed"
        };
      }
    }

    if (swapSource && swapSource.year === year) {
      return {
        cursor: "pointer",
        transition: "all 0.15s ease"
      };
    }

    return {
      cursor: "pointer"
    };
  };

  const getCellTooltip = (year, day, period, cell) => {
    if (!swapModeEnabled) {
      const isPrac = isPracticalInBlock(year, day, period);
      return isPrac
        ? "Click to edit 2-Hour Practical Lab Batches, Faculty & Rooms ✏️"
        : "Click to edit Faculty & Room for this slot ✏️";
    }
    if (swapSource) {
      if (swapSource.year !== year) {
        return `Cannot swap across classes (Current source is ${swapSource.year})`;
      }
      const isTwoHr = isPracticalInBlock(swapSource.year, swapSource.day, swapSource.period) ||
                      isPracticalInBlock(year, day, period);
      if (isTwoHr) {
        const [s1] = getBlockPeriods(swapSource.period);
        const [t1] = getBlockPeriods(period);
        if (swapSource.day === day && s1 === t1) {
          return "Selected 2-Hour block. Click to deselect.";
        }
      } else {
        if (swapSource.day === day && swapSource.period === period) {
          return "Source slot selected. Click to deselect.";
        }
      }
      const val = validateSwap(swapSource, { year, day, period, cell });
      return val.reason;
    }
    const isPrac = isPracticalInBlock(year, day, period);
    return isPrac ? "Click to select 2-Hour Lab Block for swap" : "Click to select as swap source";
  };

  const getExternal = (type, day, period) => {
    if (!masterData || !masterData.externalLoads) {
      return null;
    }
    const extMap = toExternalLoadsMap(masterData.externalLoads);
    if (!extMap[type] || !Array.isArray(extMap[type])) {
      return null;
    }
    const item = extMap[type].find(
      (e) => e.day === day && e.period === period
    );
    return item ? item.description : "—";
  };

  const getCellBadgeClass = (cell) => {
    if (!cell || cell.course === "—") return "";
    const t = cell.cellType || "";
    if (t === "PRACTICAL") return "badge-practical";
    if (t === "MDM") return "badge-mdm";
    if (t === "OE") return "badge-oe";
    if (t === "MENTORING") return "badge-mentoring";
    if (t === "CAPSTONE") return "badge-capstone";
    return "badge-theory";
  };

  const renderCellContent = (cell) => {
    if (!cell || !cell.course || cell.course === "—") {
      return <span className="empty-slot">—</span>;
    }

    if (cell.subEntries && cell.subEntries.length > 0) {
      return (
        <div className="multi-batch-cell">
          {cell.subEntries.map((sub, idx) => (
            <div key={idx} className="sub-entry-row">
              <span className="sub-batch">{sub.batch} -{sub.course}</span>
              <span className="sub-faculty">{sub.faculty}</span>
              <span className="sub-loc">{sub.location}</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="single-cell-content">
        <strong className="cell-course">{cell.course}</strong>
        {cell.faculty && <span className="cell-faculty">{cell.faculty}</span>}
        {cell.location && <span className="cell-location">{cell.location}</span>}
      </div>
    );
  };

  const isStartOfTwoHourPractical = (year, day, period) => {
    if (period !== 1 && period !== 3 && period !== 5) return false;
    const cell1 = getCell(year, day, period);
    const cell2 = getCell(year, day, period + 1);
    if (!cell1 || !cell2) return false;
    return cell1.cellType === "PRACTICAL" && cell2.cellType === "PRACTICAL";
  };

  const isEndOfTwoHourPractical = (year, day, period) => {
    if (period !== 2 && period !== 4 && period !== 6) return false;
    return isStartOfTwoHourPractical(year, day, period - 1);
  };

  const renderYearSlot = (year, day, period, cell) => {
    if (isEndOfTwoHourPractical(year, day, period)) {
      return null;
    }

    const isTwoHr = isStartOfTwoHourPractical(year, day, period);
    const isSource = swapSource && swapSource.year === year && swapSource.day === day && (
      isPracticalInBlock(swapSource.year, swapSource.day, swapSource.period)
        ? getBlockPeriods(swapSource.period).includes(period)
        : swapSource.period === period
    );
    const swapStyle = getCellSwapStyle(year, day, period);
    const tooltip = getCellTooltip(year, day, period, cell);

    if (cell?.subEntries && cell.subEntries.length > 0) {
      return (
        <td
          colSpan="3"
          rowSpan={isTwoHr ? "2" : "1"}
          className={`master-cell ${getCellBadgeClass(cell)} ${isTwoHr ? "two-hr-practical-cell" : ""}`}
          style={{
            ...swapStyle,
            background: isTwoHr ? "#f0fdf4" : undefined,
            borderLeft: isTwoHr ? "4px solid #16a34a" : undefined
          }}
          onClick={() => handleCellClick(year, day, period, cell)}
          onMouseEnter={() => handleCellMouseEnter(year, day, period, cell)}
          onMouseLeave={handleCellMouseLeave}
          title={tooltip}
        >
          {isSource && (
            <div style={{ fontSize: "9px", background: "#2563eb", color: "white", padding: "1px 4px", borderRadius: "3px", width: "fit-content", marginBottom: "2px" }}>
              SELECTED FOR SWAP
            </div>
          )}
          {isTwoHr && (
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#166534", marginBottom: "3px", display: "flex", justifyContent: "space-between" }}>
              <span>🔬 2-Hour Lab Session</span>
              <span style={{ background: "#dcfce7", color: "#15803d", padding: "1px 5px", borderRadius: "3px" }}>
                {period === 1 ? "P1-P2" : (period === 3 ? "P3-P4" : "P5-P6")}
              </span>
            </div>
          )}
          {renderCellContent(cell)}
        </td>
      );
    }

    return (
      <>
        <td
          className={`master-cell ${getCellBadgeClass(cell)}`}
          style={swapStyle}
          onClick={() => handleCellClick(year, day, period, cell)}
          onMouseEnter={() => handleCellMouseEnter(year, day, period, cell)}
          onMouseLeave={handleCellMouseLeave}
          title={tooltip}
        >
          {isSource && (
            <div style={{ fontSize: "9px", background: "#2563eb", color: "white", padding: "1px 4px", borderRadius: "3px", width: "fit-content", marginBottom: "2px" }}>
              SELECTED FOR SWAP
            </div>
          )}
          <strong>{cell?.course && cell.course !== "—" ? cell.course : "—"}</strong>
        </td>
        <td
          className="fac-cell"
          style={swapStyle}
          onClick={() => handleCellClick(year, day, period, cell)}
          onMouseEnter={() => handleCellMouseEnter(year, day, period, cell)}
          onMouseLeave={handleCellMouseLeave}
          title={tooltip}
        >
          {cell?.faculty || ""}
        </td>
        <td
          className="loc-cell"
          style={swapStyle}
          onClick={() => handleCellClick(year, day, period, cell)}
          onMouseEnter={() => handleCellMouseEnter(year, day, period, cell)}
          onMouseLeave={handleCellMouseLeave}
          title={tooltip}
        >
          {cell?.location || ""}
        </td>
      </>
    );
  };

  const getFacultyFullName = (code) => {
    const f = (inputs.faculties || []).find((fac) => fac.name === code);
    return f?.fullName || code;
  };

  const getFacultyMaxDaily = (code) => {
    const f = (inputs.faculties || []).find((fac) => fac.name === code);
    return f?.maxDailyLectures || 4;
  };

  const getClassroom = (year) => {
    return inputs.classroomMapping?.[year] || (year === "SY" ? "CR-27" : (year === "TY" ? "CR-26" : "CR-212"));
  };

  const getClassCoordinator = (year) => {
    if (year === "SY") return "Dr. S. U. Mane";
    if (year === "TY") return "Prof. A. B. Patil";
    if (year === "BTECH") return "Mrs. D. P. Patil";
    return "Department Coordinator";
  };

  const getSemesterForYear = (yr, semTerm = academicSemester) => {
    if (semTerm === "PART-I") {
      if (yr === "SY") return "Semester III";
      if (yr === "TY") return "Semester V";
      if (yr === "BTECH") return "Semester VII";
    } else {
      if (yr === "SY") return "Semester IV";
      if (yr === "TY") return "Semester VI";
      if (yr === "BTECH") return "Semester VIII";
    }
    return "Semester III";
  };

  const handleExportCurrentClassExcel = (targetYear = selectedClassYear) => {
    const semName = getSemesterForYear(targetYear, academicSemester);
    const yrData = inputs?.yearData?.[targetYear];
    const sched = masterData?.schedules?.[targetYear] || [];
    const coord = getClassCoordinator(targetYear);
    exportClassTimetableToExcel({
      year: targetYear,
      semester: semName,
      academicSession,
      academicSemester,
      classroom: getClassroom(targetYear),
      coordinator: coord,
      schedule: sched,
      subjects: yrData?.subjects || [],
      practicals: yrData?.practicals || [],
      fixedSlots: yrData?.fixedSlots || []
    });
  };

  const computeFacultySchedule = (facultyCode) => {
    if (!masterData || !facultyCode) {
      return {
        grid: {},
        stats: { totalHours: 0, theoryHours: 0, practicalHours: 0, externalHours: 0, dailyLoads: {} },
        courses: []
      };
    }

    const grid = {};
    const dailyLoads = { MONDAY: 0, TUESDAY: 0, WEDNESDAY: 0, THURSDAY: 0, FRIDAY: 0 };
    let theoryHours = 0;
    let practicalHours = 0;
    let externalHours = 0;
    const courseMap = new Map();

    days.forEach((day) => {
      grid[day] = {};
      periods.forEach((period) => {
        let entry = null;

        for (const yr of ["SY", "TY", "BTECH"]) {
          const cell = getCell(yr, day, period);
          if (!cell || cell.course === "—") continue;

          if (cell.subEntries && cell.subEntries.length > 0) {
            const matchSub = cell.subEntries.find((s) => s.faculty === facultyCode);
            if (matchSub) {
              entry = {
                year: yr,
                course: matchSub.course,
                type: "PRACTICAL",
                batch: matchSub.batch,
                location: matchSub.location,
                badgeClass: "badge-practical"
              };
              practicalHours++;
              dailyLoads[day] = (dailyLoads[day] || 0) + 1;
              const key = `${yr}-${matchSub.course}-${matchSub.location}`;
              if (!courseMap.has(key)) {
                courseMap.set(key, {
                  year: yr,
                  course: matchSub.course,
                  type: "Practical Lab",
                  location: matchSub.location,
                  hours: 1
                });
              } else {
                courseMap.get(key).hours++;
              }
              break;
            }
          }

          if (cell.faculty === facultyCode) {
            const isFixed = ["MDM", "OE", "MENTORING", "CAPSTONE"].includes(cell.cellType);
            entry = {
              year: yr,
              course: cell.course,
              type: cell.cellType || "THEORY",
              location: cell.location,
              badgeClass: getCellBadgeClass(cell)
            };
            theoryHours++;
            dailyLoads[day] = (dailyLoads[day] || 0) + 1;
            const key = `${yr}-${cell.course}-${cell.location}`;
            if (!courseMap.has(key)) {
              courseMap.set(key, {
                year: yr,
                course: cell.course,
                type: isFixed ? `Fixed (${cell.cellType})` : "Theory Lecture",
                location: cell.location,
                hours: 1
              });
            } else {
              courseMap.get(key).hours++;
            }
            break;
          }
        }

        if (!entry && masterData.externalLoads) {
          const extMap = toExternalLoadsMap(masterData.externalLoads);
          for (const [loadType, list] of Object.entries(extMap)) {
            if (!Array.isArray(list)) continue;
            const extMatch = list.find(
              (e) => e.day === day && getExternalLoadPeriods(e).includes(period) && e.facultyCode === facultyCode
            );
            if (extMatch) {
              entry = {
                year: "FY",
                course: loadType,
                type: "EXTERNAL",
                location: extMatch.description || "FY Class",
                badgeClass: "badge-external"
              };
              externalHours++;
              dailyLoads[day] = (dailyLoads[day] || 0) + 1;
              const key = `FY-${loadType}`;
              if (!courseMap.has(key)) {
                courseMap.set(key, {
                  year: "FY",
                  course: loadType,
                  type: "External University Load",
                  location: extMatch.description,
                  hours: 1
                });
              } else {
                courseMap.get(key).hours++;
              }
              break;
            }
          }
        }

        grid[day][period] = entry;
      });
    });

    return {
      grid,
      stats: {
        totalHours: theoryHours + practicalHours + externalHours,
        theoryHours,
        practicalHours,
        externalHours,
        dailyLoads
      },
      courses: Array.from(courseMap.values())
    };
  };

  const computeLabSchedule = (labRoom) => {
    if (!masterData) {
      return { grid: {}, stats: { totalOccupied: 0, totalCapacity: 30, utilizationPct: "0.0" }, sessions: [] };
    }

    const grid = {};
    let totalOccupied = 0;
    const sessions = [];

    days.forEach((day) => {
      grid[day] = {};
      periods.forEach((period) => {
        let entry = null;

        for (const yr of ["SY", "TY", "BTECH"]) {
          const cell = getCell(yr, day, period);
          if (!cell || cell.course === "—") continue;

          if (cell.subEntries && cell.subEntries.length > 0) {
            const matchSub = cell.subEntries.find((s) => s.location === labRoom);
            if (matchSub) {
              entry = {
                year: yr,
                batch: matchSub.batch,
                course: matchSub.course,
                faculty: matchSub.faculty,
                location: matchSub.location
              };
              totalOccupied++;
              sessions.push({
                day,
                period,
                year: yr,
                batch: matchSub.batch,
                course: matchSub.course,
                faculty: matchSub.faculty
              });
              break;
            }
          }

          if (cell.location === labRoom) {
            entry = {
              year: yr,
              course: cell.course,
              faculty: cell.faculty,
              location: cell.location
            };
            totalOccupied++;
            sessions.push({
              day,
              period,
              year: yr,
              course: cell.course,
              faculty: cell.faculty
            });
            break;
          }
        }

        grid[day][period] = entry;
      });
    });

    const totalCapacity = 30; // 5 days * 6 periods
    const utilizationPct = ((totalOccupied / totalCapacity) * 100).toFixed(1);

    return {
      grid,
      stats: {
        totalOccupied,
        totalCapacity,
        utilizationPct
      },
      sessions
    };
  };

  const computeAllLabsOverview = () => {
    const labNames = ["IL1", "IL2", "IL3", "IL4", "IL5", "IL6"];
    const labStats = labNames.map((lab) => {
      const schedule = computeLabSchedule(lab);
      return {
        lab,
        totalOccupied: schedule.stats.totalOccupied,
        utilizationPct: schedule.stats.utilizationPct,
        sessions: schedule.sessions
      };
    });

    const matrix = {};
    days.forEach((day) => {
      matrix[day] = {};
      periods.forEach((period) => {
        matrix[day][period] = {};
        labNames.forEach((lab) => {
          let entry = null;
          for (const yr of ["SY", "TY", "BTECH"]) {
            const cell = getCell(yr, day, period);
            if (!cell || cell.course === "—") continue;

            if (cell.subEntries && cell.subEntries.length > 0) {
              const matchSub = cell.subEntries.find((s) => s.location === lab);
              if (matchSub) {
                entry = {
                  year: yr,
                  batch: matchSub.batch,
                  course: matchSub.course,
                  faculty: matchSub.faculty
                };
                break;
              }
            } else if (cell.location === lab) {
              entry = {
                year: yr,
                course: cell.course,
                faculty: cell.faculty
              };
              break;
            }
          }
          matrix[day][period][lab] = entry;
        });
      });
    });

    return { labStats, matrix };
  };

  const getAllClassrooms = () => {
    return [
      { code: getClassroom("SY"), year: "SY", label: `S.Y. B.Tech Lecture Hall (${getClassroom("SY")})` },
      { code: getClassroom("TY"), year: "TY", label: `T.Y. B.Tech Lecture Hall (${getClassroom("TY")})` },
      { code: getClassroom("BTECH"), year: "BTECH", label: `Final Year B.Tech Lecture Hall (${getClassroom("BTECH")})` }
    ];
  };

  const computeRoomSchedule = (targetRoom) => {
    if (!masterData) {
      return { grid: {}, stats: { totalOccupied: 0, totalCapacity: 30, utilizationPct: "0.0" }, sessions: [] };
    }

    const grid = {};
    let totalOccupied = 0;
    const sessions = [];

    days.forEach((day) => {
      grid[day] = {};
      periods.forEach((period) => {
        let entry = null;

        for (const yr of ["SY", "TY", "BTECH"]) {
          const cell = getCell(yr, day, period);
          if (!cell || cell.course === "—") continue;

          if (cell.location === targetRoom) {
            entry = {
              year: yr,
              course: cell.course,
              faculty: cell.faculty,
              cellType: cell.cellType || "THEORY",
              location: cell.location
            };
            totalOccupied++;
            sessions.push({
              day,
              period,
              year: yr,
              course: cell.course,
              faculty: cell.faculty,
              cellType: cell.cellType || "THEORY"
            });
            break;
          }

          if (cell.subEntries && cell.subEntries.length > 0) {
            const matchSub = cell.subEntries.find((s) => s.location === targetRoom);
            if (matchSub) {
              entry = {
                year: yr,
                batch: matchSub.batch,
                course: matchSub.course,
                faculty: matchSub.faculty,
                cellType: "PRACTICAL",
                location: matchSub.location
              };
              totalOccupied++;
              sessions.push({
                day,
                period,
                year: yr,
                batch: matchSub.batch,
                course: matchSub.course,
                faculty: matchSub.faculty,
                cellType: "PRACTICAL"
              });
              break;
            }
          }
        }

        grid[day][period] = entry;
      });
    });

    const totalCapacity = 30; // 5 days * 6 periods
    const utilizationPct = ((totalOccupied / totalCapacity) * 100).toFixed(1);

    return {
      grid,
      stats: {
        totalOccupied,
        totalCapacity,
        utilizationPct
      },
      sessions
    };
  };

  const computeAllRoomsOverview = () => {
    const rooms = getAllClassrooms();
    const roomStats = rooms.map((r) => {
      const schedule = computeRoomSchedule(r.code);
      return {
        room: r.code,
        year: r.year,
        label: r.label,
        totalOccupied: schedule.stats.totalOccupied,
        utilizationPct: schedule.stats.utilizationPct,
        sessions: schedule.sessions
      };
    });

    const matrix = {};
    days.forEach((day) => {
      matrix[day] = {};
      periods.forEach((period) => {
        matrix[day][period] = {};
        rooms.forEach((r) => {
          let entry = null;
          for (const yr of ["SY", "TY", "BTECH"]) {
            const cell = getCell(yr, day, period);
            if (!cell || cell.course === "—") continue;

            if (cell.location === r.code) {
              entry = {
                year: yr,
                course: cell.course,
                faculty: cell.faculty,
                cellType: cell.cellType || "THEORY"
              };
              break;
            }
          }
          matrix[day][period][r.code] = entry;
        });
      });
    });

    return { roomStats, matrix, rooms };
  };

  const computeAllFacultyMasterMatrix = () => {
    const facList = inputs?.faculties || [];
    const facultySchedules = facList.map((f) => {
      const sched = computeFacultySchedule(f.name);
      return {
        faculty: f,
        schedule: sched
      };
    });

    return {
      faculties: facList,
      facultySchedules
    };
  };

  const renderOfficialBlockRowPair = (p1, p2, sr1, time1, sr2, time2, facSched, currentFaculty) => {
    const daysList = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

    const dayMergedInfo = {};
    daysList.forEach((day) => {
      const s1 = facSched?.grid?.[day]?.[p1];
      const s2 = facSched?.grid?.[day]?.[p2];

      const isTwoHrSpecial = s1 && s2 && s1.course === s2.course && (
        (s1.course || "").includes("Capstone") ||
        (s1.course || "").includes("M.Tech") ||
        (s1.course || "").includes("Project") ||
        (s1.course || "").includes("Mentoring")
      );

      const isTwoHrPrac = s1 && s2 && s1.type === "PRACTICAL" && s2.type === "PRACTICAL";

      dayMergedInfo[day] = {
        isTwoHrSpecial,
        isTwoHrPrac,
        s1,
        s2
      };
    });

    return (
      <Fragment>
        {/* Row 1 */}
        <tr>
          <td style={{ fontWeight: 700 }}>{sr1}</td>
          <td style={{ fontSize: "10.5px", whiteSpace: "pre-line", fontWeight: 600 }}>{time1}</td>
          {daysList.map((day) => {
            const info = dayMergedInfo[day];
            if (info.isTwoHrSpecial) {
              return (
                <td key={day} colSpan="3" rowSpan="2" style={{ fontWeight: 700, fontSize: "11px", textAlign: "center" }}>
                  {info.s1.course}
                </td>
              );
            }
            if (info.isTwoHrPrac) {
              return (
                <Fragment key={day}>
                  <td rowSpan="2" style={{ fontWeight: 700, fontSize: "11px", width: "4%" }}>{info.s1.year}</td>
                  <td rowSpan="2" style={{ fontWeight: 700, fontSize: "11px", width: "7.5%" }}>
                    {info.s1.batch ? `${info.s1.batch}-${info.s1.course}` : info.s1.course}
                  </td>
                  <td rowSpan="2" style={{ fontWeight: 700, fontSize: "11px", width: "4.5%" }}>{info.s1.location}</td>
                </Fragment>
              );
            }
            if (info.s1) {
              return (
                <Fragment key={day}>
                  <td style={{ fontWeight: 700, fontSize: "10.5px", width: "4%" }}>{info.s1.year || info.s1.course}</td>
                  <td style={{ fontWeight: 700, fontSize: "10.5px", width: "7.5%" }}>{info.s1.course || currentFaculty}</td>
                  <td style={{ fontWeight: 700, fontSize: "10.5px", width: "4.5%" }}>{info.s1.location}</td>
                </Fragment>
              );
            }
            return (
              <Fragment key={day}>
                <td style={{ width: "4%" }}></td>
                <td style={{ width: "7.5%" }}></td>
                <td style={{ width: "4.5%" }}></td>
              </Fragment>
            );
          })}
          {/* Saturday in Row 1 */}
          <td style={{ width: "4%" }}></td>
          <td style={{ width: "7.5%" }}></td>
          <td style={{ width: "4.5%" }}></td>
        </tr>

        {/* Row 2 */}
        <tr>
          <td style={{ fontWeight: 700 }}>{sr2}</td>
          <td style={{ fontSize: "10.5px", whiteSpace: "pre-line", fontWeight: 600 }}>{time2}</td>
          {daysList.map((day) => {
            const info = dayMergedInfo[day];
            if (info.isTwoHrSpecial || info.isTwoHrPrac) {
              return null; // Merged in Row 1
            }
            if (info.s2) {
              return (
                <Fragment key={day}>
                  <td style={{ fontWeight: 700, fontSize: "10.5px", width: "4%" }}>{info.s2.year || info.s2.course}</td>
                  <td style={{ fontWeight: 700, fontSize: "10.5px", width: "7.5%" }}>{info.s2.course || currentFaculty}</td>
                  <td style={{ fontWeight: 700, fontSize: "10.5px", width: "4.5%" }}>{info.s2.location}</td>
                </Fragment>
              );
            }
            return (
              <Fragment key={day}>
                <td style={{ width: "4%" }}></td>
                <td style={{ width: "7.5%" }}></td>
                <td style={{ width: "4.5%" }}></td>
              </Fragment>
            );
          })}
          {/* Saturday in Row 2 */}
          <td style={{ width: "4%" }}></td>
          <td style={{ width: "7.5%" }}></td>
          <td style={{ width: "4.5%" }}></td>
        </tr>
      </Fragment>
    );
  };

  const getOfficialClassIndex = (year) => {
    const yrData = inputs?.yearData?.[year] || {};
    const subjects = yrData.subjects || [];
    const labCourses = yrData.labCourses || [];
    const fixedSlots = yrData.fixedSlots || [];
    const practicals = yrData.practicals || [];

    const teacherRefMap = {
      ACA: "Mr.Dr.A.C.Adamuthe",
      DSB: "Dr.d.s.bHOSALE",
      SPP: "Mrs.S.P.Patil",
      PTS: "Prof. P. T. Sawant",
      DTM: "Prof. D. T. Mane",
      MNM: "Prof. M. N. Mulla(TPC)",
      ANM: "Mrs.Dr.A.N.Mandale",
      RSP: "Mrs. R.S. Patil",
      VUP: "Mrs. V.U. Patil",
      TNK: "Ms.T.N.Kamble",
      SJ: "Ms.S.P.Shinde",
      SPS: "Ms.S.P.Shinde",
      PSP: "Mrs.P.S.Patil",
      SUM: "Dr. S. U. Mane",
      DBC: "Mr. D. B. Chougule",
      MSK: "Mr. M. S. Kumbhar",
      MAV: "Mrs. M. A. Vairat",
      ARJ: "Mrs. A. R. Jamadagni",
      SEB: "Mrs. S. E. Bhosale",
      VVJ: "Prof. V. V. Jagtap",
      RRL: "Prof. R. R. Londhe"
    };

    const courseRefMap = {
      DM: "Discrete Mathematics",
      DS: "Data Structures",
      COA: "Digital Logic and Computer Organization",
      "MDM-I": "MDM-I (Data Structures)",
      EVS: "Environmental Science",
      OOPJ: "Object Oriented Programming with Java Lab",
      ITTT: "IT Tools and Technologies Lab"
    };

    const courses = [];
    const seenCourses = new Set();

    if (year === "SY") {
      const syBenchmarkCourses = [
        { abbr: "DM", name: "Discrete Mathematics" },
        { abbr: "DS", name: "Data Structures" },
        { abbr: "COA", name: "Digital Logic and Computer Organization" },
        { abbr: "MDM-I", name: "MDM-I (Data Structures)" },
        { abbr: "EVS", name: "Environmental Science" },
        { abbr: "OOPJ", name: "Object Oriented Programming with Java Lab" },
        { abbr: "DS", name: "Data Structures Lab" },
        { abbr: "ITTT", name: "IT Tools and Technologies Lab" }
      ];
      syBenchmarkCourses.forEach((c) => courses.push(c));
    } else {
      subjects.forEach((s) => {
        if (!seenCourses.has(s.code)) {
          seenCourses.add(s.code);
          courses.push({ abbr: s.code, name: s.name || courseRefMap[s.code] || s.code });
        }
      });
      labCourses.forEach((lc) => {
        if (!seenCourses.has(lc.code)) {
          seenCourses.add(lc.code);
          courses.push({ abbr: lc.code, name: lc.name || `${lc.code} Lab` });
        }
      });
      fixedSlots.forEach((fs) => {
        const code = (fs.courseName || "").split(/[-/]/)[0].trim();
        if (code && !seenCourses.has(code) && code !== "Language" && code !== "PSD") {
          seenCourses.add(code);
          courses.push({ abbr: code, name: fs.courseName });
        }
      });
    }

    const teachers = [];
    const seenTeachers = new Set();

    if (year === "SY") {
      const syBenchmarkTeachers = [
        { abbr: "ACA", name: "Mr.Dr.A.C.Adamuthe" },
        { abbr: "DSB", name: "Dr.d.s.bHOSALE" },
        { abbr: "SPP", name: "Mrs.S.P.Patil" },
        { abbr: "PTS", name: "Prof. P. T. Sawant" },
        { abbr: "DTM", name: "Prof. D. T. Mane" },
        { abbr: "MNM", name: "Prof. M. N. Mulla(TPC)" },
        { abbr: "ANM", name: "Mrs.Dr.A.N.Mandale" },
        { abbr: "RSP", name: "Mrs. R.S. Patil" },
        { abbr: "VUP", name: "Mrs. V.U. Patil" },
        { abbr: "TNK", name: "Ms.T.N.Kamble" },
        { abbr: "SJ", name: "Ms.S.P.Shinde" },
        { abbr: "PSP", name: "Mrs.P.S.Patil" }
      ];
      syBenchmarkTeachers.forEach((t) => teachers.push(t));
    } else {
      const addTeacher = (code) => {
        if (!code) return;
        code.split(/[/,\s]+/).forEach((c) => {
          const clean = c.trim().toUpperCase();
          if (clean && !seenTeachers.has(clean)) {
            seenTeachers.add(clean);
            const fullName = teacherRefMap[clean] || getFacultyFullName(clean) || clean;
            teachers.push({ abbr: clean, name: fullName });
          }
        });
      };
      subjects.forEach((s) => addTeacher(s.faculty?.name));
      practicals.forEach((p) => addTeacher(p.faculty));
      fixedSlots.forEach((f) => addTeacher(f.facultyName));
    }

    return { courses, teachers };
  };

  const renderOfficialClassBlockRowPair = (p1, p2, sr1, time1, sr2, time2, year) => {
    const daysList = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

    const dayMergedInfo = {};
    daysList.forEach((day) => {
      const c1 = getCell(year, day, p1);
      const c2 = getCell(year, day, p2);

      const isTwoHrPrac = (c1?.subEntries && c1.subEntries.length > 0) || c1?.type === "PRACTICAL" || (c2?.subEntries && c2.subEntries.length > 0) || c2?.type === "PRACTICAL";

      const isTwoHrSpecial = (
        (c1?.course && (c1.course.includes("PSD") || c1.course.includes("German") || c1.course.includes("Language") || c1.course.includes("Capstone") || c1.course.includes("Project"))) ||
        (c1 && c2 && c1.course === c2.course && (c1.course.includes("Mentoring") || c1.course.includes("Seminar")))
      );

      const isWide1 = c1?.course && (
        c1.course.includes("MDM-I") ||
        c1.course.includes("Mentoring") ||
        c1.course.includes("Language") ||
        c1.course.includes("Project") ||
        c1.course.includes("Seminar")
      );
      const isWide2 = c2?.course && (
        c2.course.includes("MDM-I") ||
        c2.course.includes("Mentoring") ||
        c2.course.includes("Language") ||
        c2.course.includes("Project") ||
        c2.course.includes("Seminar")
      );

      dayMergedInfo[day] = {
        isTwoHrPrac,
        isTwoHrSpecial,
        isWide1,
        isWide2,
        c1,
        c2
      };
    });

    const isSatLanguage = p1 === 1 && p2 === 2;

    return (
      <Fragment>
        {/* Row 1 */}
        <tr>
          <td style={{ fontWeight: 700, width: "35px", verticalAlign: "middle" }}>{sr1}</td>
          <td style={{ fontSize: "10.5px", whiteSpace: "pre-line", fontWeight: 600, width: "80px", verticalAlign: "middle" }}>{time1}</td>
          {daysList.map((day) => {
            const info = dayMergedInfo[day];

            if (info.isTwoHrPrac) {
              const entries = info.c1?.subEntries && info.c1.subEntries.length > 0 ? info.c1.subEntries : (info.c2?.subEntries || []);
              return (
                <td key={day} colSpan="3" rowSpan="2" style={{ padding: 0, verticalAlign: "middle", height: "100%" }}>
                  <table style={{ width: "100%", height: "100%", borderCollapse: "collapse", margin: 0, fontSize: "10.5px" }}>
                    <tbody>
                      {entries.map((b, bIdx) => (
                        <tr key={bIdx} style={{ borderBottom: bIdx < entries.length - 1 ? "1px solid #000" : "none" }}>
                          <td style={{ width: "42%", padding: "2px 4px", fontWeight: 700, textAlign: "left", whiteSpace: "nowrap" }}>
                            {b.batch ? `${b.batch} -${b.course}` : b.course}
                          </td>
                          <td style={{ width: "28%", padding: "2px 4px", fontWeight: 700, textAlign: "center", borderLeft: "1px solid #000", borderRight: "1px solid #000" }}>
                            {b.faculty}
                          </td>
                          <td style={{ width: "30%", padding: "2px 4px", fontWeight: 600, textAlign: "center" }}>
                            {b.location}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              );
            }

            if (info.isTwoHrSpecial) {
              const bg = (info.c1?.course || "").includes("PSD") || (info.c1?.course || "").includes("German") ? "#e2b7b7" : "#ffffff";
              return (
                <td key={day} colSpan="3" rowSpan="2" style={{ background: bg, fontWeight: 700, fontSize: "10px", padding: "4px", textAlign: "center", verticalAlign: "middle" }}>
                  {info.c1?.course}
                </td>
              );
            }

            if (info.isWide1) {
              const isMDM = (info.c1?.course || "").includes("MDM");
              return (
                <td key={day} colSpan="3" style={{ background: isMDM ? "#93c5fd" : "#ffffff", fontWeight: 700, fontSize: "10.5px", padding: "4px", textAlign: "center", verticalAlign: "middle" }}>
                  {info.c1?.course}
                </td>
              );
            }

            if (info.c1 && info.c1.course && info.c1.course !== "—") {
              return (
                <Fragment key={day}>
                  <td style={{ fontWeight: 700, fontSize: "11px", width: "4.5%", verticalAlign: "middle" }}>{info.c1.course}</td>
                  <td style={{ fontWeight: 700, fontSize: "11px", width: "4%", verticalAlign: "middle" }}>{info.c1.faculty}</td>
                  <td style={{ fontWeight: 600, fontSize: "10.5px", width: "4%", verticalAlign: "middle" }}>{info.c1.location}</td>
                </Fragment>
              );
            }

            return (
              <Fragment key={day}>
                <td style={{ width: "4.5%" }}></td>
                <td style={{ width: "4%" }}></td>
                <td style={{ width: "4%" }}></td>
              </Fragment>
            );
          })}

          {/* Saturday Column in Row 1 */}
          {isSatLanguage ? (
            <td colSpan="3" rowSpan="2" style={{ background: "#e2b7b7", fontWeight: 700, fontSize: "10px", padding: "4px", textAlign: "center", verticalAlign: "middle" }}>
              Language (Mech, Mechatronics, Rob.&Auto, Civil, CSE, CSE-AIML)
            </td>
          ) : (
            <Fragment>
              <td style={{ width: "4.5%" }}></td>
              <td style={{ width: "4%" }}></td>
              <td style={{ width: "4%" }}></td>
            </Fragment>
          )}
        </tr>

        {/* Row 2 */}
        <tr>
          <td style={{ fontWeight: 700, width: "35px", verticalAlign: "middle" }}>{sr2}</td>
          <td style={{ fontSize: "10.5px", whiteSpace: "pre-line", fontWeight: 600, width: "80px", verticalAlign: "middle" }}>{time2}</td>
          {daysList.map((day) => {
            const info = dayMergedInfo[day];

            if (info.isTwoHrPrac || info.isTwoHrSpecial) {
              return null; // Handled in Row 1 with rowSpan="2"
            }

            if (info.isWide2) {
              const isMDM = (info.c2?.course || "").includes("MDM");
              return (
                <td key={day} colSpan="3" style={{ background: isMDM ? "#93c5fd" : "#ffffff", fontWeight: 700, fontSize: "10.5px", padding: "4px", textAlign: "center", verticalAlign: "middle" }}>
                  {info.c2?.course}
                </td>
              );
            }

            if (info.c2 && info.c2.course && info.c2.course !== "—") {
              return (
                <Fragment key={day}>
                  <td style={{ fontWeight: 700, fontSize: "11px", width: "4.5%", verticalAlign: "middle" }}>{info.c2.course}</td>
                  <td style={{ fontWeight: 700, fontSize: "11px", width: "4%", verticalAlign: "middle" }}>{info.c2.faculty}</td>
                  <td style={{ fontWeight: 600, fontSize: "10.5px", width: "4%", verticalAlign: "middle" }}>{info.c2.location}</td>
                </Fragment>
              );
            }

            return (
              <Fragment key={day}>
                <td style={{ width: "4.5%" }}></td>
                <td style={{ width: "4%" }}></td>
                <td style={{ width: "4%" }}></td>
              </Fragment>
            );
          })}

          {/* Saturday Column in Row 2 */}
          {!isSatLanguage && (
            <Fragment>
              <td style={{ width: "4.5%" }}></td>
              <td style={{ width: "4%" }}></td>
              <td style={{ width: "4%" }}></td>
            </Fragment>
          )}
        </tr>
      </Fragment>
    );
  };

  const computeClassIndex = (year) => {
    const yrData = inputs?.yearData?.[year] || {};
    const theorySubjects = yrData.subjects || [];
    const practicalBatches = yrData.practicalBatches || [];
    const fixedSlots = yrData.fixedSlots || [];

    const practicalMap = new Map();
    practicalBatches.forEach((pb) => {
      const key = `${pb.subjectCode}-${pb.facultyCode}-${pb.room}`;
      if (!practicalMap.has(key)) {
        practicalMap.set(key, {
          subjectCode: pb.subjectCode,
          facultyCode: pb.facultyCode,
          room: pb.room,
          batches: [pb.batchName],
          weeklyHours: 2
        });
      } else {
        const item = practicalMap.get(key);
        if (!item.batches.includes(pb.batchName)) {
          item.batches.push(pb.batchName);
        }
      }
    });

    return {
      theorySubjects,
      practicalList: Array.from(practicalMap.values()),
      fixedSlots
    };
  };

  const renderClassSlot = (year, day, period) => {
    if (isEndOfTwoHourPractical(year, day, period)) {
      return null;
    }

    const isTwoHr = isStartOfTwoHourPractical(year, day, period);
    const cell = getCell(year, day, period);
    const isSource = swapSource && swapSource.year === year && swapSource.day === day && swapSource.period === period;
    const swapStyle = getCellSwapStyle(year, day, period);
    const tooltip = getCellTooltip(year, day, period, cell);

    if (!cell || !cell.course || cell.course === "—") {
      return (
        <td
          className="schedule-slot-cell empty-cell"
          style={swapStyle}
          onClick={() => handleCellClick(year, day, period, cell)}
          onMouseEnter={() => handleCellMouseEnter(year, day, period, cell)}
          onMouseLeave={handleCellMouseLeave}
          title={tooltip}
        >
          {isSource && (
            <div style={{ fontSize: "9px", background: "#2563eb", color: "white", padding: "1px 4px", borderRadius: "3px", width: "fit-content", marginBottom: "2px" }}>
              SELECTED
            </div>
          )}
          <span className="empty-text">—</span>
        </td>
      );
    }

    if (cell.subEntries && cell.subEntries.length > 0) {
      return (
        <td
          colSpan={isTwoHr ? 2 : 1}
          className={`schedule-slot-cell badge-practical ${isTwoHr ? "practical-2hr-slot" : ""}`}
          style={{
            ...swapStyle,
            minWidth: isTwoHr ? "240px" : undefined,
            background: isTwoHr ? "#f0fdf4" : undefined,
            border: isTwoHr ? "2px solid #86efac" : undefined
          }}
          onClick={() => handleCellClick(year, day, period, cell)}
          onMouseEnter={() => handleCellMouseEnter(year, day, period, cell)}
          onMouseLeave={handleCellMouseLeave}
          title={tooltip}
        >
          {isSource && (
            <div style={{ fontSize: "9px", background: "#2563eb", color: "white", padding: "1px 4px", borderRadius: "3px", width: "fit-content", marginBottom: "2px" }}>
              SELECTED
            </div>
          )}
          <div className="class-practical-cell">
            <div className="practical-tag">
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                🔬 {isTwoHr ? "2-Hour Practical Lab Session" : "Practical Batches"}
              </span>
              {isTwoHr && (
                <span style={{ fontSize: "10.5px", fontWeight: 700, background: "#dcfce7", color: "#15803d", padding: "1px 7px", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
                  {period === 1 ? "10:00 - 12:00" : (period === 3 ? "12:45 - 02:45" : "03:00 - 05:00")}
                </span>
              )}
            </div>
            <div className="batch-grid" style={isTwoHr ? { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "5px" } : { display: "flex", flexDirection: "column", gap: "4px" }}>
              {cell.subEntries.map((sub, sIdx) => (
                <div key={sIdx} className="batch-chip">
                  <div className="batch-header-row">
                    <span className="batch-name">Batch {sub.batch}</span>
                    <span className="batch-room-badge">
                      {sub.location}
                    </span>
                  </div>
                  <div className="batch-course-title">
                    {sub.course}
                  </div>
                  <div className="batch-faculty-name">
                    {getFacultyFullName(sub.faculty)} ({sub.faculty})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </td>
      );
    }

    return (
      <td
        className={`schedule-slot-cell ${getCellBadgeClass(cell)}`}
        style={swapStyle}
        onClick={() => handleCellClick(year, day, period, cell)}
        onMouseEnter={() => handleCellMouseEnter(year, day, period, cell)}
        onMouseLeave={handleCellMouseLeave}
        title={tooltip}
      >
        {isSource && (
          <div style={{ fontSize: "9px", background: "#2563eb", color: "white", padding: "1px 4px", borderRadius: "3px", width: "fit-content", marginBottom: "2px" }}>
            SELECTED
          </div>
        )}
        <div className="class-lecture-cell">
          <div className="lecture-course">{cell.course}</div>
          <div className="lecture-meta">
            <span className="lecture-fac">{getFacultyFullName(cell.faculty)} ({cell.faculty})</span>
            <span className="lecture-loc">{cell.location}</span>
          </div>
        </div>
      </td>
    );
  };

  return (
    <div className="master-timetable-page">
      {/* Dynamic View Title Card */}
      <div className="master-header-card" style={(selectedView === "ALL" || selectedView === "CLASS_MASTER") ? { display: "flex", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "16px" } : {}}>
        {(selectedView === "ALL" || selectedView === "CLASS_MASTER") ? (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.5px", color: "#1e3a8a" }}>K.E.Society's</div>
            <div style={{ fontSize: "16.5px", fontWeight: 800, marginTop: "3px", color: "#0f172a" }}>Rajarambapu Institute of Technology ,Rajaramnagar</div>
            <div style={{ fontSize: "14.5px", fontWeight: 700, marginTop: "3px", textDecoration: "underline", color: "#1e3a8a" }}>Department of Information Technology</div>
            <div style={{ fontSize: "15px", fontWeight: 800, marginTop: "3px", textDecoration: "underline", color: "#0f172a" }}>Master Class Time Table</div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, marginTop: "3px", color: "#2563eb" }}>{academicSession}/ {academicSemester}</div>
          </div>
        ) : (
          <>
            <div className="header-card-left">
              <h2 className="header-view-title">
                {selectedView === "CLASS" && `${selectedClassYear === "SY" ? "Second Year (S.Y. B.Tech) - Sem-III" : (selectedClassYear === "TY" ? "Third Year (T.Y. B.Tech) - Sem-V" : "Final Year (B.Tech) - Sem-VII")} Timetable`}
                {selectedView === "LOAD_SHEET" && "Total Staff Load Sheet - Department Workload Allocation"}
                {selectedView === "FACULTY_MASTER" && "Master Personal Faculty Time Table (Synchronized Matrix)"}
                {selectedView === "FACULTY" && `Personal Faculty Schedule: ${getFacultyFullName(selectedFaculty)} (${selectedFaculty})`}
                {selectedView === "ROOM_MASTER" && "Master Classroom Time Table (All Theory Lecture Halls)"}
                {selectedView === "ROOM" && `Personal Classroom Schedule: ${selectedRoom}`}
                {(selectedView === "LAB" || selectedView === "LAB_MASTER") && `Laboratory Schedule: ${selectedLab === "ALL" || selectedView === "LAB_MASTER" ? "Lab Master Time Table (All Labs Overview)" : `Lab Personal Time Table (${selectedLab})`}`}
              </h2>
              <div className="header-sub-info">
                <span>Department of Information Technology</span>
                <span className="dot-sep">•</span>
                <span>Rajarambapu Institute of Technology</span>
              </div>
            </div>
            <div className="header-card-right no-print">
              <span className="badge-dept">IT Department</span>
            </div>
          </>
        )}
      </div>

      {/* Save Status / Feedback Toast Banner */}
      {saveStatusMessage && (
        <div className="no-print" style={{
          margin: "0 0 12px",
          padding: "12px 18px",
          borderRadius: "8px",
          background: saveStatusMessage.type === "success" ? "#dcfce7" : (saveStatusMessage.type === "error" ? "#fee2e2" : "#eff6ff"),
          border: `1.5px solid ${saveStatusMessage.type === "success" ? "#86efac" : (saveStatusMessage.type === "error" ? "#fca5a5" : "#93c5fd")}`,
          color: saveStatusMessage.type === "success" ? "#166534" : (saveStatusMessage.type === "error" ? "#991b1b" : "#1e40af"),
          fontSize: "13px",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)"
        }}>
          <span>{saveStatusMessage.text}</span>
          <button
            type="button"
            onClick={() => setSaveStatusMessage(null)}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontWeight: 800, color: "inherit", fontSize: "14px", padding: "2px 6px" }}
          >
            ✕
          </button>
        </div>
      )}



      {/* Control Actions Bar */}
      <div className="master-actions-bar no-print">
        <div className="view-selector">
          <button
            className={`view-btn ${selectedView === "ALL" ? "active" : ""}`}
            onClick={() => setSelectedView("ALL")}
          >
            📋 Master Department View
          </button>
          <button
            className={`view-btn ${selectedView === "CLASS" ? "active" : ""}`}
            onClick={() => setSelectedView("CLASS")}
          >
            🎓 Student Class Views
          </button>
          <button
            className={`view-btn ${selectedView === "FACULTY" ? "active" : ""}`}
            onClick={() => setSelectedView("FACULTY")}
          >
            👨‍🏫 Faculty Personal Timetables
          </button>
          <button
            className={`view-btn ${selectedView === "LAB" ? "active" : ""}`}
            onClick={() => setSelectedView("LAB")}
          >
            🔬 Computer Lab Occupancy
          </button>
        </div>

        <div className="action-buttons">
          <button
            className={`btn-secondary ${swapModeEnabled ? "active" : ""}`}
            onClick={() => {
              setSwapModeEnabled(!swapModeEnabled);
              setSwapSource(null);
              setSwapHover(null);
              setSwapAlert(null);
            }}
            style={{
              background: swapModeEnabled ? "#dbeafe" : "#ffffff",
              borderColor: swapModeEnabled ? "#2563eb" : "#cbd5e1",
              fontWeight: 600,
              color: swapModeEnabled ? "#1d4ed8" : "#334155"
            }}
          >
            🔄 {swapModeEnabled ? "Exit Swap Mode" : "Period Swap Mode"}
          </button>
          {!swapModeEnabled && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                background: "#f0fdf4",
                color: "#166534",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1.5px solid #86efac",
                minWidth: "220px",
                boxShadow: "0 1px 2px rgba(22, 163, 74, 0.08)",
                cursor: "pointer",
                userSelect: "none"
              }}
              onClick={() => {
                setSwapAlert({
                  type: "info",
                  text: "💡 In-Place Edit is active! Click any cell in the timetable below to edit Faculty, Room, or practical batches."
                });
              }}
              title="Click directly on any slot in the timetable below to edit Faculty or Room"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "12px", color: "#15803d", whiteSpace: "nowrap" }}>
                <span>✏️ In-Place Edit Mode</span>
                <span style={{ fontSize: "9.5px", background: "#dcfce7", color: "#166534", padding: "1px 5px", borderRadius: "10px", border: "1px solid #bbf7d0", fontWeight: 700 }}>ACTIVE</span>
              </div>
              <div style={{ fontSize: "11px", color: "#166534", marginTop: "2px", whiteSpace: "nowrap" }}>
                Click any slot to change Faculty / Room
              </div>
            </div>
          )}
          {swapHistory.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                justifyContent: "center",
                minWidth: "150px"
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={handleUndoSwap}
                style={{
                  background: "#fef3c7",
                  borderColor: "#f59e0b",
                  color: "#92400e",
                  fontWeight: 700,
                  fontSize: "12px",
                  padding: swapHistory.length > 1 ? "6px 12px" : "10px 14px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  flex: swapHistory.length > 1 ? "1" : "initial"
                }}
                title={`Revert only the last swap (${swapHistory.length} step${swapHistory.length === 1 ? "" : "s"} recorded)`}
              >
                <span>↩ Revert Swap ({swapHistory.length})</span>
              </button>
              {swapHistory.length > 1 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleRevertAllChanges}
                  style={{
                    background: "#fee2e2",
                    borderColor: "#ef4444",
                    color: "#991b1b",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    padding: "5px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    whiteSpace: "nowrap",
                    flex: "1"
                  }}
                  title="Revert all swaps back to original schedule at once"
                >
                  <span>✕ Revert All</span>
                </button>
              )}
            </div>
          )}
          {/* ONLY 2 ACTION BUTTONS: SAVE AND RESET */}
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleSaveAllData(false)}
            style={{
              background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
              borderColor: "#15803d",
              color: "white",
              fontWeight: 700,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)",
              padding: "8px 18px",
              borderRadius: "6px",
              cursor: "pointer"
            }}
            title={lastSavedTime ? `Instantly save all current updates. Last saved: ${lastSavedTime}` : "Save all department data, course allotments, and generated timetables"}
          >
            💾 Save
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setResetModalOpen(true)}
            style={{
              background: "#ffffff",
              borderColor: "#cbd5e1",
              color: "#1e293b",
              fontWeight: 700,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer"
            }}
            title="Reset options: Reload from last saved point, Reset to RIT Benchmark Preset, or Reset to Blank Canvas"
          >
            🔄 Reset
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowInputManager(!showInputManager)}
            style={{ background: showInputManager ? "#dbeafe" : "#ffffff", borderColor: "#3b82f6" }}
          >
            ⚙ {showInputManager ? "Hide Input Manager" : "Manage Department Inputs"}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleGenerate(inputs, false)}
            disabled={loading}
            title={hasManualAdjustments ? "Maintains your existing timetable with all period swaps" : "Generate 3-Year Timetable"}
          >
            {loading ? "⚡ Generating..." : (hasManualAdjustments ? "⚡ Generate 3-Year Timetable (Keep Swaps)" : "⚡ Generate 3-Year Timetable")}
          </button>
          {hasManualAdjustments && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (window.confirm("Generate a fresh timetable from scratch? This will discard your current manual period swaps.")) {
                  handleGenerate(inputs, true);
                }
              }}
              disabled={loading}
              style={{ fontSize: "11.5px", padding: "6px 10px", color: "#64748b" }}
              title="Discard manual swaps and regenerate schedule from scratch"
            >
              🔄 Fresh Regeneration
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={() => window.print()}
          >
            🖨 Print / Export PDF
          </button>

          {/* Quick Excel Export Actions */}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (selectedView === "CLASS") {
                handleExportCurrentClassExcel(selectedClassYear);
              } else if (selectedView === "FACULTY") {
                const facSched = getFacultySchedule(selectedFaculty);
                const asgn = getFacultyAssignments(selectedFaculty);
                const facObj = (inputs.faculties || []).find((f) => f.name === selectedFaculty);
                exportPersonalTimetableToExcel({
                  facultyCode: selectedFaculty,
                  facultyName: getFacultyFullName(selectedFaculty),
                  designation: facObj?.designation || "Assistant Professor",
                  centralAuthority: facObj?.centralAuthority || "None",
                  academicSession,
                  academicSemester,
                  facSched,
                  assignments: asgn
                });
              } else {
                exportMasterDepartmentToExcel({
                  academicSession,
                  academicSemester,
                  masterData,
                  inputs,
                  periodTimings
                });
              }
            }}
            disabled={!masterData}
            title="Export timetable directly as an Excel spreadsheet (.xlsx)"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#ecfdf5",
              color: "#065f46",
              borderColor: "#a7f3d0",
              fontWeight: 700
            }}
          >
            📥 Export to Excel (.xlsx)
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => exportMasterDepartmentToExcel({
              academicSession,
              academicSemester,
              masterData,
              inputs,
              periodTimings
            })}
            disabled={!masterData}
            title="Export complete departmental multi-sheet master workbook (SY, TY, BTech, Master, and Staff Load)"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              backgroundColor: "#f0fdf4",
              color: "#166534",
              borderColor: "#bbf7d0",
              fontWeight: 600,
              fontSize: "12px"
            }}
          >
            📑 Master Workbook (.xlsx)
          </button>
        </div>
      </div>

      {/* Sub-view Selector for Student Class View */}
      {selectedView === "CLASS" && (
        <div className="sub-view-bar no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span className="sub-view-label">Select Academic Class:</span>
            <button
              type="button"
              className={`sub-view-btn ${selectedClassYear === "SY" ? "active" : ""}`}
              onClick={() => setSelectedClassYear("SY")}
            >
              S.Y. B.Tech — {academicSemester === "PART-I" ? "Sem-III" : "Sem-IV"} (Room {getClassroom("SY")})
            </button>
            <button
              type="button"
              className={`sub-view-btn ${selectedClassYear === "TY" ? "active" : ""}`}
              onClick={() => setSelectedClassYear("TY")}
            >
              T.Y. B.Tech — {academicSemester === "PART-I" ? "Sem-V" : "Sem-VI"} (Room {getClassroom("TY")})
            </button>
            <button
              type="button"
              className={`sub-view-btn ${selectedClassYear === "BTECH" ? "active" : ""}`}
              onClick={() => setSelectedClassYear("BTECH")}
            >
              Final Year B.Tech — {academicSemester === "PART-I" ? "Sem-VII" : "Sem-VIII"} (Room {getClassroom("BTECH")})
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <select
              value={academicSession}
              onChange={(e) => setAcademicSession(e.target.value)}
              style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", fontWeight: 700 }}
              title="Select Academic Session"
            >
              <option value="2026-27">Session 2026-27</option>
              <option value="2025-26">Session 2025-26</option>
              <option value="2024-25">Session 2024-25</option>
              <option value="2023-24">Session 2023-24</option>
            </select>
            <select
              value={academicSemester}
              onChange={(e) => setAcademicSemester(e.target.value)}
              style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", fontWeight: 700 }}
              title="Select Semester Term (PART-I: Odd Sems, PART-II: Even Sems)"
            >
              <option value="PART-I">PART-I (Odd: Sem III, V, VII)</option>
              <option value="PART-II">PART-II (Even: Sem IV, VI, VIII)</option>
            </select>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleExportCurrentClassExcel(selectedClassYear)}
              disabled={!masterData}
              style={{
                fontSize: "12px",
                padding: "5px 12px",
                background: "#10b981",
                color: "white",
                borderColor: "#059669",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
              title={`Download ${selectedClassYear} ${getSemesterForYear(selectedClassYear, academicSemester)} Timetable (.xlsx)`}
            >
              📥 Download {selectedClassYear} Excel (.xlsx)
            </button>
          </div>
        </div>
      )}

      {/* Sub-view Selector for Faculty View */}
      {selectedView === "FACULTY" && (
        <div className="sub-view-bar no-print">
          <span className="sub-view-label">Select Faculty Member:</span>
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              fontWeight: 600,
              minWidth: "260px"
            }}
          >
            {(inputs.faculties || []).map((f) => {
              const asgn = getFacultyAssignments(f.name);
              const desigStr = f.designation || "Assistant Professor";
              const authStr = f.centralAuthority && f.centralAuthority !== "None" ? ` - ${f.centralAuthority}` : "";
              return (
                <option key={f.name} value={f.name}>
                  {f.name} - {f.fullName || f.name} [{desigStr}{authStr}] ({asgn.totalHours} hrs/wk · Max: {f.maxDailyLectures || 4}/day)
                </option>
              );
            })}
          </select>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginLeft: "10px" }}>
            {(inputs.faculties || []).map((f) => {
              const asgn = getFacultyAssignments(f.name);
              const desigStr = f.designation || "Assistant Professor";
              const authStr = f.centralAuthority && f.centralAuthority !== "None" ? ` (${f.centralAuthority})` : "";
              return (
                <button
                  key={f.name}
                  type="button"
                  className={`sub-view-btn ${selectedFaculty === f.name ? "active" : ""}`}
                  onClick={() => setSelectedFaculty(f.name)}
                  style={{ fontSize: "11px", padding: "4px 8px" }}
                  title={`${f.fullName || f.name} - ${desigStr}${authStr} (${asgn.totalHours} hrs/week load)`}
                >
                  {f.name} <span style={{ opacity: 0.8, fontSize: "10px" }}>({asgn.totalHours}h)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-view Selector for Lab View */}
      {(selectedView === "LAB" || selectedView === "LAB_MASTER") && (
        <div className="sub-view-bar no-print">
          <span className="sub-view-label">Select Computer Laboratory:</span>
          <button
            type="button"
            className={`sub-view-btn ${selectedLab === "ALL" ? "active" : ""}`}
            onClick={() => setSelectedLab("ALL")}
          >
            📊 All Labs Overview
          </button>
          {["IL1", "IL2", "IL3", "IL4", "IL5", "IL6"].map((lab) => (
            <button
              key={lab}
              type="button"
              className={`sub-view-btn ${selectedLab === lab ? "active" : ""}`}
              onClick={() => setSelectedLab(lab)}
            >
              {lab}
            </button>
          ))}
        </div>
      )}

      {/* Sub-view Selector for Classroom View */}
      {selectedView === "ROOM" && (
        <div className="sub-view-bar no-print">
          <span className="sub-view-label">Select Lecture Classroom:</span>
          {getAllClassrooms().map((r) => (
            <button
              key={r.code}
              type="button"
              className={`sub-view-btn ${selectedRoom === r.code ? "active" : ""}`}
              onClick={() => setSelectedRoom(r.code)}
            >
              🏛️ {r.label}
            </button>
          ))}
          <button
            type="button"
            className="sub-view-btn"
            style={{ marginLeft: "auto", background: "#f1f5f9", color: "#2563eb", fontWeight: 700 }}
            onClick={() => setSelectedView("ROOM_MASTER")}
          >
            📊 View Master Classroom Matrix →
          </button>
        </div>
      )}

      {/* Sub-view Selector for Master Classroom View */}
      {selectedView === "ROOM_MASTER" && (
        <div className="sub-view-bar no-print">
          <span className="sub-view-label">Classrooms Matrix:</span>
          <span style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>
            Showing synchronized schedules for CR-27 (SY), CR-26 (TY) and CR-212 (BTech)
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
            {getAllClassrooms().map((r) => (
              <button
                key={r.code}
                type="button"
                className="sub-view-btn"
                style={{ fontSize: "11px", padding: "3px 8px" }}
                onClick={() => {
                  setSelectedRoom(r.code);
                  setSelectedView("ROOM");
                }}
              >
                Go to {r.code} →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sub-view Selector for Faculty Master View */}
      {selectedView === "FACULTY_MASTER" && (
        <div className="sub-view-bar no-print">
          <span className="sub-view-label">Filter By Working Day:</span>
          {[
            { id: "ALL", label: "📅 All Working Days (Mon - Fri)" },
            { id: "MONDAY", label: "Monday" },
            { id: "TUESDAY", label: "Tuesday" },
            { id: "WEDNESDAY", label: "Wednesday" },
            { id: "THURSDAY", label: "Thursday" },
            { id: "FRIDAY", label: "Friday" }
          ].map((d) => (
            <button
              key={d.id}
              type="button"
              className={`sub-view-btn ${facultyMasterDay === d.id ? "active" : ""}`}
              onClick={() => setFacultyMasterDay(d.id)}
            >
              {d.label}
            </button>
          ))}
          <button
            type="button"
            className="btn-secondary no-print"
            onClick={() => window.print()}
            style={{ marginLeft: "auto", padding: "4px 10px", fontSize: "12px" }}
          >
            🖨️ Print Master Sheet
          </button>
        </div>
      )}

      {/* Sub-view Selector for Total Staff Load Sheet View */}
      {selectedView === "LOAD_SHEET" && (
        <div className="sub-view-bar no-print">
          <span className="sub-view-label">Staff Load Sheet:</span>
          <span style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>
            Department of Information Technology • Academic Faculty Teaching & Lab Workload
          </span>
          <button
            type="button"
            className="btn-secondary no-print"
            onClick={() => window.print()}
            style={{ marginLeft: "auto", padding: "4px 10px", fontSize: "12px" }}
          >
            🖨️ Print Load Sheet
          </button>
        </div>
      )}

      {/* Swap Mode Guidance Bar */}
      {swapModeEnabled && (
        <div className="no-print" style={{
          background: swapSource ? "#eff6ff" : "#f8fafc",
          border: `2px dashed ${swapSource ? "#3b82f6" : "#94a3b8"}`,
          borderRadius: "8px",
          padding: "12px 18px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <div>
            <strong style={{ color: "#1e40af", fontSize: "13.5px" }}>
              🔄 Interactive Period Swap Mode Active
            </strong>
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
              {!swapSource ? (
                "👉 Click any lecture slot or 2-Hour Lab Block in SY, TY, or B.Tech to select it as the swap source."
              ) : (
                <span>
                  Selected: <strong>{swapSource.year} - {isPracticalInBlock(swapSource.year, swapSource.day, swapSource.period) ? `2-Hour Lab Block (${swapSource.cell?.course || "Lab"}) [${swapSource.day} P${getBlockPeriods(swapSource.period)[0]}-P${getBlockPeriods(swapSource.period)[1]}]` : `${swapSource.cell?.course && swapSource.cell.course !== "—" ? swapSource.cell.course : "Empty Slot"} (${swapSource.day} Period ${swapSource.period})`}</strong>.
                  Click target slot/block in {swapSource.year} to swap!
                </span>
              )}
            </div>
            {swapHover && swapSource && (
              <div style={{ fontSize: "11.5px", marginTop: "4px", fontWeight: 600, color: validateSwap(swapSource, swapHover).valid ? "#16a34a" : "#dc2626" }}>
                Target [{swapHover.day} {(isPracticalInBlock(swapSource.year, swapSource.day, swapSource.period) || isPracticalInBlock(swapHover.year, swapHover.day, swapHover.period)) ? `P${getBlockPeriods(swapHover.period)[0]}-P${getBlockPeriods(swapHover.period)[1]}` : `P${swapHover.period}`}]: {validateSwap(swapSource, swapHover).reason}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {swapSource && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setSwapSource(null); setSwapHover(null); }}
                style={{ fontSize: "12px", padding: "4px 10px" }}
              >
                Cancel Selection
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setSwapModeEnabled(false); setSwapSource(null); setSwapHover(null); }}
              style={{ fontSize: "12px", padding: "4px 10px" }}
            >
              Done / Exit
            </button>
          </div>
        </div>
      )}

      {/* Swap Alert Message */}
      {swapAlert && (
        <div className="no-print" style={{
          padding: "10px 16px",
          borderRadius: "6px",
          marginBottom: "14px",
          fontSize: "12.5px",
          fontWeight: 600,
          background: swapAlert.type === "success" ? "#dcfce7" : (swapAlert.type === "error" ? "#fee2e2" : "#e0e7ff"),
          color: swapAlert.type === "success" ? "#166534" : (swapAlert.type === "error" ? "#991b1b" : "#1e40af"),
          border: `1px solid ${swapAlert.type === "success" ? "#86efac" : (swapAlert.type === "error" ? "#fca5a5" : "#a5b4fc")}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{swapAlert.text}</span>
          <button
            onClick={() => setSwapAlert(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "14px", color: "inherit" }}
          >
            ×
          </button>
        </div>
      )}

      {/* Interactive Input Manager Drawer */}
      {showInputManager && (
        <div className="input-manager-box no-print" style={{
          background: "white",
          border: "2px solid #3b82f6",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "20px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, color: "#1e3a8a" }}>
              🛠 Department Data Inputs: Configure All 3 Years Without Conflicts
            </h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleExportJson}
                className="btn-secondary"
                style={{ fontSize: "12px", padding: "6px 12px" }}
                title="Backup complete department configuration to a JSON file"
              >
                📥 Export JSON
              </button>
              <label
                className="btn-secondary"
                style={{ fontSize: "12px", padding: "6px 12px", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                title="Load department configuration from JSON file"
              >
                📤 Import JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  style={{ display: "none" }}
                />
              </label>
              <button
                type="button"
                onClick={handleResetToPreset}
                className="btn-secondary"
                style={{ fontSize: "12px", padding: "6px 12px" }}
                title="Reset back to RIT Department Benchmark configuration"
              >
                🔄 Reset to RIT Preset
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewYearSetupSession(academicSession);
                  setNewYearSetupSemester(academicSemester);
                  setNewYearSetupScope("ALL");
                  setNewYearModalOpen(true);
                }}
                className="btn-secondary"
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  background: "#f0fdf4",
                  color: "#166534",
                  borderColor: "#86efac",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
                title="Import last year's faculties, courses, classrooms & labs only, clearing teacher allocations so you can allot fresh and calculate load"
              >
                ✨ New Year/Sem Setup (Import Base Data)
              </button>
              <button
                type="button"
                onClick={handleResetToBlank}
                className="btn-secondary"
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  borderColor: "#fca5a5",
                  fontWeight: 700
                }}
                title="Erase all current data to start entering brand new data from a blank configuration"
              >
                🗑️ Reset to Blank
              </button>
            </div>
          </div>

          <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#475569" }}>
            The generator takes these subjects, faculty members, classrooms, and labs, and runs a synchronized constraint engine ensuring <strong>no teacher or classroom is double-booked across SY, TY, or BTech</strong>.
          </p>

          {/* Academic Year & Semester Configuration Bar */}
          <div style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)",
            border: "1px solid #7dd3fc",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#0369a1", textTransform: "uppercase" }}>
                  Academic Session
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <select
                    value={academicSession}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__ADD_NEW__") {
                        setNewYearSetupSession(academicSession);
                        setNewYearSetupSemester(academicSemester);
                        setShowCustomSessionField(true);
                        setNewYearModalOpen(true);
                        return;
                      }
                      setAcademicSession(val);
                      const savedForSession = localStorage.getItem(`payload_${val}_${academicSemester}`);
                      if (savedForSession) {
                        try {
                          const parsed = JSON.parse(savedForSession);
                          setInputs(parsed);
                        } catch (err) {}
                      }
                    }}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "6px",
                      border: "1px solid #0284c7",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#0f172a",
                      background: "white"
                    }}
                    title="Select Academic Year Session"
                  >
                    {availableSessions.map((sess) => (
                      <option key={sess} value={sess}>{sess}</option>
                    ))}
                    <option value="__ADD_NEW__">+ Add New Session...</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setNewYearSetupSession(academicSession);
                      setNewYearSetupSemester(academicSemester);
                      setNewYearSetupScope("ALL");
                      setNewYearModalOpen(true);
                    }}
                    style={{
                      background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "5px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      boxShadow: "0 2px 4px rgba(37,99,235,0.2)"
                    }}
                    title="Setup fresh timetable for this academic year/semester by importing faculties, courses, classrooms & labs"
                  >
                    ✨ Setup New Timetable
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#0369a1", textTransform: "uppercase" }}>
                  Academic Term (2 Semesters / Year)
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setAcademicSemester("PART-I")}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: academicSemester === "PART-I" ? "2px solid #0284c7" : "1px solid #cbd5e1",
                      background: academicSemester === "PART-I" ? "#0284c7" : "white",
                      color: academicSemester === "PART-I" ? "white" : "#334155",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    PART-I (Odd: Sem III, V, VII)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAcademicSemester("PART-II")}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: academicSemester === "PART-II" ? "2px solid #0284c7" : "1px solid #cbd5e1",
                      background: academicSemester === "PART-II" ? "#0284c7" : "white",
                      color: academicSemester === "PART-II" ? "white" : "#334155",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    PART-II (Even: Sem IV, VI, VIII)
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#0369a1", textTransform: "uppercase" }}>
                  Active Semester Mapping
                </span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a", background: "#f8fafc", padding: "4px 8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                  SY: <strong>{academicSemester === "PART-I" ? "Sem-III" : "Sem-IV"}</strong> | TY: <strong>{academicSemester === "PART-I" ? "Sem-V" : "Sem-VI"}</strong> | BTech: <strong>{academicSemester === "PART-I" ? "Sem-VII" : "Sem-VIII"}</strong>
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => handleExportCurrentClassExcel(selectedClassYear)}
                disabled={!masterData}
                className="btn-secondary"
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  background: "#10b981",
                  color: "white",
                  borderColor: "#059669",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
                title={`Export ${selectedClassYear} ${getSemesterForYear(selectedClassYear, academicSemester)} Timetable to Excel (.xlsx)`}
              >
                📥 Export {selectedClassYear} ({getSemesterForYear(selectedClassYear, academicSemester)}) (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => exportMasterDepartmentToExcel({
                  academicSession,
                  academicSemester,
                  masterData,
                  inputs,
                  periodTimings
                })}
                disabled={!masterData}
                className="btn-secondary"
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  background: "#0284c7",
                  color: "white",
                  borderColor: "#0369a1",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
                title="Export complete departmental multi-sheet master workbook (SY, TY, BTech, and Staff Load Sheet) to Excel (.xlsx)"
              >
                📑 Export Full Master (.xlsx)
              </button>
            </div>
          </div>

          {/* Sub Tabs */}
          <div style={{ display: "flex", gap: "8px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
            {[
              { id: "SY", label: `📘 SY IT Subjects (${inputs.yearData.SY?.subjects?.length || 0})` },
              { id: "TY", label: `📗 TY IT Subjects (${inputs.yearData.TY?.subjects?.length || 0})` },
              { id: "BTECH", label: `📙 B.Tech IT Subjects (${inputs.yearData.BTECH?.subjects?.length || 0})` },
              {
                id: "PRACTICALS",
                label: `🔬 Lab Practicals (${(inputs.yearData.SY?.practicals?.length || 0) + (inputs.yearData.TY?.practicals?.length || 0) + (inputs.yearData.BTECH?.practicals?.length || 0)})`
              },
              {
                id: "FIXED",
                label: `📌 Fixed & FY Loads (${(inputs.yearData.SY?.fixedSlots?.length || 0) + (inputs.yearData.TY?.fixedSlots?.length || 0) + (inputs.yearData.BTECH?.fixedSlots?.length || 0) + (inputs.externalLoads?.length || 0)})`
              },
              { id: "FACULTY", label: `👨‍🏫 Shared Faculty (${inputs.faculties?.length || 0})` },
              { id: "UNAVAILABILITY", label: `🚫 Faculty Off-Slots (${inputs.facultyUnavailability?.length || 0})` },
              { id: "ROOMS", label: `🏫 Classrooms & Labs (${inputs.rooms?.length || 0})` }
            ].map((tab) => {
              const isActive = activeInputTab === tab.id;
              const bg = isActive ? "#1e40af" : "#f1f5f9";
              const textCol = isActive ? "white" : "#334155";

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveInputTab(tab.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: bg,
                    color: textCol,
                    fontWeight: 600,
                    fontSize: "12.5px",
                    cursor: "pointer"
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab: Faculty */}
          {activeInputTab === "FACULTY" && (() => {
            const facultiesList = inputs.faculties || [];
            let totalDeptAssignedHours = 0;
            facultiesList.forEach((f) => {
              totalDeptAssignedHours += getFacultyAssignments(f.name).totalHours;
            });
            const avgLoad = facultiesList.length > 0 ? (totalDeptAssignedHours / facultiesList.length).toFixed(1) : "0.0";

            return (
              <div>
                {/* Department Faculty Capacity Overview Banner */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  fontSize: "13px",
                  flexWrap: "wrap",
                  gap: "10px"
                }}>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: "#166534" }}>
                      👨‍🏫 Department Faculty: <strong>{facultiesList.length} Teachers</strong>
                    </span>
                    <span style={{ color: "#475569" }}>
                      Total Weekly Load Assigned: <strong>{totalDeptAssignedHours} hrs</strong>
                    </span>
                    <span style={{ color: "#0284c7", fontWeight: 600 }}>
                      Department Average: <strong>{avgLoad} hrs/faculty</strong>
                    </span>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowReassignPanel(!showReassignPanel)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        background: showReassignPanel ? "#1e40af" : "#ffffff",
                        color: showReassignPanel ? "#ffffff" : "#1e40af",
                        border: "1px solid #2563eb",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      🔄 {showReassignPanel ? "Hide Reassign Tool" : "1-Click Reassign & Replace Faculty"}
                    </button>
                  </div>
                </div>

                {/* Feedback message banner */}
                {reassignFeedback && (
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    marginBottom: "14px",
                    fontSize: "12.5px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: reassignFeedback.type === "error" ? "#fef2f2" : "#f0fdf4",
                    border: `1px solid ${reassignFeedback.type === "error" ? "#fca5a5" : "#86efac"}`,
                    color: reassignFeedback.type === "error" ? "#991b1b" : "#166534"
                  }}>
                    <span>{reassignFeedback.text}</span>
                    <button
                      type="button"
                      onClick={() => setReassignFeedback(null)}
                      style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700 }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* 1-Click Reassign / Replace Load Panel */}
                {showReassignPanel && (
                  <div style={{
                    background: "#eff6ff",
                    border: "2px dashed #3b82f6",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "18px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <strong style={{ color: "#1e40af", fontSize: "14px" }}>
                        🔄 1-Click Transfer All Teaching Load (Reassign / Replace)
                      </strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        Transfers SY/TY/BTech theory subjects, lab practicals, fixed mentoring, and FY loads.
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end" }}>
                      <div style={{ flex: 1, minWidth: "220px" }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                          Transfer From (Departing / Overloaded Faculty):
                        </label>
                        <select
                          value={reassignSource}
                          onChange={(e) => setReassignSource(e.target.value)}
                          style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", fontWeight: 600 }}
                        >
                          <option value="">-- Select Source Faculty --</option>
                          {facultiesList.map((f) => {
                            const asgn = getFacultyAssignments(f.name);
                            return (
                              <option key={f.name} value={f.name}>
                                {f.name} - {f.fullName || f.name} ({asgn.totalHours} hrs assigned)
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", paddingBottom: "8px", fontSize: "18px", color: "#2563eb", fontWeight: 700 }}>
                        ➔
                      </div>

                      <div style={{ flex: 1, minWidth: "220px" }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                          Transfer To (New / Available Faculty):
                        </label>
                        <select
                          value={reassignTarget}
                          onChange={(e) => setReassignTarget(e.target.value)}
                          style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", fontWeight: 600 }}
                        >
                          <option value="">-- Select Target Faculty --</option>
                          {facultiesList
                            .filter((f) => f.name !== reassignSource)
                            .map((f) => {
                              const asgn = getFacultyAssignments(f.name);
                              return (
                                <option key={f.name} value={f.name}>
                                  {f.name} - {f.fullName || f.name} ({asgn.totalHours} hrs · Max: {f.maxDailyLectures}/day)
                                </option>
                              );
                            })}
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={!reassignSource || !reassignTarget}
                        onClick={() => handleReplaceFaculty(reassignSource, reassignTarget, false)}
                        className="btn-primary"
                        style={{
                          padding: "8px 18px",
                          fontSize: "13px",
                          fontWeight: 700,
                          background: (!reassignSource || !reassignTarget) ? "#94a3b8" : "#2563eb",
                          cursor: (!reassignSource || !reassignTarget) ? "not-allowed" : "pointer"
                        }}
                      >
                        ⚡ Transfer All Load
                      </button>
                    </div>

                    {reassignSource && (() => {
                      const srcAsgn = getFacultyAssignments(reassignSource);
                      return (
                        <div style={{ marginTop: "10px", padding: "8px 12px", background: "#ffffff", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>
                          <strong>{reassignSource} currently teaches {srcAsgn.totalHours} hours:</strong>{" "}
                          {srcAsgn.theorySubjects.map((s) => `${s.year} ${s.code} (${s.weeklyPeriods}h)`).join(", ")}
                          {srcAsgn.labCourses.length > 0 && ` | Labs: ${srcAsgn.labCourses.map((l) => `${l.year} ${l.code}`).join(", ")}`}
                          {srcAsgn.fixedSlots.length > 0 && ` | Fixed: ${srcAsgn.fixedSlots.map((fs) => `${fs.year} ${fs.course}`).join(", ")}`}
                          {srcAsgn.externalLoads.length > 0 && ` | FY: ${srcAsgn.externalLoads.map((e) => e.loadType).join(", ")}`}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Add New Faculty Form */}
                <form onSubmit={handleAddFaculty} style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Short Code (e.g. ABP)"
                    value={newFacultyName}
                    onChange={(e) => setNewFacultyName(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "130px" }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Full Name (e.g. Dr. A. B. Patil)"
                    value={newFacultyFullName}
                    onChange={(e) => setNewFacultyFullName(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", flex: 1, minWidth: "180px" }}
                  />
                  <select
                    value={newFacultyDesignation}
                    onChange={(e) => setNewFacultyDesignation(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", minWidth: "165px", background: "#ffffff", fontWeight: 500 }}
                    title="Post / Designation"
                  >
                    {FACULTY_DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    value={newFacultyAuthority}
                    onChange={(e) => setNewFacultyAuthority(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: newFacultyAuthority !== "None" ? "1px solid #c084fc" : "1px solid #cbd5e1",
                      background: newFacultyAuthority !== "None" ? "#faf5ff" : "#ffffff",
                      color: newFacultyAuthority !== "None" ? "#7e22ce" : "#334155",
                      fontWeight: newFacultyAuthority !== "None" ? 700 : 500,
                      minWidth: "155px"
                    }}
                    title="Central Authority (HOD, TPO, TPC, or None)"
                  >
                    {CENTRAL_AUTHORITIES.map((a) => (
                      <option key={a} value={a}>{a === "None" ? "Authority: None" : `Authority: ${a}`}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    placeholder="Max Daily"
                    value={newFacultyMaxLectures}
                    onChange={(e) => setNewFacultyMaxLectures(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "95px" }}
                    title="Maximum lecture hours per day"
                  />
                  <button type="submit" className="btn-primary" style={{ padding: "8px 16px" }}>
                    + Add New Faculty
                  </button>
                </form>

                {/* Comprehensive Faculty Workload & Allocation Table */}
                <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                        <th style={{ padding: "10px 8px", width: "65px" }}>Code</th>
                        <th style={{ padding: "10px 8px", minWidth: "150px" }}>Faculty Full Name</th>
                        <th style={{ padding: "10px 8px", minWidth: "155px" }}>Post / Designation</th>
                        <th style={{ padding: "10px 8px", width: "115px" }}>Authority</th>
                        <th style={{ padding: "10px 8px", width: "85px" }}>Daily Cap</th>
                        <th style={{ padding: "10px 8px", minWidth: "150px" }}>Theory Classes (SY/TY/BTech)</th>
                        <th style={{ padding: "10px 8px", minWidth: "130px" }}>Practical Labs</th>
                        <th style={{ padding: "10px 8px", minWidth: "110px" }}>Fixed & FY Load</th>
                        <th style={{ padding: "10px 8px", width: "85px" }}>Total Load</th>
                        <th style={{ padding: "10px 8px", width: "120px" }}>Capacity Status</th>
                        <th style={{ padding: "10px 8px", textAlign: "center", width: "130px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facultiesList.map((f) => {
                        const asgn = getFacultyAssignments(f.name);
                        const totalHours = asgn.totalHours;

                        let badgeBg = "#dcfce7";
                        let badgeColor = "#15803d";
                        let badgeBorder = "#86efac";
                        let badgeText = "✓ Balanced";

                        if (totalHours < 8) {
                          badgeBg = "#e0f2fe";
                          badgeColor = "#0369a1";
                          badgeBorder = "#7dd3fc";
                          badgeText = "🟢 Available (<8h)";
                        } else if (totalHours > 16) {
                          badgeBg = "#fef3c7";
                          badgeColor = "#b45309";
                          badgeBorder = "#fcd34d";
                          badgeText = "🟠 High Load (>16h)";
                        }

                        return (
                          <tr key={f.name} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "8px", fontWeight: 700, color: "#1e3a8a" }}>
                              <span
                                onClick={() => handleOpenEditFacultyModal(f)}
                                style={{
                                  background: "#eff6ff",
                                  border: "1px solid #bfdbfe",
                                  padding: "3px 7px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                                title="Click to edit faculty code and full details"
                              >
                                {f.name}
                                <span style={{ fontSize: "10px", color: "#2563eb" }}>✏️</span>
                              </span>
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <input
                                type="text"
                                value={f.fullName || f.name}
                                onChange={(e) => handleUpdateFaculty(f.name, "fullName", e.target.value)}
                                placeholder="Faculty Full Name"
                                style={{
                                  width: "100%",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid #cbd5e1",
                                  fontWeight: 600,
                                  fontSize: "12px",
                                  color: "#0f172a",
                                  background: "white",
                                  boxSizing: "border-box"
                                }}
                                title="Edit faculty full name inline"
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <select
                                value={f.designation || "Assistant Professor"}
                                onChange={(e) => handleUpdateFaculty(f.name, "designation", e.target.value)}
                                style={{ padding: "4px 6px", fontSize: "11.5px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#f8fafc", width: "100%", cursor: "pointer", fontWeight: 500 }}
                                title="Change Post / Designation"
                              >
                                {FACULTY_DESIGNATIONS.map((d) => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: "8px" }}>
                              <select
                                value={f.centralAuthority || "None"}
                                onChange={(e) => handleUpdateFaculty(f.name, "centralAuthority", e.target.value)}
                                style={{
                                  padding: "4px 6px",
                                  fontSize: "11.5px",
                                  borderRadius: "4px",
                                  border: (f.centralAuthority && f.centralAuthority !== "None") ? "1px solid #c084fc" : "1px solid #cbd5e1",
                                  background: (f.centralAuthority && f.centralAuthority !== "None") ? "#faf5ff" : "#f8fafc",
                                  color: (f.centralAuthority && f.centralAuthority !== "None") ? "#7e22ce" : "#475569",
                                  fontWeight: (f.centralAuthority && f.centralAuthority !== "None") ? 700 : 500,
                                  width: "100%",
                                  cursor: "pointer"
                                }}
                                title="Change Central Authority (HOD, TPO, TPC, or None)"
                              >
                                {CENTRAL_AUTHORITIES.map((a) => (
                                  <option key={a} value={a}>{a}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                <input
                                  type="number"
                                  min="1"
                                  max="6"
                                  value={f.maxDailyLectures || 4}
                                  onChange={(e) => handleUpdateFaculty(f.name, "maxDailyLectures", Number(e.target.value))}
                                  style={{
                                    width: "42px",
                                    padding: "3px 4px",
                                    borderRadius: "4px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "12px",
                                    textAlign: "center",
                                    fontWeight: 600,
                                    background: "white"
                                  }}
                                  title="Max lecture hours per day"
                                />
                                <span style={{ fontSize: "11px", color: "#64748b" }}>h/d</span>
                              </div>
                            </td>
                            <td style={{ padding: "8px" }}>
                              {asgn.theorySubjects.length === 0 ? (
                                <span style={{ color: "#94a3b8", fontSize: "11.5px" }}>None</span>
                              ) : (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                  {asgn.theorySubjects.map((s, sIdx) => (
                                    <span key={sIdx} style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                                      {s.year}: {s.code} ({s.weeklyPeriods}h)
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "8px" }}>
                              {asgn.labCourses.length === 0 && asgn.practicals.length === 0 ? (
                                <span style={{ color: "#94a3b8", fontSize: "11.5px" }}>None</span>
                              ) : (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                  {asgn.labCourses.map((lc, lIdx) => (
                                    <span key={lIdx} style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                                      {lc.year}: {lc.code} Lab
                                    </span>
                                  ))}
                                  {asgn.practicals.length > 0 && asgn.labCourses.length === 0 && (
                                    <span style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                                      {asgn.practicals.length} Practical session(s)
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "8px" }}>
                              {asgn.fixedSlots.length === 0 && asgn.externalLoads.length === 0 ? (
                                <span style={{ color: "#94a3b8", fontSize: "11.5px" }}>None</span>
                              ) : (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                  {asgn.fixedSlots.map((fs, fIdx) => (
                                    <span key={fIdx} style={{ background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                                      {fs.year}: {fs.course}
                                    </span>
                                  ))}
                                  {asgn.externalLoads.map((ext, eIdx) => (
                                    <span key={`ext-${eIdx}`} style={{ background: "#faf5ff", color: "#6b21a8", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                                      {ext.loadType}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "8px", fontWeight: 700, color: "#1e293b" }}>
                              {totalHours} hrs/wk
                            </td>
                            <td style={{ padding: "8px" }}>
                              <span style={{
                                background: badgeBg,
                                color: badgeColor,
                                border: `1px solid ${badgeBorder}`,
                                padding: "3px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 700,
                                display: "inline-block"
                              }}>
                                {badgeText}
                              </span>
                            </td>
                            <td style={{ padding: "8px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                                <button
                                  type="button"
                                  title={`Edit details, code, and name for ${f.name}`}
                                  onClick={() => handleOpenEditFacultyModal(f)}
                                  style={{
                                    background: "#f0fdf4",
                                    color: "#166534",
                                    border: "1px solid #86efac",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    fontSize: "11px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px"
                                  }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  type="button"
                                  title={`Transfer ${f.name}'s load to another teacher`}
                                  onClick={() => {
                                    setReassignSource(f.name);
                                    setShowReassignPanel(true);
                                  }}
                                  style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "3px 8px", borderRadius: "4px", cursor: "pointer", fontWeight: 600, fontSize: "11px" }}
                                >
                                  🔄 Reassign
                                </button>
                                <button
                                  type="button"
                                  title={`Safe Delete ${f.name}`}
                                  onClick={() => handleDeleteFaculty(f.name)}
                                  style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", padding: "3px 8px", borderRadius: "4px", cursor: "pointer", fontWeight: 600, fontSize: "11px" }}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Tab: Faculty Unavailability & Off-Slots */}
          {activeInputTab === "UNAVAILABILITY" && (
            <div>
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "#991b1b"
              }}>
                <strong>🚫 Teacher Unavailability & Off-Slots:</strong> Lock specific periods where a professor is on leave, off-campus, or attending administrative duties. The scheduling engine strictly guarantees that no classes are assigned to that teacher during locked slots, and period swapping actively blocks any manual clash.
              </div>

              {/* Add Unavailability Form */}
              <form onSubmit={handleAddUnavailability} style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={newUnavailFaculty || inputs.faculties?.[0]?.name || ""}
                  onChange={(e) => setNewUnavailFaculty(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  {(inputs.faculties || []).map((f) => (
                    <option key={f.name} value={f.name}>{f.name} — {f.fullName || f.name}</option>
                  ))}
                </select>

                <select
                  value={newUnavailDay}
                  onChange={(e) => setNewUnavailDay(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  {days.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <select
                  value={newUnavailPeriod}
                  onChange={(e) => setNewUnavailPeriod(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  {periods.map((p, idx) => (
                    <option key={p} value={p}>Period {p} ({periodTimings[idx]})</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Reason (e.g. Leave, Committee Meeting, Research)"
                  value={newUnavailReason}
                  onChange={(e) => setNewUnavailReason(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", flex: 1, minWidth: "200px" }}
                />

                <button
                  type="submit"
                  style={{
                    background: "#dc2626",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "13px"
                  }}
                >
                  + Lock Off-Slot
                </button>
              </form>

              {/* Unavailability Table */}
              <div className="table-responsive">
                <table className="master-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px" }}>#</th>
                      <th style={{ padding: "8px" }}>Faculty</th>
                      <th style={{ padding: "8px" }}>Day</th>
                      <th style={{ padding: "8px" }}>Period & Time</th>
                      <th style={{ padding: "8px" }}>Reason / Notes</th>
                      <th style={{ padding: "8px", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!inputs.facultyUnavailability || inputs.facultyUnavailability.length === 0) ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                          No faculty off-slots configured. All teachers are fully available for all periods.
                        </td>
                      </tr>
                    ) : (
                      inputs.facultyUnavailability.map((un, idx) => {
                        const fCode = un.faculty?.name || un.facultyCode || "—";
                        const fFull = getFacultyFullName(fCode);
                        const pIdx = (un.period >= 1 && un.period <= 6) ? un.period - 1 : 0;
                        return (
                          <tr key={`${fCode}-${un.day}-${un.period}-${idx}`}>
                            <td style={{ padding: "8px", textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                            <td style={{ padding: "8px" }}>
                              <strong style={{ color: "#1e3a8a" }}>{fCode}</strong>
                              {fFull && fFull !== fCode && <span style={{ color: "#64748b", fontSize: "12px", marginLeft: "6px" }}>({fFull})</span>}
                            </td>
                            <td style={{ padding: "8px", fontWeight: 600 }}>{un.day}</td>
                            <td style={{ padding: "8px" }}>
                              <span style={{ background: "#fee2e2", color: "#b91c1c", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontSize: "11.5px" }}>
                                Period {un.period}
                              </span>
                              <span style={{ marginLeft: "6px", color: "#64748b", fontSize: "12px" }}>
                                ({periodTimings[pIdx]})
                              </span>
                            </td>
                            <td style={{ padding: "8px", color: "#475569" }}>
                              {un.reason || "Faculty Off-Slot / Leave"}
                            </td>
                            <td style={{ padding: "8px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteUnavailability(idx)}
                                style={{
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                  border: "1px solid #fecaca",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  fontSize: "11px"
                                }}
                              >
                                🗑️ Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Classrooms & Labs */}
          {activeInputTab === "ROOMS" && (
            <div>
              {/* Year Classroom Assignment Bar */}
              <div style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "16px",
                display: "flex",
                gap: "20px",
                flexWrap: "wrap",
                alignItems: "center"
              }}>
                <strong style={{ color: "#334155", fontSize: "13px" }}>🏫 Primary Classrooms:</strong>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 600 }}>SY Classroom:</span>
                  <select
                    value={inputs.yearData.SY?.defaultRoom || "CR-27"}
                    onChange={(e) => handleUpdateDefaultRoom("SY", e.target.value)}
                    style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                  >
                    {inputs.rooms.filter((r) => r.type === "THEORY").map((r) => (
                      <option key={r.name} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 600 }}>TY Classroom:</span>
                  <select
                    value={inputs.yearData.TY?.defaultRoom || "CR-26"}
                    onChange={(e) => handleUpdateDefaultRoom("TY", e.target.value)}
                    style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                  >
                    {inputs.rooms.filter((r) => r.type === "THEORY").map((r) => (
                      <option key={r.name} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 600 }}>B.Tech Classroom:</span>
                  <select
                    value={inputs.yearData.BTECH?.defaultRoom || "CR-212"}
                    onChange={(e) => handleUpdateDefaultRoom("BTECH", e.target.value)}
                    style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                  >
                    {inputs.rooms.filter((r) => r.type === "THEORY").map((r) => (
                      <option key={r.name} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <form onSubmit={handleAddRoom} style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                <input
                  type="text"
                  placeholder="Room/Lab Code (e.g. CR-101 or IL7)"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", flex: 1 }}
                />
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                >
                  <option value="THEORY">THEORY CLASSROOM</option>
                  <option value="LAB">COMPUTER LAB</option>
                </select>
                <button type="submit" className="btn-primary" style={{ padding: "8px 16px" }}>
                  + Add Room/Lab
                </button>
              </form>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {inputs.rooms.map((r) => (
                  <span key={r.name} style={{
                    background: r.type === "LAB" ? "#fef3c7" : "#e0e7ff",
                    border: `1px solid ${r.type === "LAB" ? "#f59e0b" : "#6366f1"}`,
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    {r.name} ({r.type})
                    <button
                      type="button"
                      onClick={() => handleDeleteRoom(r.name)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "bold" }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3, 4, 5: Year Subjects (SY, TY, BTECH) */}
          {["SY", "TY", "BTECH"].includes(activeInputTab) && (() => {
            const currentYearData = inputs.yearData[activeInputTab] || {};
            const totalWeeklySlots = (inputs.config?.workingDays?.length || 5) * (inputs.config?.periodsPerDay || 6);
            const fixedCount = (currentYearData.fixedSlots || []).length;

            const distinctPracPeriods = new Set();
            (currentYearData.practicals || []).forEach((pr) => {
              const d = (pr.day || "").toUpperCase();
              const periodStr = String(pr.period || "");
              const nums = periodStr.match(/\d+/g);
              if (nums && nums.length > 0) {
                nums.forEach((n) => distinctPracPeriods.add(`${d}-${n}`));
              } else if (Number(periodStr)) {
                distinctPracPeriods.add(`${d}-${periodStr}`);
              }
            });
            const practicalSlots = distinctPracPeriods.size;

            const subjectsList = currentYearData.subjects || [];
            const totalTheoryRequested = subjectsList.reduce((sum, s) => sum + (Number(s.weeklyPeriods) || 0), 0);
            const availableTheorySlots = Math.max(0, totalWeeklySlots - fixedCount - practicalSlots);
            const remainingSlots = availableTheorySlots - totalTheoryRequested;
            const isOverCapacity = totalTheoryRequested > availableTheorySlots;
            const isPerfect = totalTheoryRequested === availableTheorySlots;

            return (
              <div>
                {/* Live Capacity Indicator Banner */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  background: isOverCapacity ? "#fef2f2" : isPerfect ? "#f0fdf4" : "#f0f9ff",
                  border: `1px solid ${isOverCapacity ? "#fca5a5" : isPerfect ? "#86efac" : "#bae6fd"}`,
                  fontSize: "13px"
                }}>
                  <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: "#1e293b" }}>
                      📊 {activeInputTab} Capacity: {totalWeeklySlots} total slots/wk
                    </span>
                    <span style={{ color: "#64748b" }}>
                      Fixed: <strong>{fixedCount}</strong>
                    </span>
                    <span style={{ color: "#64748b" }}>
                      Lab Practicals: <strong>{practicalSlots}</strong>
                    </span>
                    <span style={{ color: "#0284c7", fontWeight: 600 }}>
                      Available Theory Slots: <strong>{availableTheorySlots}</strong>
                    </span>
                    <span style={{ color: isOverCapacity ? "#b91c1c" : isPerfect ? "#15803d" : "#0284c7", fontWeight: 700 }}>
                      Allocated Theory: <strong>{totalTheoryRequested}</strong> hrs
                    </span>
                  </div>
                  <div>
                    {isOverCapacity && (
                      <span style={{ color: "#dc2626", fontWeight: 700, background: "#fee2e2", padding: "4px 10px", borderRadius: "6px" }}>
                        ⚠️ Exceeds by {totalTheoryRequested - availableTheorySlots} hr(s)
                      </span>
                    )}
                    {isPerfect && (
                      <span style={{ color: "#16a34a", fontWeight: 700, background: "#dcfce7", padding: "4px 10px", borderRadius: "6px" }}>
                        ✓ 100% Balanced ({totalTheoryRequested}/{availableTheorySlots})
                      </span>
                    )}
                    {!isOverCapacity && !isPerfect && (
                      <span style={{ color: "#0284c7", fontWeight: 600, background: "#e0f2fe", padding: "4px 10px", borderRadius: "6px" }}>
                        ℹ️ {remainingSlots} free slot(s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Add Subject Form */}
                <form onSubmit={(e) => handleAddSubject(activeInputTab, e)} style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Subject Code (e.g. AI)"
                    value={newSubCode}
                    onChange={(e) => setNewSubCode(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "130px" }}
                  />
                  <input
                    type="text"
                    placeholder="Subject Name (e.g. Artificial Intelligence)"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", flex: 1 }}
                  />
                  <input
                    type="number"
                    min="1"
                    max="6"
                    placeholder="Periods/Wk"
                    value={newSubPeriods}
                    onChange={(e) => setNewSubPeriods(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "100px" }}
                  />
                  <select
                    value={newSubFaculty}
                    onChange={(e) => setNewSubFaculty(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "160px" }}
                  >
                    <option value="">Select Faculty</option>
                    {inputs.faculties.map((f) => (
                      <option key={f.name} value={f.name}>{f.name} - {f.fullName || f.name}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-primary" style={{ padding: "8px 16px" }}>
                    + Add Subject to {activeInputTab}
                  </button>
                </form>

                {/* Header and Quick Reset Bar for Year Courses */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#1e3a8a" }}>
                    📖 {activeInputTab === "SY" ? "Second Year (S.E. / S.Y. B.Tech)" : (activeInputTab === "TY" ? "Third Year (T.E. / T.Y. B.Tech)" : "Final Year (B.Tech)")} Theory Course Allotments
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetYearFacultyAllotments(activeInputTab)}
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      borderRadius: "6px",
                      padding: "5px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                    title={`Keep all course details and classroom intact, but clear assigned teachers on ${activeInputTab} to allot fresh for this semester`}
                  >
                    🔄 Clear {activeInputTab === "SY" ? "S.E." : (activeInputTab === "TY" ? "T.E." : "B.Tech")} Faculty Allotments
                  </button>
                </div>

                {/* Inline Editable Subject Table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                        <th style={{ padding: "10px 8px", width: "110px" }}>Code</th>
                        <th style={{ padding: "10px 8px" }}>Subject Name</th>
                        <th style={{ padding: "10px 8px", width: "140px" }}>Weekly Lectures</th>
                        <th style={{ padding: "10px 8px", width: "260px" }}>Assigned Faculty</th>
                        <th style={{ padding: "10px 8px", textAlign: "center", width: "90px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectsList.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>
                            No theory subjects configured for {activeInputTab}. Add one above!
                          </td>
                        </tr>
                      ) : (
                        subjectsList.map((sub, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", background: !sub.faculty?.name ? "#fffdf5" : "transparent" }}>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="text"
                                value={sub.code || ""}
                                onChange={(e) => handleUpdateSubject(activeInputTab, idx, "code", e.target.value)}
                                style={{
                                  width: "90px",
                                  padding: "6px 8px",
                                  fontWeight: 700,
                                  borderRadius: "4px",
                                  border: "1px solid #cbd5e1",
                                  background: "#f8fafc"
                                }}
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="text"
                                value={sub.name || ""}
                                onChange={(e) => handleUpdateSubject(activeInputTab, idx, "name", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid #cbd5e1"
                                }}
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <input
                                  type="number"
                                  min="1"
                                  max="6"
                                  value={sub.weeklyPeriods || 3}
                                  onChange={(e) => handleUpdateSubject(activeInputTab, idx, "weeklyPeriods", e.target.value)}
                                  style={{
                                    width: "55px",
                                    padding: "6px 8px",
                                    borderRadius: "4px",
                                    border: "1px solid #cbd5e1",
                                    fontWeight: 600
                                  }}
                                />
                                <span style={{ fontSize: "12px", color: "#64748b" }}>periods/wk</span>
                              </div>
                            </td>
                            <td style={{ padding: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <select
                                  value={sub.faculty?.name || ""}
                                  onChange={(e) => handleUpdateSubject(activeInputTab, idx, "faculty", e.target.value)}
                                  style={{
                                    flex: 1,
                                    padding: "6px 8px",
                                    borderRadius: "4px",
                                    border: !sub.faculty?.name ? "1.5px solid #f59e0b" : "1px solid #cbd5e1",
                                    background: !sub.faculty?.name ? "#fffbeb" : "#ffffff",
                                    fontWeight: 600,
                                    color: !sub.faculty?.name ? "#b45309" : "#1e40af"
                                  }}
                                >
                                  <option value="">-- Select Faculty --</option>
                                  {inputs.faculties.map((f) => (
                                    <option key={f.name} value={f.name}>
                                      {f.name} - {f.fullName || f.name} ({f.designation || "Assistant Professor"})
                                    </option>
                                  ))}
                                </select>
                                {!sub.faculty?.name && (
                                  <span style={{
                                    background: "#fef3c7",
                                    color: "#b45309",
                                    border: "1px solid #fde68a",
                                    padding: "3px 6px",
                                    borderRadius: "4px",
                                    fontSize: "10.5px",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap"
                                  }}>
                                    ⚠️ Unallotted
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: "8px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubjectByIndex(activeInputTab, idx)}
                                style={{
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontWeight: 600
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Tab: Lab Practicals & Batches */}
          {activeInputTab === "PRACTICALS" && (
            <div>
              {/* SECTION 1: COORDINATOR LAB COURSES & AUTO-ASSIGNMENT */}
              <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h4 style={{ margin: 0, color: "#1e3a8a", fontSize: "15px", display: "flex", alignItems: "center", gap: "6px" }}>
                      🧪 Coordinator Lab Courses (Auto-Assign to 4 Batches on Different Days)
                    </h4>
                    <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                      Specify the lab subject and assigned teacher. The engine automatically rotates the 4 batches across 4 different days in 2-hour continuous blocks (guaranteeing 1 lab per subject per batch).
                    </p>
                  </div>

                  {/* Class Filter Pills */}
                  <div style={{ display: "flex", gap: "6px" }}>
                    {["SY", "TY", "BTECH"].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setLabCourseYear(yr)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "6px",
                          border: labCourseYear === yr ? "2px solid #2563eb" : "1px solid #cbd5e1",
                          background: labCourseYear === yr ? "#eff6ff" : "#ffffff",
                          color: labCourseYear === yr ? "#1e40af" : "#475569",
                          fontWeight: 700,
                          fontSize: "12.5px",
                          cursor: "pointer"
                        }}
                      >
                        {yr} Lab Courses ({(inputs.yearData[yr]?.labCourses || []).length})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Teacher Overlap Warning Notice */}
                {(() => {
                  const currentCourses = inputs.yearData[labCourseYear]?.labCourses || [];
                  const teacherCoursesMap = {};
                  currentCourses.forEach((lc) => {
                    const facs = Array.isArray(lc.faculties) && lc.faculties.length > 0
                      ? lc.faculties
                      : (lc.faculty ? [lc.faculty] : []);
                    facs.forEach((f) => {
                      if (!f) return;
                      const fNorm = f.trim().toUpperCase();
                      if (!teacherCoursesMap[fNorm]) teacherCoursesMap[fNorm] = [];
                      if (!teacherCoursesMap[fNorm].includes(lc.code)) teacherCoursesMap[fNorm].push(lc.code);
                    });
                  });
                  const overlaps = Object.entries(teacherCoursesMap).filter(([_, courses]) => courses.length > 1);
                  if (overlaps.length === 0) return null;
                  return (
                    <div style={{
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      marginBottom: "14px",
                      fontSize: "12px",
                      color: "#92400e",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px"
                    }}>
                      <span style={{ fontSize: "18px" }}>⚠️</span>
                      <div>
                        <strong>Parallel Faculty Notice:</strong>{" "}
                        {overlaps.map(([t, courses]) => `${t} is assigned to both ${courses.join(" and ")}`).join("; ")}.
                        <div style={{ fontSize: "11px", color: "#b45309", marginTop: "2px" }}>
                          In parallel lab sessions, a teacher cannot teach two batches at the same time. The scheduler will automatically resolve conflicts by substituting available faculty, or you can assign distinct teachers for each parallel lab above.
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Add Lab Course Form Card */}
                <div style={{
                  background: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  padding: "16px",
                  marginBottom: "16px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                        ➕ Add Lab Course & Assign Teachers ({labCourseYear})
                      </h4>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                        Assign 1, 2, or more teachers per lab. Teachers will be distributed across batches (I1, I2, I3, I4).
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAddLabCourse}>
                    {/* Basic Info Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "12px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                          Lab Subject Code *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. OOPS, DS, MAD"
                          value={newLabCode}
                          onChange={(e) => setNewLabCode(e.target.value)}
                          style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontWeight: 700, boxSizing: "border-box" }}
                        />
                      </div>
                      <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                          Lab Course Title
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Object Oriented Programming Lab"
                          value={newLabName}
                          onChange={(e) => setNewLabName(e.target.value)}
                          style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                          Preferred Lab Room
                        </label>
                        <select
                          value={newLabRoom}
                          onChange={(e) => setNewLabRoom(e.target.value)}
                          style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                        >
                          {inputs.rooms.filter((r) => r.type === "LAB").map((r) => (
                            <option key={r.name} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Step 1: Select Multiple Teachers for this Lab */}
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0", marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                        <div>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e40af" }}>
                            👩‍🏫 Step 1: Select Teachers for this Lab ({newLabFaculties.length} selected)
                          </span>
                          <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px" }}>
                            (Select 1 or more faculty members who teach this lab course)
                          </span>
                        </div>
                        {newLabFaculties.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewLabFaculties([]);
                              setNewLabBatchMap({ I1: "", I2: "", I3: "", I4: "" });
                            }}
                            style={{ background: "none", border: "none", color: "#ef4444", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}
                          >
                            ✕ Clear All
                          </button>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleAddLabFaculty(e.target.value);
                          }}
                          style={{ padding: "7px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", minWidth: "220px", fontSize: "12.5px" }}
                        >
                          <option value="">➕ Choose teacher to add...</option>
                          {inputs.faculties
                            .filter((f) => !newLabFaculties.includes(f.name))
                            .map((f) => (
                              <option key={f.name} value={f.name}>
                                {f.name} - {f.fullName || f.name}
                              </option>
                            ))}
                        </select>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          Tip: Add multiple teachers (e.g. 2 or 3) to share the batches of this lab course.
                        </span>
                      </div>

                      {/* Selected Teachers Chips */}
                      {newLabFaculties.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                          {newLabFaculties.map((fac, fIdx) => (
                            <span
                              key={fac}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "#eff6ff",
                                color: "#1e40af",
                                border: "1px solid #bfdbfe",
                                padding: "4px 10px",
                                borderRadius: "16px",
                                fontSize: "12px",
                                fontWeight: 600
                              }}
                            >
                              <span>{getFacultyFullName(fac)} ({fac})</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveLabFaculty(fac)}
                                style={{
                                  background: "#dbeafe",
                                  border: "none",
                                  borderRadius: "50%",
                                  width: "18px",
                                  height: "18px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  fontSize: "11px",
                                  color: "#1e40af",
                                  lineHeight: 1,
                                  padding: 0
                                }}
                                title="Remove teacher"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
                          No teachers added yet. Choose at least one teacher from the dropdown above.
                        </div>
                      )}
                    </div>

                    {/* Step 2: Assign Selected Teachers to Batches */}
                    {newLabFaculties.length > 0 && (
                      <div style={{ background: "#f0fdf4", padding: "12px", borderRadius: "6px", border: "1px solid #bbf7d0", marginBottom: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                          <div>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#166534" }}>
                              🔀 Step 2: Batch Assignment (I1, I2, I3, I4)
                            </span>
                            <span style={{ fontSize: "11px", color: "#15803d", marginLeft: "6px" }}>
                              (Auto-distributed round-robin; customize each batch below if desired)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const currentBatches = (inputs.yearData[labCourseYear]?.batches && inputs.yearData[labCourseYear].batches.length > 0)
                                ? inputs.yearData[labCourseYear].batches.map((b) => b.name)
                                : ["I1", "I2", "I3", "I4"];
                              const rebalanced = {};
                              currentBatches.forEach((b, idx) => {
                                rebalanced[b] = newLabFaculties[idx % newLabFaculties.length];
                              });
                              setNewLabBatchMap(rebalanced);
                            }}
                            style={{
                              background: "#dcfce7",
                              border: "1px solid #86efac",
                              color: "#166534",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            🔄 Re-balance Round-Robin
                          </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px" }}>
                          {((inputs.yearData[labCourseYear]?.batches && inputs.yearData[labCourseYear].batches.length > 0)
                            ? inputs.yearData[labCourseYear].batches.map((b) => b.name)
                            : ["I1", "I2", "I3", "I4"]
                          ).map((batch) => (
                            <div key={batch} style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "6px", border: "1px solid #dcfce7" }}>
                              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#166534", marginBottom: "4px" }}>
                                Batch {batch}:
                              </label>
                              <select
                                value={newLabBatchMap[batch] || ""}
                                onChange={(e) => handleBatchFacultyChange(batch, e.target.value)}
                                style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12px", fontWeight: 600, color: "#1e3a8a" }}
                              >
                                {newLabFaculties.map((fac) => (
                                  <option key={fac} value={fac}>{fac} - {getFacultyFullName(fac)}</option>
                                ))}
                                {/* Allow assigning any faculty if desired */}
                                {inputs.faculties.filter((f) => !newLabFaculties.includes(f.name)).map((f) => (
                                  <option key={f.name} value={f.name}>{f.name} (other)</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ padding: "8px 20px", fontWeight: 700, fontSize: "13px" }}
                        disabled={!newLabCode.trim() || newLabFaculties.length === 0}
                      >
                        + Add Lab Course to {labCourseYear}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Configured Lab Courses Table */}
                <div style={{ background: "#ffffff", borderRadius: "6px", border: "1px solid #e2e8f0", overflowX: "auto", marginBottom: "14px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                        <th style={{ padding: "10px 12px" }}>Code</th>
                        <th style={{ padding: "10px 12px" }}>Lab Course Title</th>
                        <th style={{ padding: "10px 12px" }}>Assigned Teachers & Batch Distribution</th>
                        <th style={{ padding: "10px 12px" }}>Preferred Lab</th>
                        <th style={{ padding: "10px 12px", textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(inputs.yearData[labCourseYear]?.labCourses || []).length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>
                            No lab courses defined for {labCourseYear}. Add lab courses above to enable 4-batch auto-scheduling.
                          </td>
                        </tr>
                      ) : (
                        (inputs.yearData[labCourseYear]?.labCourses || []).map((lc, idx) => {
                          const facultiesList = Array.isArray(lc.faculties) && lc.faculties.length > 0
                            ? lc.faculties
                            : (lc.faculty ? [lc.faculty] : []);
                          const batchMap = lc.batchFacultyMap || {};
                          const hasMultiTeachers = facultiesList.length > 1;

                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1e3a8a" }}>{lc.code}</td>
                              <td style={{ padding: "10px 12px", fontWeight: 500 }}>{lc.name}</td>
                              <td style={{ padding: "10px 12px" }}>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", marginBottom: "6px" }}>
                                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                                    Teachers ({facultiesList.length}):
                                  </span>
                                  {facultiesList.map((f, fi) => (
                                    <span
                                      key={fi}
                                      style={{
                                        background: "#eff6ff",
                                        color: "#1e40af",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        fontSize: "11.5px",
                                        fontWeight: 600,
                                        border: "1px solid #bfdbfe"
                                      }}
                                    >
                                      {f} ({getFacultyFullName(f)})
                                    </span>
                                  ))}
                                </div>
                                {/* Batch Breakdown */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                  {Object.keys(batchMap).length > 0 ? (
                                    Object.entries(batchMap).map(([b, fac]) => (
                                      <span
                                        key={b}
                                        style={{
                                          background: "#f0fdf4",
                                          color: "#166534",
                                          padding: "1px 6px",
                                          borderRadius: "3px",
                                          fontSize: "11px",
                                          border: "1px solid #bbf7d0"
                                        }}
                                      >
                                        <strong>{b}:</strong> {fac}
                                      </span>
                                    ))
                                  ) : (
                                    <span style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
                                      All batches: {lc.faculty}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: "10px 12px" }}>
                                <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                                  {lc.preferredRoom || "Any Lab"}
                                </span>
                              </td>
                              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                <div style={{ display: "inline-flex", gap: "6px" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditLabCourse(labCourseYear, idx)}
                                    style={{
                                      background: "#eff6ff",
                                      color: "#2563eb",
                                      border: "1px solid #bfdbfe",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                      fontSize: "11.5px"
                                    }}
                                    title="Edit teachers and batch assignments"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLabCourse(labCourseYear, idx)}
                                    style={{
                                      background: "#fee2e2",
                                      color: "#dc2626",
                                      border: "none",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                      fontSize: "11.5px"
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Edit Lab Course Modal / Dialog */}
                {editingLabCourse && (
                  <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(15, 23, 42, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    backdropFilter: "blur(2px)",
                    padding: "16px"
                  }}>
                    <div style={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      width: "100%",
                      maxWidth: "580px",
                      boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
                      border: "1px solid #cbd5e1",
                      overflow: "hidden"
                    }}>
                      <div style={{ padding: "16px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                          ✏️ Edit Teachers & Batches: {editingLabCourse.code} ({editingLabCourse.yearKey})
                        </h3>
                        <button
                          type="button"
                          onClick={() => setEditingLabCourse(null)}
                          style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" }}
                        >
                          ×
                        </button>
                      </div>

                      <form onSubmit={handleSaveEditedLabCourse} style={{ padding: "20px" }}>
                        <div style={{ marginBottom: "12px" }}>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                            Lab Title
                          </label>
                          <input
                            type="text"
                            value={editingLabCourse.name}
                            onChange={(e) => setEditingLabCourse({ ...editingLabCourse, name: e.target.value })}
                            style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                          />
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                            Preferred Room
                          </label>
                          <select
                            value={editingLabCourse.preferredRoom}
                            onChange={(e) => setEditingLabCourse({ ...editingLabCourse, preferredRoom: e.target.value })}
                            style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                          >
                            {inputs.rooms.filter((r) => r.type === "LAB").map((r) => (
                              <option key={r.name} value={r.name}>{r.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Edit Teachers for this lab */}
                        <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "14px" }}>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e40af", marginBottom: "6px" }}>
                            Assigned Teachers ({editingLabCourse.faculties.length})
                          </div>
                          <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                            <select
                              value=""
                              onChange={(e) => {
                                const fac = e.target.value;
                                if (!fac || editingLabCourse.faculties.includes(fac)) return;
                                const nextFacs = [...editingLabCourse.faculties, fac];
                                const currentBatches = (inputs.yearData[editingLabCourse.yearKey]?.batches && inputs.yearData[editingLabCourse.yearKey].batches.length > 0)
                                  ? inputs.yearData[editingLabCourse.yearKey].batches.map((b) => b.name)
                                  : ["I1", "I2", "I3", "I4"];
                                const nextBatchMap = { ...editingLabCourse.batchFacultyMap };
                                currentBatches.forEach((b, i) => {
                                  if (!nextBatchMap[b]) nextBatchMap[b] = nextFacs[i % nextFacs.length];
                                });
                                setEditingLabCourse({
                                  ...editingLabCourse,
                                  faculties: nextFacs,
                                  batchFacultyMap: nextBatchMap
                                });
                              }}
                              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", flex: 1 }}
                            >
                              <option value="">➕ Add another teacher...</option>
                              {inputs.faculties
                                .filter((f) => !editingLabCourse.faculties.includes(f.name))
                                .map((f) => (
                                  <option key={f.name} value={f.name}>{f.name} - {f.fullName || f.name}</option>
                                ))}
                            </select>
                          </div>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {editingLabCourse.faculties.map((fac) => (
                              <span
                                key={fac}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: "#eff6ff",
                                  color: "#1e40af",
                                  border: "1px solid #bfdbfe",
                                  padding: "3px 8px",
                                  borderRadius: "14px",
                                  fontSize: "11.5px",
                                  fontWeight: 600
                                }}
                              >
                                <span>{fac}</span>
                                {editingLabCourse.faculties.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextFacs = editingLabCourse.faculties.filter((f) => f !== fac);
                                      const nextBatchMap = { ...editingLabCourse.batchFacultyMap };
                                      Object.keys(nextBatchMap).forEach((b) => {
                                        if (nextBatchMap[b] === fac) nextBatchMap[b] = nextFacs[0] || "";
                                      });
                                      setEditingLabCourse({
                                        ...editingLabCourse,
                                        faculties: nextFacs,
                                        batchFacultyMap: nextBatchMap
                                      });
                                    }}
                                    style={{
                                      background: "#dbeafe",
                                      border: "none",
                                      borderRadius: "50%",
                                      width: "16px",
                                      height: "16px",
                                      cursor: "pointer",
                                      fontSize: "11px",
                                      color: "#1e40af",
                                      padding: 0,
                                      lineHeight: 1
                                    }}
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Batch Assignments */}
                        <div style={{ background: "#f0fdf4", padding: "12px", borderRadius: "8px", border: "1px solid #bbf7d0", marginBottom: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#166534" }}>
                              Batch Assignments
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentBatches = (inputs.yearData[editingLabCourse.yearKey]?.batches && inputs.yearData[editingLabCourse.yearKey].batches.length > 0)
                                  ? inputs.yearData[editingLabCourse.yearKey].batches.map((b) => b.name)
                                  : ["I1", "I2", "I3", "I4"];
                                const rebalanced = {};
                                currentBatches.forEach((b, idx) => {
                                  rebalanced[b] = editingLabCourse.faculties[idx % editingLabCourse.faculties.length];
                                });
                                setEditingLabCourse({
                                  ...editingLabCourse,
                                  batchFacultyMap: rebalanced
                                });
                              }}
                              style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#166534", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                            >
                              🔄 Re-balance Round-Robin
                            </button>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            {((inputs.yearData[editingLabCourse.yearKey]?.batches && inputs.yearData[editingLabCourse.yearKey].batches.length > 0)
                              ? inputs.yearData[editingLabCourse.yearKey].batches.map((b) => b.name)
                              : ["I1", "I2", "I3", "I4"]
                            ).map((batch) => (
                              <div key={batch} style={{ background: "#ffffff", padding: "6px 10px", borderRadius: "6px", border: "1px solid #dcfce7" }}>
                                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#166534", marginBottom: "3px" }}>
                                  Batch {batch}:
                                </label>
                                <select
                                  value={editingLabCourse.batchFacultyMap?.[batch] || ""}
                                  onChange={(e) => {
                                    setEditingLabCourse({
                                      ...editingLabCourse,
                                      batchFacultyMap: {
                                        ...editingLabCourse.batchFacultyMap,
                                        [batch]: e.target.value
                                      }
                                    });
                                  }}
                                  style={{ width: "100%", padding: "5px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "11.5px", fontWeight: 600 }}
                                >
                                  {editingLabCourse.faculties.map((f) => (
                                    <option key={f} value={f}>{f} - {getFacultyFullName(f)}</option>
                                  ))}
                                  {inputs.faculties.filter((f) => !editingLabCourse.faculties.includes(f.name)).map((f) => (
                                    <option key={f.name} value={f.name}>{f.name} (other)</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                          <button
                            type="button"
                            onClick={() => setEditingLabCourse(null)}
                            style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn-primary"
                            style={{ padding: "8px 20px", fontWeight: 700 }}
                          >
                            Save Changes & Sync
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Auto-Schedule Action Banner */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  flexWrap: "wrap",
                  gap: "12px"
                }}>
                  <div style={{ fontSize: "12.5px", color: "#1e40af" }}>
                    <strong>🎯 Auto-Scheduling Guarantees for {labCourseYear}:</strong>
                    <div style={{ display: "flex", gap: "12px", marginTop: "4px", flexWrap: "wrap" }}>
                      <span>✓ 1 lab per subject per batch (0 duplicates)</span>
                      <span>✓ 2-hour continuous blocks</span>
                      <span>✓ 4 distinct days (parallel batch rotation)</span>
                      <span>✓ 0 teacher/room clashes</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => autoGenerate4BatchPracticals(labCourseYear)}
                    style={{
                      padding: "9px 18px",
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(37,99,235,0.25)"
                    }}
                  >
                    ✨ Auto-Schedule {labCourseYear} 4 Batches (Different Days, 2-Hr Blocks)
                  </button>
                </div>
              </div>

              {/* SECTION 2: DETAILED PRACTICAL SLOTS (INSPECTION & OVERRIDES) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h4 style={{ margin: 0, color: "#334155", fontSize: "14px" }}>
                    📋 Generated Practical Sessions for {pracFilterYear === "ALL" ? "All Classes" : pracFilterYear} ({(inputs.yearData[pracFilterYear === "ALL" ? "SY" : pracFilterYear]?.practicals || []).length} sessions)
                  </h4>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {["ALL", "SY", "TY", "BTECH"].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setPracFilterYear(yr)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                          background: pracFilterYear === yr ? "#2563eb" : "#f8fafc",
                          color: pracFilterYear === yr ? "white" : "#334155",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        {yr === "ALL" ? "All Classes" : `${yr}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Practicals List Table */}
                <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead style={{ position: "sticky", top: 0, background: "#f1f5f9", zIndex: 1 }}>
                      <tr style={{ textAlign: "left", borderBottom: "2px solid #cbd5e1" }}>
                        <th style={{ padding: "8px" }}>Class</th>
                        <th style={{ padding: "8px" }}>Batch</th>
                        <th style={{ padding: "8px" }}>Subject</th>
                        <th style={{ padding: "8px" }}>Lab Faculty</th>
                        <th style={{ padding: "8px" }}>Lab Room</th>
                        <th style={{ padding: "8px" }}>Day & Slot (2-Hour Block)</th>
                        <th style={{ padding: "8px", textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["SY", "TY", "BTECH"]
                        .filter((yr) => pracFilterYear === "ALL" || pracFilterYear === yr)
                        .flatMap((yr) => (inputs.yearData[yr]?.practicals || []).map((pr, idx) => ({ ...pr, yr, origIdx: idx })))
                        .map((pr, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "8px", fontWeight: 700, color: "#1e3a8a" }}>{pr.yr}</td>
                            <td style={{ padding: "8px", fontWeight: 600 }}>{pr.batch}</td>
                            <td style={{ padding: "8px", fontWeight: 600 }}>{pr.practical}</td>
                            <td style={{ padding: "8px", color: "#1e40af" }}>{getFacultyFullName(pr.faculty)} ({pr.faculty})</td>
                            <td style={{ padding: "8px" }}><span className="badge-lab" style={{ padding: "2px 6px", borderRadius: "4px", background: "#fef3c7" }}>{pr.room}</span></td>
                            <td style={{ padding: "8px", fontWeight: 600 }}>{pr.day} ({pr.period})</td>
                            <td style={{ padding: "8px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleDeletePractical(pr.yr, pr.origIdx)}
                                style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Fixed Slots & FY Loads */}
          {activeInputTab === "FIXED" && (
            <div>
              {/* Section A: Institutional Fixed Slots */}
              <div style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h4 style={{ margin: "0 0 4px", color: "#1e3a8a", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                      📌 Institutional Fixed Slots (MDM, Open Electives, Mentoring, German)
                    </h4>
                    <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>
                      Locked institutional slots have top priority. Practicals and theory lectures strictly route around them without overwriting.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: "flex", gap: "6px" }}>
                    {["ALL", "SY", "TY", "BTECH"].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setFixedFilterYear(yr)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: fixedFilterYear === yr ? "2px solid #2563eb" : "1px solid #cbd5e1",
                          background: fixedFilterYear === yr ? "#eff6ff" : "#ffffff",
                          color: fixedFilterYear === yr ? "#1e40af" : "#475569",
                          fontWeight: 700,
                          fontSize: "12px",
                          cursor: "pointer"
                        }}
                      >
                        {yr === "ALL" ? "All Classes" : `${yr} Slots`} (
                        {yr === "ALL"
                          ? ["SY", "TY", "BTECH"].reduce((acc, y) => acc + (inputs.yearData[y]?.fixedSlots || []).length, 0)
                          : (inputs.yearData[yr]?.fixedSlots || []).length}
                        )
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add Fixed Slot Form */}
                <form onSubmit={handleAddFixedSlot} style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", alignItems: "center" }}>
                  <select
                    value={newFixedYear}
                    onChange={(e) => setNewFixedYear(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "100px", fontWeight: 700 }}
                  >
                    <option value="SY">SY</option>
                    <option value="TY">TY</option>
                    <option value="BTECH">B.Tech</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Course/Slot Name (e.g. MDM-I, Mentoring, OE)"
                    value={newFixedCourse}
                    onChange={(e) => setNewFixedCourse(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", flex: 1, minWidth: "180px", fontWeight: 600 }}
                  />

                  <select
                    value={newFixedDay}
                    onChange={(e) => setNewFixedDay(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "130px", fontWeight: 600 }}
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <select
                    value={newFixedPeriod}
                    onChange={(e) => setNewFixedPeriod(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "135px", fontWeight: 600 }}
                  >
                    {periods.map((p, idx) => (
                      <option key={p} value={p}>Period {p} ({periodTimings[idx]})</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Faculty (e.g. PTS/ARJ)"
                    value={newFixedFaculty}
                    onChange={(e) => setNewFixedFaculty(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "130px" }}
                  />

                  <input
                    type="text"
                    placeholder="Room (e.g. CR26/27)"
                    value={newFixedRoom}
                    onChange={(e) => setNewFixedRoom(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "110px" }}
                  />

                  <button type="submit" className="btn-primary" style={{ padding: "8px 16px", fontWeight: 700 }}>
                    + Add Fixed Slot
                  </button>
                </form>

                {/* Interactive Inline Editable Fixed Slots Table */}
                <div style={{ maxHeight: "380px", overflowY: "auto", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                    <thead style={{ position: "sticky", top: 0, background: "#f1f5f9", zIndex: 1 }}>
                      <tr style={{ textAlign: "left", borderBottom: "2px solid #cbd5e1" }}>
                        <th style={{ padding: "8px 10px", width: "70px" }}>Class</th>
                        <th style={{ padding: "8px 10px", width: "85px" }}>Type</th>
                        <th style={{ padding: "8px 10px", minWidth: "160px" }}>Course / Slot Name</th>
                        <th style={{ padding: "8px 10px", width: "125px" }}>Day</th>
                        <th style={{ padding: "8px 10px", width: "140px" }}>Period</th>
                        <th style={{ padding: "8px 10px", width: "110px" }}>Faculty</th>
                        <th style={{ padding: "8px 10px", width: "95px" }}>Room</th>
                        <th style={{ padding: "8px 10px", minWidth: "140px" }}>Slot Status</th>
                        <th style={{ padding: "8px 10px", textAlign: "center", width: "70px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["SY", "TY", "BTECH"]
                        .filter((yr) => fixedFilterYear === "ALL" || fixedFilterYear === yr)
                        .flatMap((yr) =>
                          (inputs.yearData[yr]?.fixedSlots || []).map((fs, idx) => ({ ...fs, yr, origIdx: idx }))
                        ).map((fs, i) => {
                          const clash = getFixedSlotClashInfo(fs, fs.yr, fs.origIdx);
                          const courseUpper = (fs.courseName || "").toUpperCase();
                          let badgeType = "FIXED";
                          if (courseUpper.includes("MDM")) badgeType = "MDM";
                          else if (courseUpper.includes("OE")) badgeType = "OE";
                          else if (courseUpper.includes("MENTORING")) badgeType = "MENTORING";
                          else if (courseUpper.includes("CAPSTONE") || courseUpper.includes("PROJECT")) badgeType = "CAPSTONE";
                          else if (courseUpper.includes("GERMAN") || courseUpper.includes("PSD")) badgeType = "SPECIAL";

                          return (
                            <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", background: clash?.isError ? "#fef2f2" : "inherit" }}>
                              {/* Class */}
                              <td style={{ padding: "6px 10px", fontWeight: 700, color: "#1e3a8a" }}>
                                <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: "4px", fontWeight: 800 }}>
                                  {fs.yr}
                                </span>
                              </td>

                              {/* Slot Type Badge */}
                              <td style={{ padding: "6px 10px" }}>
                                <span className={`badge-${badgeType.toLowerCase()}`} style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                                  {badgeType}
                                </span>
                              </td>

                              {/* Course Name */}
                              <td style={{ padding: "6px 10px" }}>
                                <input
                                  type="text"
                                  value={fs.courseName || ""}
                                  onChange={(e) => handleUpdateFixedSlot(fs.yr, fs.origIdx, "courseName", e.target.value)}
                                  style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontWeight: 600, fontSize: "12px" }}
                                />
                              </td>

                              {/* Day */}
                              <td style={{ padding: "6px 10px" }}>
                                <select
                                  value={fs.day}
                                  onChange={(e) => handleUpdateFixedSlot(fs.yr, fs.origIdx, "day", e.target.value)}
                                  style={{ width: "100%", padding: "5px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontWeight: 600, fontSize: "12px" }}
                                >
                                  {days.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Period */}
                              <td style={{ padding: "6px 10px" }}>
                                <select
                                  value={fs.period}
                                  onChange={(e) => handleUpdateFixedSlot(fs.yr, fs.origIdx, "period", e.target.value)}
                                  style={{ width: "100%", padding: "5px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontWeight: 600, fontSize: "12px" }}
                                >
                                  {periods.map((p, idx) => (
                                    <option key={p} value={p}>P{p} ({periodTimings[idx].split(" ")[0]})</option>
                                  ))}
                                </select>
                              </td>

                              {/* Faculty */}
                              <td style={{ padding: "6px 10px" }}>
                                <input
                                  type="text"
                                  value={fs.facultyName || ""}
                                  onChange={(e) => handleUpdateFixedSlot(fs.yr, fs.origIdx, "facultyName", e.target.value)}
                                  placeholder="Faculty"
                                  style={{ width: "100%", padding: "5px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12px", color: "#1e40af", fontWeight: 600 }}
                                />
                              </td>

                              {/* Room */}
                              <td style={{ padding: "6px 10px" }}>
                                <input
                                  type="text"
                                  value={fs.room || ""}
                                  onChange={(e) => handleUpdateFixedSlot(fs.yr, fs.origIdx, "room", e.target.value)}
                                  placeholder="Room"
                                  style={{ width: "100%", padding: "5px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                                />
                              </td>

                              {/* Real-Time Clash Status */}
                              <td style={{ padding: "6px 10px", fontSize: "11.5px" }}>
                                {clash && (
                                  <span style={{
                                    display: "inline-block",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontWeight: 600,
                                    background: clash.isError ? "#fee2e2" : (clash.type === "OK" ? "#dcfce7" : "#fef3c7"),
                                    color: clash.isError ? "#b91c1c" : (clash.type === "OK" ? "#15803d" : "#b45309"),
                                    border: `1px solid ${clash.isError ? "#fca5a5" : (clash.type === "OK" ? "#86efac" : "#fde68a")}`
                                  }}>
                                    {clash.text}
                                  </span>
                                )}
                              </td>

                              {/* Action */}
                              <td style={{ padding: "6px 10px", textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFixedSlot(fs.yr, fs.origIdx)}
                                  style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Practical Re-Alignment Helper Action */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", flexWrap: "wrap", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#475569" }}>
                    🔄 Moved any fixed slots? Practicals and lectures will automatically avoid them. You can also re-align 4-batch practicals with 1 click:
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {["SY", "TY", "BTECH"].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          autoGenerate4BatchPracticals(yr);
                        }}
                        style={{
                          padding: "4px 10px",
                          background: "#e0e7ff",
                          color: "#3730a3",
                          border: "1px solid #c7d2fe",
                          borderRadius: "4px",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        ⚡ Re-Align {yr} Practicals
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section B: External FY Loads */}
              <div>
                <h4 style={{ margin: "0 0 10px", color: "#1e3a8a" }}>
                  🏛 First-Year (FY) University Loads (Occupying IT Department Faculty)
                </h4>

                <form onSubmit={handleAddExternalLoad} style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <select
                    value={newExtType}
                    onChange={(e) => setNewExtType(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "120px" }}
                  >
                    <option value="FY-EEDP">FY-EEDP</option>
                    <option value="FY-PPS">FY-PPS</option>
                    <option value="FY-PCC">FY-PCC</option>
                  </select>

                  <select
                    value={newExtFaculty}
                    onChange={(e) => setNewExtFaculty(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "140px" }}
                  >
                    <option value="">Select Faculty</option>
                    {inputs.faculties.map((f) => (
                      <option key={f.name} value={f.name}>{f.name}</option>
                    ))}
                  </select>

                  <select
                    value={newExtDay}
                    onChange={(e) => setNewExtDay(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "130px" }}
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <select
                    value={newExtPeriod}
                    onChange={(e) => setNewExtPeriod(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", minWidth: "220px", fontWeight: 600 }}
                  >
                    <optgroup label="2-Hour Continuous Slots (Recommended for FY)">
                      <option value="P1-P2">10:00 AM - 12:00 PM (P1-P2: 2 Hours)</option>
                      <option value="P3-P4">12:45 PM - 02:45 PM (P3-P4: 2 Hours)</option>
                      <option value="P5-P6">03:00 PM - 05:00 PM (P5-P6: 2 Hours)</option>
                    </optgroup>
                    <optgroup label="Single 1-Hour Lecture Slots">
                      {periods.map((p, idx) => (
                        <option key={p} value={p}>Period {p} ({periodTimings[idx]})</option>
                      ))}
                    </optgroup>
                  </select>

                  <input
                    type="text"
                    placeholder="Description (e.g. PTS-Div E)"
                    value={newExtDesc}
                    onChange={(e) => setNewExtDesc(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", flex: 1, minWidth: "150px" }}
                  />

                  <button type="submit" className="btn-primary" style={{ padding: "8px 16px" }}>
                    + Add FY Load
                  </button>
                </form>

                <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead style={{ position: "sticky", top: 0, background: "#f1f5f9", zIndex: 1 }}>
                      <tr style={{ textAlign: "left", borderBottom: "2px solid #cbd5e1" }}>
                        <th style={{ padding: "6px 8px" }}>Type</th>
                        <th style={{ padding: "6px 8px" }}>Faculty</th>
                        <th style={{ padding: "6px 8px" }}>Day & Slot</th>
                        <th style={{ padding: "6px 8px" }}>Duration</th>
                        <th style={{ padding: "6px 8px" }}>Description</th>
                        <th style={{ padding: "6px 8px", textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(inputs.externalLoads || []).map((ext, idx) => {
                        const dur = getExternalLoadPeriods(ext).length;
                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "6px 8px", fontWeight: 700, color: "#b45309" }}>{ext.loadType}</td>
                            <td style={{ padding: "6px 8px", fontWeight: 600, color: "#1e40af" }}>{ext.facultyCode}</td>
                            <td style={{ padding: "6px 8px" }}>
                              <span style={{ fontWeight: 600 }}>{ext.day}</span>: {formatExternalLoadSlot(ext)}
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: dur > 1 ? "#dbeafe" : "#f1f5f9",
                                color: dur > 1 ? "#1e40af" : "#475569"
                              }}>
                                {dur} Hour{dur > 1 ? "s" : ""} / wk
                              </span>
                            </td>
                            <td style={{ padding: "6px 8px" }}>{ext.description}</td>
                            <td style={{ padding: "6px 8px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteExternalLoad(idx)}
                                style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "3px 6px", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn-primary"
              onClick={() => {
                handleGenerate(inputs);
                setShowInputManager(false);
              }}
              style={{ padding: "10px 20px", fontSize: "13.5px" }}
            >
              ✓ Save Changes & Generate Conflict-Free Timetable
            </button>
          </div>
        </div>
      )}

      {/* Conflict & Status Alert */}
      <div id="conflicts-section" className="master-status-card no-print">
        <div className="status-item">
          <span className={`dot ${conflictLog.length === 0 ? "dot-success" : "dot-danger"}`} style={conflictLog.length > 0 ? { background: "#ef4444" } : {}}></span>
          <strong>Conflict Status:</strong>
          <span
            className={`status-tag ${conflictLog.length === 0 ? "success-tag" : "danger-tag"}`}
            style={conflictLog.length > 0 ? { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", cursor: "pointer", fontWeight: 700 } : {}}
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            title={conflictLog.length > 0 ? "Click to toggle conflict breakdown" : ""}
          >
            {conflictLog.length === 0 ? "✓ 0 Conflicts (All 3 Years + FY Conflict-Free)" : `⚠ ${conflictLog.length} Conflicts Detected`}
          </span>
        </div>
        <div className="status-item">
          <strong>Active Faculty:</strong> {inputs.faculties?.length || 13} Members
        </div>
        <div className="status-item">
          <strong>Theory Rooms:</strong> CR-26, CR-27, CR-212
        </div>
        <div className="status-item">
          <strong>Computer Labs:</strong> IL1 to IL6
        </div>
      </div>

      {/* Active Clashes & Double-Booking Warnings Panel */}
      {conflictLog && conflictLog.length > 0 && (
        <div className="no-print" style={{
          marginBottom: "16px",
          background: "#fff1f2",
          border: "2px solid #f87171",
          borderRadius: "8px",
          padding: "16px 20px",
          boxShadow: "0 4px 12px rgba(239, 68, 68, 0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #fecaca", paddingBottom: "8px" }}>
            <h4 style={{ margin: 0, fontSize: "14.5px", color: "#991b1b", display: "flex", alignItems: "center", gap: "8px", fontWeight: 800 }}>
              <span>⚠️ Active Clashes & Double-Bookings Detected ({conflictLog.length})</span>
            </h4>
            <span style={{ fontSize: "11.5px", background: "#dc2626", color: "white", padding: "2px 10px", borderRadius: "12px", fontWeight: 700 }}>
              Immediate Attention Needed
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {conflictLog.map((conf, idx) => (
              <div key={idx} style={{
                background: "white",
                borderLeft: "4px solid #ef4444",
                borderRadius: "4px",
                padding: "10px 14px",
                fontSize: "13px",
                color: "#1e293b",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}>
                <span style={{ color: "#ef4444", fontWeight: 800, fontSize: "14px" }}>✕</span>
                <span style={{ fontWeight: 600 }}>{conf}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#7f1d1d", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <span>💡 Tip: Click <strong>"Launch Swap Tool"</strong> to swap clashing periods into open slots with 0 conflicts.</span>
            <button
              type="button"
              onClick={() => {
                setSwapModeEnabled(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              🔄 Launch Swap Tool
            </button>
          </div>
        </div>
      )}

      {/* Diagnostics & Bottleneck Inspector */}
      <div className="no-print" style={{ marginBottom: "16px" }}>
        {diagnostics && diagnostics.filter((d) => d.severity === "ERROR" || d.severity === "WARNING").length > 0 ? (
          <div>
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              style={{
                background: diagnostics.some((d) => d.severity === "ERROR") ? "#fee2e2" : "#fef3c7",
                border: `1px solid ${diagnostics.some((d) => d.severity === "ERROR") ? "#f87171" : "#f59e0b"}`,
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                color: "#1e293b"
              }}
            >
              <span>🔍 Constraint & Bottleneck Diagnostics ({diagnostics.filter((d) => d.severity === "ERROR" || d.severity === "WARNING").length} active issue{diagnostics.filter((d) => d.severity === "ERROR" || d.severity === "WARNING").length === 1 ? "" : "s"})</span>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                {showDiagnostics ? "▲ Hide Details" : "▼ Show Details"}
              </span>
            </button>

            {showDiagnostics && (
              <div style={{
                marginTop: "10px",
                background: "white",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "14px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <h4 style={{ margin: "0 0 10px", fontSize: "13.5px", color: "#1e3a8a" }}>
                  📋 Active Constraint & Bottleneck Diagnostics
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {diagnostics.filter((d) => d.severity === "ERROR" || d.severity === "WARNING").map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        background: item.severity === "ERROR" ? "#fff1f2" : "#fffbeb",
                        borderLeft: `4px solid ${item.severity === "ERROR" ? "#ef4444" : "#f59e0b"}`
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: "12px", color: "#1e293b" }}>
                          [{item.type}] {item.entity}
                        </span>
                        <span style={{
                          fontSize: "10.5px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: 700,
                          background: item.severity === "ERROR" ? "#fecdd3" : "#fde68a",
                          color: item.severity === "ERROR" ? "#9f1239" : "#92400e"
                        }}>
                          {item.severity}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#334155" }}>
                        {item.message}
                      </div>
                      {item.suggestion && (
                        <div style={{ fontSize: "11.5px", color: "#64748b", fontStyle: "italic" }}>
                          💡 Suggestion: {item.suggestion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#ecfdf5",
            border: "1px solid #10b981",
            borderRadius: "6px",
            padding: "8px 14px",
            fontSize: "12.5px",
            fontWeight: 600,
            color: "#065f46"
          }}>
            <span>✅ Constraint Diagnostics: 0 Active Collisions (All constraints satisfied)</span>
          </div>
        )}
      </div>

      {/* Main Master Table */}
      {selectedView === "ALL" && (
        <div className="master-table-card">
          {/* Official Institutional Header for Master Class Timetable */}
          <div className="official-master-sheet-header" style={{ textAlign: "center", padding: "12px 14px", borderBottom: "1.5px solid #000000", background: "#ffffff", color: "#000000" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.5px" }}>K.E.Society's</div>
            <div style={{ fontSize: "16px", fontWeight: 800, marginTop: "2px" }}>Rajarambapu Institute of Technology ,Rajaramnagar</div>
            <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px", textDecoration: "underline" }}>Department of Information Technology</div>
            <div style={{ fontSize: "15px", fontWeight: 800, marginTop: "2px", textDecoration: "underline" }}>Master Class Time Table</div>
            <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>{academicSession}/ {academicSemester}</div>
          </div>
          <div className="table-responsive">
            <table className="master-table">
            <thead>
              {/* Top Column Groups */}
              <tr className="header-group-row">
                <th rowSpan="2" className="day-col">Day</th>
                <th rowSpan="2" className="sr-col">Sr No</th>
                <th rowSpan="2" className="time-col">Time</th>

                {(selectedView === "ALL" || selectedView === "SY") && (
                  <th colSpan="3" className="year-group-header sy-group">SY</th>
                )}
                {(selectedView === "ALL" || selectedView === "TY") && (
                  <th colSpan="3" className="year-group-header ty-group">TY</th>
                )}
                {(selectedView === "ALL" || selectedView === "BTECH") && (
                  <th colSpan="3" className="year-group-header btech-group">BTECH</th>
                )}

                {selectedView === "ALL" && (
                  <>
                    <th rowSpan="2" className="ext-col">FY-EEDP</th>
                    <th rowSpan="2" className="ext-col">FY-PPS</th>
                    <th rowSpan="2" className="ext-col">FY-PCC</th>
                  </>
                )}
              </tr>

              {/* Sub Columns (Course, Faculty, Location) */}
              <tr className="sub-header-row">
                {(selectedView === "ALL" || selectedView === "SY") && (
                  <>
                    <th className="sub-col">Course</th>
                    <th className="sub-col">Faculty</th>
                    <th className="sub-col">Location</th>
                  </>
                )}
                {(selectedView === "ALL" || selectedView === "TY") && (
                  <>
                    <th className="sub-col">Course</th>
                    <th className="sub-col">Faculty</th>
                    <th className="sub-col">Location</th>
                  </>
                )}
                {(selectedView === "ALL" || selectedView === "BTECH") && (
                  <>
                    <th className="sub-col">Course</th>
                    <th className="sub-col">Faculty</th>
                    <th className="sub-col">Location</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {days.map((day) => (
                periods.map((period, pIdx) => {
                  const sy = getCell("SY", day, period);
                  const ty = getCell("TY", day, period);
                  const btech = getCell("BTECH", day, period);
                  const eedp = getExternal("FY-EEDP", day, period);
                  const pps = getExternal("FY-PPS", day, period);
                  const pcc = getExternal("FY-PCC", day, period);

                  return (
                    <tr key={`${day}-${period}`} className={pIdx === 0 ? "day-start-row" : ""}>
                      {/* Day Name (Only on 1st period of day) */}
                      {pIdx === 0 && (
                        <td rowSpan="6" className="day-name-cell">
                          {day.charAt(0) + day.slice(1).toLowerCase()}
                        </td>
                      )}

                      <td className="sr-cell">{period}</td>
                      <td className="time-cell">{periodTimings[pIdx]}</td>

                      {/* SY Cells */}
                      {(selectedView === "ALL" || selectedView === "SY") && renderYearSlot("SY", day, period, sy)}

                      {/* TY Cells */}
                      {(selectedView === "ALL" || selectedView === "TY") && renderYearSlot("TY", day, period, ty)}

                      {/* BTECH Cells */}
                      {(selectedView === "ALL" || selectedView === "BTECH") && renderYearSlot("BTECH", day, period, btech)}

                      {/* External FY Loads */}
                      {selectedView === "ALL" && (
                        <>
                          <td
                            className="ext-cell"
                            onClick={() => openExternalLoadEditor("FY-EEDP", day, period)}
                            style={{ cursor: !swapModeEnabled ? "pointer" : "default" }}
                            title={!swapModeEnabled ? "Click to edit FY-EEDP load ✏️" : ""}
                          >
                            {eedp}
                          </td>
                          <td
                            className="ext-cell"
                            onClick={() => openExternalLoadEditor("FY-PPS", day, period)}
                            style={{ cursor: !swapModeEnabled ? "pointer" : "default" }}
                            title={!swapModeEnabled ? "Click to edit FY-PPS load ✏️" : ""}
                          >
                            {pps}
                          </td>
                          <td
                            className="ext-cell"
                            onClick={() => openExternalLoadEditor("FY-PCC", day, period)}
                            style={{ cursor: !swapModeEnabled ? "pointer" : "default" }}
                            title={!swapModeEnabled ? "Click to edit FY-PCC load ✏️" : ""}
                          >
                            {pcc}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              ))}

              {/* Total Contact Hours Summary Row */}
              <tr className="total-hours-row">
                <td colSpan="3" className="total-label">Total Contact Hrs</td>
                {(selectedView === "ALL" || selectedView === "SY") && (
                  <td colSpan="3" className="total-val">
                    {masterData?.totalContactHours?.SY || 28}
                  </td>
                )}
                {(selectedView === "ALL" || selectedView === "TY") && (
                  <td colSpan="3" className="total-val">
                    {masterData?.totalContactHours?.TY || 27}
                  </td>
                )}
                {(selectedView === "ALL" || selectedView === "BTECH") && (
                  <td colSpan="3" className="total-val">
                    {masterData?.totalContactHours?.BTECH || 25}
                  </td>
                )}
                {selectedView === "ALL" && <td colSpan="3"></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* =========================================================================
          PERSPECTIVE 1: STUDENT CLASS VIEW (OFFICIAL INSTITUTIONAL PRINT VIEW & MODERN)
          ========================================================================= */}
      {selectedView === "CLASS" && (
        <div className="class-view-container">
          {/* Class View Header Controls Bar */}
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e3a8a" }}>
                Class View Mode:
              </span>
              <button
                type="button"
                className={`sub-view-btn ${classPrintViewMode === "OFFICIAL" ? "active" : ""}`}
                onClick={() => setClassPrintViewMode("OFFICIAL")}
                style={{
                  fontWeight: 700,
                  fontSize: "12px",
                  background: classPrintViewMode === "OFFICIAL" ? "#2563eb" : "#f1f5f9",
                  color: classPrintViewMode === "OFFICIAL" ? "white" : "#334155",
                  borderColor: classPrintViewMode === "OFFICIAL" ? "#1d4ed8" : "#cbd5e1"
                }}
              >
                📜 Official Institutional Print View
              </button>
              <button
                type="button"
                className={`sub-view-btn ${classPrintViewMode === "MODERN" ? "active" : ""}`}
                onClick={() => setClassPrintViewMode("MODERN")}
                style={{
                  fontWeight: 700,
                  fontSize: "12px",
                  background: classPrintViewMode === "MODERN" ? "#2563eb" : "#f1f5f9",
                  color: classPrintViewMode === "MODERN" ? "white" : "#334155",
                  borderColor: classPrintViewMode === "MODERN" ? "#1d4ed8" : "#cbd5e1"
                }}
              >
                ⚙️ Interactive Schedule Grid
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleExportCurrentClassExcel(selectedClassYear)}
                style={{
                  background: "#10b981",
                  color: "white",
                  borderColor: "#059669",
                  fontWeight: 700,
                  fontSize: "12px",
                  padding: "6px 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
                title={`Download ${selectedClassYear} ${getSemesterForYear(selectedClassYear, academicSemester)} Timetable (.xlsx)`}
              >
                📥 Download Excel (.xlsx)
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => window.print()}
                style={{ fontSize: "12px", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "5px" }}
              >
                🖨️ Print Class Timetable
              </button>
            </div>
          </div>

          {/* OFFICIAL INSTITUTIONAL PRINT VIEW (Exact match to uploaded benchmark document) */}
          <div className={`official-class-sheet-wrapper ${classPrintViewMode === "MODERN" ? "only-print" : ""}`} style={{ marginBottom: "25px" }}>
            <div className="official-timetable-sheet" style={{ background: "#ffffff", color: "#000000", border: "2px solid #000000", margin: "0 auto 20px", maxWidth: "1100px", fontFamily: "Arial, sans-serif" }}>
              {/* Official Institutional Header */}
              <div className="official-sheet-header" style={{ position: "relative", padding: "10px 14px", borderBottom: "1.5px solid #000000", textAlign: "center", lineHeight: "1.35" }}>
                <div style={{ position: "absolute", top: "14px", right: "20px", fontSize: "14px", fontStyle: "italic", fontWeight: 700 }}>
                  Class:- {selectedClassYear === "SY" ? "S. Y. IT." : (selectedClassYear === "TY" ? "T. Y. IT." : "Final Year B. Tech. IT.")}
                </div>
                <div style={{ fontSize: "14.5px", fontWeight: 700, letterSpacing: "0.5px" }}>K.E.Society's</div>
                <div style={{ fontSize: "15px", fontWeight: 700, marginTop: "2px" }}>Rajarambapu Institute of Technology,Rajaramnagar</div>
                <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px", textDecoration: "underline" }}>Department of Information Technology</div>
                <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px", textDecoration: "underline" }}>Class Time Table</div>
                <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>{academicSession}-{academicSemester}</div>
              </div>

              {/* Coordinator & Contact Hours Sub-Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 14px", borderBottom: "1.5px solid #000000", fontSize: "12px", fontWeight: 700 }}>
                <div>Class Cordinator: {selectedClassYear === "SY" ? "Ms.T.N.Kamble" : getClassCoordinator(selectedClassYear)}</div>
                <div>Total Contact Hrs : {masterData?.totalContactHours?.[selectedClassYear] || 26}</div>
              </div>

              {/* 20-Column Official Weekly Grid */}
              <div className="table-responsive">
                <table className="official-grid-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", tableLayout: "fixed", color: "#000000" }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ width: "35px", verticalAlign: "middle", border: "1px solid #000000", background: "#ffffff", padding: "2px" }}>
                        <div style={{ fontSize: "12px", fontWeight: 800 }}>
                          {selectedClassYear === "BTECH" ? "B.Tech" : selectedClassYear}
                        </div>
                        <div style={{ borderTop: "1px solid #000000", paddingTop: "2px", fontSize: "10px" }}>Sr.No</div>
                      </th>
                      <th rowSpan="2" style={{ width: "80px", verticalAlign: "middle", fontSize: "11px", border: "1px solid #000000", background: "#ffffff", padding: "2px" }}>Time</th>
                      <th colSpan="3" style={{ fontSize: "12px", border: "1px solid #000000", background: "#ffffff", padding: "4px 2px" }}>Monday</th>
                      <th colSpan="3" style={{ fontSize: "12px", border: "1px solid #000000", background: "#ffffff", padding: "4px 2px" }}>Tuesday</th>
                      <th colSpan="3" style={{ fontSize: "12px", border: "1px solid #000000", background: "#ffffff", padding: "4px 2px" }}>Wedensday</th>
                      <th colSpan="3" style={{ fontSize: "12px", border: "1px solid #000000", background: "#ffffff", padding: "4px 2px" }}>Thursday</th>
                      <th colSpan="3" style={{ fontSize: "12px", border: "1px solid #000000", background: "#ffffff", padding: "4px 2px" }}>Friday</th>
                      <th colSpan="3" style={{ fontSize: "12px", border: "1px solid #000000", background: "#ffffff", padding: "4px 2px" }}>Saturday</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Period 1 & 2 */}
                    {renderOfficialClassBlockRowPair(1, 2, "1.", "10.00\nto\n11.00", "2.", "11.00\nto\n12.00", selectedClassYear)}

                    {/* Lunch Break Row */}
                    <tr className="break-row-official">
                      <td colSpan="2" style={{ fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #000000", padding: "4px" }}>
                        12:00 To 12:45
                      </td>
                      <td colSpan="18" style={{ fontWeight: 700, letterSpacing: "1px", padding: "5px", border: "1px solid #000000", textAlign: "center" }}>
                        Lunch Break
                      </td>
                    </tr>

                    {/* Period 3 & 4 */}
                    {renderOfficialClassBlockRowPair(3, 4, "3.", "12.45\nto\n01.45", "4.", "01.45\nto\n02.45", selectedClassYear)}

                    {/* Recess Row */}
                    <tr className="break-row-official">
                      <td colSpan="2" style={{ fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #000000", padding: "4px" }}>
                        02:45 To 03:00
                      </td>
                      <td colSpan="18" style={{ fontWeight: 700, letterSpacing: "1px", padding: "5px", border: "1px solid #000000", textAlign: "center" }}>
                        Recess
                      </td>
                    </tr>

                    {/* Period 5 & 6 */}
                    {renderOfficialClassBlockRowPair(5, 6, "5.", "03.00\nto\n04.00", "6.", "04.00\nto\n05.00", selectedClassYear)}
                  </tbody>
                </table>
              </div>

              {/* Institutional Signatures */}
              <div className="official-sheet-footer" style={{ display: "flex", justifyContent: "space-between", padding: "16px 60px 12px", borderTop: "1.5px solid #000000", marginTop: "10px" }}>
                <div style={{ textAlign: "center", minWidth: "200px" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>Time Table Incharge</div>
                  <div style={{ marginTop: "16px", fontSize: "12.5px", fontWeight: 600 }}>Mrs.R.S.Patil</div>
                </div>
                <div style={{ textAlign: "center", minWidth: "200px" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>HOD</div>
                  <div style={{ marginTop: "16px", fontSize: "12.5px", fontWeight: 600 }}>Dr.A.C.Adamuthe</div>
                </div>
              </div>

              {/* Course & Teacher Reference Index Tables */}
              {(() => {
                const { courses, teachers } = getOfficialClassIndex(selectedClassYear);
                return (
                  <div style={{ display: "flex", gap: "20px", padding: "10px 14px", borderTop: "1px solid #000000", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
                    {/* Course Index */}
                    <div style={{ flex: "1 1 50%", minWidth: "300px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "4px" }}>*NB- New Building</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", border: "1px solid #000000" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            <th style={{ border: "1px solid #000000", padding: "3px 6px", textAlign: "left", width: "35%" }}>Abbrv. of Course</th>
                            <th style={{ border: "1px solid #000000", padding: "3px 6px", textAlign: "left" }}>Full Name of Course</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courses.map((c, idx) => (
                            <tr key={idx}>
                              <td style={{ border: "1px solid #000000", padding: "2px 6px", fontWeight: 700 }}>{c.abbr}</td>
                              <td style={{ border: "1px solid #000000", padding: "2px 6px" }}>{c.name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Teacher Index */}
                    <div style={{ flex: "1 1 45%", minWidth: "280px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", border: "1px solid #000000", marginTop: "18px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            <th style={{ border: "1px solid #000000", padding: "3px 6px", textAlign: "left", width: "35%" }}>Abbrv. of Teacher</th>
                            <th style={{ border: "1px solid #000000", padding: "3px 6px", textAlign: "left" }}>Full Name of Teacher</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teachers.map((t, idx) => (
                            <tr key={idx}>
                              <td style={{ border: "1px solid #000000", padding: "2px 6px", fontWeight: 700 }}>{t.abbr}</td>
                              <td style={{ border: "1px solid #000000", padding: "2px 6px" }}>{t.name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* MODERN INTERACTIVE SCHEDULE GRID (Only displayed when modern mode is toggled) */}
          {classPrintViewMode === "MODERN" && (
            <div className="no-print">
              {/* Class Meta Banner */}
              <div className="perspective-header-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
                  <div className="perspective-meta-item">
                    <span>Academic Class & Semester</span>
                    <strong style={{ fontSize: "15px", color: "#1e3a8a" }}>
                      {selectedClassYear === "SY" ? `Second Year (S.Y. B.Tech) — ${academicSemester === "PART-I" ? "Sem-III" : "Sem-IV"}` : (selectedClassYear === "TY" ? `Third Year (T.Y. B.Tech) — ${academicSemester === "PART-I" ? "Sem-V" : "Sem-VI"}` : `Final Year (B.Tech) — ${academicSemester === "PART-I" ? "Sem-VII" : "Sem-VIII"}`)}
                    </strong>
                    <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600, marginTop: "2px" }}>
                      Session: <strong>{academicSession}</strong> | Term: <strong>{academicSemester}</strong>
                    </div>
                  </div>
                  <div className="perspective-meta-item">
                    <span>Designated Classroom</span>
                    <strong style={{ color: "#16a34a", fontSize: "15px" }}>{getClassroom(selectedClassYear)}</strong>
                  </div>
                  <div className="perspective-meta-item">
                    <span>Class Coordinator</span>
                    <strong>{getClassCoordinator(selectedClassYear)}</strong>
                  </div>
                  <div className="perspective-meta-item">
                    <span>Weekly Contact Hours</span>
                    <strong style={{ color: "#0f172a" }}>
                      {masterData?.totalContactHours?.[selectedClassYear] || (selectedClassYear === "SY" ? 28 : (selectedClassYear === "TY" ? 27 : 25))} Hours
                    </strong>
                  </div>
                </div>
              </div>

              {/* Single Class Weekly Timetable Grid */}
              <div className="horizontal-schedule-card">
                <div className="table-responsive">
                  <table className="horizontal-schedule-table">
                    <thead>
                      <tr>
                        <th className="th-day">Day</th>
                        <th>Period 1<div className="th-time">10:00 To 11:00</div></th>
                        <th>Period 2<div className="th-time">11:00 To 12:00</div></th>
                        <th className="th-break" title="Recess (12:00 To 12:45)"></th>
                        <th>Period 3<div className="th-time">12:45 To 01:45</div></th>
                        <th>Period 4<div className="th-time">01:45 To 02:45</div></th>
                        <th className="th-break" title="Recess (02:45 To 03:00)"></th>
                        <th>Period 5<div className="th-time">03:00 To 04:00</div></th>
                        <th>Period 6<div className="th-time">04:00 To 05:00</div></th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day, dIdx) => (
                        <tr key={day}>
                          <td className="day-label-cell">
                            {day.charAt(0) + day.slice(1).toLowerCase()}
                          </td>
                          {renderClassSlot(selectedClassYear, day, 1)}
                          {renderClassSlot(selectedClassYear, day, 2)}
                          {dIdx === 0 && (
                            <td rowSpan="5" className="break-col-cell">
                              <span className="vertical-break-text">RECESS</span>
                            </td>
                          )}
                          {renderClassSlot(selectedClassYear, day, 3)}
                          {renderClassSlot(selectedClassYear, day, 4)}
                          {dIdx === 0 && (
                            <td rowSpan="5" className="break-col-cell">
                              <span className="vertical-break-text">RECESS</span>
                            </td>
                          )}
                          {renderClassSlot(selectedClassYear, day, 5)}
                          {renderClassSlot(selectedClassYear, day, 6)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Course Reference & Faculty Index Cards */}
              {(() => {
                const classIndex = computeClassIndex(selectedClassYear);

                return (
                  <div className="course-index-container">
                    {/* Theory Courses Card */}
                    <div className="index-card">
                      <h4>📘 Theory Courses & Faculty In-charge</h4>
                      <table className="index-table">
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Course Title</th>
                            <th>Assigned Faculty</th>
                            <th style={{ textAlign: "center" }}>Code</th>
                            <th style={{ textAlign: "center" }}>Hrs/Wk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(classIndex.theorySubjects || []).map((sub, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 700, color: "#1e3a8a" }}>{sub.code}</td>
                              <td>{sub.name}</td>
                              <td>{getFacultyFullName(sub.faculty?.name)}</td>
                              <td style={{ textAlign: "center", fontWeight: 700 }}>{sub.faculty?.name}</td>
                              <td style={{ textAlign: "center", fontWeight: 700 }}>{sub.weeklyPeriods || 3}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Practical Labs Card */}
                    <div className="index-card">
                      <h4>🔬 Laboratory Practicals & Batches</h4>
                      <table className="index-table">
                        <thead>
                          <tr>
                            <th style={{ width: "22%" }}>Lab Course</th>
                            <th style={{ width: "32%" }}>Faculty In-charge</th>
                            <th style={{ width: "14%", textAlign: "center" }}>Lab Room</th>
                            <th style={{ width: "20%" }}>Batches</th>
                            <th style={{ width: "12%", textAlign: "center" }}>Hrs/Wk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(classIndex.practicalList || []).map((p, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 700, color: "#7e22ce" }}>{p.subjectCode}</td>
                              <td>{getFacultyFullName(p.facultyCode)} ({p.facultyCode})</td>
                              <td style={{ textAlign: "center", fontWeight: 700, color: "#059669" }}>
                                <span style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "2px 7px", borderRadius: "4px", fontSize: "11px" }}>
                                  {p.room}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                  {p.batches.map((b) => (
                                    <span key={b} style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", color: "#6b21a8", padding: "1px 6px", borderRadius: "4px", fontSize: "10.5px", fontWeight: 700 }}>
                                      {b}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td style={{ textAlign: "center", fontWeight: 700 }}>{p.weeklyHours}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Institutional Fixed Slots */}
                    {classIndex.fixedSlots && classIndex.fixedSlots.length > 0 && (
                      <div className="index-card">
                        <h4>🏛 Institutional & Co-Curricular Slots</h4>
                        <table className="index-table">
                          <thead>
                            <tr>
                              <th>Activity / Course</th>
                              <th>Faculty / Mentor</th>
                              <th>Time Slot</th>
                              <th style={{ textAlign: "center" }}>Room</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classIndex.fixedSlots.map((fs, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 700, color: "#b45309" }}>{fs.courseName}</td>
                                <td>{fs.facultyName ? `${getFacultyFullName(fs.facultyName)} (${fs.facultyName})` : "Department Faculty"}</td>
                                <td>{fs.day} Period {fs.period}</td>
                                <td style={{ textAlign: "center", fontWeight: 700 }}>{fs.room || getClassroom(selectedClassYear)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          PERSPECTIVE 2: FACULTY PERSONAL TIMETABLES (OFFICIAL RIT FORMAT & MODERN)
          ========================================================================= */}
      {selectedView === "FACULTY" && (
        <div className="faculty-view-container">
          {(() => {
            const facSched = computeFacultySchedule(selectedFaculty);
            const maxCap = getFacultyMaxDaily(selectedFaculty);
            const asgn = getFacultyAssignments(selectedFaculty);

            const ugL = facSched.stats.theoryHours || 0;
            const ugPR = facSched.stats.practicalHours || 0;
            const ugCAP = asgn.fixedSlots?.filter((f) => (f.course || "").includes("Capstone")).length * 2 || (selectedFaculty === "SUM" ? 4 : 0);
            const ugMP = asgn.fixedSlots?.filter((f) => (f.course || "").includes("Mentoring") || (f.course || "").includes("Project")).length * 2 || (selectedFaculty === "SUM" ? 6 : 0);
            const pgL = (asgn.externalLoads || []).length > 0 ? (asgn.externalLoads.length) : (selectedFaculty === "SUM" ? 2 : 0);
            const totalWorkload = facSched.stats.totalHours || (ugL + ugPR + ugCAP + ugMP + pgL);

            return (
              <>
                {/* Control & Mode Switcher Bar */}
                <div className="sub-view-bar no-print" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span className="sub-view-label">Display Mode:</span>
                    <button
                      type="button"
                      className={`sub-view-btn ${facultyPrintViewMode === "OFFICIAL" ? "active" : ""}`}
                      onClick={() => setFacultyPrintViewMode("OFFICIAL")}
                      style={{ fontWeight: 700 }}
                    >
                      📋 Official Institutional Print View (RIT Image Format)
                    </button>
                    <button
                      type="button"
                      className={`sub-view-btn ${facultyPrintViewMode === "MODERN" ? "active" : ""}`}
                      onClick={() => setFacultyPrintViewMode("MODERN")}
                      style={{ fontWeight: 700 }}
                    >
                      📊 Modern Analytics View
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      value={academicSession}
                      onChange={(e) => setAcademicSession(e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", fontWeight: 700 }}
                      title="Select Academic Year Session"
                    >
                      <option value="2026-27">2026-27</option>
                      <option value="2025-26">2025-26</option>
                      <option value="2024-25">2024-25</option>
                    </select>

                    <select
                      value={academicSemester}
                      onChange={(e) => setAcademicSemester(e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", fontWeight: 700 }}
                      title="Select Academic Term"
                    >
                      <option value="PART-I">PART-I (Odd Semester)</option>
                      <option value="PART-II">PART-II (Even Semester)</option>
                    </select>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        const facObj = (inputs.faculties || []).find((f) => f.name === selectedFaculty);
                        exportPersonalTimetableToExcel({
                          facultyCode: selectedFaculty,
                          facultyName: getFacultyFullName(selectedFaculty),
                          designation: facObj?.designation || "Assistant Professor",
                          centralAuthority: facObj?.centralAuthority || "None",
                          academicSession,
                          academicSemester,
                          facSched,
                          assignments: asgn,
                          days
                        });
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "12px", background: "#16a34a", borderColor: "#15803d" }}
                      title="Save Personal Timetable directly to Excel file (.xlsx)"
                    >
                      📥 Download Excel (.xlsx)
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => window.print()}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "12px" }}
                      title="Print official personal timetable"
                    >
                      🖨️ Print Timetable
                    </button>
                  </div>
                </div>

                {/* VIEW 1: OFFICIAL INSTITUTIONAL PRINT VIEW (EXACT RIT IMAGE REPLICA) */}
                {facultyPrintViewMode === "OFFICIAL" ? (
                  <div className="official-personal-sheet-wrapper">
                    <div className="official-timetable-sheet">
                      {/* Document Header */}
                      <div className="official-sheet-header">
                        <div style={{ fontSize: "13.5px", fontWeight: 700, letterSpacing: "0.5px" }}>K.E.Society's</div>
                        <div style={{ fontSize: "15px", fontWeight: 800, marginTop: "2px" }}>Rajarambapu Institute of Technology,Rajaramnagar</div>
                        <div style={{ fontSize: "13.5px", fontWeight: 700, marginTop: "2px" }}>Department of Information Technology</div>
                        <div style={{ fontSize: "13.5px", fontWeight: 700, marginTop: "2px" }}>Personal Timetable</div>
                        <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>{academicSession}/ {academicSemester}</div>
                      </div>

                      {/* Faculty Info & Workload Allocation Table */}
                      <table className="official-summary-table">
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 700, width: "130px", whiteSpace: "nowrap" }}>Name of Faculty :</td>
                            <td style={{ fontWeight: 700, minWidth: "140px" }}>{getFacultyFullName(selectedFaculty)}</td>
                            <td style={{ width: "165px", whiteSpace: "nowrap" }}>
                              {(() => {
                                const facObj = (inputs.faculties || []).find((f) => f.name === selectedFaculty);
                                const desig = facObj?.designation || "Assistant Professor";
                                const auth = facObj?.centralAuthority;
                                return auth && auth !== "None" ? `${desig} (${auth})` : desig;
                              })()}
                            </td>
                            <td style={{ fontWeight: 700, textAlign: "center", width: "40px" }}>UG</td>
                            <td style={{ fontWeight: 700, width: "30px", textAlign: "center" }}>L:</td>
                            <td style={{ textAlign: "center", width: "35px" }}>{ugL}</td>
                            <td style={{ fontWeight: 700, width: "35px", textAlign: "center" }}>PR:</td>
                            <td style={{ textAlign: "center", width: "35px" }}>{ugPR}</td>
                            <td style={{ fontWeight: 700, width: "40px", textAlign: "center" }}>TUT:</td>
                            <td style={{ width: "30px" }}></td>
                            <td style={{ fontWeight: 700, width: "35px", textAlign: "center" }}>IIP:</td>
                            <td style={{ width: "30px" }}></td>
                            <td style={{ fontWeight: 700, width: "40px", textAlign: "center" }}>CAP:</td>
                            <td style={{ textAlign: "center", width: "35px" }}>{ugCAP || ""}</td>
                            <td style={{ fontWeight: 700, width: "40px", textAlign: "center" }}>M/P:</td>
                            <td style={{ textAlign: "center", width: "35px" }}>{ugMP || ""}</td>
                            <td style={{ width: "30px" }}></td>
                            <td style={{ width: "30px" }}></td>
                            <td style={{ fontWeight: 700, width: "50px", textAlign: "center" }}>Total:</td>
                            <td style={{ fontWeight: 700, width: "45px", textAlign: "center" }}>{totalWorkload}</td>
                          </tr>
                          <tr>
                            <td colSpan="3" style={{ borderTop: "none" }}></td>
                            <td style={{ fontWeight: 700, textAlign: "center" }}>PG</td>
                            <td style={{ fontWeight: 700, textAlign: "center" }}>L:</td>
                            <td style={{ textAlign: "center" }}>{pgL || ""}</td>
                            <td colSpan="2"></td>
                            <td style={{ fontWeight: 700, textAlign: "center" }}>TUT:</td>
                            <td></td>
                            <td style={{ fontWeight: 700, textAlign: "center" }}>ED:</td>
                            <td></td>
                            <td style={{ fontWeight: 700, textAlign: "center" }}>URE:</td>
                            <td></td>
                            <td style={{ fontWeight: 700, textAlign: "center" }} colSpan="2">SEMINAR:</td>
                            <td colSpan="4"></td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Main Official Grid Table */}
                      <table className="official-grid-table">
                        <thead>
                          <tr>
                            <th style={{ width: "42px" }}>Sr.No</th>
                            <th style={{ width: "95px" }}>Time</th>
                            <th colSpan="3">Monday</th>
                            <th colSpan="3">Tuesday</th>
                            <th colSpan="3">Wedensday</th>
                            <th colSpan="3">Thursday</th>
                            <th colSpan="3">Friday</th>
                            <th colSpan="3">Saturday</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Period 1 & 2 */}
                          {renderOfficialBlockRowPair(1, 2, "1.", "10.00\nto\n11.00", "2.", "11.00\nto\n12.00", facSched, selectedFaculty)}

                          {/* Lunch Break Row */}
                          <tr className="break-row-official">
                            <td colSpan="2" style={{ fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap" }}>
                              12.00 to 12.45 pm
                            </td>
                            <td colSpan="18" style={{ fontWeight: 700, letterSpacing: "1px", padding: "6px" }}>
                              Lunch Break
                            </td>
                          </tr>

                          {/* Period 3 & 4 */}
                          {renderOfficialBlockRowPair(3, 4, "3.", "12.45\nto\n01.45", "4.", "01.45\nto\n02.45", facSched, selectedFaculty)}

                          {/* Recess Row */}
                          <tr className="break-row-official">
                            <td colSpan="2" style={{ fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap" }}>
                              02.45 to 03.00 pm
                            </td>
                            <td colSpan="18" style={{ fontWeight: 700, letterSpacing: "1px", padding: "6px" }}>
                              Recess
                            </td>
                          </tr>

                          {/* Period 5 & 6 */}
                          {renderOfficialBlockRowPair(5, 6, "5.", "03.00\nto\n04.00", "6.", "04.00\nto\n05.00", facSched, selectedFaculty)}
                        </tbody>
                      </table>

                      {/* Institutional Signatures */}
                      <div className="official-sheet-footer">
                        <div style={{ textAlign: "center", minWidth: "180px" }}>
                          <div style={{ fontWeight: 700, fontSize: "13px" }}>Time Table Incharge</div>
                          <div style={{ marginTop: "6px", fontSize: "12.5px" }}>Ms.R.S.Patil</div>
                        </div>
                        <div style={{ textAlign: "center", minWidth: "180px" }}>
                          <div style={{ fontWeight: 700, fontSize: "13px" }}>HOD</div>
                          <div style={{ marginTop: "6px", fontSize: "12.5px" }}>Dr.A.C.Adamuthe</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* VIEW 2: MODERN ANALYTICS VIEW */
                  <>
                    <div className="perspective-header-card">
                      <div className="perspective-meta-item">
                        <span>Faculty Member</span>
                        <strong style={{ fontSize: "16px", color: "#1e3a8a" }}>
                          {getFacultyFullName(selectedFaculty)}
                        </strong>
                      </div>
                      <div className="perspective-meta-item">
                        <span>Short Code</span>
                        <strong style={{ fontSize: "15px" }}>{selectedFaculty}</strong>
                      </div>
                      <div className="perspective-meta-item">
                        <span>Designation & Role</span>
                        <strong style={{ fontSize: "14px" }}>
                          {(() => {
                            const facObj = (inputs.faculties || []).find((f) => f.name === selectedFaculty);
                            const desig = facObj?.designation || "Assistant Professor";
                            const auth = facObj?.centralAuthority;
                            return auth && auth !== "None" ? `${desig} (${auth})` : desig;
                          })()} / Dept. of IT
                        </strong>
                      </div>
                      <div className="perspective-meta-item">
                        <span>Configured Max Daily Workload</span>
                        <strong>{maxCap} Lectures / Day Max Cap</strong>
                      </div>
                    </div>

                    <div className="analytics-grid">
                      <div className="analytics-card">
                        <span className="analytics-title">Total Assigned Load</span>
                        <span className="analytics-value">{facSched.stats.totalHours} <span style={{ fontSize: "13px", fontWeight: 600 }}>Hrs/Wk</span></span>
                        <span className="analytics-sub">Across All Academic Years</span>
                      </div>
                      <div className="analytics-card">
                        <span className="analytics-title">Core Theory Lectures</span>
                        <span className="analytics-value" style={{ color: "#2563eb" }}>{facSched.stats.theoryHours} <span style={{ fontSize: "13px", fontWeight: 600 }}>Hrs</span></span>
                        <span className="analytics-sub">SY, TY & B.Tech Classes</span>
                      </div>
                      <div className="analytics-card">
                        <span className="analytics-title">Laboratory Practicals</span>
                        <span className="analytics-value" style={{ color: "#7e22ce" }}>{facSched.stats.practicalHours} <span style={{ fontSize: "13px", fontWeight: 600 }}>Hrs</span></span>
                        <span className="analytics-sub">Practical Batch Sessions</span>
                      </div>
                      <div className="analytics-card">
                        <span className="analytics-title">FY University External</span>
                        <span className="analytics-value" style={{ color: "#b45309" }}>{facSched.stats.externalHours} <span style={{ fontSize: "13px", fontWeight: 600 }}>Hrs</span></span>
                        <span className="analytics-sub">EEDP, PPS & PCC Loads</span>
                      </div>
                    </div>

                    <div className="horizontal-schedule-card">
                      <div className="table-responsive">
                        <table className="horizontal-schedule-table">
                          <thead>
                            <tr>
                              <th className="th-day">Day</th>
                              <th>Period 1<div className="th-time">10:00 To 11:00</div></th>
                              <th>Period 2<div className="th-time">11:00 To 12:00</div></th>
                              <th className="th-break" title="Recess (12:00 To 12:45)"></th>
                              <th>Period 3<div className="th-time">12:45 To 01:45</div></th>
                              <th>Period 4<div className="th-time">01:45 To 02:45</div></th>
                              <th className="th-break" title="Recess (02:45 To 03:00)"></th>
                              <th>Period 5<div className="th-time">03:00 To 04:00</div></th>
                              <th>Period 6<div className="th-time">04:00 To 05:00</div></th>
                              <th style={{ width: "70px" }}>Day Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {days.map((day, dIdx) => {
                              const dayLoad = facSched.stats.dailyLoads[day] || 0;
                              return (
                                <tr key={day}>
                                  <td className="day-label-cell">
                                    {day.charAt(0) + day.slice(1).toLowerCase()}
                                  </td>
                                  {[1, 2].map((p) => {
                                    const slot = facSched.grid[day]?.[p];
                                    if (!slot) return <td key={p} className="free-slot-cell">— Free / Prep —</td>;
                                    return (
                                      <td key={p} className={`schedule-slot-cell ${slot.badgeClass}`}>
                                        <div className="fac-slot-content">
                                          <span className="fac-slot-badge" style={{ background: slot.year === "FY" ? "#fef3c7" : "#dbeafe", color: slot.year === "FY" ? "#92400e" : "#1e40af" }}>
                                            {slot.year === "FY" ? "FY Univ" : `${slot.year} IT`} {slot.batch ? `• Batch ${slot.batch}` : ""}
                                          </span>
                                          <strong className="fac-slot-course">{slot.course}</strong>
                                          <span className="fac-slot-loc">📍 {slot.location}</span>
                                        </div>
                                      </td>
                                    );
                                  })}
                                  {dIdx === 0 && <td rowSpan="5" className="break-col-cell"><span className="vertical-break-text">RECESS</span></td>}
                                  {[3, 4].map((p) => {
                                    const slot = facSched.grid[day]?.[p];
                                    if (!slot) return <td key={p} className="free-slot-cell">— Free / Prep —</td>;
                                    return (
                                      <td key={p} className={`schedule-slot-cell ${slot.badgeClass}`}>
                                        <div className="fac-slot-content">
                                          <span className="fac-slot-badge" style={{ background: slot.year === "FY" ? "#fef3c7" : "#dbeafe", color: slot.year === "FY" ? "#92400e" : "#1e40af" }}>
                                            {slot.year === "FY" ? "FY Univ" : `${slot.year} IT`} {slot.batch ? `• Batch ${slot.batch}` : ""}
                                          </span>
                                          <strong className="fac-slot-course">{slot.course}</strong>
                                          <span className="fac-slot-loc">📍 {slot.location}</span>
                                        </div>
                                      </td>
                                    );
                                  })}
                                  {dIdx === 0 && <td rowSpan="5" className="break-col-cell"><span className="vertical-break-text">RECESS</span></td>}
                                  {[5, 6].map((p) => {
                                    const slot = facSched.grid[day]?.[p];
                                    if (!slot) return <td key={p} className="free-slot-cell">— Free / Prep —</td>;
                                    return (
                                      <td key={p} className={`schedule-slot-cell ${slot.badgeClass}`}>
                                        <div className="fac-slot-content">
                                          <span className="fac-slot-badge" style={{ background: slot.year === "FY" ? "#fef3c7" : "#dbeafe", color: slot.year === "FY" ? "#92400e" : "#1e40af" }}>
                                            {slot.year === "FY" ? "FY Univ" : `${slot.year} IT`} {slot.batch ? `• Batch ${slot.batch}` : ""}
                                          </span>
                                          <strong className="fac-slot-course">{slot.course}</strong>
                                          <span className="fac-slot-loc">📍 {slot.location}</span>
                                        </div>
                                      </td>
                                    );
                                  })}
                                  <td style={{ fontWeight: 800, background: "#f8fafc", fontSize: "12px", color: dayLoad >= maxCap ? "#b45309" : "#0f172a" }}>
                                    {dayLoad} Hrs
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* =========================================================================
          PERSPECTIVE 3: COMPUTER LAB OCCUPANCY SCHEDULE
          ========================================================================= */}
      {(selectedView === "LAB" || selectedView === "LAB_MASTER") && (
        <div className="lab-view-container">
          {selectedLab !== "ALL" && selectedView !== "LAB_MASTER" ? (
            (() => {
              const labSched = computeLabSchedule(selectedLab);

              return (
                <>
                  {/* Lab Meta Banner */}
                  <div className="perspective-header-card">
                    <div className="perspective-meta-item">
                      <span>Computer Laboratory</span>
                      <strong style={{ fontSize: "16px", color: "#7e22ce" }}>{selectedLab}</strong>
                    </div>
                    <div className="perspective-meta-item">
                      <span>Designated Role</span>
                      <strong>Practical Sessions & Project Work (IT Dept)</strong>
                    </div>
                    <div className="perspective-meta-item">
                      <span>Weekly Available Hours</span>
                      <strong>30 Hours (5 Working Days × 6 Periods)</strong>
                    </div>
                    <div className="perspective-meta-item">
                      <span>Occupied Hours</span>
                      <strong style={{ color: "#1e40af" }}>{labSched.stats.totalOccupied} Hours / Week</strong>
                    </div>
                    <div className="perspective-meta-item">
                      <span>Utilization Rate</span>
                      <strong style={{ color: Number(labSched.stats.utilizationPct) > 75 ? "#b45309" : "#16a34a" }}>
                        {labSched.stats.utilizationPct}%
                      </strong>
                    </div>
                  </div>

                  {/* Analytics Metric Cards */}
                  <div className="analytics-grid">
                    <div className="analytics-card">
                      <span className="analytics-title">Scheduled Practical Hours</span>
                      <span className="analytics-value" style={{ color: "#7e22ce" }}>{labSched.stats.totalOccupied} <span style={{ fontSize: "13px", fontWeight: 600 }}>Hrs/Wk</span></span>
                      <span className="analytics-sub">Across SY, TY & B.Tech Batches</span>
                    </div>
                    <div className="analytics-card">
                      <span className="analytics-title">Lab Utilization</span>
                      <span className="analytics-value" style={{ color: "#1e3a8a" }}>{labSched.stats.utilizationPct}%</span>
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${Math.min(100, Number(labSched.stats.utilizationPct))}%`,
                            background: Number(labSched.stats.utilizationPct) > 75 ? "#f59e0b" : "#22c55e"
                          }}
                        />
                      </div>
                    </div>
                    <div className="analytics-card">
                      <span className="analytics-title">Available Free Slots</span>
                      <span className="analytics-value" style={{ color: "#15803d" }}>
                        {labSched.stats.totalCapacity - labSched.stats.totalOccupied} <span style={{ fontSize: "13px", fontWeight: 600 }}>Hrs</span>
                      </span>
                      <span className="analytics-sub">Available for Remedial / Open Lab</span>
                    </div>
                  </div>

                  {/* Lab Weekly Schedule Grid */}
                  <div className="horizontal-schedule-card">
                    <div className="table-responsive">
                      <table className="horizontal-schedule-table">
                        <thead>
                          <tr>
                            <th className="th-day">Day</th>
                            <th>Period 1<div className="th-time">10:00 To 11:00</div></th>
                            <th>Period 2<div className="th-time">11:00 To 12:00</div></th>
                            <th className="th-break" title="Recess (12:00 To 12:45)"></th>
                            <th>Period 3<div className="th-time">12:45 To 01:45</div></th>
                            <th>Period 4<div className="th-time">01:45 To 02:45</div></th>
                            <th className="th-break" title="Recess (02:45 To 03:00)"></th>
                            <th>Period 5<div className="th-time">03:00 To 04:00</div></th>
                            <th>Period 6<div className="th-time">04:00 To 05:00</div></th>
                          </tr>
                        </thead>
                        <tbody>
                          {days.map((day, dIdx) => (
                            <tr key={day}>
                              <td className="day-label-cell">
                                {day.charAt(0) + day.slice(1).toLowerCase()}
                              </td>

                              {[1, 2].map((p) => {
                                const entry = labSched.grid[day]?.[p];
                                if (!entry) {
                                  return (
                                    <td key={p} className="available-lab-cell">
                                      ✓ Available / Open Lab
                                    </td>
                                  );
                                }
                                return (
                                  <td key={p} className="schedule-slot-cell badge-practical">
                                    <div className="lab-slot-content">
                                      <span className="lab-slot-class">{entry.year} IT {entry.batch ? `• Batch ${entry.batch}` : ""}</span>
                                      <strong className="lab-slot-subject">{entry.course}</strong>
                                      <span className="lab-slot-fac">👨‍🏫 Prof. {entry.faculty}</span>
                                    </div>
                                  </td>
                                );
                              })}

                              {dIdx === 0 && (
                                <td rowSpan="5" className="break-col-cell">
                                  <span className="vertical-break-text">RECESS</span>
                                </td>
                              )}

                              {[3, 4].map((p) => {
                                const entry = labSched.grid[day]?.[p];
                                if (!entry) {
                                  return (
                                    <td key={p} className="available-lab-cell">
                                      ✓ Available / Open Lab
                                    </td>
                                  );
                                }
                                return (
                                  <td key={p} className="schedule-slot-cell badge-practical">
                                    <div className="lab-slot-content">
                                      <span className="lab-slot-class">{entry.year} IT {entry.batch ? `• Batch ${entry.batch}` : ""}</span>
                                      <strong className="lab-slot-subject">{entry.course}</strong>
                                      <span className="lab-slot-fac">👨‍🏫 Prof. {entry.faculty}</span>
                                    </div>
                                  </td>
                                );
                              })}

                              {dIdx === 0 && (
                                <td rowSpan="5" className="break-col-cell">
                                  <span className="vertical-break-text">RECESS</span>
                                </td>
                              )}

                              {[5, 6].map((p) => {
                                const entry = labSched.grid[day]?.[p];
                                if (!entry) {
                                  return (
                                    <td key={p} className="available-lab-cell">
                                      ✓ Available / Open Lab
                                    </td>
                                  );
                                }
                                return (
                                  <td key={p} className="schedule-slot-cell badge-practical">
                                    <div className="lab-slot-content">
                                      <span className="lab-slot-class">{entry.year} IT {entry.batch ? `• Batch ${entry.batch}` : ""}</span>
                                      <strong className="lab-slot-subject">{entry.course}</strong>
                                      <span className="lab-slot-fac">👨‍🏫 Prof. {entry.faculty}</span>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Scheduled Lab Batches Index */}
                  <div className="index-card" style={{ marginTop: "16px" }}>
                    <h4>🔬 All Scheduled Batches in {selectedLab}</h4>
                    <table className="index-table">
                      <thead>
                        <tr>
                          <th>Day & Slot</th>
                          <th>Class & Batch</th>
                          <th>Practical Course</th>
                          <th>Faculty In-charge</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(labSched.sessions || []).map((s, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{s.day} Period {s.period} ({periodTimings[s.period - 1]})</td>
                            <td style={{ fontWeight: 700, color: "#1e3a8a" }}>{s.year} IT {s.batch ? `[Batch ${s.batch}]` : ""}</td>
                            <td style={{ fontWeight: 700, color: "#7e22ce" }}>{s.course}</td>
                            <td>{getFacultyFullName(s.faculty)} ({s.faculty})</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()
          ) : (
            (() => {
              const allOverview = computeAllLabsOverview();

              return (
                <>
                  {/* All Labs Overview Header Card */}
                  <div className="perspective-header-card">
                    <div className="perspective-meta-item">
                      <span>Laboratory Facility</span>
                      <strong style={{ fontSize: "16px", color: "#1e3a8a" }}>Department Computer Laboratories Overview</strong>
                    </div>
                    <div className="perspective-meta-item">
                      <span>Total Active Labs</span>
                      <strong>6 Labs (IL1 to IL6)</strong>
                    </div>
                    <div className="perspective-meta-item">
                      <span>Department Weekly Lab Capacity</span>
                      <strong>180 Laboratory Hours (6 × 30 Hours)</strong>
                    </div>
                  </div>

                  {/* Lab Utilization Comparison Summary */}
                  <div className="index-card" style={{ marginBottom: "18px" }}>
                    <h4>📊 Laboratory Weekly Utilization Comparison</h4>
                    <table className="index-table">
                      <thead>
                        <tr>
                          <th>Laboratory</th>
                          <th>Scheduled Practical Hours</th>
                          <th>Weekly Capacity</th>
                          <th>Utilization %</th>
                          <th style={{ width: "220px" }}>Utilization Meter</th>
                          <th style={{ textAlign: "center" }}>Quick Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allOverview.labStats.map((item) => (
                          <tr key={item.lab}>
                            <td style={{ fontWeight: 800, color: "#7e22ce", fontSize: "12px" }}>{item.lab}</td>
                            <td style={{ fontWeight: 700 }}>{item.totalOccupied} Hours / Week</td>
                            <td>30 Hours</td>
                            <td style={{ fontWeight: 800, color: Number(item.utilizationPct) > 75 ? "#b45309" : "#16a34a" }}>
                              {item.utilizationPct}%
                            </td>
                            <td>
                              <div className="progress-bar-container">
                                <div
                                  className="progress-bar-fill"
                                  style={{
                                    width: `${Math.min(100, Number(item.utilizationPct))}%`,
                                    background: Number(item.utilizationPct) > 75 ? "#f59e0b" : "#22c55e"
                                  }}
                                />
                              </div>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="sub-view-btn"
                                onClick={() => setSelectedLab(item.lab)}
                                style={{ padding: "3px 8px", fontSize: "11px" }}
                              >
                                View {item.lab} Grid →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Synchronized All Labs Schedule Matrix */}
                  <div className="horizontal-schedule-card">
                    <div style={{ padding: "10px 14px", background: "#f8fafc", borderBottom: "1px solid #000", fontWeight: 700, fontSize: "12px", color: "#1e3a8a" }}>
                      🔬 Synchronized Multi-Lab Timetable Matrix (All 6 Computer Labs by Time Block)
                    </div>
                    <div className="table-responsive">
                      <table className="horizontal-schedule-table">
                        <thead>
                          <tr>
                            <th className="th-day">Day</th>
                            <th style={{ width: "40px" }}>Period</th>
                            <th style={{ width: "95px" }}>Time Slot</th>
                            <th>IL1</th>
                            <th>IL2</th>
                            <th>IL3</th>
                            <th>IL4</th>
                            <th>IL5</th>
                            <th>IL6</th>
                          </tr>
                        </thead>
                        <tbody>
                          {days.map((day) => (
                            periods.map((p, pIdx) => (
                              <tr key={`${day}-${p}`} className={pIdx === 0 ? "day-start-row" : ""}>
                                {pIdx === 0 && (
                                  <td rowSpan="6" className="day-name-cell">
                                    {day.charAt(0) + day.slice(1).toLowerCase()}
                                  </td>
                                )}
                                <td style={{ fontWeight: 700 }}>{p}</td>
                                <td style={{ fontSize: "10.5px", whiteSpace: "nowrap" }}>{periodTimings[pIdx]}</td>

                                {["IL1", "IL2", "IL3", "IL4", "IL5", "IL6"].map((lab) => {
                                  const entry = allOverview.matrix[day]?.[p]?.[lab];
                                  if (!entry) {
                                    return (
                                      <td key={lab} style={{ background: "#f0fdf4", color: "#16a34a", fontSize: "10px" }}>
                                        Open
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={lab} style={{ background: "#f5f3ff", padding: "3px 4px", fontSize: "10px", textAlign: "left" }}>
                                      <strong style={{ color: "#1e40af" }}>{entry.year} [{entry.batch || "P"}]</strong>: {entry.course}
                                      <div style={{ color: "#64748b", fontSize: "9px" }}>Prof. {entry.faculty}</div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()
          )}
        </div>
      )}

      {/* =========================================================================
          PERSPECTIVE 4: TOTAL STAFF LOAD SHEET
          ========================================================================= */}
      {selectedView === "LOAD_SHEET" && (() => {
        const facultiesList = inputs.faculties || [];
        let grandTotalTheoryHours = 0;
        let grandTotalLabHours = 0;
        let grandTotalHours = 0;
        let balancedCount = 0;
        let highLoadCount = 0;
        let availableCount = 0;

        const facultyLoads = facultiesList.map((f) => {
          const asgn = getFacultyAssignments(f.name);
          const totalHours = asgn.totalHours;
          let theoryHrs = 0;
          asgn.theorySubjects.forEach((s) => { theoryHrs += (s.weeklyPeriods || 0); });
          let labHrs = 0;
          asgn.labCourses.forEach(() => { labHrs += 2; });
          asgn.practicals.forEach(() => { labHrs += 2; });

          grandTotalTheoryHours += theoryHrs;
          grandTotalLabHours += labHrs;
          grandTotalHours += totalHours;

          if (totalHours < 8) availableCount++;
          else if (totalHours > 16) highLoadCount++;
          else balancedCount++;

          return {
            ...f,
            asgn,
            totalHours,
            theoryHrs,
            labHrs
          };
        });

        const avgLoad = facultiesList.length > 0 ? (grandTotalHours / facultiesList.length).toFixed(1) : 0;

        return (
          <div className="load-sheet-container" style={{ marginBottom: "30px" }}>
            {/* Meta Banner */}
            <div className="perspective-header-card">
              <div className="perspective-meta-item">
                <span>Academic Document</span>
                <strong style={{ fontSize: "16px", color: "#1e3a8a" }}>Department Faculty Workload Allocation Sheet</strong>
              </div>
              <div className="perspective-meta-item">
                <span>Department & Institute</span>
                <strong>Department of Information Technology, RIT</strong>
              </div>
              <div className="perspective-meta-item">
                <span>Academic Term</span>
                <strong>Academic Year 2024-25 • Odd Semester</strong>
              </div>
              <div className="perspective-meta-item">
                <span>Total Active Staff</span>
                <strong style={{ color: "#7e22ce" }}>{facultiesList.length} Faculty Members</strong>
              </div>
            </div>

            {/* Department Summary Metrics */}
            <div className="analytics-grid">
              <div className="analytics-card">
                <span className="analytics-title">Total Allocated Hours</span>
                <span className="analytics-value" style={{ color: "#1e3a8a" }}>
                  {grandTotalHours} <span style={{ fontSize: "13px", fontWeight: 600 }}>Hrs / Week</span>
                </span>
                <span className="analytics-sub">Across All Theory, Labs & University Load</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-title">Average Staff Load</span>
                <span className="analytics-value" style={{ color: "#7e22ce" }}>
                  {avgLoad} <span style={{ fontSize: "13px", fontWeight: 600 }}>Hrs / Faculty</span>
                </span>
                <span className="analytics-sub">Standard Target: 12 – 16 Hours / Week</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-title">Workload Distribution</span>
                <div style={{ display: "flex", gap: "10px", marginTop: "8px", fontSize: "12.5px", fontWeight: 700 }}>
                  <span style={{ color: "#16a34a" }}>✓ {balancedCount} Balanced</span>
                  <span style={{ color: "#b45309" }}>🟠 {highLoadCount} High Load</span>
                  <span style={{ color: "#0284c7" }}>🟢 {availableCount} Available</span>
                </div>
                <span className="analytics-sub" style={{ marginTop: "4px" }}>Faculty Capacity Balance Status</span>
              </div>
            </div>

            {/* Main Workload Allocation Table */}
            <div className="master-table-card" style={{ marginTop: "16px" }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 18px",
                background: "#f8fafc",
                borderBottom: "2px solid #cbd5e1"
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>
                    📋 Total Staff Load Sheet — Detailed Course & Laboratory Allocations
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                    Official breakdown of theory lectures, practical labs, and external academic duties
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary no-print"
                  onClick={() => window.print()}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "13px" }}
                >
                  🖨️ Print Load Sheet
                </button>
              </div>

              <div className="table-responsive">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", textAlign: "left", borderBottom: "2px solid #cbd5e1", color: "#334155" }}>
                      <th style={{ padding: "10px 10px", width: "45px", textAlign: "center" }}>Sr.</th>
                      <th style={{ padding: "10px 10px", width: "75px" }}>Faculty</th>
                      <th style={{ padding: "10px 10px", minWidth: "160px" }}>Faculty Full Name</th>
                      <th style={{ padding: "10px 10px", minWidth: "150px" }}>Post / Designation</th>
                      <th style={{ padding: "10px 10px", width: "100px", textAlign: "center" }}>Authority</th>
                      <th style={{ padding: "10px 10px", width: "85px" }}>Daily Cap</th>
                      <th style={{ padding: "10px 10px", minWidth: "200px" }}>Theory Courses (SY / TY / BTech)</th>
                      <th style={{ padding: "10px 10px", minWidth: "160px" }}>Practical Labs</th>
                      <th style={{ padding: "10px 10px", minWidth: "130px" }}>Fixed & FY Load</th>
                      <th style={{ padding: "10px 10px", width: "95px", textAlign: "center" }}>Total Load</th>
                      <th style={{ padding: "10px 10px", width: "125px", textAlign: "center" }}>Status</th>
                      <th style={{ padding: "10px 10px", width: "110px", textAlign: "center" }} className="no-print">Quick View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyLoads.map((f, idx) => {
                      const asgn = f.asgn;
                      const totalHours = f.totalHours;

                      let badgeBg = "#dcfce7";
                      let badgeColor = "#15803d";
                      let badgeBorder = "#86efac";
                      let badgeText = "✓ Balanced";

                      if (totalHours < 8) {
                        badgeBg = "#e0f2fe";
                        badgeColor = "#0369a1";
                        badgeBorder = "#7dd3fc";
                        badgeText = "🟢 Available (<8h)";
                      } else if (totalHours > 16) {
                        badgeBg = "#fef3c7";
                        badgeColor = "#b45309";
                        badgeBorder = "#fcd34d";
                        badgeText = "🟠 High Load (>16h)";
                      }

                      return (
                        <tr key={f.name} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                          <td style={{ padding: "10px 10px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: "10px 10px", fontWeight: 700, color: "#1e3a8a" }}>
                            <span style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "3px 8px", borderRadius: "6px", fontSize: "12px" }}>
                              {f.name}
                            </span>
                          </td>
                          <td style={{ padding: "10px 10px", fontWeight: 600, color: "#0f172a" }}>
                            {f.fullName || f.name}
                          </td>
                          <td style={{ padding: "10px 10px", color: "#334155", fontWeight: 500 }}>
                            {f.designation || "Assistant Professor"}
                          </td>
                          <td style={{ padding: "10px 10px", textAlign: "center" }}>
                            {f.centralAuthority && f.centralAuthority !== "None" ? (
                              <span style={{
                                background: "#faf5ff",
                                color: "#7e22ce",
                                border: "1px solid #d8b4fe",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontSize: "11px",
                                fontWeight: 700,
                                display: "inline-block"
                              }}>
                                {f.centralAuthority}
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8", fontSize: "11.5px" }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "10px 10px", color: "#64748b", fontSize: "12px" }}>
                            {f.maxDailyLectures || 4} hrs/day
                          </td>
                          <td style={{ padding: "10px 10px" }}>
                            {asgn.theorySubjects.length === 0 ? (
                              <span style={{ color: "#94a3b8", fontSize: "11.5px" }}>— None —</span>
                            ) : (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                                {asgn.theorySubjects.map((s, sIdx) => (
                                  <span key={sIdx} style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                                    {s.year}: {s.code} ({s.weeklyPeriods}h)
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "10px 10px" }}>
                            {asgn.labCourses.length === 0 && asgn.practicals.length === 0 ? (
                              <span style={{ color: "#94a3b8", fontSize: "11.5px" }}>— None —</span>
                            ) : (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                                {asgn.labCourses.map((lc, lIdx) => (
                                  <span key={lIdx} style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                                    {lc.year}: {lc.code} Lab
                                  </span>
                                ))}
                                {asgn.practicals.length > 0 && asgn.labCourses.length === 0 && (
                                  <span style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                                    {asgn.practicals.length} Practical session(s)
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "10px 10px" }}>
                            {asgn.fixedSlots.length === 0 && asgn.externalLoads.length === 0 ? (
                              <span style={{ color: "#94a3b8", fontSize: "11.5px" }}>— None —</span>
                            ) : (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                                {asgn.fixedSlots.map((fs, fIdx) => (
                                  <span key={fIdx} style={{ background: "#fef3c7", color: "#92400e", padding: "2px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                                    {fs.year}: {fs.course}
                                  </span>
                                ))}
                                {asgn.externalLoads.map((ext, eIdx) => (
                                  <span key={`ext-${eIdx}`} style={{ background: "#faf5ff", color: "#6b21a8", padding: "2px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                                    {ext.loadType}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "10px 10px", textAlign: "center", fontWeight: 800, fontSize: "13px", color: "#0f172a" }}>
                            {totalHours} hrs/wk
                          </td>
                          <td style={{ padding: "10px 10px", textAlign: "center" }}>
                            <span style={{
                              background: badgeBg,
                              color: badgeColor,
                              border: `1px solid ${badgeBorder}`,
                              padding: "3px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: 700,
                              display: "inline-block"
                            }}>
                              {badgeText}
                            </span>
                          </td>
                          <td style={{ padding: "10px 10px", textAlign: "center" }} className="no-print">
                            <button
                              type="button"
                              className="sub-view-btn"
                              onClick={() => {
                                setSelectedFaculty(f.name);
                                setSelectedView("FACULTY");
                              }}
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                            >
                              View Schedule →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f1f5f9", fontWeight: 800, borderTop: "2px solid #cbd5e1" }}>
                      <td colSpan="4" style={{ padding: "12px 10px", textAlign: "right" }}>
                        Total Department Teaching Load:
                      </td>
                      <td style={{ padding: "12px 10px", color: "#0369a1" }}>
                        {grandTotalTheoryHours} hrs/wk (Theory)
                      </td>
                      <td style={{ padding: "12px 10px", color: "#15803d" }}>
                        {grandTotalLabHours} hrs/wk (Labs)
                      </td>
                      <td></td>
                      <td style={{ padding: "12px 10px", textAlign: "center", fontSize: "14px", color: "#1e3a8a" }}>
                        {grandTotalHours} hrs/wk
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          PERSPECTIVE 5: MASTER PERSONAL FACULTY TIME TABLE
          ========================================================================= */}
      {selectedView === "FACULTY_MASTER" && (() => {
        const { faculties, facultySchedules } = computeAllFacultyMasterMatrix();
        const daysToRender = facultyMasterDay === "ALL" ? days : [facultyMasterDay];

        return (
          <div className="faculty-master-container" style={{ marginBottom: "30px" }}>
            {/* Meta Banner */}
            <div className="perspective-header-card">
              <div className="perspective-meta-item">
                <span>Timetable Schedule</span>
                <strong style={{ fontSize: "16px", color: "#1e3a8a" }}>Master Personal Faculty Time Table</strong>
              </div>
              <div className="perspective-meta-item">
                <span>Department Staff</span>
                <strong>{faculties.length} Teaching Faculties Synchronized</strong>
              </div>
              <div className="perspective-meta-item">
                <span>Current View Mode</span>
                <strong style={{ color: "#7e22ce" }}>
                  {facultyMasterDay === "ALL" ? "All Working Days (Mon to Fri)" : `${facultyMasterDay.charAt(0) + facultyMasterDay.slice(1).toLowerCase()} Day Schedule`}
                </strong>
              </div>
              <div className="perspective-meta-item">
                <span>Working Slots</span>
                <strong>6 Periods / Day + 2 Recess Breaks</strong>
              </div>
            </div>

            {/* Render Day-by-Day Master Tables */}
            {daysToRender.map((day) => {
              return (
                <div key={day} className="horizontal-schedule-card" style={{ marginBottom: "24px" }}>
                  <div style={{
                    padding: "10px 16px",
                    background: "#f8fafc",
                    borderBottom: "2px solid #cbd5e1",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div style={{ fontWeight: 800, fontSize: "13.5px", color: "#1e3a8a" }}>
                      📅 {day.charAt(0) + day.slice(1).toLowerCase()} Master Faculty Matrix
                    </div>
                    <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>
                      All Faculty Synchronized Schedule
                    </span>
                  </div>

                  <div className="table-responsive">
                    <table className="horizontal-schedule-table">
                      <thead>
                        <tr>
                          <th style={{ width: "75px" }}>Faculty</th>
                          <th style={{ width: "160px" }}>Full Name</th>
                          <th>Period 1<div className="th-time">10:00 To 11:00</div></th>
                          <th>Period 2<div className="th-time">11:00 To 12:00</div></th>
                          <th className="th-break" title="Recess (12:00 To 12:45)"></th>
                          <th>Period 3<div className="th-time">12:45 To 01:45</div></th>
                          <th>Period 4<div className="th-time">01:45 To 02:45</div></th>
                          <th className="th-break" title="Recess (02:45 To 03:00)"></th>
                          <th>Period 5<div className="th-time">03:00 To 04:00</div></th>
                          <th>Period 6<div className="th-time">04:00 To 05:00</div></th>
                          <th style={{ width: "70px" }}>Day Load</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facultySchedules.map(({ faculty: f, schedule: sched }, idx) => {
                          const dailyLoad = sched.stats.dailyLoads[day] || 0;
                          return (
                            <tr key={f.name} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fbfcfe" }}>
                              <td style={{ fontWeight: 700, color: "#1e3a8a" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFaculty(f.name);
                                    setSelectedView("FACULTY");
                                  }}
                                  style={{
                                    background: "#eff6ff",
                                    border: "1px solid #bfdbfe",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    color: "#1d4ed8",
                                    fontSize: "11px"
                                  }}
                                  title={`View full personal schedule for Prof. ${f.fullName || f.name}`}
                                >
                                  {f.name}
                                </button>
                              </td>
                              <td style={{ textAlign: "left", paddingLeft: "8px", fontWeight: 600, fontSize: "11.5px", color: "#334155" }}>
                                {f.fullName || f.name}
                              </td>

                              {[1, 2].map((p) => {
                                const entry = sched.grid[day]?.[p];
                                if (!entry) {
                                  return (
                                    <td key={p} style={{ color: "#cbd5e1", fontSize: "11px" }}>
                                      —
                                    </td>
                                  );
                                }
                                return (
                                  <td key={p} className={`schedule-slot-cell ${entry.badgeClass || ""}`} style={{ padding: "4px" }}>
                                    <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#0f172a" }}>
                                      {entry.year} • {entry.course}
                                    </div>
                                    <div style={{ fontSize: "9.5px", color: "#475569" }}>
                                      📍 {entry.location}
                                    </div>
                                  </td>
                                );
                              })}

                              {idx === 0 && (
                                <td rowSpan={facultySchedules.length} className="break-col-cell">
                                  <span className="vertical-break-text">RECESS</span>
                                </td>
                              )}

                              {[3, 4].map((p) => {
                                const entry = sched.grid[day]?.[p];
                                if (!entry) {
                                  return (
                                    <td key={p} style={{ color: "#cbd5e1", fontSize: "11px" }}>
                                      —
                                    </td>
                                  );
                                }
                                return (
                                  <td key={p} className={`schedule-slot-cell ${entry.badgeClass || ""}`} style={{ padding: "4px" }}>
                                    <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#0f172a" }}>
                                      {entry.year} • {entry.course}
                                    </div>
                                    <div style={{ fontSize: "9.5px", color: "#475569" }}>
                                      📍 {entry.location}
                                    </div>
                                  </td>
                                );
                              })}

                              {idx === 0 && (
                                <td rowSpan={facultySchedules.length} className="break-col-cell">
                                  <span className="vertical-break-text">RECESS</span>
                                </td>
                              )}

                              {[5, 6].map((p) => {
                                const entry = sched.grid[day]?.[p];
                                if (!entry) {
                                  return (
                                    <td key={p} style={{ color: "#cbd5e1", fontSize: "11px" }}>
                                      —
                                    </td>
                                  );
                                }
                                return (
                                  <td key={p} className={`schedule-slot-cell ${entry.badgeClass || ""}`} style={{ padding: "4px" }}>
                                    <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#0f172a" }}>
                                      {entry.year} • {entry.course}
                                    </div>
                                    <div style={{ fontSize: "9.5px", color: "#475569" }}>
                                      📍 {entry.location}
                                    </div>
                                  </td>
                                );
                              })}

                              <td style={{ fontWeight: 800, color: dailyLoad > 0 ? "#1e40af" : "#94a3b8", fontSize: "11.5px" }}>
                                {dailyLoad > 0 ? `${dailyLoad}h` : "Off"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* =========================================================================
          PERSPECTIVE 6: MASTER CLASSROOM TIME TABLE
          ========================================================================= */}
      {selectedView === "ROOM_MASTER" && (() => {
        const { roomStats, matrix, rooms } = computeAllRoomsOverview();

        return (
          <div className="room-master-container" style={{ marginBottom: "30px" }}>
            {/* Perspective Header Card */}
            <div className="perspective-header-card">
              <div className="perspective-meta-item">
                <span>Classroom Facility</span>
                <strong style={{ fontSize: "16px", color: "#1e3a8a" }}>Master Classroom Time Table (All Theory Halls)</strong>
              </div>
              <div className="perspective-meta-item">
                <span>Core Lecture Halls</span>
                <strong>3 Classrooms (CR-27, CR-26, CR-212)</strong>
              </div>
              <div className="perspective-meta-item">
                <span>Department Weekly Capacity</span>
                <strong>90 Lecture Hours (3 × 30 Hours)</strong>
              </div>
            </div>

            {/* Room Utilization Comparison Summary */}
            <div className="index-card" style={{ marginBottom: "18px" }}>
              <h4>📊 Theory Lecture Halls Weekly Utilization Comparison</h4>
              <table className="index-table">
                <thead>
                  <tr>
                    <th>Classroom</th>
                    <th>Designated Academic Class</th>
                    <th>Scheduled Lecture Hours</th>
                    <th>Weekly Capacity</th>
                    <th>Utilization %</th>
                    <th style={{ width: "220px" }}>Utilization Meter</th>
                    <th style={{ textAlign: "center" }}>Quick Action</th>
                  </tr>
                </thead>
                <tbody>
                  {roomStats.map((item) => (
                    <tr key={item.room}>
                      <td style={{ fontWeight: 800, color: "#1e40af", fontSize: "12.5px" }}>{item.room}</td>
                      <td style={{ fontWeight: 600 }}>{item.label}</td>
                      <td style={{ fontWeight: 700 }}>{item.totalOccupied} Hours / Week</td>
                      <td>30 Hours</td>
                      <td style={{ fontWeight: 800, color: Number(item.utilizationPct) > 70 ? "#b45309" : "#16a34a" }}>
                        {item.utilizationPct}%
                      </td>
                      <td>
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Math.min(100, Number(item.utilizationPct))}%`,
                              background: Number(item.utilizationPct) > 70 ? "#f59e0b" : "#22c55e"
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="sub-view-btn"
                          onClick={() => {
                            setSelectedRoom(item.room);
                            setSelectedView("ROOM");
                          }}
                          style={{ padding: "3px 8px", fontSize: "11px" }}
                        >
                          View {item.room} Grid →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Synchronized Multi-Classroom Schedule Matrix */}
            <div className="horizontal-schedule-card">
              <div style={{ padding: "10px 14px", background: "#f8fafc", borderBottom: "1px solid #000", fontWeight: 700, fontSize: "12px", color: "#1e3a8a" }}>
                🏛️ Synchronized Multi-Classroom Timetable Matrix (CR-27, CR-26 & CR-212 by Time Block)
              </div>
              <div className="table-responsive">
                <table className="horizontal-schedule-table">
                  <thead>
                    <tr>
                      <th className="th-day">Day</th>
                      <th style={{ width: "40px" }}>Period</th>
                      <th style={{ width: "95px" }}>Time Slot</th>
                      <th>CR-27 (S.Y. B.Tech)</th>
                      <th>CR-26 (T.Y. B.Tech)</th>
                      <th>CR-212 (Final Year B.Tech)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day) => (
                      periods.map((p, pIdx) => (
                        <tr key={`${day}-${p}`} className={pIdx === 0 ? "day-start-row" : ""}>
                          {pIdx === 0 && (
                            <td rowSpan="6" className="day-name-cell">
                              {day.charAt(0) + day.slice(1).toLowerCase()}
                            </td>
                          )}
                          <td style={{ fontWeight: 700 }}>{p}</td>
                          <td style={{ fontSize: "10.5px", whiteSpace: "nowrap" }}>{periodTimings[pIdx]}</td>

                          {rooms.map((r) => {
                            const entry = matrix[day]?.[p]?.[r.code];
                            if (!entry) {
                              return (
                                <td key={r.code} style={{ background: "#f0fdf4", color: "#16a34a", fontSize: "10.5px" }}>
                                  ✓ Available / Vacant Hall
                                </td>
                              );
                            }
                            return (
                              <td key={r.code} style={{ background: "#eff6ff", padding: "5px 6px", fontSize: "10.5px", textAlign: "left" }}>
                                <strong style={{ color: "#1e40af" }}>{entry.year} IT</strong>: {entry.course}
                                <div style={{ color: "#64748b", fontSize: "9.5px", marginTop: "1px" }}>
                                  👨‍🏫 Prof. {entry.faculty}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          PERSPECTIVE 7: PERSONAL CLASSROOM TIME TABLE
          ========================================================================= */}
      {selectedView === "ROOM" && (() => {
        const roomSched = computeRoomSchedule(selectedRoom);
        const roomObj = getAllClassrooms().find((r) => r.code === selectedRoom) || { label: `Lecture Hall ${selectedRoom}`, year: "Class" };

        return (
          <div className="room-view-container" style={{ marginBottom: "30px" }}>
            {/* Room Meta Banner */}
            <div className="perspective-header-card">
              <div className="perspective-meta-item">
                <span>Lecture Classroom</span>
                <strong style={{ fontSize: "16px", color: "#1e40af" }}>{selectedRoom}</strong>
              </div>
              <div className="perspective-meta-item">
                <span>Primary Academic Class</span>
                <strong>{roomObj.label}</strong>
              </div>
              <div className="perspective-meta-item">
                <span>Weekly Available Hours</span>
                <strong>30 Hours (5 Working Days × 6 Periods)</strong>
              </div>
              <div className="perspective-meta-item">
                <span>Occupied Hours</span>
                <strong style={{ color: "#1e40af" }}>{roomSched.stats.totalOccupied} Hours / Week</strong>
              </div>
              <div className="perspective-meta-item">
                <span>Utilization Rate</span>
                <strong style={{ color: Number(roomSched.stats.utilizationPct) > 70 ? "#b45309" : "#16a34a" }}>
                  {roomSched.stats.utilizationPct}%
                </strong>
              </div>
            </div>

            {/* Analytics Metric Cards */}
            <div className="analytics-grid">
              <div className="analytics-card">
                <span className="analytics-title">Scheduled Theory Lectures</span>
                <span className="analytics-value" style={{ color: "#1e40af" }}>
                  {roomSched.stats.totalOccupied} <span style={{ fontSize: "13px", fontWeight: 600 }}>Hrs/Wk</span>
                </span>
                <span className="analytics-sub">Across Working Days in {selectedRoom}</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-title">Classroom Utilization</span>
                <span className="analytics-value" style={{ color: "#1e3a8a" }}>{roomSched.stats.utilizationPct}%</span>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(100, Number(roomSched.stats.utilizationPct))}%`,
                      background: Number(roomSched.stats.utilizationPct) > 70 ? "#f59e0b" : "#22c55e"
                    }}
                  />
                </div>
              </div>
              <div className="analytics-card">
                <span className="analytics-title">Available Free Slots</span>
                <span className="analytics-value" style={{ color: "#15803d" }}>
                  {roomSched.stats.totalCapacity - roomSched.stats.totalOccupied} <span style={{ fontSize: "13px", fontWeight: 600 }}>Hrs</span>
                </span>
                <span className="analytics-sub">Vacant when students attend computer labs</span>
              </div>
            </div>

            {/* Room Weekly Schedule Grid */}
            <div className="horizontal-schedule-card">
              <div className="table-responsive">
                <table className="horizontal-schedule-table">
                  <thead>
                    <tr>
                      <th className="th-day">Day</th>
                      <th>Period 1<div className="th-time">10:00 To 11:00</div></th>
                      <th>Period 2<div className="th-time">11:00 To 12:00</div></th>
                      <th className="th-break" title="Recess (12:00 To 12:45)"></th>
                      <th>Period 3<div className="th-time">12:45 To 01:45</div></th>
                      <th>Period 4<div className="th-time">01:45 To 02:45</div></th>
                      <th className="th-break" title="Recess (02:45 To 03:00)"></th>
                      <th>Period 5<div className="th-time">03:00 To 04:00</div></th>
                      <th>Period 6<div className="th-time">04:00 To 05:00</div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day, dIdx) => (
                      <tr key={day}>
                        <td className="day-label-cell">
                          {day.charAt(0) + day.slice(1).toLowerCase()}
                        </td>

                        {[1, 2].map((p) => {
                          const entry = roomSched.grid[day]?.[p];
                          if (!entry) {
                            return (
                              <td key={p} className="available-lab-cell">
                                ✓ Available / Vacant Hall
                              </td>
                            );
                          }
                          return (
                            <td key={p} className="schedule-slot-cell badge-theory">
                              <div className="lab-slot-content">
                                <span className="lab-slot-class">{entry.year} IT</span>
                                <strong className="lab-slot-subject">{entry.course}</strong>
                                <span className="lab-slot-fac">👨‍🏫 Prof. {entry.faculty}</span>
                              </div>
                            </td>
                          );
                        })}

                        {dIdx === 0 && (
                          <td rowSpan="5" className="break-col-cell">
                            <span className="vertical-break-text">RECESS</span>
                          </td>
                        )}

                        {[3, 4].map((p) => {
                          const entry = roomSched.grid[day]?.[p];
                          if (!entry) {
                            return (
                              <td key={p} className="available-lab-cell">
                                ✓ Available / Vacant Hall
                              </td>
                            );
                          }
                          return (
                            <td key={p} className="schedule-slot-cell badge-theory">
                              <div className="lab-slot-content">
                                <span className="lab-slot-class">{entry.year} IT</span>
                                <strong className="lab-slot-subject">{entry.course}</strong>
                                <span className="lab-slot-fac">👨‍🏫 Prof. {entry.faculty}</span>
                              </div>
                            </td>
                          );
                        })}

                        {dIdx === 0 && (
                          <td rowSpan="5" className="break-col-cell">
                            <span className="vertical-break-text">RECESS</span>
                          </td>
                        )}

                        {[5, 6].map((p) => {
                          const entry = roomSched.grid[day]?.[p];
                          if (!entry) {
                            return (
                              <td key={p} className="available-lab-cell">
                                ✓ Available / Vacant Hall
                              </td>
                            );
                          }
                          return (
                            <td key={p} className="schedule-slot-cell badge-theory">
                              <div className="lab-slot-content">
                                <span className="lab-slot-class">{entry.year} IT</span>
                                <strong className="lab-slot-subject">{entry.course}</strong>
                                <span className="lab-slot-fac">👨‍🏫 Prof. {entry.faculty}</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scheduled Room Lectures Index */}
            <div className="index-card" style={{ marginTop: "16px" }}>
              <h4>🏛️ All Scheduled Theory Lectures in {selectedRoom}</h4>
              <table className="index-table">
                <thead>
                  <tr>
                    <th>Day & Slot</th>
                    <th>Class Year</th>
                    <th>Subject Course</th>
                    <th>Faculty In-charge</th>
                  </tr>
                </thead>
                <tbody>
                  {(roomSched.sessions || []).map((s, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{s.day} Period {s.period} ({periodTimings[s.period - 1]})</td>
                      <td style={{ fontWeight: 700, color: "#1e3a8a" }}>{s.year} IT</td>
                      <td style={{ fontWeight: 700, color: "#0369a1" }}>{s.course}</td>
                      <td>{getFacultyFullName(s.faculty)} ({s.faculty})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Safe Faculty Deletion & Load Reassignment Modal */}
      {deleteModalOpen && facultyToDelete && (() => {
        const assignments = getFacultyAssignments(facultyToDelete);
        const facObj = inputs.faculties.find((f) => f.name === facultyToDelete);
        const facName = facObj?.fullName || facultyToDelete;

        return (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}>
            <div style={{
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              maxWidth: "620px",
              width: "100%",
              overflow: "hidden",
              border: "1px solid #cbd5e1"
            }}>
              <div style={{
                background: "#fef2f2",
                borderBottom: "1px solid #fecaca",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                <span style={{ fontSize: "24px" }}>⚠️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#991b1b", fontWeight: 700 }}>
                    Safe Deletion Check: {facultyToDelete} ({facName})
                  </h3>
                  <div style={{ fontSize: "12.5px", color: "#b91c1c", marginTop: "2px" }}>
                    This faculty member cannot be deleted directly because they are currently teaching <strong>{assignments.totalHours} weekly hours</strong> across {assignments.totalActiveCount} session(s).
                  </div>
                </div>
              </div>

              <div style={{ padding: "20px", maxHeight: "420px", overflowY: "auto" }}>
                <div style={{ marginBottom: "14px", fontSize: "13px", color: "#334155" }}>
                  To avoid leaving any classes or laboratory batches without an instructor, select a replacement faculty member below. All teaching assignments will be transferred automatically:
                </div>

                {assignments.theorySubjects.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontWeight: 700, fontSize: "12px", color: "#1e40af", marginBottom: "4px" }}>
                      📘 Active Theory Subjects ({assignments.theorySubjects.length}):
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {assignments.theorySubjects.map((s, idx) => (
                        <span key={idx} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", color: "#1e3a8a" }}>
                          {s.year}: <strong>{s.code}</strong> - {s.name} ({s.weeklyPeriods} hrs/wk)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(assignments.labCourses.length > 0 || assignments.practicals.length > 0) && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontWeight: 700, fontSize: "12px", color: "#047857", marginBottom: "4px" }}>
                      🔬 Laboratory Practicals ({assignments.labCourses.length + assignments.practicals.length}):
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {assignments.labCourses.map((lc, idx) => (
                        <span key={idx} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", color: "#14532d" }}>
                          {lc.year}: <strong>{lc.code} Lab</strong> ({lc.room})
                        </span>
                      ))}
                      {assignments.practicals.map((pr, idx) => (
                        <span key={`pr-${idx}`} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", color: "#14532d" }}>
                          {pr.year} Batch {pr.batch}: {pr.practical} ({pr.day} {pr.period})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {assignments.fixedSlots.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontWeight: 700, fontSize: "12px", color: "#b45309", marginBottom: "4px" }}>
                      📌 Fixed Slots / Mentoring ({assignments.fixedSlots.length}):
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {assignments.fixedSlots.map((fs, idx) => (
                        <span key={idx} style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", color: "#78350f" }}>
                          {fs.year}: {fs.course} ({fs.day} P{fs.period})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {assignments.externalLoads.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontWeight: 700, fontSize: "12px", color: "#6b21a8", marginBottom: "4px" }}>
                      🏛️ External FY University Loads ({assignments.externalLoads.length}):
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {assignments.externalLoads.map((ext, idx) => (
                        <span key={idx} style={{ background: "#faf5ff", border: "1px solid #e9d5ff", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", color: "#581c87" }}>
                          {ext.loadType} ({ext.day} P{ext.period})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: "16px", padding: "14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                    Select Replacement Faculty to Take Over {facultyToDelete}'s Load:
                  </label>
                  <select
                    value={deleteReplacement}
                    onChange={(e) => setDeleteReplacement(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      fontWeight: 600
                    }}
                  >
                    <option value="">-- Choose Replacement Faculty --</option>
                    {inputs.faculties
                      .filter((f) => f.name !== facultyToDelete)
                      .map((f) => {
                        const asgn = getFacultyAssignments(f.name);
                        return (
                          <option key={f.name} value={f.name}>
                            {f.name} - {f.fullName || f.name} ({asgn.totalHours} hrs/wk current load · Max: {f.maxDailyLectures}/day)
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>

              <div style={{
                background: "#f1f5f9",
                borderTop: "1px solid #e2e8f0",
                padding: "14px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setFacultyToDelete(null);
                  }}
                  className="btn-secondary"
                  style={{ fontSize: "13px", padding: "8px 16px" }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!deleteReplacement}
                  onClick={() => {
                    handleReplaceFaculty(facultyToDelete, deleteReplacement, true);
                    setDeleteModalOpen(false);
                    setFacultyToDelete(null);
                  }}
                  className="btn-primary"
                  style={{
                    fontSize: "13px",
                    padding: "8px 18px",
                    background: !deleteReplacement ? "#94a3b8" : "#dc2626",
                    cursor: !deleteReplacement ? "not-allowed" : "pointer"
                  }}
                >
                  ⚡ Transfer Load to {deleteReplacement || "Replacement"} & Delete {facultyToDelete}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Setup for New Academic Year / Semester Modal */}
      {newYearModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 99999,
          padding: "20px"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "680px",
            maxHeight: "92vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #cbd5e1"
          }}>
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
              color: "white",
              padding: "18px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTopLeftRadius: "14px",
              borderTopRightRadius: "14px"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800 }}>
                  ✨ Setup New Academic Year / Semester Timetable
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.9 }}>
                  Import benchmark infrastructure & courses while clearing previous teacher allocations for fresh semester setup
                </p>
              </div>
              <button
                onClick={() => {
                  setNewYearModalOpen(false);
                  setShowCustomSessionField(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: "22px",
                  cursor: "pointer",
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Configuration Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
                {/* Academic Session */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e3a8a", marginBottom: "6px" }}>
                    📅 Academic Session:
                  </label>
                  {!showCustomSessionField ? (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <select
                        value={newYearSetupSession}
                        onChange={(e) => {
                          if (e.target.value === "__NEW__") {
                            setShowCustomSessionField(true);
                          } else {
                            setNewYearSetupSession(e.target.value);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13px",
                          fontWeight: 700
                        }}
                      >
                        {availableSessions.map((sess) => (
                          <option key={sess} value={sess}>{sess}</option>
                        ))}
                        <option value="__NEW__">+ Add Custom Session...</option>
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        placeholder="e.g. 2027-28"
                        value={customSessionInput}
                        onChange={(e) => setCustomSessionInput(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #3b82f6",
                          fontSize: "13px",
                          fontWeight: 700
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowCustomSessionField(false)}
                        className="btn-secondary"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Academic Term */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e3a8a", marginBottom: "6px" }}>
                    🔄 Academic Term (Semester):
                  </label>
                  <select
                    value={newYearSetupSemester}
                    onChange={(e) => setNewYearSetupSemester(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      fontWeight: 700
                    }}
                  >
                    <option value="PART-I">PART-I (Odd Semester: Sem III, V, VII)</option>
                    <option value="PART-II">PART-II (Even Semester: Sem IV, VI, VIII)</option>
                  </select>
                </div>
              </div>

              {/* Scope Selection */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e3a8a", marginBottom: "6px" }}>
                  🎯 Scope of Fresh Allotment:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: newYearSetupScope === "ALL" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    background: newYearSetupScope === "ALL" ? "#eff6ff" : "#f8fafc",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "12.5px"
                  }}>
                    <input
                      type="radio"
                      name="setupScope"
                      checked={newYearSetupScope === "ALL"}
                      onChange={() => setNewYearSetupScope("ALL")}
                    />
                    <span>All 3 Years (SY, TY, BTech) <span style={{ fontSize: "11px", color: "#64748b" }}>(Recommended)</span></span>
                  </label>

                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: newYearSetupScope === "SY" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    background: newYearSetupScope === "SY" ? "#eff6ff" : "#f8fafc",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "12.5px"
                  }}>
                    <input
                      type="radio"
                      name="setupScope"
                      checked={newYearSetupScope === "SY"}
                      onChange={() => setNewYearSetupScope("SY")}
                    />
                    <span>Second Year (S.E. / S.Y.) Only</span>
                  </label>

                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: newYearSetupScope === "TY" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    background: newYearSetupScope === "TY" ? "#eff6ff" : "#f8fafc",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "12.5px"
                  }}>
                    <input
                      type="radio"
                      name="setupScope"
                      checked={newYearSetupScope === "TY"}
                      onChange={() => setNewYearSetupScope("TY")}
                    />
                    <span>Third Year (T.E. / T.Y.) Only</span>
                  </label>

                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: newYearSetupScope === "BTECH" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    background: newYearSetupScope === "BTECH" ? "#eff6ff" : "#f8fafc",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "12.5px"
                  }}>
                    <input
                      type="radio"
                      name="setupScope"
                      checked={newYearSetupScope === "BTECH"}
                      onChange={() => setNewYearSetupScope("BTECH")}
                    />
                    <span>Final Year (B.Tech) Only</span>
                  </label>
                </div>
              </div>

              {/* What Will Happen Checklist */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ fontWeight: 700, color: "#166534", fontSize: "12.5px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>✅ Preserved & Imported</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11.5px", color: "#166534", lineHeight: "1.6" }}>
                    <li><strong>All {inputs.faculties?.length || 19} Faculty Members</strong> (Full names, designations & roles)</li>
                    <li><strong>All Theory Courses</strong> (Course codes, names & weekly hours)</li>
                    <li><strong>All Lab Courses & Batches</strong> (IL1 to IL6, Batches I1-I4)</li>
                    <li><strong>Designated Classrooms</strong> (CR-27, CR-26, CR-212)</li>
                  </ul>
                </div>

                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ fontWeight: 700, color: "#92400e", fontSize: "12.5px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🧹 Cleared for Fresh Allotment</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11.5px", color: "#92400e", lineHeight: "1.6" }}>
                    <li><strong>Teacher Allotments on Courses</strong> (Reset to -- Select Faculty --)</li>
                    <li><strong>Lab Batch Allocations</strong> (Ready for fresh assignment)</li>
                    <li><strong>Fixed & External Loads</strong> (Cleared so load starts at 0 hrs/wk)</li>
                    <li><strong>Generated Schedules</strong> (Ready to generate after allotting)</li>
                  </ul>
                </div>
              </div>

              {/* Info banner */}
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "10px 14px", fontSize: "12px", color: "#1e40af", marginBottom: "20px" }}>
                💡 <strong>Load Calculation:</strong> After importing, each faculty's teaching workload will start at <strong>0 hrs/wk</strong>. As you allot courses to teachers in the department drawer, total staff load and capacity status will calculate dynamically in real time!
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setNewYearModalOpen(false);
                    setShowCustomSessionField(false);
                  }}
                  className="btn-secondary"
                  style={{ fontSize: "13px", padding: "8px 18px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteNewYearSetup()}
                  className="btn-primary"
                  style={{
                    fontSize: "13px",
                    padding: "8px 22px",
                    background: "#16a34a",
                    borderColor: "#15803d",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  🚀 Confirm & Import Base Structure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Timetable Reset Options Modal */}
      {resetModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 99999,
          padding: "20px"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "580px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #cbd5e1",
            overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
              color: "white",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🔄 Reset & Restore Options</span>
                </h3>
                <p style={{ margin: "3px 0 0", fontSize: "12px", opacity: 0.9 }}>
                  Choose how you want to reset or restore your timetable and department data
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "white", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Option 1: Reload from last saved point */}
              <div
                style={{
                  border: "1.5px solid #86efac",
                  background: "#f0fdf4",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "14px"
                }}
              >
                <div>
                  <strong style={{ color: "#166534", fontSize: "14px", display: "block" }}>
                    🔄 Reload from Last Saved Point
                  </strong>
                  <span style={{ fontSize: "12px", color: "#374151" }}>
                    Restore your department inputs and generated timetable back to your last saved state ({lastSavedTime || "No saved state yet"}).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResetModalOpen(false);
                    handleReloadSavedData();
                  }}
                  className="btn-primary"
                  style={{
                    background: "#16a34a",
                    borderColor: "#15803d",
                    whiteSpace: "nowrap",
                    padding: "7px 14px",
                    fontSize: "12px",
                    fontWeight: 700
                  }}
                >
                  Reload Saved
                </button>
              </div>

              {/* Option 2: Reset to RIT Benchmark Preset */}
              <div
                style={{
                  border: "1.5px solid #cbd5e1",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "14px"
                }}
              >
                <div>
                  <strong style={{ color: "#0f172a", fontSize: "14px", display: "block" }}>
                    🏢 Reset to RIT Benchmark Preset
                  </strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Restore the official RIT Information Technology department curriculum benchmark, standard faculty list, and room definitions.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResetModalOpen(false);
                    handleResetToPreset();
                  }}
                  className="btn-secondary"
                  style={{
                    whiteSpace: "nowrap",
                    padding: "7px 14px",
                    fontSize: "12px",
                    fontWeight: 700
                  }}
                >
                  Apply Preset
                </button>
              </div>

              {/* Option 3: Reset to Blank */}
              <div
                style={{
                  border: "1.5px solid #fecaca",
                  background: "#fef2f2",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "14px"
                }}
              >
                <div>
                  <strong style={{ color: "#b91c1c", fontSize: "14px", display: "block" }}>
                    🗑️ Reset to Blank Canvas
                  </strong>
                  <span style={{ fontSize: "12px", color: "#7f1d1d" }}>
                    Erase all current courses, faculties, and room mappings to start entering brand new data from scratch.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResetModalOpen(false);
                    handleResetToBlank();
                  }}
                  className="btn-secondary"
                  style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    borderColor: "#fca5a5",
                    whiteSpace: "nowrap",
                    padding: "7px 14px",
                    fontSize: "12px",
                    fontWeight: 700
                  }}
                >
                  Clear All
                </button>
              </div>

              {/* Option 4: Revert Swaps (if adjustments exist) */}
              {hasManualAdjustments && (
                <div
                  style={{
                    border: "1.5px solid #fde68a",
                    background: "#fffbeb",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "14px"
                  }}
                >
                  <div>
                    <strong style={{ color: "#92400e", fontSize: "14px", display: "block" }}>
                      ↩ Revert All Manual Swaps
                    </strong>
                    <span style={{ fontSize: "12px", color: "#78350f" }}>
                      Discard manual period swaps and restore the original generated schedule layout.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResetModalOpen(false);
                      handleRevertAllChanges();
                    }}
                    className="btn-secondary"
                    style={{
                      background: "#fef3c7",
                      color: "#92400e",
                      borderColor: "#f59e0b",
                      whiteSpace: "nowrap",
                      padding: "7px 14px",
                      fontSize: "12px",
                      fontWeight: 700
                    }}
                  >
                    Revert Swaps
                  </button>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: "8px 18px", fontSize: "13px" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Faculty Details & Name Modal */}
      {editingFacultyModal.isOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 99999,
          padding: "20px"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "580px",
            maxHeight: "92vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #cbd5e1"
          }}>
            {/* Modal Header */}
            <div style={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
              color: "white",
              padding: "16px 22px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTopLeftRadius: "14px",
              borderTopRightRadius: "14px"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>✏️ Edit Faculty Details: {editingFacultyModal.originalCode}</span>
                </h3>
                <p style={{ margin: "3px 0 0", fontSize: "12px", opacity: 0.9 }}>
                  Update faculty short code, full name, academic designation, authority, and workload limits
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingFacultyModal({ ...editingFacultyModal, isOpen: false })}
                style={{ background: "transparent", border: "none", color: "white", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveFacultyDetails} style={{ padding: "22px" }}>
              {/* Short Code & Full Name */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "5px" }}>
                    Short Code *:
                  </label>
                  <input
                    type="text"
                    value={editingFacultyModal.name}
                    onChange={(e) => setEditingFacultyModal({ ...editingFacultyModal, name: e.target.value.toUpperCase() })}
                    placeholder="e.g. SUM"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#1e40af",
                      boxSizing: "border-box"
                    }}
                  />
                  <span style={{ fontSize: "10.5px", color: "#64748b", marginTop: "3px", display: "block" }}>
                    Used on timetable
                  </span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "5px" }}>
                    Faculty Full Name *:
                  </label>
                  <input
                    type="text"
                    value={editingFacultyModal.fullName}
                    onChange={(e) => setEditingFacultyModal({ ...editingFacultyModal, fullName: e.target.value })}
                    placeholder="e.g. Dr. S. U. Mane"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box"
                    }}
                  />
                  <span style={{ fontSize: "10.5px", color: "#64748b", marginTop: "3px", display: "block" }}>
                    Official name on prints & exports
                  </span>
                </div>
              </div>

              {/* Designation & Central Authority */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "5px" }}>
                    Post / Designation:
                  </label>
                  <select
                    value={editingFacultyModal.designation}
                    onChange={(e) => setEditingFacultyModal({ ...editingFacultyModal, designation: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "white",
                      boxSizing: "border-box"
                    }}
                  >
                    {FACULTY_DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "5px" }}>
                    Central Authority Role:
                  </label>
                  <select
                    value={editingFacultyModal.centralAuthority}
                    onChange={(e) => setEditingFacultyModal({ ...editingFacultyModal, centralAuthority: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: editingFacultyModal.centralAuthority !== "None" ? "1.5px solid #c084fc" : "1px solid #cbd5e1",
                      background: editingFacultyModal.centralAuthority !== "None" ? "#faf5ff" : "white",
                      color: editingFacultyModal.centralAuthority !== "None" ? "#7e22ce" : "#1e293b",
                      fontWeight: editingFacultyModal.centralAuthority !== "None" ? 700 : 500,
                      fontSize: "13px",
                      boxSizing: "border-box"
                    }}
                  >
                    {CENTRAL_AUTHORITIES.map((a) => (
                      <option key={a} value={a}>{a === "None" ? "None (Regular Faculty)" : `Central Authority: ${a}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Max Lectures Cap */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "5px" }}>
                  Maximum Daily Lectures Limit (Cap):
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={editingFacultyModal.maxDailyLectures}
                    onChange={(e) => setEditingFacultyModal({ ...editingFacultyModal, maxDailyLectures: e.target.value })}
                    style={{
                      width: "90px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      textAlign: "center",
                      fontWeight: 700
                    }}
                  />
                  <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                    hours per day (standard limit is 4 hrs/day for teaching staff)
                  </span>
                </div>
              </div>

              {/* Notice for Short Code change */}
              {editingFacultyModal.name && editingFacultyModal.name !== editingFacultyModal.originalCode && (
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "6px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  marginBottom: "18px",
                  fontSize: "12px",
                  color: "#1e40af"
                }}>
                  ℹ️ <strong>Automatic Cascade:</strong> Changing short code from <strong>{editingFacultyModal.originalCode}</strong> to <strong>{editingFacultyModal.name}</strong> will automatically rename all teaching assignments across SY, TY, BTech courses, practical batches, fixed slots, and existing generated timetables!
                </div>
              )}

              {/* Current Assignments Summary Box */}
              {(() => {
                const asgn = getFacultyAssignments(editingFacultyModal.originalCode);
                return (
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>
                      Current Workload ({editingFacultyModal.originalCode})
                    </div>
                    <div style={{ fontSize: "12.5px", color: "#334155", lineHeight: "1.6" }}>
                      • <strong>{asgn.totalHours} hours/week</strong> currently assigned<br />
                      • Theory: {asgn.theorySubjects.length > 0 ? asgn.theorySubjects.map((s) => `${s.year} ${s.code}`).join(", ") : "None"}<br />
                      • Labs: {asgn.labCourses.length > 0 ? asgn.labCourses.map((l) => `${l.year} ${l.code}`).join(", ") : "None"}
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setEditingFacultyModal({ ...editingFacultyModal, isOpen: false })}
                  className="btn-secondary"
                  style={{ padding: "8px 16px", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: "8px 22px",
                    fontSize: "13px",
                    fontWeight: 700,
                    background: "#2563eb",
                    borderColor: "#1d4ed8"
                  }}
                >
                  ✓ Save Faculty Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Database Saved Timetables Modal */}
      {showDbModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "680px",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              background: "#1e3a8a",
              color: "white",
              padding: "16px 22px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                  🗄️ Saved Timetables in Database
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#bfdbfe" }}>
                  Load or manage persistent master timetables stored in the backend database
                </p>
              </div>
              <button
                onClick={() => setShowDbModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: "20px",
                  cursor: "pointer",
                  padding: "4px 8px"
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Save Bar inside Modal */}
            <div style={{
              padding: "14px 22px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              gap: "10px",
              alignItems: "center"
            }}>
              <input
                type="text"
                value={customSaveName}
                onChange={(e) => setCustomSaveName(e.target.value)}
                placeholder="Give this version a name (e.g., Even Sem Final v1)"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px"
                }}
              />
              <button
                type="button"
                onClick={handleSaveToDb}
                disabled={savingToDb || !masterData}
                style={{
                  padding: "8px 16px",
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: savingToDb || !masterData ? "not-allowed" : "pointer",
                  opacity: savingToDb || !masterData ? 0.6 : 1,
                  whiteSpace: "nowrap"
                }}
              >
                {savingToDb ? "Saving..." : "💾 Save Current"}
              </button>
            </div>

            {/* Modal Body - List of Saved Timetables */}
            <div style={{ padding: "16px 22px", overflowY: "auto", flex: 1 }}>
              {dbTimetables.length === 0 ? (
                <div style={{ textAlign: "center", padding: "36px 16px", color: "#64748b" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>📭</div>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "#334155" }}>No Saved Timetables Yet</div>
                  <div style={{ fontSize: "12.5px", marginTop: "4px" }}>
                    Click "Save Current" above or use the "💾 Save to DB" button to store timetables in MySQL/H2!
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {dbTimetables.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        background: "#ffffff",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b" }}>
                          {item.name || `Timetable #${item.id}`}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                          {item.department ? `${item.department} • ` : ""}
                          {item.academicYear ? `${item.academicYear} • ` : ""}
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Recently saved"}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleLoadSaved(item)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid #bfdbfe",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            fontWeight: 600,
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          📂 Load
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSaved(item.id, e)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            color: "#b91c1c",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                          title="Delete from database"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "12px 22px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "flex-end"
            }}>
              <button
                type="button"
                onClick={() => setShowDbModal(false)}
                className="btn-secondary"
                style={{ fontSize: "13px", padding: "6px 14px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          IN-PLACE QUICK EDIT SLOT MODAL
          ========================================================================= */}
      {quickEditModal.isOpen && (
        <div
          className="no-print"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setQuickEditModal((prev) => ({ ...prev, isOpen: false }));
            }
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              maxWidth: quickEditModal.mode === "PRACTICAL" ? "820px" : "560px",
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #cbd5e1",
              overflow: "hidden"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 22px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 6px", color: "#1e3a8a", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  {quickEditModal.mode === "PRACTICAL" && "🔬 Quick Edit 2-Hour Practical Lab Session"}
                  {quickEditModal.mode === "EXTERNAL" && `🏛 Quick Edit University FY Load (${quickEditModal.externalType})`}
                  {quickEditModal.mode === "FIXED" && `📌 Quick Edit Fixed Slot: ${quickEditModal.course}`}
                  {quickEditModal.mode === "EMPTY" && "➕ Assign Subject & Teacher to Open Slot"}
                  {quickEditModal.mode === "THEORY" && `✏️ Quick Edit Slot: ${quickEditModal.course || "Theory Lecture"}`}
                </h3>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "11.5px", background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "4px", fontWeight: 700, border: "1px solid #bfdbfe" }}>
                    {quickEditModal.year} Class
                  </span>
                  <span style={{ fontSize: "11.5px", background: "#f1f5f9", color: "#334155", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
                    {quickEditModal.day}
                  </span>
                  <span style={{ fontSize: "11.5px", background: "#f5f3ff", color: "#6b21a8", padding: "2px 8px", borderRadius: "4px", fontWeight: 700, border: "1px solid #ddd6fe" }}>
                    Period {quickEditModal.periodLabel}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setQuickEditModal((prev) => ({ ...prev, isOpen: false }))}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "4px"
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
              {/* CASE 1: 2-HOUR PRACTICAL LAB */}
              {quickEditModal.mode === "PRACTICAL" && (
                <div>
                  <div style={{ marginBottom: "14px", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "12.5px", color: "#166534" }}>
                    <strong>🔬 2-Hour Practical Block ({quickEditModal.periodLabel}):</strong> Changes made below will synchronize both periods in the timetable and keep batch distributions aligned.
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {quickEditModal.subEntries.map((sub, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "12px 14px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          background: "#ffffff",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                        }}
                      >
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "6px" }}>
                          {/* Batch Badge */}
                          <span style={{ background: "#7e22ce", color: "white", padding: "4px 10px", borderRadius: "6px", fontWeight: 700, fontSize: "12px", minWidth: "50px", textAlign: "center" }}>
                            {sub.batch}
                          </span>

                          {/* Lab Course Code */}
                          <div style={{ width: "140px" }}>
                            <input
                              type="text"
                              value={sub.course || ""}
                              onChange={(e) => handleSubEntryChange(idx, "course", e.target.value)}
                              placeholder="Course (e.g. DS)"
                              style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", fontWeight: 600 }}
                            />
                          </div>

                          {/* Faculty Select */}
                          <div style={{ flex: 1, minWidth: "200px" }}>
                            <select
                              value={sub.faculty || ""}
                              onChange={(e) => handleSubEntryChange(idx, "faculty", e.target.value)}
                              style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", fontWeight: 600 }}
                            >
                              <option value="">-- Select Teacher --</option>
                              {(inputs.faculties || []).map((fac) => (
                                <option key={fac.name} value={fac.name}>
                                  {fac.name} — {fac.fullName || fac.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Lab Room Select */}
                          <div style={{ width: "130px" }}>
                            <select
                              value={sub.location || ""}
                              onChange={(e) => handleSubEntryChange(idx, "location", e.target.value)}
                              style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", fontWeight: 600 }}
                            >
                              <option value="">-- Room --</option>
                              {["IL1", "IL2", "IL3", "IL4", "IL5", "IL6"].map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                              {(inputs.rooms || [])
                                .filter((r) => !["IL1", "IL2", "IL3", "IL4", "IL5", "IL6"].includes(r.name))
                                .map((r) => (
                                  <option key={r.name} value={r.name}>{r.name}</option>
                                ))}
                            </select>
                          </div>
                        </div>

                        {/* Live Conflict Feedback for Batch */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {(() => {
                            if (!sub.faculty) return null;
                            const c1 = isFacultyBusyAt(sub.faculty, quickEditModal.day, quickEditModal.period, quickEditModal.year);
                            const c2 = quickEditModal.period2 ? isFacultyBusyAt(sub.faculty, quickEditModal.day, quickEditModal.period2, quickEditModal.year) : null;
                            const clash = c1 || c2;
                            if (clash) {
                              return (
                                <div style={{ fontSize: "11px", color: "#991b1b", background: "#fef2f2", padding: "3px 8px", borderRadius: "4px", border: "1px solid #fecaca" }}>
                                  ⚠️ <strong>Teacher Clash:</strong> Prof. {sub.faculty} is already teaching in {clash} during {quickEditModal.periodLabel}!
                                </div>
                              );
                            }
                            return (
                              <div style={{ fontSize: "11px", color: "#166534", background: "#f0fdf4", padding: "3px 8px", borderRadius: "4px", border: "1px solid #bbf7d0" }}>
                                ✅ Prof. {sub.faculty} ({getFacultyFullName(sub.faculty)}) is free for this slot.
                              </div>
                            );
                          })()}

                          {(() => {
                            if (!sub.location) return null;
                            const r1 = isRoomOccupiedAt(sub.location, quickEditModal.day, quickEditModal.period, quickEditModal.year);
                            const r2 = quickEditModal.period2 ? isRoomOccupiedAt(sub.location, quickEditModal.day, quickEditModal.period2, quickEditModal.year) : null;
                            const clash = r1 || r2;
                            if (clash) {
                              return (
                                <div style={{ fontSize: "11px", color: "#991b1b", background: "#fef2f2", padding: "3px 8px", borderRadius: "4px", border: "1px solid #fecaca" }}>
                                  ⚠️ <strong>Room Conflict:</strong> Lab {sub.location} is occupied by {clash} during {quickEditModal.periodLabel}!
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CASE 2: EXTERNAL FY UNIVERSITY LOAD */}
              {quickEditModal.mode === "EXTERNAL" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "12.5px", color: "#92400e" }}>
                    <strong>🏛 External University FY Load ({quickEditModal.externalType}):</strong> Updating teacher or division details directly synchronizes the master faculty schedule.
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Assigned Faculty Code
                    </label>
                    <select
                      value={quickEditModal.faculty || ""}
                      onChange={(e) => setQuickEditModal((prev) => ({ ...prev, faculty: e.target.value }))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600 }}
                    >
                      <option value="">-- Select Faculty --</option>
                      {(inputs.faculties || []).map((fac) => (
                        <option key={fac.name} value={fac.name}>
                          {fac.name} — {fac.fullName || fac.name}
                        </option>
                      ))}
                    </select>

                    {(() => {
                      if (!quickEditModal.faculty) return null;
                      const clash = isFacultyBusyAt(quickEditModal.faculty, quickEditModal.day, quickEditModal.period, null);
                      if (clash) {
                        return (
                          <div style={{ marginTop: "6px", padding: "8px 12px", background: "#fef2f2", borderLeft: "4px solid #ef4444", borderRadius: "4px", fontSize: "12px", color: "#991b1b" }}>
                            ⚠️ <strong>Teacher Clash:</strong> Prof. {quickEditModal.faculty} is already teaching in {clash} on {quickEditModal.day} Period {quickEditModal.period}!
                          </div>
                        );
                      }
                      return (
                        <div style={{ marginTop: "6px", padding: "6px 12px", background: "#f0fdf4", borderLeft: "4px solid #22c55e", borderRadius: "4px", fontSize: "12px", color: "#166534" }}>
                          ✅ Prof. {quickEditModal.faculty} ({getFacultyFullName(quickEditModal.faculty)}) is available.
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Description / Class Division
                    </label>
                    <input
                      type="text"
                      value={quickEditModal.externalDesc || ""}
                      onChange={(e) => setQuickEditModal((prev) => ({ ...prev, externalDesc: e.target.value }))}
                      placeholder="e.g. PTS-Div E"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                  </div>
                </div>
              )}

              {/* CASE 3: THEORY / FIXED / EMPTY SLOT */}
              {(quickEditModal.mode === "THEORY" || quickEditModal.mode === "FIXED" || quickEditModal.mode === "EMPTY") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {/* Course / Subject */}
                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Course / Subject Title
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {(inputs.yearData?.[quickEditModal.year]?.subjects || []).length > 0 && (
                        <select
                          onChange={(e) => {
                            const selectedCode = e.target.value;
                            const matchedSub = (inputs.yearData?.[quickEditModal.year]?.subjects || []).find((s) => s.code === selectedCode);
                            setQuickEditModal((prev) => ({
                              ...prev,
                              course: selectedCode,
                              faculty: matchedSub?.faculty?.name || prev.faculty
                            }));
                          }}
                          value={(inputs.yearData?.[quickEditModal.year]?.subjects || []).some((s) => s.code === quickEditModal.course) ? quickEditModal.course : ""}
                          style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", flex: 1 }}
                        >
                          <option value="">-- Choose {quickEditModal.year} Subject --</option>
                          {(inputs.yearData?.[quickEditModal.year]?.subjects || []).map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.code} — {s.name} ({s.faculty?.name || "No teacher"})
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        type="text"
                        value={quickEditModal.course || ""}
                        onChange={(e) => setQuickEditModal((prev) => ({ ...prev, course: e.target.value }))}
                        placeholder="e.g. DS, MDM-I, Mentoring"
                        style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", flex: 1, fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  {/* Assigned Faculty */}
                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Assigned Faculty / Teacher
                    </label>
                    <select
                      value={quickEditModal.faculty || ""}
                      onChange={(e) => setQuickEditModal((prev) => ({ ...prev, faculty: e.target.value }))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600 }}
                    >
                      <option value="">-- No Teacher Assigned --</option>
                      {(inputs.faculties || []).map((fac) => (
                        <option key={fac.name} value={fac.name}>
                          {fac.name} — {fac.fullName || fac.name}
                        </option>
                      ))}
                    </select>

                    {/* Real-time Faculty Clash Check */}
                    {(() => {
                      if (!quickEditModal.faculty) return null;
                      const clash = isFacultyBusyAt(quickEditModal.faculty, quickEditModal.day, quickEditModal.period, quickEditModal.year);
                      if (clash) {
                        return (
                          <div style={{ marginTop: "6px", padding: "8px 12px", background: "#fef2f2", borderLeft: "4px solid #ef4444", borderRadius: "4px", fontSize: "12px", color: "#991b1b" }}>
                            <strong>⚠️ Teacher Clash:</strong> Prof. {quickEditModal.faculty} ({getFacultyFullName(quickEditModal.faculty)}) is currently occupied in <strong>{clash}</strong> on {quickEditModal.day} Period {quickEditModal.period}!
                          </div>
                        );
                      }
                      return (
                        <div style={{ marginTop: "6px", padding: "6px 12px", background: "#f0fdf4", borderLeft: "4px solid #22c55e", borderRadius: "4px", fontSize: "12px", color: "#166534" }}>
                          <strong>✅ Available:</strong> Prof. {quickEditModal.faculty} ({getFacultyFullName(quickEditModal.faculty)}) has no other classes at this time.
                        </div>
                      );
                    })()}
                  </div>

                  {/* Assigned Location / Classroom */}
                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Assigned Location / Classroom / Lab
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <select
                        value={quickEditModal.location || ""}
                        onChange={(e) => setQuickEditModal((prev) => ({ ...prev, location: e.target.value }))}
                        style={{ width: "60%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                      >
                        <option value="">-- Select Room --</option>
                        {(inputs.rooms || []).map((r) => (
                          <option key={r.name} value={r.name}>
                            {r.name} ({r.type})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={quickEditModal.location || ""}
                        onChange={(e) => setQuickEditModal((prev) => ({ ...prev, location: e.target.value }))}
                        placeholder="Or custom room"
                        style={{ width: "40%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                      />
                    </div>

                    {/* Real-time Room Clash Check */}
                    {(() => {
                      if (!quickEditModal.location) return null;
                      const clash = isRoomOccupiedAt(quickEditModal.location, quickEditModal.day, quickEditModal.period, quickEditModal.year);
                      if (clash) {
                        return (
                          <div style={{ marginTop: "6px", padding: "8px 12px", background: "#fef2f2", borderLeft: "4px solid #ef4444", borderRadius: "4px", fontSize: "12px", color: "#991b1b" }}>
                            <strong>⚠️ Room Clash:</strong> Room {quickEditModal.location} is occupied by <strong>{clash}</strong> on {quickEditModal.day} Period {quickEditModal.period}!
                          </div>
                        );
                      }
                      return (
                        <div style={{ marginTop: "6px", padding: "6px 12px", background: "#f0fdf4", borderLeft: "4px solid #22c55e", borderRadius: "4px", fontSize: "12px", color: "#166534" }}>
                          <strong>✅ Free Room:</strong> {quickEditModal.location} is available.
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 22px",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                {quickEditModal.course && quickEditModal.course !== "—" && (
                  <button
                    type="button"
                    onClick={handleClearSlot}
                    style={{
                      background: "#fee2e2",
                      color: "#dc2626",
                      border: "1px solid #fca5a5",
                      padding: "7px 12px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                    title="Clear this slot and make it empty"
                  >
                    🗑 Empty Slot
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setQuickEditModal((prev) => ({ ...prev, isOpen: false }))}
                  className="btn-secondary"
                  style={{ fontSize: "13px", padding: "7px 14px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickEdit}
                  className="btn-primary"
                  style={{ fontSize: "13px", padding: "7px 18px", fontWeight: 700 }}
                >
                  💾 Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MasterTimetable;
