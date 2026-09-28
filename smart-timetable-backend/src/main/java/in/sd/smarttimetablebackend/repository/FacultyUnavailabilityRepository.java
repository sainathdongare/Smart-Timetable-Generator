package in.sd.smarttimetablebackend.repository;

import in.sd.smarttimetablebackend.model.FacultyUnavailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FacultyUnavailabilityRepository extends JpaRepository<FacultyUnavailability, Long> {
    List<FacultyUnavailability> findByFacultyId(Long facultyId);
    List<FacultyUnavailability> findByDay(String day);
}
