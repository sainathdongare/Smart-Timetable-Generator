package in.sd.smarttimetablebackend.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "timetable_configs")
public class TimetableConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "academic_year")
    private String year;
    private String branch;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "config_working_days", joinColumns = @JoinColumn(name = "config_id"))
    @Column(name = "working_day")
    private List<String> workingDays = new ArrayList<>();

    private int periodsPerDay;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "config_period_timings", joinColumns = @JoinColumn(name = "config_id"))
    @Column(name = "period_timing")
    private List<String> periodTimings = new ArrayList<>();

    public TimetableConfig() {
    }

    public TimetableConfig(Long id,
                           String year,
                           String branch,
                           List<String> workingDays,
                           int periodsPerDay,
                           List<String> periodTimings) {
        this.id = id;
        this.year = year;
        this.branch = branch;
        this.workingDays = workingDays;
        this.periodsPerDay = periodsPerDay;
        this.periodTimings = periodTimings;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public List<String> getWorkingDays() {
        return workingDays;
    }

    public void setWorkingDays(List<String> workingDays) {
        this.workingDays = workingDays;
    }

    public int getPeriodsPerDay() {
        return periodsPerDay;
    }

    public void setPeriodsPerDay(int periodsPerDay) {
        this.periodsPerDay = periodsPerDay;
    }

    public List<String> getPeriodTimings() {
        return periodTimings;
    }

    public void setPeriodTimings(List<String> periodTimings) {
        this.periodTimings = periodTimings;
    }

}