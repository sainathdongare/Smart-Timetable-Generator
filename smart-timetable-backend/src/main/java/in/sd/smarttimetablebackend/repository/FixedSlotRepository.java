package in.sd.smarttimetablebackend.repository;

import in.sd.smarttimetablebackend.model.FixedSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FixedSlotRepository extends JpaRepository<FixedSlot, Long> {
    List<FixedSlot> findByYear(String year);
    List<FixedSlot> findByYearAndBranch(String year, String branch);
}
