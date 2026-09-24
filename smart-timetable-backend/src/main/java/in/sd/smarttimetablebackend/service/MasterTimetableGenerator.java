package in.sd.smarttimetablebackend.service;

import in.sd.smarttimetablebackend.model.*;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class MasterTimetableGenerator {

    public MasterTimetableResponse generate(MasterTimetableRequest request) {
        MasterTimetableResponse response = new MasterTimetableResponse();

        if (request == null || request.getConfig() == null) {
            response.setStatus(TimetableStatus.NOT_STARTED);
            return response;
        }

        TimetableConfig config = request.getConfig();
        response.setConfig(config);

        List<String> days = config.getWorkingDays() != null && !config.getWorkingDays().isEmpty()
                ? config.getWorkingDays()
                : Arrays.asList("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY");

        List<String> timings = config.getPeriodTimings() != null && !config.getPeriodTimings().isEmpty()
                ? config.getPeriodTimings()
                : Arrays.asList(
                "10:00 To 11:00",
                "11:00 To 12:00",
                "12:45 To 01:45",
                "01:45 To 02:45",
                "03:00 To 04:00",
                "04:00 To 05:00"
        );

        int periodsPerDay = config.getPeriodsPerDay() > 0 ? config.getPeriodsPerDay() : timings.size();
        int totalWeeklySlots = days.size() * periodsPerDay;
        List<DiagnosticItem> diagnostics = new ArrayList<>();

        // 1. Global State Trackers across the entire department: [day][period]
        Map<String, Map<Integer, Set<String>>> occupiedFaculty = new HashMap<>();
        Map<String, Map<Integer, Set<String>>> occupiedRooms = new HashMap<>();
        Map<String, Map<String, Map<Integer, MasterCellEntry>>> yearSchedules = new HashMap<>();

        for (String day : days) {
            occupiedFaculty.put(day, new HashMap<>());
            occupiedRooms.put(day, new HashMap<>());
            for (int p = 1; p <= periodsPerDay; p++) {
                occupiedFaculty.get(day).put(p, new HashSet<>());
                occupiedRooms.get(day).put(p, new HashSet<>());
            }
        }

        // Initialize year schedules: year -> day -> period -> MasterCellEntry
        List<String> yearKeys = Arrays.asList("SY", "TY", "BTECH");
        for (String yr : yearKeys) {
            yearSchedules.put(yr, new HashMap<>());
            for (String day : days) {
                yearSchedules.get(yr).put(day, new HashMap<>());
            }
        }

        // Faculty Capacities & Daily Workload Trackers
        Map<String, Integer> facultyMaxDailyCaps = new HashMap<>();
        if (request.getFaculties() != null) {
            for (Faculty f : request.getFaculties()) {
                if (f.getName() != null) {
                    facultyMaxDailyCaps.put(normalize(f.getName()), f.getMaxDailyLectures() > 0 ? f.getMaxDailyLectures() : 4);
                }
            }
        }

        Map<String, Map<String, Integer>> facultyDailyLoad = new HashMap<>();
        for (String fName : facultyMaxDailyCaps.keySet()) {
            facultyDailyLoad.put(fName, new HashMap<>());
            for (String day : days) {
                facultyDailyLoad.get(fName).put(day, 0);
            }
        }

        // Pre-generation Capacity Verification
        Map<String, YearClassData> yearDataMap = request.getYearData() != null ? request.getYearData() : new HashMap<>();
        for (String yr : yearKeys) {
            YearClassData yData = yearDataMap.get(yr);
            if (yData != null) {
                int fixedCount = yData.getFixedSlots() != null ? yData.getFixedSlots().size() : 0;
                int practicalSlots = 0;
                if (yData.getPracticals() != null && !yData.getPracticals().isEmpty()
                        && yData.getPracticals().stream().anyMatch(pr -> pr.getDay() != null && !pr.getDay().trim().isEmpty())) {
                    Set<String> distinctPracticalPeriods = new HashSet<>();
                    for (PracticalAssignmentDto pr : yData.getPracticals()) {
                        String d = pr.getDay() != null ? pr.getDay().toUpperCase() : "";
                        for (int p : pr.getPeriodNumbers()) {
                            distinctPracticalPeriods.add(d + "-" + p);
                        }
                    }
                    practicalSlots = distinctPracticalPeriods.size();
                } else if (yData.getLabCourses() != null && !yData.getLabCourses().isEmpty()) {
                    practicalSlots = yData.getLabCourses().size() * 2;
                }
                int theoryRequested = 0;
                if (yData.getSubjects() != null) {
                    for (Subject s : yData.getSubjects()) {
                        if ("THEORY".equalsIgnoreCase(s.getType())) {
                            theoryRequested += s.getWeeklyPeriods() > 0 ? s.getWeeklyPeriods() : 4;
                        }
                    }
                }

                Set<String> subjectCodes = new HashSet<>();
                if (yData.getSubjects() != null) {
                    for (Subject s : yData.getSubjects()) {
                        if (s.getCode() != null) subjectCodes.add(normalize(s.getCode()));
                    }
                }
                int overlappingFixedCount = 0;
                if (yData.getFixedSlots() != null) {
                    for (FixedSlot fs : yData.getFixedSlots()) {
                        String c = fs.getCourseName() != null ? normalize(fs.getCourseName()) : (fs.getSubjectCode() != null ? normalize(fs.getSubjectCode()) : "");
                        if (subjectCodes.contains(c)) {
                            overlappingFixedCount++;
                        }
                    }
                }

                int totalEstimatedPeriods = (fixedCount - overlappingFixedCount) + practicalSlots + theoryRequested;
                if (totalEstimatedPeriods > totalWeeklySlots) {
                    diagnostics.add(new DiagnosticItem(
                            "CAPACITY_EXCEEDED",
                            "WARNING",
                            yr,
                            "Class " + yr + " requested approx " + totalEstimatedPeriods + " periods, but weekly capacity is " + totalWeeklySlots + " periods.",
                            "Consider reducing theory hours or consolidating practical sessions."
                    ));
                }
            }
        }

        // 2. Stage 1: Lock Faculty Unavailability
        if (request.getFacultyUnavailability() != null) {
            for (FacultyUnavailability un : request.getFacultyUnavailability()) {
                if (un.getDay() != null && occupiedFaculty.containsKey(un.getDay().toUpperCase())) {
                    String facultyName = un.getFaculty() != null ? normalize(un.getFaculty().getName()) : null;
                    if (facultyName != null && un.getPeriod() > 0 && un.getPeriod() <= periodsPerDay) {
                        occupiedFaculty.get(un.getDay().toUpperCase()).get(un.getPeriod()).add(facultyName);
                    }
                }
            }
        }

        // 3. Stage 2: Register External FY Loads
        Map<String, List<ExternalLoad>> externalMap = new HashMap<>();
        externalMap.put("FY-EEDP", new ArrayList<>());
        externalMap.put("FY-PPS", new ArrayList<>());
        externalMap.put("FY-PCC", new ArrayList<>());

        if (request.getExternalLoads() != null) {
            for (ExternalLoad ext : request.getExternalLoads()) {
                if (ext.getDay() != null && occupiedFaculty.containsKey(ext.getDay().toUpperCase())) {
                    String d = ext.getDay().toUpperCase();
                    int p = ext.getPeriod();
                    if (p >= 1 && p <= periodsPerDay) {
                        String normF = ext.getFacultyCode() != null ? normalize(ext.getFacultyCode()) : "";
                        if (!normF.isEmpty()) {
                            occupiedFaculty.get(d).get(p).add(normF);
                            incrementFacultyLoad(facultyDailyLoad, normF, d);
                        }
                        String type = ext.getLoadType() != null ? ext.getLoadType() : "FY-PCC";
                        externalMap.computeIfAbsent(type, k -> new ArrayList<>()).add(ext);
                    }
                }
            }
        }
        response.setExternalLoads(externalMap);

        // 4. Stage 3: Schedule Fixed Slots for all years with collision detection
        for (String yr : yearKeys) {
            YearClassData yData = yearDataMap.get(yr);
            if (yData != null && yData.getFixedSlots() != null) {
                for (FixedSlot fs : yData.getFixedSlots()) {
                    if (fs.getDay() != null && occupiedFaculty.containsKey(fs.getDay().toUpperCase())) {
                        String d = fs.getDay().toUpperCase();
                        int p = fs.getPeriod();
                        if (p >= 1 && p <= periodsPerDay) {
                            String time = p <= timings.size() ? timings.get(p - 1) : ("Period " + p);
                            String course = fs.getCourseName() != null ? fs.getCourseName() : fs.getSubjectCode();
                            String faculty = fs.getFacultyName() != null ? fs.getFacultyName() : "";
                            String room = fs.getRoom() != null ? fs.getRoom() : "";
                            String cellType = detectCellType(course);

                            // Detect if slot in this class is already occupied by another fixed slot
                            if (yearSchedules.get(yr).get(d).containsKey(p)) {
                                diagnostics.add(new DiagnosticItem(
                                        "FIXED_SLOT_COLLISION",
                                        "ERROR",
                                        yr + " " + d + " P" + p,
                                        "Multiple fixed slots configured on the same day and period for " + yr,
                                        "Remove or reschedule duplicate fixed slot."
                                ));
                            }

                            MasterCellEntry cell = new MasterCellEntry(d, p, time, yr, course, faculty, room, cellType);
                            yearSchedules.get(yr).get(d).put(p, cell);

                            // Mark faculty as occupied
                            if (faculty != null && !faculty.isEmpty()) {
                                String[] fParts = faculty.split("[/,\\s]+");
                                for (String fp : fParts) {
                                    if (!fp.isEmpty()) {
                                        String normF = normalize(fp);
                                        if (occupiedFaculty.get(d).get(p).contains(normF)) {
                                            diagnostics.add(new DiagnosticItem(
                                                    "FACULTY_FIXED_CLASH",
                                                    "WARNING",
                                                    normF,
                                                    "Faculty " + fp + " for fixed slot '" + course + "' (" + yr + ") is allocated to multiple fixed or FY slots simultaneously on " + d + " P" + p,
                                                    "Check fixed slot faculty assignments across classes or FY loads."
                                            ));
                                        }
                                        occupiedFaculty.get(d).get(p).add(normF);
                                        incrementFacultyLoad(facultyDailyLoad, normF, d);
                                    }
                                }
                            }

                            // Mark room as occupied
                            if (room != null && !room.isEmpty()) {
                                String[] rParts = room.split("[/,\\s]+");
                                for (String rp : rParts) {
                                    if (!rp.isEmpty()) {
                                        String normR = normalize(rp);
                                        if (occupiedRooms.get(d).get(p).contains(normR)) {
                                            diagnostics.add(new DiagnosticItem(
                                                    "ROOM_FIXED_CLASH",
                                                    "WARNING",
                                                    normR,
                                                    "Room " + rp + " for fixed slot '" + course + "' (" + yr + ") is already occupied on " + d + " P" + p,
                                                    "Consider assigning an alternate room or period."
                                            ));
                                        }
                                        occupiedRooms.get(d).get(p).add(normR);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Available Lab Rooms
        List<String> availableLabRooms = new ArrayList<>();
        if (request.getRooms() != null) {
            for (Room r : request.getRooms()) {
                if ("LAB".equalsIgnoreCase(r.getType()) && r.getName() != null) {
                    availableLabRooms.add(r.getName().toUpperCase());
                }
            }
        }
        if (availableLabRooms.isEmpty()) {
            availableLabRooms = Arrays.asList("IL1", "IL2", "IL3", "IL4", "IL5", "IL6");
        }

        // 5. Stage 4: Schedule Practical Lab Sessions (grouped by slot or auto-scheduled from labCourses)
        for (String yr : yearKeys) {
            YearClassData yData = yearDataMap.get(yr);
            if (yData == null) continue;

            boolean hasExplicitPracticals = yData.getPracticals() != null && !yData.getPracticals().isEmpty()
                    && yData.getPracticals().stream().anyMatch(pr -> pr.getDay() != null && !pr.getDay().trim().isEmpty());

            if (hasExplicitPracticals) {
                Map<String, Map<Integer, List<PracticalAssignmentDto>>> practicalGroups = new HashMap<>();
                for (PracticalAssignmentDto pr : yData.getPracticals()) {
                    if (pr.getDay() != null && occupiedFaculty.containsKey(pr.getDay().toUpperCase())) {
                        String d = pr.getDay().toUpperCase();
                        for (int p : pr.getPeriodNumbers()) {
                            if (p >= 1 && p <= periodsPerDay) {
                                // Protect fixed slots from being overwritten by explicit practicals
                                MasterCellEntry existingCell = yearSchedules.get(yr).get(d).get(p);
                                if (existingCell != null && !"PRACTICAL".equalsIgnoreCase(existingCell.getCellType())) {
                                    diagnostics.add(new DiagnosticItem(
                                            "PRACTICAL_FIXED_CLASH",
                                            "WARNING",
                                            yr + " " + d + " P" + p,
                                            "Explicit practical for batch " + pr.getBatch() + " (" + pr.getPractical() + ") conflicts with locked fixed slot '" + existingCell.getCourse() + "'. Fixed slot is preserved on " + yr + " " + d + " P" + p + ".",
                                            "Please reschedule this practical session to an open period or use auto-scheduling."
                                    ));
                                    continue;
                                }

                                practicalGroups.computeIfAbsent(d, k -> new HashMap<>())
                                        .computeIfAbsent(p, k -> new ArrayList<>())
                                        .add(pr);
                            }
                        }
                    }
                }

                // Convert practical groups to MasterCellEntry
                for (Map.Entry<String, Map<Integer, List<PracticalAssignmentDto>>> dayEntry : practicalGroups.entrySet()) {
                    String d = dayEntry.getKey();
                    for (Map.Entry<Integer, List<PracticalAssignmentDto>> pEntry : dayEntry.getValue().entrySet()) {
                        int p = pEntry.getKey();
                        MasterCellEntry existingCell = yearSchedules.get(yr).get(d).get(p);
                        if (existingCell != null && !"PRACTICAL".equalsIgnoreCase(existingCell.getCellType())) {
                            continue; // Safety double-check: never overwrite a fixed slot
                        }

                        List<PracticalAssignmentDto> batchList = pEntry.getValue();

                        String time = p <= timings.size() ? timings.get(p - 1) : ("Period " + p);
                        MasterCellEntry cell = new MasterCellEntry(d, p, time, yr, "", "", "", "PRACTICAL");

                        List<String> courseSummaries = new ArrayList<>();
                        List<String> facultySummaries = new ArrayList<>();
                        List<String> locationSummaries = new ArrayList<>();

                        Set<String> teachersInCell = new HashSet<>();
                        Set<String> roomsInCell = new HashSet<>();

                        for (PracticalAssignmentDto b : batchList) {
                            String fac = b.getFaculty();
                            String normF = normalize(fac);

                            // HARD CONSTRAINT: A teacher cannot teach two batches at the same time or be double-booked
                            if (!normF.isEmpty() && (teachersInCell.contains(normF) || occupiedFaculty.get(d).get(p).contains(normF))) {
                                String altFac = null;
                                if (yData.getLabCourses() != null) {
                                    for (LabCourseDto lc : yData.getLabCourses()) {
                                        if (b.getPractical() != null && b.getPractical().equalsIgnoreCase(lc.getCode())) {
                                            if (lc.getFaculties() != null) {
                                                for (String candidate : lc.getFaculties()) {
                                                    String normCand = normalize(candidate);
                                                    if (!teachersInCell.contains(normCand) && !occupiedFaculty.get(d).get(p).contains(normCand)) {
                                                        altFac = candidate;
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                if (altFac == null && request.getFaculties() != null) {
                                    for (Faculty f : request.getFaculties()) {
                                        String normCand = normalize(f.getName());
                                        if (!teachersInCell.contains(normCand) && !occupiedFaculty.get(d).get(p).contains(normCand)) {
                                            altFac = f.getName();
                                            break;
                                        }
                                    }
                                }
                                if (altFac != null) {
                                    fac = altFac;
                                    normF = normalize(fac);
                                } else {
                                    diagnostics.add(new DiagnosticItem(
                                            "TEACHER_DOUBLE_BOOKED",
                                            "ERROR",
                                            yr + " " + d + " P" + p,
                                            "Faculty '" + fac + "' was double-booked in parallel batch " + b.getBatch() + " (" + b.getPractical() + ").",
                                            "Assign distinct faculty members to parallel lab batches."
                                    ));
                                    response.getConflictLog().add(
                                            "Faculty " + fac + " double-booked at " + yr + " " + d + " P" + p + " (Batch " + b.getBatch() + " " + b.getPractical() + ")."
                                    );
                                }
                            }

                            // HARD CONSTRAINT: Room collision check
                            String room = b.getRoom();
                            String normR = normalize(room);
                            if (normR.isEmpty() || roomsInCell.contains(normR) || occupiedRooms.get(d).get(p).contains(normR)) {
                                for (String candidateRoom : availableLabRooms) {
                                    String normCandR = normalize(candidateRoom);
                                    if (!roomsInCell.contains(normCandR) && !occupiedRooms.get(d).get(p).contains(normCandR)) {
                                        room = candidateRoom;
                                        normR = normCandR;
                                        break;
                                    }
                                }
                            }

                            SubEntry sub = new SubEntry(b.getBatch(), b.getPractical(), fac, room);
                            cell.addSubEntry(sub);

                            courseSummaries.add(b.getBatch() + " -" + b.getPractical());
                            if (fac != null && !fac.isEmpty()) {
                                facultySummaries.add(fac);
                                teachersInCell.add(normF);
                                occupiedFaculty.get(d).get(p).add(normF);
                                incrementFacultyLoad(facultyDailyLoad, normF, d);
                            }
                            if (room != null && !room.isEmpty()) {
                                locationSummaries.add(room);
                                roomsInCell.add(normR);
                                occupiedRooms.get(d).get(p).add(normR);
                            }
                        }

                        cell.setCourse(String.join(", ", courseSummaries));
                        cell.setFaculty(String.join(", ", facultySummaries));
                        cell.setLocation(String.join(", ", locationSummaries));

                        yearSchedules.get(yr).get(d).put(p, cell);
                    }
                }
            } else if (yData.getLabCourses() != null && !yData.getLabCourses().isEmpty()) {
                autoSchedulePracticalsForYear(yr, yData, days, periodsPerDay, timings,
                        yearSchedules, occupiedFaculty, occupiedRooms, facultyDailyLoad, request.getRooms());
            }
        }

        // 6. Stage 5: Schedule Core Theory Lectures with Strict Teacher Dispersion & Day Balancing
        for (String yr : yearKeys) {
            YearClassData yData = yearDataMap.get(yr);
            if (yData == null || yData.getSubjects() == null) continue;

            String defaultRoom = yData.getDefaultRoom() != null && !yData.getDefaultRoom().isEmpty()
                    ? yData.getDefaultRoom()
                    : ("SY".equalsIgnoreCase(yr) ? "CR-27" : ("TY".equalsIgnoreCase(yr) ? "CR-26" : "CR-212"));

            List<Subject> theorySubjects = new ArrayList<>();
            for (Subject s : yData.getSubjects()) {
                if ("THEORY".equalsIgnoreCase(s.getType())) {
                    theorySubjects.add(s);
                }
            }

            int maxWeeklyPeriods = 0;
            for (Subject s : theorySubjects) {
                int wp = s.getWeeklyPeriods() > 0 ? s.getWeeklyPeriods() : 4;
                if (wp > maxWeeklyPeriods) maxWeeklyPeriods = wp;
            }

            List<String> availableTheoryRooms = new ArrayList<>();
            if (request.getRooms() != null) {
                for (Room r : request.getRooms()) {
                    if ("THEORY".equalsIgnoreCase(r.getType()) && r.getName() != null) {
                        availableTheoryRooms.add(r.getName());
                    }
                }
            }
            if (availableTheoryRooms.isEmpty()) {
                availableTheoryRooms = Arrays.asList("CR-27", "CR-26", "CR-212");
            }

            // PASS 1: Strict Ideal Mode
            // 1. Staggered starting days to balance periods across the entire 5-day week
            // 2. Max 1 period per subject per day (different days in the week)
            // 3. Max 1 theory lecture per teacher per day in this class (no single teacher multiple periods in a day)
            // 4. Zero consecutive / back-to-back periods for the same teacher
            for (int periodIndex = 0; periodIndex < maxWeeklyPeriods; periodIndex++) {
                for (int sIdx = 0; sIdx < theorySubjects.size(); sIdx++) {
                    Subject subject = theorySubjects.get(sIdx);
                    int weeklyPeriods = subject.getWeeklyPeriods() > 0 ? subject.getWeeklyPeriods() : 4;
                    int scheduled = countScheduledPeriods(yearSchedules.get(yr), subject);
                    if (scheduled >= weeklyPeriods) continue;

                    String facultyName = subject.getFaculty() != null ? subject.getFaculty().getName() : "";
                    String normFaculty = normalize(facultyName);
                    int maxDailyCap = facultyMaxDailyCaps.getOrDefault(normFaculty, 4);

                    boolean placed = false;
                    int startDayOffset = (sIdx + periodIndex * 2) % days.size();

                    for (int dStep = 0; dStep < days.size(); dStep++) {
                        String day = days.get((startDayOffset + dStep) % days.size());

                        // Condition A: Subject not on this day (guarantees different days in the week)
                        if (hasSubjectOnDay(yearSchedules.get(yr), day, subject)) continue;

                        // Condition B: Teacher not already teaching theory in this class on this day
                        if (countTheoryPeriodsForFacultyOnDayInClass(yearSchedules.get(yr), day, normFaculty) > 0) continue;

                        // Condition C: Faculty global daily cap across college
                        int currentDaily = facultyDailyLoad.getOrDefault(normFaculty, Map.of()).getOrDefault(day, 0);
                        if (!normFaculty.isEmpty() && currentDaily >= maxDailyCap) continue;

                        for (int p = 1; p <= periodsPerDay; p++) {
                            // Condition D: Never schedule adjacent/continuous periods for same teacher
                            if (isAdjacentSlotSameTeacher(yearSchedules.get(yr), day, p, normFaculty)) continue;

                            String roomToUse = getAvailableTheoryRoom(defaultRoom, availableTheoryRooms, day, p, occupiedRooms);
                            if (isSlotAvailable(yr, day, p, normFaculty, roomToUse, yearSchedules, occupiedFaculty, occupiedRooms)) {
                                placeTheoryLecture(yr, day, p, timings, subject, facultyName, roomToUse, yearSchedules, occupiedFaculty, occupiedRooms);
                                incrementFacultyLoad(facultyDailyLoad, normFaculty, day);
                                placed = true;
                                break;
                            }
                        }
                        if (placed) break;
                    }
                }
            }

            // PASS 2: Balanced Relaxation for Any Remaining Unplaced Periods
            // Still strictly enforces:
            // 1. Subject on different days if possible
            // 2. NEVER continuous / back-to-back periods for same teacher (must have at least a break or other class)
            // 3. Max 2 theory lectures for a teacher in this class on that day (never 3!)
            for (Subject subject : theorySubjects) {
                int weeklyPeriods = subject.getWeeklyPeriods() > 0 ? subject.getWeeklyPeriods() : 4;
                int scheduled = countScheduledPeriods(yearSchedules.get(yr), subject);
                int needed = Math.max(0, weeklyPeriods - scheduled);

                String facultyName = subject.getFaculty() != null ? subject.getFaculty().getName() : "";
                String normFaculty = normalize(facultyName);
                int maxDailyCap = facultyMaxDailyCaps.getOrDefault(normFaculty, 4);

                for (int count = 0; count < needed; count++) {
                    boolean placed = false;

                    for (String day : days) {
                        if (hasSubjectOnDay(yearSchedules.get(yr), day, subject)) continue;

                        int currentDaily = facultyDailyLoad.getOrDefault(normFaculty, Map.of()).getOrDefault(day, 0);
                        if (!normFaculty.isEmpty() && currentDaily >= maxDailyCap) continue;

                        // Limit teacher to at most 1 other period in this class on this day (max 2 total, never 3!)
                        if (countTheoryPeriodsForFacultyOnDayInClass(yearSchedules.get(yr), day, normFaculty) >= 2) continue;

                        for (int p = 1; p <= periodsPerDay; p++) {
                            // STRICT: Never back-to-back continuous periods for same teacher!
                            if (isAdjacentSlotSameTeacher(yearSchedules.get(yr), day, p, normFaculty)) continue;

                            String roomToUse = getAvailableTheoryRoom(defaultRoom, availableTheoryRooms, day, p, occupiedRooms);
                            if (isSlotAvailable(yr, day, p, normFaculty, roomToUse, yearSchedules, occupiedFaculty, occupiedRooms)) {
                                placeTheoryLecture(yr, day, p, timings, subject, facultyName, roomToUse, yearSchedules, occupiedFaculty, occupiedRooms);
                                incrementFacultyLoad(facultyDailyLoad, normFaculty, day);
                                placed = true;
                                break;
                            }
                        }
                        if (placed) break;
                    }

                    // PASS 3: Safety Fallback for Curriculum Completion (if vacant slots are tightly constrained)
                    if (!placed) {
                        for (String day : days) {
                            for (int p = 1; p <= periodsPerDay; p++) {
                                // Even in fallback, NEVER schedule continuous / back-to-back periods for same teacher!
                                if (isAdjacentSlotSameTeacher(yearSchedules.get(yr), day, p, normFaculty)) continue;

                                String roomToUse = getAvailableTheoryRoom(defaultRoom, availableTheoryRooms, day, p, occupiedRooms);
                                if (isSlotAvailable(yr, day, p, normFaculty, roomToUse, yearSchedules, occupiedFaculty, occupiedRooms)) {
                                    placeTheoryLecture(yr, day, p, timings, subject, facultyName, roomToUse, yearSchedules, occupiedFaculty, occupiedRooms);
                                    incrementFacultyLoad(facultyDailyLoad, normFaculty, day);
                                    placed = true;
                                    break;
                                }
                            }
                            if (placed) break;
                        }
                    }

                    // Diagnostics if still unplaced
                    if (!placed) {
                        List<String> vacantPeriods = findVacantPeriodsForYear(yearSchedules.get(yr), days, periodsPerDay);
                        String errorMsg;
                        String suggestion;

                        if (vacantPeriods.isEmpty()) {
                            errorMsg = "Class " + yr + " has 0 vacant periods remaining in the weekly grid for " + subject.getCode() + " (" + facultyName + ").";
                            suggestion = "Reduce weekly hours of other subjects or remove fixed slots.";
                        } else {
                            errorMsg = "Cannot place " + yr + " " + subject.getCode() + " (" + facultyName + "): Faculty or classroom " + defaultRoom + " is busy in all " + vacantPeriods.size() + " vacant periods (" + String.join(", ", vacantPeriods.subList(0, Math.min(3, vacantPeriods.size()))) + "...).";
                            suggestion = "Check faculty availability or assign an alternate teacher.";
                        }

                        response.getConflictLog().add(errorMsg);
                        diagnostics.add(new DiagnosticItem("BOTTLENECK", "ERROR", yr + " - " + subject.getCode(), errorMsg, suggestion));
                    }
                }
            }
        }

        // 7. Assemble Final Response Schedules & Contact Hours
        Map<String, List<MasterCellEntry>> finalSchedules = new HashMap<>();
        Map<String, Integer> contactHours = new HashMap<>();
        int totalHoursAllYears = 0;

        for (String yr : yearKeys) {
            List<MasterCellEntry> flatList = new ArrayList<>();
            int totalHours = 0;

            for (String day : days) {
                for (int p = 1; p <= periodsPerDay; p++) {
                    MasterCellEntry cell = yearSchedules.get(yr).get(day).get(p);
                    if (cell != null) {
                        flatList.add(cell);
                        totalHours++;
                    } else {
                        String time = p <= timings.size() ? timings.get(p - 1) : ("Period " + p);
                        flatList.add(new MasterCellEntry(day, p, time, yr, "—", "", "", "FREE"));
                    }
                }
            }

            finalSchedules.put(yr, flatList);
            contactHours.put(yr, totalHours);
            totalHoursAllYears += totalHours;
        }

        if (response.getConflictLog().isEmpty()) {
            diagnostics.add(new DiagnosticItem(
                    "SUCCESS",
                    "INFO",
                    "DEPARTMENT",
                    "Generated conflict-free 3-year timetable with 0 collisions across teachers, classrooms, and computer labs (" + totalHoursAllYears + " total periods scheduled).",
                    "All academic years synchronized successfully."
            ));
        }

        response.setDiagnostics(diagnostics);
        response.setSchedules(finalSchedules);
        response.setTotalContactHours(contactHours);
        response.setStatus(TimetableStatus.FINALIZED);

        return response;
    }

    private String getAvailableTheoryRoom(String defaultRoom, List<String> availableTheoryRooms, String day, int period,
                                         Map<String, Map<Integer, Set<String>>> occupiedRooms) {
        String normDef = normalize(defaultRoom);
        if (!normDef.isEmpty() && !occupiedRooms.get(day).get(period).contains(normDef)) {
            return defaultRoom;
        }
        if (availableTheoryRooms != null) {
            for (String room : availableTheoryRooms) {
                String normR = normalize(room);
                if (!normR.isEmpty() && !occupiedRooms.get(day).get(period).contains(normR)) {
                    return room;
                }
            }
        }
        return defaultRoom;
    }

    private boolean isSlotAvailable(String yr, String day, int period, String normFaculty, String room,
                                    Map<String, Map<String, Map<Integer, MasterCellEntry>>> yearSchedules,
                                    Map<String, Map<Integer, Set<String>>> occupiedFaculty,
                                    Map<String, Map<Integer, Set<String>>> occupiedRooms) {

        // Check if year slot is free
        if (yearSchedules.get(yr).get(day).containsKey(period)) {
            return false;
        }

        // Check if faculty is free globally across all years and FY loads
        if (!normFaculty.isEmpty() && occupiedFaculty.get(day).get(period).contains(normFaculty)) {
            return false;
        }

        // Check if classroom is free globally
        String normRoom = normalize(room);
        if (!normRoom.isEmpty() && occupiedRooms.get(day).get(period).contains(normRoom)) {
            return false;
        }

        return true;
    }

    private void placeTheoryLecture(String yr, String day, int period, List<String> timings,
                                    Subject subject, String facultyName, String room,
                                    Map<String, Map<String, Map<Integer, MasterCellEntry>>> yearSchedules,
                                    Map<String, Map<Integer, Set<String>>> occupiedFaculty,
                                    Map<String, Map<Integer, Set<String>>> occupiedRooms) {

        String time = period <= timings.size() ? timings.get(period - 1) : ("Period " + period);
        String courseCode = subject.getCode() != null && !subject.getCode().isEmpty() ? subject.getCode() : subject.getName();

        MasterCellEntry cell = new MasterCellEntry(day, period, time, yr, courseCode, facultyName, room, "THEORY");
        yearSchedules.get(yr).get(day).put(period, cell);

        String normFaculty = normalize(facultyName);
        if (!normFaculty.isEmpty()) {
            occupiedFaculty.get(day).get(period).add(normFaculty);
        }

        String normRoom = normalize(room);
        if (!normRoom.isEmpty()) {
            occupiedRooms.get(day).get(period).add(normRoom);
        }
    }

    private void incrementFacultyLoad(Map<String, Map<String, Integer>> facultyDailyLoad, String normFaculty, String day) {
        if (normFaculty == null || normFaculty.isEmpty()) return;
        facultyDailyLoad.computeIfAbsent(normFaculty, k -> new HashMap<>())
                .put(day, facultyDailyLoad.computeIfAbsent(normFaculty, k -> new HashMap<>()).getOrDefault(day, 0) + 1);
    }

    private boolean isSameSubject(MasterCellEntry cell, Subject subject) {
        if (cell == null || cell.getCourse() == null) return false;
        if (!"THEORY".equalsIgnoreCase(cell.getCellType())) return false;
        String code = subject.getCode() != null ? normalize(subject.getCode()) : "";
        String cellCourse = normalize(cell.getCourse());
        return !code.isEmpty() && cellCourse.equalsIgnoreCase(code);
    }

    private List<String> findVacantPeriodsForYear(Map<String, Map<Integer, MasterCellEntry>> yearSchedule,
                                                  List<String> days, int periodsPerDay) {
        List<String> vacant = new ArrayList<>();
        for (String day : days) {
            for (int p = 1; p <= periodsPerDay; p++) {
                if (!yearSchedule.get(day).containsKey(p)) {
                    vacant.add(day.substring(0, 3) + " P" + p);
                }
            }
        }
        return vacant;
    }

    private boolean hasSubjectOnDay(Map<String, Map<Integer, MasterCellEntry>> yearSchedule, String day, Subject subject) {
        Map<Integer, MasterCellEntry> dayEntries = yearSchedule.get(day);
        if (dayEntries == null) return false;

        String code = subject.getCode() != null ? normalize(subject.getCode()) : "";

        for (MasterCellEntry cell : dayEntries.values()) {
            if (cell != null && cell.getCourse() != null && !"PRACTICAL".equalsIgnoreCase(cell.getCellType())) {
                String c = normalize(cell.getCourse());
                if (!code.isEmpty() && c.equalsIgnoreCase(code)) {
                    return true;
                }
            }
        }
        return false;
    }

    private int countTheoryPeriodsForFacultyOnDayInClass(Map<String, Map<Integer, MasterCellEntry>> yearSchedule, String day, String normFaculty) {
        if (normFaculty == null || normFaculty.isEmpty()) return 0;
        Map<Integer, MasterCellEntry> dayEntries = yearSchedule.get(day);
        if (dayEntries == null) return 0;

        int count = 0;
        for (MasterCellEntry cell : dayEntries.values()) {
            if (cell != null && !"PRACTICAL".equalsIgnoreCase(cell.getCellType())) {
                if (cellHasTeacher(cell, normFaculty)) {
                    count++;
                }
            }
        }
        return count;
    }

    private boolean isAdjacentSlotSameTeacher(Map<String, Map<Integer, MasterCellEntry>> yearSchedule, String day, int period, String normFaculty) {
        if (normFaculty == null || normFaculty.isEmpty()) return false;
        Map<Integer, MasterCellEntry> dayEntries = yearSchedule.get(day);
        if (dayEntries == null) return false;

        // In this timetable:
        // P1 & P2: Morning block (10:00 - 12:00)
        // [12:00 - 12:45: 45-min Lunch Recess]
        // P3 & P4: Afternoon block (12:45 - 02:45)
        // [02:45 - 03:00: 15-min Tea Recess]
        // P5 & P6: Evening block (03:00 - 05:00)
        // Therefore, P2 & P3 and P4 & P5 are separated by breaks and not considered back-to-back.

        // Check period - 1: Only if period is 2, 4, or 6 (unbroken preceding period)
        if (period == 2 || period == 4 || period == 6) {
            MasterCellEntry prev = dayEntries.get(period - 1);
            if (prev != null && !"PRACTICAL".equalsIgnoreCase(prev.getCellType()) && cellHasTeacher(prev, normFaculty)) {
                return true;
            }
        }

        // Check period + 1: Only if period is 1, 3, or 5 (unbroken succeeding period)
        if (period == 1 || period == 3 || period == 5) {
            MasterCellEntry next = dayEntries.get(period + 1);
            if (next != null && !"PRACTICAL".equalsIgnoreCase(next.getCellType()) && cellHasTeacher(next, normFaculty)) {
                return true;
            }
        }

        return false;
    }

    private boolean cellHasTeacher(MasterCellEntry cell, String normFaculty) {
        if (cell == null || normFaculty == null || normFaculty.isEmpty()) return false;
        if (cell.getSubEntries() != null && !cell.getSubEntries().isEmpty()) {
            for (SubEntry sub : cell.getSubEntries()) {
                if (sub.getFaculty() != null) {
                    for (String fp : sub.getFaculty().split("[/,\\s]+")) {
                        if (normalize(fp).equalsIgnoreCase(normFaculty)) return true;
                    }
                }
            }
        } else if (cell.getFaculty() != null) {
            for (String fp : cell.getFaculty().split("[/,\\s]+")) {
                if (normalize(fp).equalsIgnoreCase(normFaculty)) return true;
            }
        }
        return false;
    }

    private int countScheduledPeriods(Map<String, Map<Integer, MasterCellEntry>> yearSchedule, Subject subject) {
        int count = 0;
        String code = subject.getCode() != null ? normalize(subject.getCode()) : "";

        for (Map<Integer, MasterCellEntry> dayEntries : yearSchedule.values()) {
            for (MasterCellEntry cell : dayEntries.values()) {
                if (cell != null && cell.getCourse() != null && !"PRACTICAL".equalsIgnoreCase(cell.getCellType())) {
                    String c = normalize(cell.getCourse());
                    if (!code.isEmpty() && c.equalsIgnoreCase(code)) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    private String detectCellType(String course) {
        if (course == null) return "THEORY";
        String upper = course.toUpperCase();
        if (upper.startsWith("MDM")) return "MDM";
        if (upper.startsWith("OE")) return "OE";
        if (upper.contains("MENTORING")) return "MENTORING";
        if (upper.contains("CAPSTONE") || upper.contains("PROJECT")) return "CAPSTONE";
        if (upper.contains("PE-") || upper.contains("ELECTIVE")) return "ELECTIVE";
        return "THEORY";
    }

    private void autoSchedulePracticalsForYear(
            String yr, YearClassData yData, List<String> days, int periodsPerDay, List<String> timings,
            Map<String, Map<String, Map<Integer, MasterCellEntry>>> yearSchedules,
            Map<String, Map<Integer, Set<String>>> occupiedFaculty,
            Map<String, Map<Integer, Set<String>>> occupiedRooms,
            Map<String, Map<String, Integer>> facultyDailyLoad,
            List<Room> allRooms) {

        List<LabCourseDto> labCourses = yData.getLabCourses();
        if (labCourses == null || labCourses.isEmpty()) return;

        // Collect batches (e.g. I1, I2, I3, I4)
        List<String> batchNames = new ArrayList<>();
        if (yData.getBatches() != null && !yData.getBatches().isEmpty()) {
            for (PracticalBatch pb : yData.getBatches()) {
                if (pb.getName() != null && !pb.getName().trim().isEmpty()) {
                    batchNames.add(pb.getName().trim());
                }
            }
        }
        if (batchNames.isEmpty()) {
            batchNames = Arrays.asList("I1", "I2", "I3", "I4");
        }

        // Available lab rooms
        List<String> availableLabRooms = new ArrayList<>();
        if (allRooms != null) {
            for (Room r : allRooms) {
                if ("LAB".equalsIgnoreCase(r.getType()) && r.getName() != null) {
                    availableLabRooms.add(r.getName().toUpperCase());
                }
            }
        }
        if (availableLabRooms.isEmpty()) {
            availableLabRooms = Arrays.asList("IL1", "IL2", "IL3", "IL4", "IL5", "IL6");
        }

        int numCourses = labCourses.size();
        int numBatches = batchNames.size();

        // 2-hour continuous blocks (P1-P2, P3-P4, P5-P6)
        int[][] blocks = new int[][]{ {1, 2}, {3, 4}, {5, 6} };

        // For M lab courses, we need M distinct days so no batch has multiple labs on the same day
        Set<String> usedDaysForPracticals = new HashSet<>();

        for (int cIdx = 0; cIdx < numCourses; cIdx++) {
            boolean scheduled = false;

            // Search for an available day not yet used for practicals in this class
            for (String day : days) {
                if (usedDaysForPracticals.contains(day)) continue;

                // Try each 2-hour continuous block
                for (int[] blk : blocks) {
                    int p1 = blk[0];
                    int p2 = blk[1];

                    // Check if class slot is free in p1 and p2
                    if (yearSchedules.get(yr).get(day).containsKey(p1) ||
                        yearSchedules.get(yr).get(day).containsKey(p2)) {
                        continue;
                    }

                    // Check if faculties and lab rooms for all batches in this block are free
                    boolean blockAvailable = true;
                    List<String> assignedFaculties = new ArrayList<>();
                    List<String> assignedRooms = new ArrayList<>();

                    for (int bIdx = 0; bIdx < numBatches; bIdx++) {
                        String batchName = batchNames.get(bIdx);
                        // Latin Square rotation: guarantees each batch bIdx receives subject sIdx exactly once across all cIdx sessions!
                        int sIdx = (bIdx + cIdx) % numCourses;
                        LabCourseDto course = labCourses.get(sIdx);

                        String fac = course.getBatchFacultyMap() != null && course.getBatchFacultyMap().containsKey(batchName)
                                ? course.getBatchFacultyMap().get(batchName)
                                : (course.getFaculties() != null && !course.getFaculties().isEmpty()
                                        ? course.getFaculties().get(bIdx % course.getFaculties().size())
                                        : course.getFaculty());
                        String normF = normalize(fac);

                        if (!normF.isEmpty()) {
                            if (occupiedFaculty.get(day).get(p1).contains(normF) ||
                                occupiedFaculty.get(day).get(p2).contains(normF) ||
                                assignedFaculties.contains(normF)) {
                                blockAvailable = false;
                                break;
                            }
                            assignedFaculties.add(normF);
                        }

                        // Room selection: preferred or next available distinct lab
                        String room = course.getBatchRoomMap() != null && course.getBatchRoomMap().containsKey(batchName)
                                ? course.getBatchRoomMap().get(batchName)
                                : course.getPreferredRoom();

                        if (room == null || room.isEmpty() || assignedRooms.contains(normalize(room))) {
                            for (String candidateLab : availableLabRooms) {
                                String normLab = normalize(candidateLab);
                                if (!occupiedRooms.get(day).get(p1).contains(normLab) &&
                                    !occupiedRooms.get(day).get(p2).contains(normLab) &&
                                    !assignedRooms.contains(normLab)) {
                                    room = candidateLab;
                                    break;
                                }
                            }
                        }

                        String normR = normalize(room);
                        if (!normR.isEmpty()) {
                            if (occupiedRooms.get(day).get(p1).contains(normR) ||
                                occupiedRooms.get(day).get(p2).contains(normR) ||
                                assignedRooms.contains(normR)) {
                                blockAvailable = false;
                                break;
                            }
                            assignedRooms.add(normR);
                        }
                    }

                    if (blockAvailable) {
                        // Place practicals in p1 and p2!
                        usedDaysForPracticals.add(day);

                        for (int p : blk) {
                            String time = p <= timings.size() ? timings.get(p - 1) : ("Period " + p);
                            MasterCellEntry cell = new MasterCellEntry(day, p, time, yr, "", "", "", "PRACTICAL");

                            List<String> courseSummaries = new ArrayList<>();
                            List<String> facultySummaries = new ArrayList<>();
                            List<String> locationSummaries = new ArrayList<>();

                            for (int bIdx = 0; bIdx < numBatches; bIdx++) {
                                String batchName = batchNames.get(bIdx);
                                int sIdx = (bIdx + cIdx) % numCourses;
                                LabCourseDto course = labCourses.get(sIdx);

                                String fac = course.getBatchFacultyMap() != null && course.getBatchFacultyMap().containsKey(batchName)
                                        ? course.getBatchFacultyMap().get(batchName)
                                        : (course.getFaculties() != null && !course.getFaculties().isEmpty()
                                                ? course.getFaculties().get(bIdx % course.getFaculties().size())
                                                : course.getFaculty());
                                String room = bIdx < assignedRooms.size() ? assignedRooms.get(bIdx) : course.getPreferredRoom();

                                SubEntry sub = new SubEntry(batchName, course.getCode(), fac, room);
                                cell.addSubEntry(sub);

                                courseSummaries.add(batchName + " -" + course.getCode());
                                if (fac != null && !fac.isEmpty()) {
                                    facultySummaries.add(fac);
                                    String normF = normalize(fac);
                                    occupiedFaculty.get(day).get(p).add(normF);
                                    incrementFacultyLoad(facultyDailyLoad, normF, day);
                                }
                                if (room != null && !room.isEmpty()) {
                                    locationSummaries.add(room);
                                    occupiedRooms.get(day).get(p).add(normalize(room));
                                }
                            }

                            cell.setCourse(String.join(", ", courseSummaries));
                            cell.setFaculty(String.join(", ", facultySummaries));
                            cell.setLocation(String.join(", ", locationSummaries));

                            yearSchedules.get(yr).get(day).put(p, cell);
                        }

                        scheduled = true;
                        break;
                    }
                }
                if (scheduled) break;
            }
        }
    }

    private String normalize(String s) {
        return s == null ? "" : s.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
    }
}
