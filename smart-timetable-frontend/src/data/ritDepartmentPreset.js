export const ritDepartmentPreset = {
  version: "2026-27-TY-REVISED",
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
  faculties: [
    { id: 1, name: "SUM", fullName: "Dr. S. U. Mane" },
    { id: 2, name: "RSP", fullName: "Ms. R. S. Patil" },
    { id: 3, name: "SPP", fullName: "Mr. S. P. Patil" },
    { id: 4, name: "DTM", fullName: "Mr. D. T. Mane" },
    { id: 5, name: "MAV", fullName: "Mrs. M. A. Vairat" },
    { id: 6, name: "ARJ", fullName: "Mrs. A. R. Jamadagni" },
    { id: 7, name: "PTS", fullName: "Mr. P. T. Sawant" },
    { id: 8, name: "VUP", fullName: "Mr. V. U. Patil" },
    { id: 9, name: "DBC", fullName: "Mr. D. B. Chougule" },
    { id: 10, name: "MSK", fullName: "Mr. M. S. Kumbhar" },
    { id: 11, name: "ACA", fullName: "Dr. A. C. Adamuthe" },
    { id: 12, name: "MNM", fullName: "Mrs. M. N. More" },
    { id: 13, name: "SEB", fullName: "Mrs. S. E. Bhosale" },
    { id: 14, name: "DSB", fullName: "Dr. D. S. Bhosale" },
    { id: 15, name: "TNK", fullName: "Ms. T. N. Kamble" },
    { id: 16, name: "PSP", fullName: "Mrs. P. S. Patil" },
    { id: 17, name: "VVJ", fullName: "Prof. V. V. Jagtap" },
    { id: 18, name: "ANM", fullName: "Mrs. Dr. A. N. Mulla" },
    { id: 19, name: "SPS", fullName: "Ms. S. P. Shinde" }
  ],
  rooms: [
    { id: 1, name: "CR-27", type: "THEORY" },
    { id: 2, name: "CR-26", type: "THEORY" },
    { id: 3, name: "CR-212", type: "THEORY" },
    { id: 4, name: "IL1", type: "LAB" },
    { id: 5, name: "IL2", type: "LAB" },
    { id: 6, name: "IL3", type: "LAB" },
    { id: 7, name: "IL4", type: "LAB" },
    { id: 8, name: "IL5", type: "LAB" },
    { id: 9, name: "IL6", type: "LAB" }
  ],
  externalLoads: [
    { day: "MONDAY", period: 1, facultyCode: "PTS", loadType: "FY-EEDP", description: "PTS-Div E" },
    { day: "MONDAY", period: 1, facultyCode: "DBC", loadType: "FY-PCC", description: "DBC-PCC" },
    { day: "MONDAY", period: 5, facultyCode: "VUP", loadType: "FY-PCC", description: "VUP-Div B" },
    { day: "TUESDAY", period: 3, facultyCode: "MSK", loadType: "FY-PPS", description: "MSK-Div D" },
    { day: "WEDNESDAY", period: 1, facultyCode: "MSK", loadType: "FY-PPS", description: "MSK-PPS" },
    { day: "THURSDAY", period: 1, facultyCode: "PTS", loadType: "FY-EEDP", description: "PTS-Div E" },
    { day: "THURSDAY", period: 5, facultyCode: "DBC", loadType: "FY-PCC", description: "DBC-Div D" },
    { day: "FRIDAY", period: 3, facultyCode: "MSK", loadType: "FY-PPS", description: "MSK-PPS" },
    { day: "FRIDAY", period: 4, facultyCode: "DBC", loadType: "FY-PCC", description: "DBC-PCC" },
    { day: "FRIDAY", period: 5, facultyCode: "VUP", loadType: "FY-PCC", description: "VUP-Div B" }
  ],
  facultyUnavailability: [],
  yearData: {
    SY: {
      year: "SY",
      branch: "IT",
      defaultRoom: "CR-27",
      subjects: [
        { id: 1, code: "DS", name: "Data Structures", type: "THEORY", weeklyPeriods: 3, faculty: { id: 1, name: "SUM" } },
        { id: 2, code: "OOPJ", name: "Object Oriented Programming Java", type: "THEORY", weeklyPeriods: 3, faculty: { id: 2, name: "RSP" } },
        { id: 3, code: "DM", name: "Discrete Mathematics", type: "THEORY", weeklyPeriods: 3, faculty: { id: 3, name: "SPP" } },
        { id: 4, code: "COA", name: "Computer Organization Architecture", type: "THEORY", weeklyPeriods: 3, faculty: { id: 9, name: "DBC" } },
        { id: 5, code: "EVS", name: "Environmental Studies", type: "THEORY", weeklyPeriods: 3, faculty: { id: 13, name: "SEB" } }
      ],
      fixedSlots: [
        { day: "TUESDAY", period: 3, courseName: "MDM-I-PTS/ARJ-CR26/27", facultyName: "PTS/ARJ", room: "CR-27" },
        { day: "TUESDAY", period: 4, courseName: "Mentoring", facultyName: "I1-SUM, I2-VUP, I3-RSP, I4-ANM", room: "IL5, IL6, CR-27, CR-212" },
        { day: "WEDNESDAY", period: 1, courseName: "MDM-I-PTS/ARJ-CR26/27", facultyName: "PTS/ARJ", room: "CR-27" },
        { day: "THURSDAY", period: 3, courseName: "MDM-I-PTS/ARJ-CR26/27", facultyName: "PTS/ARJ", room: "CR-27" },
        { day: "FRIDAY", period: 3, courseName: "PSD and German Language (CSE, CSE-AIML, ETC, IT)", facultyName: "", room: "" }
      ],
      labCourses: [
        { code: "DS", name: "Data Structures Lab", faculty: "SUM", faculties: ["SUM"], batchFacultyMap: { I1: "SUM", I2: "SUM", I3: "SUM", I4: "SUM" }, preferredRoom: "IL1" },
        { code: "OOPJ", name: "Object Oriented Programming Java Lab", faculty: "RSP", faculties: ["RSP"], batchFacultyMap: { I1: "RSP", I2: "RSP", I3: "RSP", I4: "RSP" }, preferredRoom: "IL4" },
        { code: "ITTT", name: "IT Tools & Techniques Lab", faculty: "DBC", faculties: ["DBC", "PTS"], batchFacultyMap: { I1: "DBC", I2: "PTS", I3: "PTS", I4: "DBC" }, preferredRoom: "IL2" },
        { code: "EVS", name: "Environmental Studies Lab", faculty: "MNM", faculties: ["MNM", "MAV", "VUP", "SEB"], batchFacultyMap: { I1: "MNM", I2: "MAV", I3: "VUP", I4: "SEB" }, preferredRoom: "IL6" }
      ],
      practicals: [
        // Monday P3-P4
        { day: "MONDAY", period: "P3-P4", batch: "I1", practical: "DS", faculty: "SUM", room: "IL1" },
        { day: "MONDAY", period: "P3-P4", batch: "I2", practical: "OOPJ", faculty: "RSP", room: "IL4" },
        { day: "MONDAY", period: "P3-P4", batch: "I3", practical: "ITTT", faculty: "PTS", room: "IL2" },
        { day: "MONDAY", period: "P3-P4", batch: "I4", practical: "EVS", faculty: "SEB", room: "IL6" },

        // Wednesday P5-P6
        { day: "WEDNESDAY", period: "P5-P6", batch: "I1", practical: "OOPJ", faculty: "RSP", room: "IL4" },
        { day: "WEDNESDAY", period: "P5-P6", batch: "I2", practical: "DS", faculty: "SUM", room: "IL1" },
        { day: "WEDNESDAY", period: "P5-P6", batch: "I3", practical: "EVS", faculty: "MAV", room: "IL6" },
        { day: "WEDNESDAY", period: "P5-P6", batch: "I4", practical: "ITTT", faculty: "DBC", room: "IL2" },

        // Thursday P1-P2
        { day: "THURSDAY", period: "P1-P2", batch: "I1", practical: "ITTT", faculty: "DBC", room: "IL2" },
        { day: "THURSDAY", period: "P1-P2", batch: "I2", practical: "EVS", faculty: "MNM", room: "IL6" },
        { day: "THURSDAY", period: "P1-P2", batch: "I3", practical: "DS", faculty: "SUM", room: "IL1" },
        { day: "THURSDAY", period: "P1-P2", batch: "I4", practical: "OOPJ", faculty: "RSP", room: "IL4" },

        // Friday P1-P2
        { day: "FRIDAY", period: "P1-P2", batch: "I1", practical: "EVS", faculty: "MNM", room: "IL6" },
        { day: "FRIDAY", period: "P1-P2", batch: "I2", practical: "ITTT", faculty: "PTS", room: "IL2" },
        { day: "FRIDAY", period: "P1-P2", batch: "I3", practical: "OOPJ", faculty: "RSP", room: "IL4" },
        { day: "FRIDAY", period: "P1-P2", batch: "I4", practical: "DS", faculty: "SUM", room: "IL1" }
      ]
    },
    TY: {
      year: "TY",
      branch: "IT",
      defaultRoom: "CR-26",
      subjects: [
        { id: 11, code: "AT", name: "Automata Theory", type: "THEORY", weeklyPeriods: 3, faculty: { id: 14, name: "DSB" } },
        { id: 12, code: "OS", name: "Operating System", type: "THEORY", weeklyPeriods: 3, faculty: { id: 11, name: "ACA" } },
        { id: 13, code: "CN", name: "Computer Networks", type: "THEORY", weeklyPeriods: 3, faculty: { id: 15, name: "TNK" } },
        { id: 14, code: "PE-I-NOSQL", name: "Program Elective 1 - NOSQL", type: "THEORY", weeklyPeriods: 2, faculty: { id: 8, name: "VUP" } },
        { id: 15, code: "MAD", name: "Mobile Application Development", type: "THEORY", weeklyPeriods: 1, faculty: { id: 16, name: "PSP" } }
      ],
      fixedSlots: [
        // Institutional Fixed Slots
        { day: "MONDAY", period: 3, courseName: "OE-DSB-CR-26", facultyName: "DSB", room: "CR-26" },
        { day: "TUESDAY", period: 1, courseName: "MDM-III-RSP-CR-26-Div A", facultyName: "RSP", room: "CR-26" },
        { day: "TUESDAY", period: 2, courseName: "MDM-III-RSP-CR-26-Div A", facultyName: "RSP", room: "CR-26" },
        { day: "TUESDAY", period: 4, courseName: "Mentoring", facultyName: "I1-ACA, I2-ARJ, I3-DSB, I4-SUM", room: "IL1, IL3, IL4, IL2" },
        { day: "THURSDAY", period: 1, courseName: "OE-DSB-CR-26", facultyName: "PSP", room: "CR-26" },
        { day: "FRIDAY", period: 1, courseName: "MDM-III-A-ARJ-CR-26", facultyName: "ARJ", room: "CR-26" },
        { day: "FRIDAY", period: 2, courseName: "MDM-III-B-ARJ-CR-26", facultyName: "ARJ", room: "CR-26" },
        { day: "FRIDAY", period: 3, courseName: "OE-DSB-CR-26", facultyName: "DSB", room: "CR-26" },

        // Revised Authoritative TY Core Theory Slots (Class Coordinator: Dr. D.S. Bhosale)
        { day: "MONDAY", period: 4, courseName: "PE-I-NOSQL", facultyName: "VUP", room: "CR-26" },
        { day: "MONDAY", period: 5, courseName: "CN", facultyName: "TNK", room: "CR-26" },
        { day: "MONDAY", period: 6, courseName: "AT", facultyName: "DSB", room: "CR-26" },
        { day: "TUESDAY", period: 3, courseName: "OS", facultyName: "ACA", room: "CR-26" },
        { day: "WEDNESDAY", period: 1, courseName: "PE-I-NOSQL", facultyName: "VUP", room: "CR-212" },
        { day: "WEDNESDAY", period: 2, courseName: "CN", facultyName: "TNK", room: "CR-26" },
        { day: "WEDNESDAY", period: 5, courseName: "OS", facultyName: "ACA", room: "CR-212" },
        { day: "WEDNESDAY", period: 6, courseName: "AT", facultyName: "DSB", room: "CR-212" },
        { day: "THURSDAY", period: 2, courseName: "MAD", facultyName: "PSP", room: "CR-212" },
        { day: "THURSDAY", period: 3, courseName: "OS", facultyName: "ACA", room: "CR-212" },
        { day: "THURSDAY", period: 4, courseName: "CN", facultyName: "TNK", room: "CR-212" },
        { day: "FRIDAY", period: 4, courseName: "AT", facultyName: "DSB", room: "CR-26" }
      ],
      labCourses: [
        { code: "MP", name: "Mini Project", faculty: "ACA", faculties: ["ACA", "ARJ", "DSB", "SUM"], batchFacultyMap: { I1: "ACA", I2: "ARJ", I3: "DSB", I4: "SUM" }, preferredRoom: "IL1" },
        { code: "MAD", name: "Mobile Application Development Lab", faculty: "PSP", faculties: ["PSP", "VVJ"], batchFacultyMap: { I1: "PSP", I2: "VVJ", I3: "VVJ", I4: "PSP" }, preferredRoom: "IL3" },
        { code: "MDM-IV", name: "Multidisciplinary Minor IV Lab", faculty: "VUP", faculties: ["VUP", "RSP", "SPS", "DTM"], batchFacultyMap: { I1: "VUP", I2: "RSP", I3: "SPS", I4: "DTM" }, preferredRoom: "IL1" }
      ],
      practicals: [
        // Monday P1-P2
        { day: "MONDAY", period: "P1-P2", batch: "I1", practical: "MP", faculty: "ACA", room: "IL1" },
        { day: "MONDAY", period: "P1-P2", batch: "I2", practical: "MP", faculty: "ARJ", room: "IL3" },
        { day: "MONDAY", period: "P1-P2", batch: "I3", practical: "MP", faculty: "DSB", room: "IL4" },
        { day: "MONDAY", period: "P1-P2", batch: "I4", practical: "MP", faculty: "SUM", room: "IL2" },

        // Tuesday P5-P6
        { day: "TUESDAY", period: "P5-P6", batch: "I1", practical: "MP", faculty: "ACA", room: "IL1" },
        { day: "TUESDAY", period: "P5-P6", batch: "I2", practical: "MP", faculty: "ARJ", room: "IL4" },
        { day: "TUESDAY", period: "P5-P6", batch: "I3", practical: "MP", faculty: "DSB", room: "IL3" },
        { day: "TUESDAY", period: "P5-P6", batch: "I4", practical: "MAD", faculty: "PSP", room: "IL2" },

        // Wednesday P3-P4
        { day: "WEDNESDAY", period: "P3-P4", batch: "I1", practical: "MDM-IV", faculty: "VUP", room: "IL1" },
        { day: "WEDNESDAY", period: "P3-P4", batch: "I2", practical: "MDM-IV", faculty: "RSP", room: "IL3" },
        { day: "WEDNESDAY", period: "P3-P4", batch: "I3", practical: "MDM-IV", faculty: "SPS", room: "IL5" },
        { day: "WEDNESDAY", period: "P3-P4", batch: "I4", practical: "MDM-IV", faculty: "DTM", room: "IL2" },

        // Thursday P5-P6
        { day: "THURSDAY", period: "P5-P6", batch: "I1", practical: "MP", faculty: "ACA", room: "IL1" },
        { day: "THURSDAY", period: "P5-P6", batch: "I2", practical: "MP", faculty: "ARJ", room: "IL2" },
        { day: "THURSDAY", period: "P5-P6", batch: "I3", practical: "MAD", faculty: "VVJ", room: "IL4" },
        { day: "THURSDAY", period: "P5-P6", batch: "I4", practical: "MAD", faculty: "PSP", room: "IL3" },

        // Friday P5-P6
        { day: "FRIDAY", period: "P5-P6", batch: "I1", practical: "MAD", faculty: "PSP", room: "IL3" },
        { day: "FRIDAY", period: "P5-P6", batch: "I2", practical: "MAD", faculty: "VVJ", room: "IL4" },
        { day: "FRIDAY", period: "P5-P6", batch: "I3", practical: "MP", faculty: "DSB", room: "IL2" },
        { day: "FRIDAY", period: "P5-P6", batch: "I4", practical: "MP", faculty: "SUM", room: "IL1" }
      ]
    },
    BTECH: {
      year: "BTECH",
      branch: "IT",
      defaultRoom: "CR-212",
      subjects: [
        { id: 21, code: "CC", name: "Cloud Computing", type: "THEORY", weeklyPeriods: 3, faculty: { id: 4, name: "DTM" } },
        { id: 22, code: "FSWT", name: "Full Stack Web Technologies", type: "THEORY", weeklyPeriods: 2, faculty: { id: 5, name: "MAV" } },
        { id: 23, code: "IS", name: "Information Security", type: "THEORY", weeklyPeriods: 3, faculty: { id: 12, name: "MNM" } },
        { id: 24, code: "HPC", name: "High Performance Computing", type: "THEORY", weeklyPeriods: 2, faculty: { id: 1, name: "SUM" } },
        { id: 25, code: "PE-III-CS", name: "Professional Elective III Cyber Security", type: "THEORY", weeklyPeriods: 3, faculty: { id: 7, name: "PTS" } }
      ],
      fixedSlots: [
        { day: "TUESDAY", period: 3, courseName: "Capstone Project-I", facultyName: "", room: "" },
        { day: "WEDNESDAY", period: 4, courseName: "Mentoring", facultyName: "I2-ANM, I3-MSK, I4-PTS", room: "IL6, IL2, IL4" },
        { day: "THURSDAY", period: 5, courseName: "Capstone Project-I", facultyName: "", room: "" },
        { day: "THURSDAY", period: 6, courseName: "Capstone Project-I", facultyName: "", room: "" },
        { day: "FRIDAY", period: 5, courseName: "Capstone Project-I", facultyName: "", room: "" },
        { day: "FRIDAY", period: 6, courseName: "I3-Mentoring", facultyName: "MSK", room: "IL5" }
      ],
      labCourses: [
        { code: "PE-IV DLL", name: "Deep Learning Lab", faculty: "SPP", faculties: ["SPP"], batchFacultyMap: { I1: "SPP", I2: "SPP", I3: "SPP", I4: "SPP" }, preferredRoom: "IL5" },
        { code: "FTWD", name: "Full Stack Web Tech Lab", faculty: "MAV", faculties: ["MAV", "ARJ"], batchFacultyMap: { I1: "MAV", I2: "ARJ", I3: "ARJ", I4: "MAV" }, preferredRoom: "IL3" }
      ],
      practicals: [
        // Monday P1-P2 (IL5, IL6 free from TY MP)
        { day: "MONDAY", period: "P1-P2", batch: "I1", practical: "FTWD", faculty: "MAV", room: "IL5" },
        { day: "MONDAY", period: "P1-P2", batch: "I2", practical: "PE-IV DLL", faculty: "SPP", room: "IL6" },

        // Tuesday P1-P2 (IL3, IL5 free)
        { day: "TUESDAY", period: "P1-P2", batch: "I3", practical: "FTWD", faculty: "MAV", room: "IL3" },
        { day: "TUESDAY", period: "P1-P2", batch: "I4", practical: "PE-IV DLL", faculty: "SPP", room: "IL5" },

        // Wednesday P1-P2
        { day: "WEDNESDAY", period: "P1-P2", batch: "I1", practical: "PE-IV DLL", faculty: "SPP", room: "IL5" },
        { day: "WEDNESDAY", period: "P1-P2", batch: "I2", practical: "FTWD", faculty: "MAV", room: "IL3" },

        // Friday P3-P4
        { day: "FRIDAY", period: "P3-P4", batch: "I3", practical: "PE-IV DLL", faculty: "SPP", room: "IL5" },
        { day: "FRIDAY", period: "P3-P4", batch: "I4", practical: "FTWD", faculty: "MAV", room: "IL3" }
      ]
    }
  }
};
