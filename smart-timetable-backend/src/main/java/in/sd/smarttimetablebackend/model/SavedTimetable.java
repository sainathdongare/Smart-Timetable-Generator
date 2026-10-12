package in.sd.smarttimetablebackend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "saved_timetables")
public class SavedTimetable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Lob
    @Column(nullable = false)
    private String timetableData;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public SavedTimetable() {}

    public SavedTimetable(String name, String timetableData) {
        this.name = name;
        this.timetableData = timetableData;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public String getTimetableData() {
        return timetableData;
    }

    public void setTimetableData(String timetableData) {
        this.timetableData = timetableData;
    }
}
