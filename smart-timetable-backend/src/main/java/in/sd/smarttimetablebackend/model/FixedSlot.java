package in.sd.smarttimetablebackend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "fixed_slots")
public class FixedSlot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "day_of_week")
    private String day;

    @Column(name = "period_number")
    private int period;

    @ManyToOne
    @JoinColumn(name = "subject_id")
    private Subject subject;

    private String courseName;
    private String facultyName;
    private String room;
    private String subjectCode;

    @Column(name = "academic_year")
    private String year;
    private String branch;

    public FixedSlot() {
    }

    public FixedSlot(Long id,
                     String day,
                     int period,
                     Subject subject) {

        this.id = id;
        this.day = day;
        this.period = period;
        this.subject = subject;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Subject getSubject() {
        return subject;
    }

    public void setSubject(Subject subject) {
        this.subject = subject;
    }

    public String getCourseName() {
        if (courseName != null && !courseName.isEmpty()) return courseName;
        if (subject != null) {
            return subject.getName() != null ? subject.getName() : subject.getCode();
        }
        return null;
    }

    public void setCourseName(String courseName) {
        this.courseName = courseName;
    }

    public String getFacultyName() {
        if (facultyName != null && !facultyName.isEmpty()) return facultyName;
        if (subject != null && subject.getFaculty() != null) {
            return subject.getFaculty().getName();
        }
        return null;
    }

    public void setFacultyName(String facultyName) {
        this.facultyName = facultyName;
    }

    public String getRoom() {
        return room;
    }

    public void setRoom(String room) {
        this.room = room;
    }

    public String getSubjectCode() {
        if (subjectCode != null && !subjectCode.isEmpty()) return subjectCode;
        if (subject != null) return subject.getCode();
        return null;
    }

    public void setSubjectCode(String subjectCode) {
        this.subjectCode = subjectCode;
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
}
