package in.sd.smarttimetablebackend.model;

import java.util.ArrayList;
import java.util.List;

public class MasterCellEntry {
    private String day;
    private int period;
    private String time;
    private String year;       // "SY", "TY", "BTECH"
    private String course;     // e.g. "DS", "OOPJ", "MDM-I", "Mentoring"
    private String faculty;    // e.g. "SUM", "RSP", "PTS/ARJ"
    private String location;   // e.g. "CR-27", "IL4", "CR-26/27"
    private String cellType;   // "THEORY", "PRACTICAL", "MDM", "OE", "MENTORING", "CAPSTONE", "FIXED"
    private List<SubEntry> subEntries = new ArrayList<>();

    public MasterCellEntry() {
    }

    public MasterCellEntry(String day, int period, String time, String year, String course, String faculty, String location, String cellType) {
        this.day = day;
        this.period = period;
        this.time = time;
        this.year = year;
        this.course = course;
        this.faculty = faculty;
        this.location = location;
        this.cellType = cellType;
    }

    public String getDay() {
        return day;
    }

    public void setDay(String day) {
        this.day = day;
    }

    public int getPeriod() {
        return period;
    }

    public void setPeriod(int period) {
        this.period = period;
    }

    public String getTime() {
        return time;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public String getYear() {
        return year;
    }

    public void setYear(String year) {
        this.year = year;
    }

    public String getCourse() {
        return course;
    }

    public void setCourse(String course) {
        this.course = course;
    }

    public String getFaculty() {
        return faculty;
    }

    public void setFaculty(String faculty) {
        this.faculty = faculty;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getCellType() {
        return cellType;
    }

    public void setCellType(String cellType) {
        this.cellType = cellType;
    }

    public List<SubEntry> getSubEntries() {
        return subEntries;
    }

    public void setSubEntries(List<SubEntry> subEntries) {
        this.subEntries = subEntries;
    }

    public void addSubEntry(SubEntry subEntry) {
        this.subEntries.add(subEntry);
    }
}
