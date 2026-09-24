package in.sd.smarttimetablebackend.model;

public class SubEntry {
    private String batch;
    private String course;
    private String faculty;
    private String location;

    public SubEntry() {
    }

    public SubEntry(String batch, String course, String faculty, String location) {
        this.batch = batch;
        this.course = course;
        this.faculty = faculty;
        this.location = location;
    }

    public String getBatch() {
        return batch;
    }

    public void setBatch(String batch) {
        this.batch = batch;
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
}
