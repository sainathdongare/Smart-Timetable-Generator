package in.sd.smarttimetablebackend.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MasterTimetableResponse {
    private String department = "Department of Information Technology";
    private String academicYear = "";
    private String institute = "K.E.Society's Rajarambapu Institute of Technology, Rajaramnagar";
    private TimetableStatus status = TimetableStatus.FINALIZED;

    private TimetableConfig config;
    private Map<String, List<MasterCellEntry>> schedules = new HashMap<>(); // "SY", "TY", "BTECH" -> list of cell entries
    private Map<String, List<ExternalLoad>> externalLoads = new HashMap<>(); // "FY-EEDP", "FY-PPS", "FY-PCC"
    private Map<String, Integer> totalContactHours = new HashMap<>();
    private List<String> conflictLog = new ArrayList<>();
    private List<DiagnosticItem> diagnostics = new ArrayList<>();

    public MasterTimetableResponse() {
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getAcademicYear() {
        return academicYear;
    }

    public void setAcademicYear(String academicYear) {
        this.academicYear = academicYear;
    }

    public String getInstitute() {
        return institute;
    }

    public void setInstitute(String institute) {
        this.institute = institute;
    }

    public TimetableStatus getStatus() {
        return status;
    }

    public void setStatus(TimetableStatus status) {
        this.status = status;
    }

    public TimetableConfig getConfig() {
        return config;
    }

    public void setConfig(TimetableConfig config) {
        this.config = config;
    }

    public Map<String, List<MasterCellEntry>> getSchedules() {
        return schedules;
    }

    public void setSchedules(Map<String, List<MasterCellEntry>> schedules) {
        this.schedules = schedules;
    }

    public Map<String, List<ExternalLoad>> getExternalLoads() {
        return externalLoads;
    }

    public void setExternalLoads(Map<String, List<ExternalLoad>> externalLoads) {
        this.externalLoads = externalLoads;
    }

    public Map<String, Integer> getTotalContactHours() {
        return totalContactHours;
    }

    public void setTotalContactHours(Map<String, Integer> totalContactHours) {
        this.totalContactHours = totalContactHours;
    }

    public List<String> getConflictLog() {
        return conflictLog;
    }

    public void setConflictLog(List<String> conflictLog) {
        this.conflictLog = conflictLog;
    }

    public List<DiagnosticItem> getDiagnostics() {
        return diagnostics;
    }

    public void setDiagnostics(List<DiagnosticItem> diagnostics) {
        this.diagnostics = diagnostics;
    }
}
