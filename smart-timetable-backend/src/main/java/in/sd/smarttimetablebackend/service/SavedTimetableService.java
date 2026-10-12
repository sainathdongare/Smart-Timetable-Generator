package in.sd.smarttimetablebackend.service;

import in.sd.smarttimetablebackend.model.SavedTimetable;
import in.sd.smarttimetablebackend.repository.SavedTimetableRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SavedTimetableService {

    private final SavedTimetableRepository repository;

    public SavedTimetableService(SavedTimetableRepository repository) {
        this.repository = repository;
    }

    public SavedTimetable saveTimetable(SavedTimetable savedTimetable) {
        return repository.save(savedTimetable);
    }

    public List<SavedTimetable> getAllSavedTimetables() {
        return repository.findAllByOrderByCreatedAtDesc();
    }

    public Optional<SavedTimetable> getSavedTimetableById(Long id) {
        return repository.findById(id);
    }

    public void deleteSavedTimetable(Long id) {
        repository.deleteById(id);
    }
}
