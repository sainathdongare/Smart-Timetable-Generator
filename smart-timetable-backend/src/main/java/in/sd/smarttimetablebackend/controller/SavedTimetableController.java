package in.sd.smarttimetablebackend.controller;

import in.sd.smarttimetablebackend.model.SavedTimetable;
import in.sd.smarttimetablebackend.service.SavedTimetableService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/saved-timetables")
public class SavedTimetableController {

    private final SavedTimetableService service;

    public SavedTimetableController(SavedTimetableService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<SavedTimetable> saveTimetable(@RequestBody SavedTimetable request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (request.getTimetableData() == null || request.getTimetableData().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        SavedTimetable saved = service.saveTimetable(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public ResponseEntity<List<SavedTimetable>> getAllSavedTimetables() {
        return ResponseEntity.ok(service.getAllSavedTimetables());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SavedTimetable> getSavedTimetableById(@PathVariable Long id) {
        Optional<SavedTimetable> timetable = service.getSavedTimetableById(id);
        return timetable.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSavedTimetable(@PathVariable Long id) {
        service.deleteSavedTimetable(id);
        return ResponseEntity.noContent().build();
    }
}
