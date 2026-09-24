package in.sd.smarttimetablebackend.model;

public class ExternalLoad {
    private String day;
    private int period;
    private String facultyCode;
    private String loadType;      // "FY-EEDP", "FY-PPS", "FY-PCC"
    private String description;   // "PTS-Div E", "DBC-PCC", "VUP-Div B", "MSK-Div D", "MSK-PPS"

    public ExternalLoad() {
    }

    public ExternalLoad(String day, int period, String facultyCode, String loadType, String description) {
        this.day = day;
        this.period = period;
        this.facultyCode = facultyCode;
        this.loadType = loadType;
        this.description = description;
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

    public String getFacultyCode() {
        return facultyCode;
    }

    public void setFacultyCode(String facultyCode) {
        this.facultyCode = facultyCode;
    }

    public String getLoadType() {
        return loadType;
    }

    public void setLoadType(String loadType) {
        this.loadType = loadType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
