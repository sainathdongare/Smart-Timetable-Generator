package in.sd.smarttimetablebackend.controller;

import in.sd.smarttimetablebackend.model.Timetable;
import in.sd.smarttimetablebackend.model.TimetableGenerationRequest;
import in.sd.smarttimetablebackend.service.TimetableService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/timetable")
@CrossOrigin(origins = "http://localhost:5173")
public class TimetableController {

    private final TimetableService timetableService;

    public TimetableController(TimetableService timetableService) {
        this.timetableService = timetableService;
    }

    @GetMapping("/hello")
    public String hello() {
        return "Smart Timetable Backend is running!";
    }

    @PostMapping("/generate")
    public Timetable generateTimetable(
            @RequestBody TimetableGenerationRequest request) {
        return timetableService.generateTimetable(request);
    }

    @PostMapping("/master/generate")
    public ResponseEntity<in.sd.smarttimetablebackend.model.MasterTimetableResponse> generateMasterTimetable(
            @RequestBody in.sd.smarttimetablebackend.model.MasterTimetableRequest request) {
        in.sd.smarttimetablebackend.model.MasterTimetableResponse response = timetableService.generateMasterTimetable(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/save")
    public ResponseEntity<Timetable> saveTimetable(@RequestBody Timetable timetable) {
        Timetable saved = timetableService.saveTimetable(timetable);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/latest")
    public ResponseEntity<Timetable> getLatestTimetable() {
        return timetableService.getLatestTimetable()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/all")
    public ResponseEntity<List<Timetable>> getAllTimetables() {
        return ResponseEntity.ok(timetableService.getAllTimetables());
    }

    @PostMapping("/master/save")
    public ResponseEntity<in.sd.smarttimetablebackend.model.SavedMasterTimetable> saveMasterTimetable(
            @RequestBody in.sd.smarttimetablebackend.model.MasterTimetableResponse response,
            @RequestParam(required = false) String name) {
        in.sd.smarttimetablebackend.model.SavedMasterTimetable saved = timetableService.saveMasterTimetable(response, name);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/master/latest")
    public ResponseEntity<in.sd.smarttimetablebackend.model.SavedMasterTimetable> getLatestMasterTimetable() {
        return timetableService.getLatestSavedMasterTimetable()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/master/all")
    public ResponseEntity<List<in.sd.smarttimetablebackend.model.SavedMasterTimetable>> getAllMasterTimetables() {
        return ResponseEntity.ok(timetableService.getAllSavedMasterTimetables());
    }

    @GetMapping("/master/{id}")
    public ResponseEntity<in.sd.smarttimetablebackend.model.SavedMasterTimetable> getMasterTimetableById(@PathVariable Long id) {
        return timetableService.getSavedMasterTimetableById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/master/{id}")
    public ResponseEntity<Void> deleteMasterTimetable(@PathVariable Long id) {
        timetableService.deleteSavedMasterTimetable(id);
        return ResponseEntity.noContent().build();
    }

    // --- Resource & Constraint Endpoints ---

    @GetMapping("/resources/faculties")
    public ResponseEntity<List<in.sd.smarttimetablebackend.model.Faculty>> getFaculties() {
        return ResponseEntity.ok(timetableService.getAllFaculties());
    }

    @PostMapping("/resources/faculties")
    public ResponseEntity<in.sd.smarttimetablebackend.model.Faculty> saveFaculty(
            @RequestBody in.sd.smarttimetablebackend.model.Faculty faculty) {
        return ResponseEntity.ok(timetableService.saveFaculty(faculty));
    }

    @GetMapping("/resources/rooms")
    public ResponseEntity<List<in.sd.smarttimetablebackend.model.Room>> getRooms() {
        return ResponseEntity.ok(timetableService.getAllRooms());
    }

    @PostMapping("/resources/rooms")
    public ResponseEntity<in.sd.smarttimetablebackend.model.Room> saveRoom(
            @RequestBody in.sd.smarttimetablebackend.model.Room room) {
        return ResponseEntity.ok(timetableService.saveRoom(room));
    }

    @GetMapping("/resources/subjects")
    public ResponseEntity<List<in.sd.smarttimetablebackend.model.Subject>> getSubjects() {
        return ResponseEntity.ok(timetableService.getAllSubjects());
    }

    @PostMapping("/resources/subjects")
    public ResponseEntity<in.sd.smarttimetablebackend.model.Subject> saveSubject(
            @RequestBody in.sd.smarttimetablebackend.model.Subject subject) {
        return ResponseEntity.ok(timetableService.saveSubject(subject));
    }

    @GetMapping("/resources/batches")
    public ResponseEntity<List<in.sd.smarttimetablebackend.model.PracticalBatch>> getBatches() {
        return ResponseEntity.ok(timetableService.getAllBatches());
    }

    @PostMapping("/resources/batches")
    public ResponseEntity<in.sd.smarttimetablebackend.model.PracticalBatch> saveBatch(
            @RequestBody in.sd.smarttimetablebackend.model.PracticalBatch batch) {
        return ResponseEntity.ok(timetableService.saveBatch(batch));
    }

    @GetMapping("/constraints/unavailability")
    public ResponseEntity<List<in.sd.smarttimetablebackend.model.FacultyUnavailability>> getFacultyUnavailabilities() {
        return ResponseEntity.ok(timetableService.getAllFacultyUnavailabilities());
    }

    @PostMapping("/constraints/unavailability")
    public ResponseEntity<List<in.sd.smarttimetablebackend.model.FacultyUnavailability>> saveFacultyUnavailabilities(
            @RequestBody List<in.sd.smarttimetablebackend.model.FacultyUnavailability> list) {
        return ResponseEntity.ok(timetableService.saveFacultyUnavailabilities(list));
    }

    @GetMapping("/constraints/fixed-slots")
    public ResponseEntity<List<in.sd.smarttimetablebackend.model.FixedSlot>> getFixedSlots() {
        return ResponseEntity.ok(timetableService.getAllFixedSlots());
    }

    @PostMapping("/constraints/fixed-slots")
    public ResponseEntity<List<in.sd.smarttimetablebackend.model.FixedSlot>> saveFixedSlots(
            @RequestBody List<in.sd.smarttimetablebackend.model.FixedSlot> list) {
        return ResponseEntity.ok(timetableService.saveFixedSlots(list));
    }

    @GetMapping("/config")
    public ResponseEntity<in.sd.smarttimetablebackend.model.TimetableConfig> getConfig() {
        return timetableService.getLatestTimetableConfig()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/config")
    public ResponseEntity<in.sd.smarttimetablebackend.model.TimetableConfig> saveConfig(
            @RequestBody in.sd.smarttimetablebackend.model.TimetableConfig config) {
        return ResponseEntity.ok(timetableService.saveTimetableConfig(config));
    }
}