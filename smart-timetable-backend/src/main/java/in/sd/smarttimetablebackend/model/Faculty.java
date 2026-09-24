package in.sd.smarttimetablebackend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "faculties")
public class Faculty {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String fullName;
    private int maxDailyLectures = 4;

    public Faculty() {
    }

    public Faculty(Long id, String name) {
        this.id = id;
        this.name = name;
        this.fullName = name;
    }

    public Faculty(Long id, String name, String fullName, int maxDailyLectures) {
        this.id = id;
        this.name = name;
        this.fullName = fullName;
        this.maxDailyLectures = maxDailyLectures;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public int getMaxDailyLectures() {
        return maxDailyLectures > 0 ? maxDailyLectures : 4;
    }

    public void setMaxDailyLectures(int maxDailyLectures) {
        this.maxDailyLectures = maxDailyLectures;
    }
}
