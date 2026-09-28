package in.sd.smarttimetablebackend.repository;

import in.sd.smarttimetablebackend.model.PracticalBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PracticalBatchRepository extends JpaRepository<PracticalBatch, Long> {
    Optional<PracticalBatch> findByName(String name);
}
