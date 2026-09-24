package in.sd.smarttimetablebackend.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MasterTimetableRequest {
    private TimetableConfig config;
    private List<Faculty> faculties = new ArrayList<>();
    private List<Room> rooms = new ArrayList<>();
    private List<FacultyUnavailability> facultyUnavailability = new ArrayList<>();
    private Map<String, YearClassData> yearData = new HashMap<>(); // "SY", "TY", "BTECH"
    private List<ExternalLoad> externalLoads = new ArrayList<>();  // FY Loads

    public MasterTimetableRequest() {
    }

    public MasterTimetableRequest(TimetableConfig config, List<Faculty> faculties, List<Room> rooms, List<FacultyUnavailability> facultyUnavailability, Map<String, YearClassData> yearData, List<ExternalLoad> externalLoads) {
        this.config = config;
        this.faculties = faculties;
        this.rooms = rooms;
        this.facultyUnavailability = facultyUnavailability;
        this.yearData = yearData;
        this.externalLoads = externalLoads;
    }

    public TimetableConfig getConfig() {
        return config;
    }

    public void setConfig(TimetableConfig config) {
        this.config = config;
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

    public List<FacultyUnavailability> getFacultyUnavailability() {
        return facultyUnavailability;
    }

    public void setFacultyUnavailability(List<FacultyUnavailability> facultyUnavailability) {
        this.facultyUnavailability = facultyUnavailability;
    }

    public Map<String, YearClassData> getYearData() {
        return yearData;
    }

    public void setYearData(Map<String, YearClassData> yearData) {
        this.yearData = yearData;
    }

    public List<ExternalLoad> getExternalLoads() {
        return externalLoads;
    }

    public void setExternalLoads(List<ExternalLoad> externalLoads) {
        this.externalLoads = externalLoads;
    }
}
