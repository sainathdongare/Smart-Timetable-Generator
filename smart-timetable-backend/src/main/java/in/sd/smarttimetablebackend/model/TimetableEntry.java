package in.sd.smarttimetablebackend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "timetable_entries")
public class TimetableEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "academic_year")
    private String year;
    private String branch;

    private String day;
    private int period;
    private String time;

    @ManyToOne
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @ManyToOne
    @JoinColumn(name = "faculty_id")
    private Faculty faculty;

    @ManyToOne
    @JoinColumn(name = "room_id")
    private Room room;

    @ManyToOne
    @JoinColumn(name = "batch_id")
    private PracticalBatch batch;

    public TimetableEntry() {
    }

    public TimetableEntry(Long id,
                          String year,
                          String branch,
                          String day,
                          int period,
                          String time,
                          Subject subject,
                          Faculty faculty,
                          Room room,
                          PracticalBatch batch) {

        this.id = id;
        this.year = year;
        this.branch = branch;
        this.day = day;
        this.period = period;
        this.time = time;
        this.subject = subject;
        this.faculty = faculty;
        this.room = room;
        this.batch = batch;
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

    public String getTime() {
        return time;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public Subject getSubject() {
        return subject;
    }

    public void setSubject(Subject subject) {
        this.subject = subject;
    }

    public Faculty getFaculty() {
        return faculty;
    }

    public void setFaculty(Faculty faculty) {
        this.faculty = faculty;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public PracticalBatch getBatch() {
        return batch;
    }

    public void setBatch(PracticalBatch batch) {
        this.batch = batch;
    }
}