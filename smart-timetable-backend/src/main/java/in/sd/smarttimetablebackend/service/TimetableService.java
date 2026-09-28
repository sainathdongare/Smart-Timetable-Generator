package in.sd.smarttimetablebackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.sd.smarttimetablebackend.model.*;
import in.sd.smarttimetablebackend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class TimetableService {

    private final TimetableGenerator timetableGenerator;
    private final MasterTimetableGenerator masterTimetableGenerator;
    private final TimetableRepository timetableRepository;
    private final SubjectRepository subjectRepository;
    private final FacultyRepository facultyRepository;
    private final RoomRepository roomRepository;
    private final PracticalBatchRepository practicalBatchRepository;
    private final FacultyUnavailabilityRepository facultyUnavailabilityRepository;
    private final FixedSlotRepository fixedSlotRepository;
    private final TimetableConfigRepository timetableConfigRepository;
    private final SavedMasterTimetableRepository savedMasterTimetableRepository;
    private final ObjectMapper objectMapper;

    public TimetableService(TimetableGenerator timetableGenerator,
                            MasterTimetableGenerator masterTimetableGenerator,
                            TimetableRepository timetableRepository,
                            SubjectRepository subjectRepository,
                            FacultyRepository facultyRepository,
                            RoomRepository roomRepository,
                            PracticalBatchRepository practicalBatchRepository,
                            FacultyUnavailabilityRepository facultyUnavailabilityRepository,
                            FixedSlotRepository fixedSlotRepository,
                            TimetableConfigRepository timetableConfigRepository,
                            SavedMasterTimetableRepository savedMasterTimetableRepository,
                            ObjectMapper objectMapper) {
        this.timetableGenerator = timetableGenerator;
        this.masterTimetableGenerator = masterTimetableGenerator;
        this.timetableRepository = timetableRepository;
        this.subjectRepository = subjectRepository;
        this.facultyRepository = facultyRepository;
        this.roomRepository = roomRepository;
        this.practicalBatchRepository = practicalBatchRepository;
        this.facultyUnavailabilityRepository = facultyUnavailabilityRepository;
        this.fixedSlotRepository = fixedSlotRepository;
        this.timetableConfigRepository = timetableConfigRepository;
        this.savedMasterTimetableRepository = savedMasterTimetableRepository;
        this.objectMapper = objectMapper;
    }

    public MasterTimetableResponse generateMasterTimetable(MasterTimetableRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Master timetable generation request cannot be null");
        }
        return masterTimetableGenerator.generate(request);
    }

    public Timetable generateTimetable(TimetableGenerationRequest request) {
        if (request == null) {
            throw new IllegalArgumentException(
                    "Timetable generation request cannot be null"
            );
        }

        if (request.getConfig() == null) {
            throw new IllegalArgumentException(
                    "Timetable configuration is required"
            );
        }

        return timetableGenerator.generate(request);
    }

    @Transactional
    public Timetable saveTimetable(Timetable timetable) {
        if (timetable == null) {
            throw new IllegalArgumentException("Timetable cannot be null");
        }

        java.util.Map<Long, in.sd.smarttimetablebackend.model.Faculty> facultyMap = new java.util.HashMap<>();
        java.util.Map<Long, in.sd.smarttimetablebackend.model.Subject> subjectMap = new java.util.HashMap<>();
        java.util.Map<Long, in.sd.smarttimetablebackend.model.Room> roomMap = new java.util.HashMap<>();
        java.util.Map<Long, in.sd.smarttimetablebackend.model.PracticalBatch> batchMap = new java.util.HashMap<>();

        if (timetable.getEntries() != null) {
            // 1. Collect and persist distinct faculties
            for (TimetableEntry entry : timetable.getEntries()) {
                if (entry.getFaculty() != null) {
                    in.sd.smarttimetablebackend.model.Faculty f = entry.getFaculty();
                    Long key = f.getId() != null ? f.getId() : (long) f.getName().hashCode();
                    facultyMap.putIfAbsent(key, f);
                }
                if (entry.getSubject() != null && entry.getSubject().getFaculty() != null) {
                    in.sd.smarttimetablebackend.model.Faculty f = entry.getSubject().getFaculty();
                    Long key = f.getId() != null ? f.getId() : (long) f.getName().hashCode();
                    facultyMap.putIfAbsent(key, f);
                }
            }
            for (java.util.Map.Entry<Long, in.sd.smarttimetablebackend.model.Faculty> e : facultyMap.entrySet()) {
                in.sd.smarttimetablebackend.model.Faculty f = e.getValue();
                in.sd.smarttimetablebackend.model.Faculty managed = facultyRepository.findByName(f.getName()).orElseGet(() -> {
                    in.sd.smarttimetablebackend.model.Faculty newF = new in.sd.smarttimetablebackend.model.Faculty(null, f.getName());
                    return facultyRepository.save(newF);
                });
                e.setValue(managed);
            }

            // 2. Collect and persist distinct subjects with managed faculty references
            for (TimetableEntry entry : timetable.getEntries()) {
                if (entry.getSubject() != null) {
                    in.sd.smarttimetablebackend.model.Subject s = entry.getSubject();
                    Long key = s.getId() != null ? s.getId() : (long) s.getCode().hashCode();
                    subjectMap.putIfAbsent(key, s);
                }
            }
            for (java.util.Map.Entry<Long, in.sd.smarttimetablebackend.model.Subject> e : subjectMap.entrySet()) {
                in.sd.smarttimetablebackend.model.Subject s = e.getValue();
                in.sd.smarttimetablebackend.model.Subject managed = subjectRepository.findByCode(s.getCode()).orElseGet(() -> {
                    in.sd.smarttimetablebackend.model.Faculty fRef = null;
                    if (s.getFaculty() != null) {
                        Long fKey = s.getFaculty().getId() != null ? s.getFaculty().getId() : (long) s.getFaculty().getName().hashCode();
                        fRef = facultyMap.get(fKey);
                    }
                    in.sd.smarttimetablebackend.model.Subject newS = new in.sd.smarttimetablebackend.model.Subject(null, s.getCode(), s.getName(), s.getType(), s.getWeeklyPeriods(), fRef);
                    return subjectRepository.save(newS);
                });
                e.setValue(managed);
            }

            // 3. Collect and persist distinct rooms
            for (TimetableEntry entry : timetable.getEntries()) {
                if (entry.getRoom() != null) {
                    in.sd.smarttimetablebackend.model.Room r = entry.getRoom();
                    Long key = r.getId() != null ? r.getId() : (long) r.getName().hashCode();
                    roomMap.putIfAbsent(key, r);
                }
            }
            for (java.util.Map.Entry<Long, in.sd.smarttimetablebackend.model.Room> e : roomMap.entrySet()) {
                in.sd.smarttimetablebackend.model.Room r = e.getValue();
                in.sd.smarttimetablebackend.model.Room managed = roomRepository.findByName(r.getName()).orElseGet(() -> {
                    in.sd.smarttimetablebackend.model.Room newR = new in.sd.smarttimetablebackend.model.Room(null, r.getName(), r.getType());
                    return roomRepository.save(newR);
                });
                e.setValue(managed);
            }

            // 4. Collect and persist distinct batches
            for (TimetableEntry entry : timetable.getEntries()) {
                if (entry.getBatch() != null) {
                    in.sd.smarttimetablebackend.model.PracticalBatch b = entry.getBatch();
                    Long key = b.getId() != null ? b.getId() : (long) b.getName().hashCode();
                    batchMap.putIfAbsent(key, b);
                }
            }
            for (java.util.Map.Entry<Long, in.sd.smarttimetablebackend.model.PracticalBatch> e : batchMap.entrySet()) {
                in.sd.smarttimetablebackend.model.PracticalBatch b = e.getValue();
                in.sd.smarttimetablebackend.model.PracticalBatch managed = practicalBatchRepository.findByName(b.getName()).orElseGet(() -> {
                    in.sd.smarttimetablebackend.model.PracticalBatch newB = new in.sd.smarttimetablebackend.model.PracticalBatch(null, b.getName(), b.getYear(), b.getBranch());
                    return practicalBatchRepository.save(newB);
                });
                e.setValue(managed);
            }

            // 5. Update entry references to point to managed persisted entities and reset id
            for (TimetableEntry entry : timetable.getEntries()) {
                entry.setId(null);
                if (entry.getSubject() != null) {
                    Long key = entry.getSubject().getId() != null ? entry.getSubject().getId() : (long) entry.getSubject().getCode().hashCode();
                    entry.setSubject(subjectMap.get(key));
                }
                if (entry.getFaculty() != null) {
                    Long key = entry.getFaculty().getId() != null ? entry.getFaculty().getId() : (long) entry.getFaculty().getName().hashCode();
                    entry.setFaculty(facultyMap.get(key));
                }
                if (entry.getRoom() != null) {
                    Long key = entry.getRoom().getId() != null ? entry.getRoom().getId() : (long) entry.getRoom().getName().hashCode();
                    entry.setRoom(roomMap.get(key));
                }
                if (entry.getBatch() != null) {
                    Long key = entry.getBatch().getId() != null ? entry.getBatch().getId() : (long) entry.getBatch().getName().hashCode();
                    entry.setBatch(batchMap.get(key));
                }
            }
        }

        timetable.setId(null);
        return timetableRepository.save(timetable);
    }

    public Optional<Timetable> getLatestTimetable() {
        return timetableRepository.findFirstByOrderByIdDesc();
    }

    public List<Timetable> getAllTimetables() {
        return timetableRepository.findAllByOrderByIdDesc();
    }

    public Optional<Timetable> getTimetableById(Long id) {
        return timetableRepository.findById(id);
    }

    // --- Saved Master Timetables ---

    @Transactional
    public SavedMasterTimetable saveMasterTimetable(MasterTimetableResponse response, String customName) {
        if (response == null) {
            throw new IllegalArgumentException("Master timetable response cannot be null");
        }

        String jsonPayload;
        try {
            jsonPayload = objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize master timetable to JSON", e);
        }

        String name = (customName != null && !customName.trim().isEmpty())
                ? customName.trim()
                : (response.getDepartment() != null ? response.getDepartment() : "Department") + " - " +
                  (response.getAcademicYear() != null && !response.getAcademicYear().isEmpty() ? response.getAcademicYear() : "Master Schedule");

        SavedMasterTimetable record = new SavedMasterTimetable(
                null,
                name,
                response.getDepartment(),
                response.getAcademicYear(),
                response.getInstitute(),
                response.getStatus(),
                java.time.LocalDateTime.now(),
                jsonPayload
        );

        return savedMasterTimetableRepository.save(record);
    }

    public Optional<SavedMasterTimetable> getLatestSavedMasterTimetable() {
        return savedMasterTimetableRepository.findFirstByOrderByIdDesc();
    }

    public List<SavedMasterTimetable> getAllSavedMasterTimetables() {
        return savedMasterTimetableRepository.findAllByOrderByIdDesc();
    }

    public Optional<SavedMasterTimetable> getSavedMasterTimetableById(Long id) {
        return savedMasterTimetableRepository.findById(id);
    }

    @Transactional
    public void deleteSavedMasterTimetable(Long id) {
        savedMasterTimetableRepository.deleteById(id);
    }

    // --- Resources ---

    public List<Faculty> getAllFaculties() {
        return facultyRepository.findAll();
    }

    @Transactional
    public Faculty saveFaculty(Faculty faculty) {
        return facultyRepository.save(faculty);
    }

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    @Transactional
    public Room saveRoom(Room room) {
        return roomRepository.save(room);
    }

    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }

    @Transactional
    public Subject saveSubject(Subject subject) {
        return subjectRepository.save(subject);
    }

    public List<PracticalBatch> getAllBatches() {
        return practicalBatchRepository.findAll();
    }

    @Transactional
    public PracticalBatch saveBatch(PracticalBatch batch) {
        return practicalBatchRepository.save(batch);
    }

    // --- Constraints & Configurations ---

    public List<FacultyUnavailability> getAllFacultyUnavailabilities() {
        return facultyUnavailabilityRepository.findAll();
    }

    @Transactional
    public List<FacultyUnavailability> saveFacultyUnavailabilities(List<FacultyUnavailability> unavailabilities) {
        if (unavailabilities == null) return List.of();
        return facultyUnavailabilityRepository.saveAll(unavailabilities);
    }

    public List<FixedSlot> getAllFixedSlots() {
        return fixedSlotRepository.findAll();
    }

    @Transactional
    public List<FixedSlot> saveFixedSlots(List<FixedSlot> fixedSlots) {
        if (fixedSlots == null) return List.of();
        return fixedSlotRepository.saveAll(fixedSlots);
    }

    public Optional<TimetableConfig> getLatestTimetableConfig() {
        return timetableConfigRepository.findFirstByOrderByIdDesc();
    }

    @Transactional
    public TimetableConfig saveTimetableConfig(TimetableConfig config) {
        return timetableConfigRepository.save(config);
    }
}