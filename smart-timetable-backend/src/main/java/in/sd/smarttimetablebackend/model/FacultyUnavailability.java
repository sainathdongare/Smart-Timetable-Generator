package in.sd.smarttimetablebackend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "faculty_unavailabilities")
public class FacultyUnavailability {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "faculty_id")
    private Faculty faculty;

    @Column(name = "day_of_week")
    private String day;

    @Column(name = "period_number")
    private int period;

    public FacultyUnavailability() {
    }

    public FacultyUnavailability(Long id,
                                 Faculty faculty,
                                 String day,
                                 int period) {

        this.id = id;
        this.faculty = faculty;
        this.day = day;
        this.period = period;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Faculty getFaculty() {
        return faculty;
    }

    public void setFaculty(Faculty faculty) {
        this.faculty = faculty;
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
}
