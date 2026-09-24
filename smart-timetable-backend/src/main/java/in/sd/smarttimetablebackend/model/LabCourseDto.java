package in.sd.smarttimetablebackend.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class LabCourseDto {
    private String code;            // e.g. "DS", "OOPJ", "ITTT", "EVS"
    private String name;            // e.g. "Data Structures Lab"
    private String faculty;         // e.g. "SUM" (primary or default faculty)
    private String preferredRoom;   // e.g. "IL1"
    private List<String> faculties = new ArrayList<>(); // multiple teachers for this lab
    private Map<String, String> batchFacultyMap = new HashMap<>(); // optional: e.g. {"I1": "MNM", "I2": "MAV", "I3": "VUP", "I4": "RSP"}
    private Map<String, String> batchRoomMap = new HashMap<>();    // optional: e.g. {"I1": "IL2", "I2": "IL6", "I3": "IL3", "I4": "IL4"}

    public LabCourseDto() {
    }

    public LabCourseDto(String code, String name, String faculty, String preferredRoom) {
        this.code = code;
        this.name = name;
        this.faculty = faculty;
        this.preferredRoom = preferredRoom;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFaculty() {
        return faculty;
    }

    public void setFaculty(String faculty) {
        this.faculty = faculty;
    }

    public String getPreferredRoom() {
        return preferredRoom;
    }

    public void setPreferredRoom(String preferredRoom) {
        this.preferredRoom = preferredRoom;
    }

    public List<String> getFaculties() {
        return faculties;
    }

    public void setFaculties(List<String> faculties) {
        this.faculties = faculties;
    }

    public Map<String, String> getBatchFacultyMap() {
        return batchFacultyMap;
    }

    public void setBatchFacultyMap(Map<String, String> batchFacultyMap) {
        this.batchFacultyMap = batchFacultyMap;
    }

    public Map<String, String> getBatchRoomMap() {
        return batchRoomMap;
    }

    public void setBatchRoomMap(Map<String, String> batchRoomMap) {
        this.batchRoomMap = batchRoomMap;
    }
}
