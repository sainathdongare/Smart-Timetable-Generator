package in.sd.smarttimetablebackend.model;

import java.util.ArrayList;
import java.util.List;

public class PracticalAssignmentDto {
    private String day;
    private String period; // e.g. "P3-P4" or "3-4" or 3
    private String batch;  // e.g. "I1", "I2", "I3", "I4"
    private String practical; // e.g. "OOPJ", "ITTT", "DS", "MAD", "FTWD", "PE-IV DLL"
    private String faculty;   // e.g. "RSP", "PTS", "SUM", "MAV", "SPP"
    private String room;      // e.g. "IL4", "IL2", "IL1", "IL3"

    public PracticalAssignmentDto() {
    }

    public PracticalAssignmentDto(String day, String period, String batch, String practical, String faculty, String room) {
        this.day = day;
        this.period = period;
        this.batch = batch;
        this.practical = practical;
        this.faculty = faculty;
        this.room = room;
    }

    public String getDay() {
        return day;
    }

    public void setDay(String day) {
        this.day = day;
    }

    public String getPeriod() {
        return period;
    }

    public void setPeriod(String period) {
        this.period = period;
    }

    public String getBatch() {
        return batch;
    }

    public void setBatch(String batch) {
        this.batch = batch;
    }

    public String getPractical() {
        return practical;
    }

    public void setPractical(String practical) {
        this.practical = practical;
    }

    public String getFaculty() {
        return faculty;
    }

    public void setFaculty(String faculty) {
        this.faculty = faculty;
    }

    public String getRoom() {
        return room;
    }

    public void setRoom(String room) {
        this.room = room;
    }

    public List<Integer> getPeriodNumbers() {
        List<Integer> list = new ArrayList<>();
        if (period == null) return list;
        String clean = period.replaceAll("[^0-9\\-]", "");
        if (clean.contains("-")) {
            String[] parts = clean.split("-");
            try {
                int start = Integer.parseInt(parts[0].trim());
                int end = Integer.parseInt(parts[1].trim());
                for (int i = start; i <= end; i++) {
                    list.add(i);
                }
            } catch (NumberFormatException ignored) {}
        } else {
            try {
                list.add(Integer.parseInt(clean.trim()));
            } catch (NumberFormatException ignored) {}
        }
        return list;
    }
}
