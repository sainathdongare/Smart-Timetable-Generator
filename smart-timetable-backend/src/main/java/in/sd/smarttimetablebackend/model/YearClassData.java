package in.sd.smarttimetablebackend.model;

import java.util.ArrayList;
import java.util.List;

public class YearClassData {
    private String year;         // "SY", "TY", "BTECH"
    private String branch;       // "IT"
    private String defaultRoom;  // "CR-27", "CR-26", "CR-212"
    private List<Subject> subjects = new ArrayList<>();
    private List<PracticalBatch> batches = new ArrayList<>();
    private List<FixedSlot> fixedSlots = new ArrayList<>();
    private List<PracticalAssignmentDto> practicals = new ArrayList<>();
    private List<LabCourseDto> labCourses = new ArrayList<>();

    public YearClassData() {
    }

    public YearClassData(String year, String branch, String defaultRoom, List<Subject> subjects, List<PracticalBatch> batches, List<FixedSlot> fixedSlots, List<PracticalAssignmentDto> practicals) {
        this.year = year;
        this.branch = branch;
        this.defaultRoom = defaultRoom;
        this.subjects = subjects;
        this.batches = batches;
        this.fixedSlots = fixedSlots;
        this.practicals = practicals;
    }

    public String getYear() {
        return year;
    }

    public void setYear(String year) {
        this.year = year;
    }

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public String getDefaultRoom() {
        return defaultRoom;
    }

    public void setDefaultRoom(String defaultRoom) {
        this.defaultRoom = defaultRoom;
    }

    public List<Subject> getSubjects() {
        return subjects;
    }

    public void setSubjects(List<Subject> subjects) {
        this.subjects = subjects;
    }

    public List<PracticalBatch> getBatches() {
        return batches;
    }

    public void setBatches(List<PracticalBatch> batches) {
        this.batches = batches;
    }

    public List<FixedSlot> getFixedSlots() {
        return fixedSlots;
    }

    public void setFixedSlots(List<FixedSlot> fixedSlots) {
        this.fixedSlots = fixedSlots;
    }

    public List<PracticalAssignmentDto> getPracticals() {
        return practicals;
    }

    public void setPracticals(List<PracticalAssignmentDto> practicals) {
        this.practicals = practicals;
    }

    public List<LabCourseDto> getLabCourses() {
        return labCourses;
    }

    public void setLabCourses(List<LabCourseDto> labCourses) {
        this.labCourses = labCourses;
    }
}
