package in.sd.smarttimetablebackend.service;

public class Slot {
    private String day;
    private int period;
    private String time;

    public Slot(String day, int period, String time) {
        this.day = day;
        this.period = period;
        this.time = time;
    }

    public String getDay() {
        return day;
    }

    public int getPeriod() {
        return period;
    }

    public String getTime() {
        return time;
    }
}
