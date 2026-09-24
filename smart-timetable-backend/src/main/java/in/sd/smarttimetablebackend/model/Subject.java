package in.sd.smarttimetablebackend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "subjects")
public class Subject {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code;
    private String name;
    private String type;

    private int weeklyPeriods;

    @ManyToOne
    @JoinColumn(name = "faculty_id")
    private Faculty faculty;

    public Subject() {
    }

    public Subject(Long id,
                   String code,
                   String name,
                   String type,
                   int weeklyPeriods,
                   Faculty faculty) {

        this.id = id;
        this.code = code;
        this.name = name;
        this.type = type;
        this.weeklyPeriods = weeklyPeriods;
        this.faculty = faculty;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public int getWeeklyPeriods() {
        return weeklyPeriods;
    }

    public void setWeeklyPeriods(int weeklyPeriods) {
        this.weeklyPeriods = weeklyPeriods;
    }

    public Faculty getFaculty() {
        return faculty;
    }

    public void setFaculty(Faculty faculty) {
        this.faculty = faculty;
    }

    public boolean isTheory() {
        return "THEORY".equalsIgnoreCase(type);
    }

    public boolean isPractical() {
        return "PRACTICAL".equalsIgnoreCase(type);
    }
}
