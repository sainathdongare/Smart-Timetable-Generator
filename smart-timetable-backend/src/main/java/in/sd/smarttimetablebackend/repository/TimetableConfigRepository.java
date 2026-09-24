package in.sd.smarttimetablebackend.repository;

import in.sd.smarttimetablebackend.model.TimetableConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TimetableConfigRepository extends JpaRepository<TimetableConfig, Long> {
    Optional<TimetableConfig> findFirstByOrderByIdDesc();
    Optional<TimetableConfig> findByYearAndBranch(String year, String branch);
}
