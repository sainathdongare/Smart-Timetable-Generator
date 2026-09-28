package in.sd.smarttimetablebackend.model;

import java.util.List;

public class TimetableGenerationRequest {
    private TimetableConfig config;

    private List<Subject> subjects;
    private List<Faculty> faculties;
    private List<Room> rooms;
    private List<PracticalBatch> batches;
    private List<FacultyUnavailability> facultyUnavailability;
    private List<FixedSlot> fixedSlots;

    public TimetableGenerationRequest() {
    }

    public TimetableConfig getConfig() {
        return config;
    }

    public void setConfig(TimetableConfig config) {
        this.config = config;
    }

    public List<Subject> getSubjects() {
        return subjects;
    }

    public void setSubjects(List<Subject> subjects) {
        this.subjects = subjects;
    }

    public List<Faculty> getFaculties() {
        return faculties;
    }

    public void setFaculties(List<Faculty> faculties) {
        this.faculties = faculties;
    }

    public List<Room> getRooms() {
        return rooms;
    }

    public void setRooms(List<Room> rooms) {
        this.rooms = rooms;
    }

    public List<PracticalBatch> getBatches() {
        return batches;
    }

    public void setBatches(List<PracticalBatch> batches) {
        this.batches = batches;
    }

    public List<FacultyUnavailability> getFacultyUnavailability() {
        return facultyUnavailability;
    }

    public void setFacultyUnavailability(
            List<FacultyUnavailability> facultyUnavailability) {
        this.facultyUnavailability = facultyUnavailability;
    }

    public List<FixedSlot> getFixedSlots() {
        return fixedSlots;
    }

    public void setFixedSlots(List<FixedSlot> fixedSlots) {
        this.fixedSlots = fixedSlots;
    }
}
