package in.sd.smarttimetablebackend.repository;

import in.sd.smarttimetablebackend.model.SavedTimetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavedTimetableRepository extends JpaRepository<SavedTimetable, Long> {
    List<SavedTimetable> findAllByOrderByCreatedAtDesc();
}
