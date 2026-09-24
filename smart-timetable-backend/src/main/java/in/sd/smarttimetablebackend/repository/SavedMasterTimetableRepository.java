package in.sd.smarttimetablebackend.repository;

import in.sd.smarttimetablebackend.model.SavedMasterTimetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedMasterTimetableRepository extends JpaRepository<SavedMasterTimetable, Long> {
    Optional<SavedMasterTimetable> findFirstByOrderByIdDesc();
    List<SavedMasterTimetable> findAllByOrderByIdDesc();
}
