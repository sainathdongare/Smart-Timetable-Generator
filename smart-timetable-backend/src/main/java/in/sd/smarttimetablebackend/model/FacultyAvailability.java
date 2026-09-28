package in.sd.smarttimetablebackend.model;

public class FacultyAvailability {
    private String facultyName;
    private String day;
    private int periodNumber;

    public FacultyAvailability() {
    }

    public FacultyAvailability(
            String facultyName,
            String day,
            int periodNumber) {

        this.facultyName = facultyName;
        this.day = day;
        this.periodNumber = periodNumber;
    }

    public String getFacultyName() {
        return facultyName;
    }

    public void setFacultyName(String facultyName) {
        this.facultyName = facultyName;
    }

    public String getDay() {
        return day;
    }

    public void setDay(String day) {
        this.day = day;
    }

    public int getPeriodNumber() {
        return periodNumber;
    }

    public void setPeriodNumber(int periodNumber) {
        this.periodNumber = periodNumber;
    }
}
