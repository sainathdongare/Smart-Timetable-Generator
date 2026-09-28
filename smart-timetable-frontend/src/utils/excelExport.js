import * as XLSX from "xlsx";

/**
 * Helper to export Personal Faculty Timetable to Excel (.xlsx)
 * Matching the exact official institutional format of RIT.
 */
export function exportPersonalTimetableToExcel({
  facultyCode,
  facultyName,
  designation = "Assistant Professor",
  centralAuthority = "None",
  academicSession = "2026-27",
  academicSemester = "PART-I",
  facSched,
  assignments,
  days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
}) {
  const wb = XLSX.utils.book_new();

  // Compute workload breakdown
  const ugL = facSched?.stats?.theoryHours || 0;
  const ugPR = facSched?.stats?.practicalHours || 0;
  const ugCAP = assignments?.fixedSlots?.filter((f) => (f.course || "").includes("Capstone")).length * 2 || 4;
  const ugMP = assignments?.fixedSlots?.filter((f) => (f.course || "").includes("Mentoring") || (f.course || "").includes("Project")).length * 2 || 6;
  const pgL = (assignments?.externalLoads || []).length > 0 ? (assignments.externalLoads.length) : 2;
  const totalHours = facSched?.stats?.totalHours || (ugL + ugPR + ugCAP + ugMP + pgL);

  const displayDesignation = centralAuthority && centralAuthority !== "None"
    ? `${designation} (${centralAuthority})`
    : designation;

  const aoa = [
    ["K.E.Society's"],
    ["Rajarambapu Institute of Technology,Rajaramnagar"],
    ["Department of Information Technology"],
    ["Personal Timetable"],
    [`${academicSession}/ ${academicSemester}`],
    [],
    [
      "Name of Faculty :",
      facultyName || facultyCode,
      "",
      displayDesignation,
      "UG",
      "L:",
      ugL,
      "PR:",
      ugPR,
      "TUT:",
      "",
      "IIP:",
      "",
      "CAP:",
      ugCAP,
      "M/P:",
      ugMP,
      "",
      "",
      "Total:",
      totalHours
    ],
    [
      "",
      "",
      "",
      "",
      "PG",
      "L:",
      pgL,
      "",
      "",
      "TUT:",
      "",
      "ED:",
      "",
      "URE:",
      "",
      "SEMINAR:",
      "",
      "",
      "",
      ""
    ],
    [],
    [
      "Sr.No",
      "Time",
      "Monday", "", "",
      "Tuesday", "", "",
      "Wednesday", "", "",
      "Thursday", "", "",
      "Friday", "", "",
      "Saturday", "", ""
    ]
  ];

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 19 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 19 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 19 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 19 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 19 } },
    // Header merges for days
    { s: { r: 9, c: 0 }, e: { r: 9, c: 0 } },
    { s: { r: 9, c: 1 }, e: { r: 9, c: 1 } },
    { s: { r: 9, c: 2 }, e: { r: 9, c: 4 } }, // Monday
    { s: { r: 9, c: 5 }, e: { r: 9, c: 7 } }, // Tuesday
    { s: { r: 9, c: 8 }, e: { r: 9, c: 10 } }, // Wednesday
    { s: { r: 9, c: 11 }, e: { r: 9, c: 13 } }, // Thursday
    { s: { r: 9, c: 14 }, e: { r: 9, c: 16 } }, // Friday
    { s: { r: 9, c: 17 }, e: { r: 9, c: 19 } }  // Saturday
  ];

  const getSlot = (day, p) => facSched?.grid?.[day]?.[p] || null;

  // Period 1 (10.00 to 11.00) & Period 2 (11.00 to 12.00)
  const rowP1 = ["1.", "10.00 to 11.00"];
  const rowP2 = ["2.", "11.00 to 12.00"];

  days.forEach((day) => {
    const s1 = getSlot(day, 1);
    const s2 = getSlot(day, 2);

    if (s1 && s2 && ((s1.type === "PRACTICAL" && s2.type === "PRACTICAL") || (s1.course === s2.course && (s1.course.includes("M.Tech") || s1.course.includes("Project"))))) {
      // 2-hour practical or merged block
      if (s1.course.includes("M.Tech") || s1.course.includes("Project") || s1.course.includes("Capstone")) {
        rowP1.push(s1.course, "", "");
        rowP2.push("", "", "");
      } else {
        rowP1.push(s1.year || "", s1.batch ? `${s1.batch}-${s1.course}` : s1.course, s1.location || "");
        rowP2.push("", "", "");
      }
    } else {
      if (s1) rowP1.push(s1.year || "", s1.course || "", s1.location || "");
      else rowP1.push("", "", "");

      if (s2) rowP2.push(s2.year || "", s2.course || "", s2.location || "");
      else rowP2.push("", "", "");
    }
  });
  // Saturday empty
  rowP1.push("", "", "");
  rowP2.push("", "", "");

  aoa.push(rowP1);
  aoa.push(rowP2);

  // Lunch Break
  const break1RowIdx = aoa.length;
  aoa.push(["", "12.00 to 12.45 pm", "Lunch Break", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  merges.push({ s: { r: break1RowIdx, c: 2 }, e: { r: break1RowIdx, c: 19 } });

  // Period 3 (12.45 to 01.45) & Period 4 (01.45 to 02.45)
  const rowP3 = ["3.", "12.45 to 01.45"];
  const rowP4 = ["4.", "01.45 to 02.45"];

  days.forEach((day) => {
    const s3 = getSlot(day, 3);
    const s4 = getSlot(day, 4);

    if (s3 && s4 && ((s3.type === "PRACTICAL" && s4.type === "PRACTICAL") || (s3.course === s4.course && (s3.course.includes("Capstone") || s3.course.includes("Project"))))) {
      if (s3.course.includes("Capstone") || s3.course.includes("Project")) {
        rowP3.push(s3.course, "", "");
        rowP4.push("", "", "");
      } else {
        rowP3.push(s3.year || "", s3.batch ? `${s3.batch}-${s3.course}` : s3.course, s3.location || "");
        rowP4.push("", "", "");
      }
    } else {
      if (s3) rowP3.push(s3.year || "", s3.course || "", s3.location || "");
      else rowP3.push("", "", "");

      if (s4) rowP4.push(s4.year || "", s4.course || "", s4.location || "");
      else rowP4.push("", "", "");
    }
  });
  rowP3.push("", "", "");
  rowP4.push("", "", "");

  aoa.push(rowP3);
  aoa.push(rowP4);

  // Recess
  const break2RowIdx = aoa.length;
  aoa.push(["", "02.45 to 03.00 pm", "Recess", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  merges.push({ s: { r: break2RowIdx, c: 2 }, e: { r: break2RowIdx, c: 19 } });

  // Period 5 (03.00 to 04.00) & Period 6 (04.00 to 05.00)
  const rowP5 = ["5.", "03.00 to 04.00"];
  const rowP6 = ["6.", "04.00 to 05.00"];

  days.forEach((day) => {
    const s5 = getSlot(day, 5);
    const s6 = getSlot(day, 6);

    if (s5 && s6 && ((s5.type === "PRACTICAL" && s6.type === "PRACTICAL") || (s5.course === s6.course && (s5.course.includes("Capstone") || s5.course.includes("Project"))))) {
      if (s5.course.includes("Capstone") || s5.course.includes("Project")) {
        rowP5.push(s5.course, "", "");
        rowP6.push("", "", "");
      } else {
        rowP5.push(s5.year || "", s5.batch ? `${s5.batch}-${s5.course}` : s5.course, s5.location || "");
        rowP6.push("", "", "");
      }
    } else {
      if (s5) rowP5.push(s5.year || "", s5.course || "", s5.location || "");
      else rowP5.push("", "", "");

      if (s6) rowP6.push(s6.year || "", s6.course || "", s6.location || "");
      else rowP6.push("", "", "");
    }
  });
  rowP5.push("", "", "");
  rowP6.push("", "", "");

  aoa.push(rowP5);
  aoa.push(rowP6);

  // Blank line & Signatures
  aoa.push([]);
  aoa.push([]);
  const sigRowIdx = aoa.length;
  aoa.push([
    "", "", "Time Table Incharge", "", "", "", "", "", "", "", "", "", "", "", "HOD", "", "", "", "", ""
  ]);
  aoa.push([
    "", "", "Ms.R.S.Patil", "", "", "", "", "", "", "", "", "", "", "", "Dr.A.C.Adamuthe", "", "", "", "", ""
  ]);

  merges.push({ s: { r: sigRowIdx, c: 2 }, e: { r: sigRowIdx, c: 5 } });
  merges.push({ s: { r: sigRowIdx, c: 14 }, e: { r: sigRowIdx, c: 17 } });
  merges.push({ s: { r: sigRowIdx + 1, c: 2 }, e: { r: sigRowIdx + 1, c: 5 } });
  merges.push({ s: { r: sigRowIdx + 1, c: 14 }, e: { r: sigRowIdx + 1, c: 17 } });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 8 }, { wch: 11 }, { wch: 9 }, // Mon
    { wch: 8 }, { wch: 11 }, { wch: 9 }, // Tue
    { wch: 8 }, { wch: 11 }, { wch: 9 }, // Wed
    { wch: 8 }, { wch: 11 }, { wch: 9 }, // Thu
    { wch: 8 }, { wch: 11 }, { wch: 9 }, // Fri
    { wch: 6 }, { wch: 6 }, { wch: 6 }   // Sat
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Personal Timetable");
  const fileName = `Personal_Timetable_${facultyCode}_${academicSession}_${academicSemester}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function buildClassWorksheet({
  year,
  semester,
  academicSession = "2026-27",
  academicSemester = "PART-I",
  classroom = "CR-27",
  coordinator = "Class Coordinator",
  schedule = [],
  subjects = [],
  practicals = [],
  fixedSlots = []
}) {
  const yearName = year === "SY" ? "Second Year (S.Y. B.Tech)" : (year === "TY" ? "Third Year (T.Y. B.Tech)" : "Final Year B.Tech");

  const aoa = [
    ["K.E.Society's"],
    ["Rajarambapu Institute of Technology,Rajaramnagar"],
    ["Department of Information Technology"],
    [`Class Timetable: ${yearName} — ${semester} (${academicSession} / ${academicSemester})`],
    [`Designated Classroom: ${classroom} | Class Coordinator: ${coordinator}`],
    [],
    ["Day", "Period 1\n(10:00 To 11:00)", "Period 2\n(11:00 To 12:00)", "Recess\n(12:00-12:45)", "Period 3\n(12:45 To 01:45)", "Period 4\n(01:45 To 02:45)", "Recess\n(02:45-03:00)", "Period 5\n(03:00 To 04:00)", "Period 6\n(04:00 To 05:00)"]
  ];

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } }
  ];

  const daysList = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  daysList.forEach((day) => {
    const getCell = (p) => {
      const cell = schedule.find((c) => c.day === day && c.period === p);
      if (!cell || cell.course === "—") return "—";
      if (cell.subEntries && cell.subEntries.length > 0) {
        return cell.subEntries.map((s) => `${s.batch}: ${s.course} (${s.faculty}) [${s.location}]`).join("\n");
      }
      return `${cell.course}\n${cell.faculty} [${cell.location}]`;
    };

    aoa.push([
      day.charAt(0) + day.slice(1).toLowerCase(),
      getCell(1),
      getCell(2),
      "RECESS",
      getCell(3),
      getCell(4),
      "RECESS",
      getCell(5),
      getCell(6)
    ]);
  });

  // Course Index Tables
  aoa.push([]);
  aoa.push(["📘 Theory Courses"]);
  aoa.push(["Course Code", "Course Name", "Faculty In-charge", "Hrs/Wk"]);
  subjects.forEach((s) => {
    aoa.push([s.code, s.name, s.faculty?.name || "", s.weeklyPeriods || 3]);
  });

  aoa.push([]);
  aoa.push(["🔬 Practical Laboratory Batches"]);
  aoa.push(["Batch", "Practical Lab", "Faculty In-charge", "Room", "Slot"]);
  practicals.forEach((p) => {
    aoa.push([p.batch, p.practical, p.faculty, p.room, `${p.day} ${p.period}`]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 10 },
    { wch: 20 },
    { wch: 20 },
    { wch: 10 },
    { wch: 20 },
    { wch: 20 }
  ];

  return ws;
}

/**
 * Helper to export Class Timetable for specific Year & Semester to Excel (.xlsx)
 */
export function exportClassTimetableToExcel({
  year,
  semester,
  academicSession = "2026-27",
  academicSemester = "PART-I",
  classroom,
  coordinator,
  schedule = [],
  subjects = [],
  practicals = [],
  fixedSlots = []
}) {
  const wb = XLSX.utils.book_new();
  const ws = buildClassWorksheet({
    year,
    semester,
    academicSession,
    academicSemester,
    classroom,
    coordinator,
    schedule,
    subjects,
    practicals,
    fixedSlots
  });

  const safeSem = (semester || "Sem").replace(/[^a-zA-Z0-9_-]/g, "_");
  XLSX.utils.book_append_sheet(wb, ws, `${year}_${safeSem}`);
  const fileName = `RIT_IT_Timetable_${year}_${safeSem}_${academicSession}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Helper to export Full Department Master Timetable with All Classes to Multi-Sheet Excel (.xlsx)
 */
export function exportMasterDepartmentToExcel({
  academicSession = "2026-27",
  academicSemester = "PART-I",
  masterData,
  inputs,
  days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
  periodTimings = [
    "10:00 To 11:00",
    "11:00 To 12:00",
    "12:45 To 01:45",
    "01:45 To 02:45",
    "03:00 To 04:00",
    "04:00 To 05:00"
  ]
}) {
  const wb = XLSX.utils.book_new();

  // Tab 1: Master Synchronized Timetable
  const masterAoa = [
    ["K.E.Society's"],
    ["Rajarambapu Institute of Technology ,Rajaramnagar"],
    ["Department of Information Technology"],
    ["Master Class Time Table"],
    [`${academicSession}/ ${academicSemester}`],
    [],
    ["Day", "Sr.No", "Time", "SY Course", "SY Faculty", "SY Room", "TY Course", "TY Faculty", "TY Room", "Final Year Course", "Final Year Faculty", "Final Year Room", "FY-EEDP", "FY-PPS", "FY-PCC"]
  ];

  days.forEach((day) => {
    [1, 2, 3, 4, 5, 6].forEach((p, pIdx) => {
      const getC = (yr) => (masterData?.schedules?.[yr] || []).find((c) => c.day === day && c.period === p);
      const sy = getC("SY");
      const ty = getC("TY");
      const btech = getC("BTECH");

      const ext = masterData?.externalLoads || {};
      const eedp = (ext["FY-EEDP"] || []).find((e) => e.day === day && e.period === p)?.facultyCode || "";
      const pps = (ext["FY-PPS"] || []).find((e) => e.day === day && e.period === p)?.facultyCode || "";
      const pcc = (ext["FY-PCC"] || []).find((e) => e.day === day && e.period === p)?.facultyCode || "";

      masterAoa.push([
        pIdx === 0 ? day : "",
        p,
        periodTimings[pIdx],
        sy?.course || "—", sy?.faculty || "", sy?.location || "",
        ty?.course || "—", ty?.faculty || "", ty?.location || "",
        btech?.course || "—", btech?.faculty || "", btech?.location || "",
        eedp, pps, pcc
      ]);
    });
  });

  const wsMaster = XLSX.utils.aoa_to_sheet(masterAoa);
  wsMaster["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 14 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 14 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 14 } }
  ];
  XLSX.utils.book_append_sheet(wb, wsMaster, "Master Timetable");

  // Tabs for each individual Year & Semester
  const semMap = {
    SY: academicSemester === "PART-I" ? "Sem-III" : "Sem-IV",
    TY: academicSemester === "PART-I" ? "Sem-V" : "Sem-VI",
    BTECH: academicSemester === "PART-I" ? "Sem-VII" : "Sem-VIII"
  };

  const roomMap = {
    SY: inputs?.rooms?.find((r) => r.type === "THEORY" && r.defaultForYear === "SY")?.name || "CR-27",
    TY: inputs?.rooms?.find((r) => r.type === "THEORY" && r.defaultForYear === "TY")?.name || "CR-26",
    BTECH: inputs?.rooms?.find((r) => r.type === "THEORY" && r.defaultForYear === "BTECH")?.name || "CR-212"
  };

  const coordMap = {
    SY: "Prof. P. R. Patil",
    TY: "Dr. S. U. Mane",
    BTECH: "Dr. A. C. Adamuthe"
  };

  ["SY", "TY", "BTECH"].forEach((yr) => {
    const yrData = inputs?.yearData?.[yr];
    const sched = masterData?.schedules?.[yr] || [];
    const wsYr = buildClassWorksheet({
      year: yr,
      semester: semMap[yr],
      academicSession,
      academicSemester,
      classroom: roomMap[yr],
      coordinator: coordMap[yr],
      schedule: sched,
      subjects: yrData?.subjects || [],
      practicals: yrData?.practicals || [],
      fixedSlots: yrData?.fixedSlots || []
    });
    XLSX.utils.book_append_sheet(wb, wsYr, `${yr}_${semMap[yr]}`);
  });

  // Tab: Total Staff Load Sheet
  const loadAoa = [
    ["Department of Information Technology, RIT"],
    [`Total Staff Workload Allocation Sheet (${academicSession} / ${academicSemester})`],
    [],
    ["Sr.", "Faculty Code", "Faculty Full Name", "Designation / Post", "Central Authority", "Daily Cap", "Theory Courses", "Practical Labs", "Fixed & FY Load", "Total Load (Hrs/Wk)", "Status"]
  ];

  (inputs?.faculties || []).forEach((f, idx) => {
    const asgn = computeFacultyAssignmentsHelper(f.name, inputs, masterData);
    loadAoa.push([
      idx + 1,
      f.name,
      f.fullName || f.name,
      f.designation || "Assistant Professor",
      f.centralAuthority || "None",
      `${f.maxDailyLectures || 4} hrs/day`,
      asgn.theoryStr,
      asgn.labStr,
      asgn.fixedStr,
      `${asgn.totalHours} hrs/wk`,
      asgn.totalHours > 16 ? "High Load" : (asgn.totalHours < 8 ? "Available" : "Balanced")
    ]);
  });

  const wsLoad = XLSX.utils.aoa_to_sheet(loadAoa);
  XLSX.utils.book_append_sheet(wb, wsLoad, "Staff Load Sheet");

  const fileName = `RIT_IT_Master_Timetable_${academicSession}_${academicSemester}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function computeFacultyAssignmentsHelper(facultyCode, inputs, masterData) {
  let totalHours = 0;
  const theory = [];
  const labs = [];
  const fixed = [];

  ["SY", "TY", "BTECH"].forEach((yr) => {
    const yrData = inputs?.yearData?.[yr];
    if (!yrData) return;
    (yrData.subjects || []).forEach((s) => {
      if ((s.faculty?.name || "").trim().toUpperCase() === facultyCode.trim().toUpperCase()) {
        theory.push(`${yr}: ${s.code} (${s.weeklyPeriods || 3}h)`);
        totalHours += (s.weeklyPeriods || 3);
      }
    });
    (yrData.practicals || []).forEach((pr) => {
      if ((pr.faculty || "").trim().toUpperCase() === facultyCode.trim().toUpperCase()) {
        labs.push(`${yr}: ${pr.practical} [${pr.batch}]`);
        totalHours += 2;
      }
    });
    (yrData.fixedSlots || []).forEach((fs) => {
      if ((fs.facultyName || "").includes(facultyCode)) {
        fixed.push(`${yr}: ${fs.courseName}`);
        totalHours += 1;
      }
    });
  });

  const ext = masterData?.externalLoads || inputs?.externalLoads || [];
  if (Array.isArray(ext)) {
    ext.forEach((e) => {
      if ((e.facultyCode || "").trim().toUpperCase() === facultyCode.trim().toUpperCase()) {
        fixed.push(e.loadType);
        totalHours += 1;
      }
    });
  }

  return {
    theoryStr: theory.join(", ") || "None",
    labStr: labs.join(", ") || "None",
    fixedStr: fixed.join(", ") || "None",
    totalHours
  };
}
