# Chapter 3: Methodology — Flowchart Documentation
## Module: Timetable Generation Initialization & Constraint Pre-Processing

This document accompanies the technical flowchart for **Chapter 3 (Methodology)** of the academic project report titled *"Academic Timetable Generator for RIT"*. It specifies the exact execution flow of the initialization, state tracking, capacity verification, and preliminary load registration phases in `MasterTimetableGenerator.java`.

---

### 1. Code Verification & Source Method Mapping

The flowchart directly mirrors the actual Java source code in [`MasterTimetableGenerator.java`](file:///d:/Programing/Smart%20Timetable%20Management%20System/smart-timetable-backend/src/main/java/in/sd/smarttimetablebackend/service/MasterTimetableGenerator.java) (lines 11–176).

| Flowchart Step | Java Source Lines | Methods & Operations Used |
| :--- | :--- | :--- |
| **Request & Config Validation** | Lines 11–17 | `request == null \|\| request.getConfig() == null`<br>`response.setStatus(TimetableStatus.NOT_STARTED)` |
| **Configuration Extraction** | Lines 19–38 | `request.getConfig()`, `config.getWorkingDays()`, `config.getPeriodTimings()`, `config.getPeriodsPerDay()` |
| **State Structure Initialization** | Lines 41–80 | Iterative population of `occupiedFaculty[day][period]`, `occupiedRooms[day][period]`, `yearSchedules[year][day][period]`, `normalize(f.getName())`, `facultyDailyLoad[faculty][day] = 0` |
| **Pre-Generation Capacity Check** | Lines 82–138 | Iteration over `yearKeys = ["SY", "TY", "BTECH"]`<br>`(fixedCount - overlap) + practicalSlots + theoryRequested`<br>`diagnostics.add(new DiagnosticItem("CAPACITY_EXCEEDED", "WARNING", ...))` |
| **Stage 1: Faculty Unavailability** | Lines 140–150 | Iteration over `request.getFacultyUnavailability()`<br>`occupiedFaculty.get(un.getDay().toUpperCase()).get(un.getPeriod()).add(facultyName)` |
| **Stage 2: External FY Loads** | Lines 152–175 | Iteration over `request.getExternalLoads()`<br>`occupiedFaculty.get(d).get(p).add(normF)`<br>`incrementFacultyLoad(facultyDailyLoad, normF, d)`<br>`response.setExternalLoads(externalMap)` |
| **Transition to Stage 3** | Line 177 | Control passes to Fixed-Slot Scheduling: `for (String yr : yearKeys)` |

---

### 2. Standard Flowchart Notation

* **Ovals (Terminals):** 
  * `Start: generate(request)`
  * `Return response (Exit)`
  * `Pass Control to Stage 3: Fixed-Session Scheduling`
* **Diamonds (Decisions with Yes/No branches):**
  * `Is request == null OR request.getConfig() == null?`
  * `Is totalEstimated > totalWeeklySlots?`
  * `More cohorts to check?`
* **Rectangles (Processes):**
  * Configuration parameter extraction
  * Global state structure allocation
  * Cohort demand calculation
  * Stage 1 faculty unavailability locking
  * Stage 2 external load registration
* **Dashed Rectangle (Warning / Diagnostic Event):**
  * Appending `CAPACITY_EXCEEDED` warning without stopping algorithm execution

---

### 3. Critical Flow Clarification: Capacity Check Non-Termination

In `MasterTimetableGenerator.java` (lines 127–136), if `totalEstimatedPeriods > totalWeeklySlots`, the system registers a `CAPACITY_EXCEEDED` diagnostic:
```java
if (totalEstimatedPeriods > totalWeeklySlots) {
    diagnostics.add(new DiagnosticItem(
            "CAPACITY_EXCEEDED",
            "WARNING",
            yr,
            "Class " + yr + " requested approx " + totalEstimatedPeriods + " periods, but weekly capacity is " + totalWeeklySlots + " periods.",
            "Consider reducing theory hours or consolidating practical sessions."
    ));
}
```
**Important:** This is an informational warning, **not an assertion failure or early termination**. The loop continues to verify subsequent academic cohorts and then smoothly transitions into Stage 1, Stage 2, and subsequent scheduling stages. The flowchart accurately illustrates this non-terminating merge path.

---

### 4. Editable Mermaid Diagram Source

```mermaid
flowchart TD
    Start([Start: generate(request)]) --> CheckReq{Is request == null OR<br/>request.getConfig() == null?}
    
    CheckReq -- Yes --> SetNotStarted[Set response status = NOT_STARTED]
    SetNotStarted --> ReturnExit([Return response <Exit>])

    CheckReq -- No --> ExtractConfig[Extract Configuration Parameters:<br/>- Retrieve workingDays, periodTimings, periodsPerDay<br/>- Calculate totalWeeklySlots = days.size × periodsPerDay]

    ExtractConfig --> InitState[Initialize Department Tracking Structures:<br/>- occupiedFaculty Map[day][period]<br/>- occupiedRooms Map[day][period]<br/>- yearSchedules Map[year][day][period]<br/>- facultyMaxDailyCaps & facultyDailyLoad = 0]

    InitState --> LoopCohort[Pre-Generation Capacity Check:<br/>For each cohort in ['SY', 'TY', 'BTECH']<br/>Calculate estimated = (fixed - overlap) + practical + theory]

    LoopCohort --> CheckCapacity{Is totalEstimated ><br/>totalWeeklySlots?}

    CheckCapacity -- Yes --> WarnCapacity[Append CAPACITY_EXCEEDED<br/>warning to diagnostics<br/>&lt;Execution Continues&gt;]
    CheckCapacity -- No --> MergeCapacity[Proceed]
    WarnCapacity --> MergeCapacity

    MergeCapacity --> MoreCohorts{More cohorts<br/>to verify?}
    MoreCohorts -- Yes --> LoopCohort
    MoreCohorts -- No --> Stage1[Stage 1: Lock Faculty Unavailability<br/>Iterate request.facultyUnavailability:<br/>- Validate day and 1 <= period <= periodsPerDay<br/>- Add faculty to occupiedFaculty[day][period]]

    Stage1 --> Stage2[Stage 2: Register External FY Loads<br/>Iterate request.externalLoads (FY-EEDP, FY-PPS, FY-PCC):<br/>- Add faculty to occupiedFaculty[day][period]<br/>- incrementFacultyLoad(facultyDailyLoad, faculty, day)<br/>- Categorize and attach to response.externalLoads map]

    Stage2 --> Stage3([Pass Control to Stage 3:<br/>Fixed-Session Scheduling & Collision Check])
```
