package in.sd.smarttimetablebackend.repository;

import in.sd.smarttimetablebackend.model.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, Long> {
    List<Timetable> findAllByOrderByIdDesc();
    Optional<Timetable> findFirstByOrderByIdDesc();
}
