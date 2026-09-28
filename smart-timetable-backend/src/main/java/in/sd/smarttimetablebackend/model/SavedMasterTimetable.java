package in.sd.smarttimetablebackend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "saved_master_timetables")
public class SavedMasterTimetable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String department;
    private String academicYear;
    private String institute;

    @Enumerated(EnumType.STRING)
    private TimetableStatus status;

    private LocalDateTime createdAt;

    @Lob
    private String timetableJson;

    public SavedMasterTimetable() {
    }

    public SavedMasterTimetable(Long id,
                                String name,
                                String department,
                                String academicYear,
                                String institute,
                                TimetableStatus status,
                                LocalDateTime createdAt,
                                String timetableJson) {
        this.id = id;
        this.name = name;
        this.department = department;
        this.academicYear = academicYear;
        this.institute = institute;
        this.status = status;
        this.createdAt = createdAt;
        this.timetableJson = timetableJson;
    }

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = TimetableStatus.FINALIZED;
        }
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

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getAcademicYear() {
        return academicYear;
    }

    public void setAcademicYear(String academicYear) {
        this.academicYear = academicYear;
    }

    public String getInstitute() {
        return institute;
    }

    public void setInstitute(String institute) {
        this.institute = institute;
    }

    public TimetableStatus getStatus() {
        return status;
    }

    public void setStatus(TimetableStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getTimetableJson() {
        return timetableJson;
    }

    public void setTimetableJson(String timetableJson) {
        this.timetableJson = timetableJson;
    }
}
