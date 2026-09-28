package in.sd.smarttimetablebackend.service;

import in.sd.smarttimetablebackend.model.Timetable;
import in.sd.smarttimetablebackend.model.TimetableGenerationRequest;
import in.sd.smarttimetablebackend.model.TimetableStatus;
import in.sd.smarttimetablebackend.model.FixedSlot;
import in.sd.smarttimetablebackend.model.TimetableEntry;
import in.sd.smarttimetablebackend.model.Subject;
import in.sd.smarttimetablebackend.model.Faculty;
import in.sd.smarttimetablebackend.model.FacultyUnavailability;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class TimetableGenerator {

    public Timetable generate(TimetableGenerationRequest request) {
        if (request == null || request.getConfig() == null) {
            return new Timetable(null, "SY", "IT", TimetableStatus.NOT_STARTED);
        }

        List<Slot> slots = createSlots(request);
        List<FixedSlot> fixedSlots = request.getFixedSlots() != null 
                ? request.getFixedSlots() 
                : new ArrayList<>();

        slots.removeIf(slot -> isFixedSlot(slot, fixedSlots));

        Timetable timetable = new Timetable(
                null,
                request.getConfig().getYear(),
                request.getConfig().getBranch(),
                TimetableStatus.IN_PROGRESS
        );

        addFixedEntries(timetable, fixedSlots, request);

        scheduleTheorySubjects(
                timetable,
                request,
                slots
        );

        return timetable;
    }

    private List<Slot> createSlots(TimetableGenerationRequest request) {
        List<Slot> slots = new ArrayList<>();

        List<String> days = request.getConfig().getWorkingDays();
        List<String> timings = request.getConfig().getPeriodTimings();
        int periodsPerDay = request.getConfig().getPeriodsPerDay();

        if (days == null || timings == null || periodsPerDay <= 0) {
            return slots;
        }

        for (String day : days) {
            for (int period = 1; period <= periodsPerDay && period <= timings.size(); period++) {
                String time = timings.get(period - 1);
                slots.add(new Slot(day, period, time));
            }
        }

        return slots;
    }

    private boolean isFixedSlot(Slot slot, List<FixedSlot> fixedSlots) {
        if (fixedSlots == null) {
            return false;
        }

        for (FixedSlot fixedSlot : fixedSlots) {
            if (fixedSlot.getDay() != null 
                    && fixedSlot.getDay().equalsIgnoreCase(slot.getDay())
                    && fixedSlot.getPeriod() == slot.getPeriod()) {
                return true;
            }
        }

        return false;
    }

    private void addFixedEntries(
            Timetable timetable,
            List<FixedSlot> fixedSlots,
            TimetableGenerationRequest request) {

        if (fixedSlots == null) {
            return;
        }

        for (FixedSlot fixedSlot : fixedSlots) {
            String time = getTimeForPeriod(request, fixedSlot.getPeriod());
            Subject fixedSub = fixedSlot.getSubject();
            Faculty fixedFac = (fixedSub != null) ? fixedSub.getFaculty() : null;

            TimetableEntry entry = new TimetableEntry(
                    null,
                    timetable.getYear(),
                    timetable.getBranch(),
                    fixedSlot.getDay(),
                    fixedSlot.getPeriod(),
                    time,
                    fixedSub,
                    fixedFac,
                    null,
                    null
            );

            timetable.addEntry(entry);
        }
    }

    private String getTimeForPeriod(TimetableGenerationRequest request, int period) {
        List<String> timings = request.getConfig().getPeriodTimings();
        if (timings != null && period >= 1 && period <= timings.size()) {
            return timings.get(period - 1);
        }
        return "Period " + period;
    }

    private void scheduleTheorySubjects(
            Timetable timetable,
            TimetableGenerationRequest request,
            List<Slot> availableSlots) {

        if (request.getSubjects() == null) {
            return;
        }

        List<Subject> theorySubjects = new ArrayList<>();

        for (Subject subject : request.getSubjects()) {
            if (subject != null && subject.isTheory()) {
                theorySubjects.add(subject);
            }
        }

        for (Subject subject : theorySubjects) {
            int alreadyScheduled = countSubjectOccurrences(subject, timetable);
            int periodsNeeded = subject.getWeeklyPeriods() - alreadyScheduled;

            if (periodsNeeded <= 0) {
                continue;
            }

            for (int i = 0; i < periodsNeeded; i++) {
                Slot slot = findAvailableFacultySlot(
                        subject,
                        availableSlots,
                        request,
                        timetable
                );

                if (slot == null) {
                    // No valid slot found without violating constraints for this period
                    break;
                }

                availableSlots.remove(slot);

                Faculty faculty = findFacultyForSubject(subject, request);

                TimetableEntry entry = new TimetableEntry(
                        null,
                        timetable.getYear(),
                        timetable.getBranch(),
                        slot.getDay(),
                        slot.getPeriod(),
                        slot.getTime(),
                        subject,
                        faculty,
                        null,
                        null
                );

                timetable.addEntry(entry);
            }
        }
    }

    private boolean isFacultyAvailable(
            Subject subject,
            Slot slot,
            List<FacultyUnavailability> unavailableSlots) {

        if (subject.getFaculty() == null || unavailableSlots == null) {
            return true;
        }

        Faculty subjectFaculty = subject.getFaculty();

        for (FacultyUnavailability unavailable : unavailableSlots) {
            if (unavailable == null || unavailable.getFaculty() == null || unavailable.getDay() == null) {
                continue;
            }

            boolean matchId = unavailable.getFaculty().getId() != null
                    && subjectFaculty.getId() != null
                    && unavailable.getFaculty().getId().equals(subjectFaculty.getId());

            boolean matchName = unavailable.getFaculty().getName() != null
                    && subjectFaculty.getName() != null
                    && unavailable.getFaculty().getName().equalsIgnoreCase(subjectFaculty.getName());

            if ((matchId || matchName)
                    && unavailable.getDay().equalsIgnoreCase(slot.getDay())
                    && unavailable.getPeriod() == slot.getPeriod()) {
                return false;
            }
        }

        return true;
    }

    private Slot findAvailableFacultySlot(
            Subject subject,
            List<Slot> availableSlots,
            TimetableGenerationRequest request,
            Timetable timetable) {

        for (Slot slot : availableSlots) {
            boolean facultyAvailable = isFacultyAvailable(
                    subject,
                    slot,
                    request.getFacultyUnavailability()
            );

            boolean subjectAlreadyOnDay = isSubjectAlreadyOnDay(
                    subject,
                    slot,
                    timetable
            );

            boolean facultyBusy = isFacultyBusy(
                    subject,
                    slot,
                    timetable
            );

            if (facultyAvailable && !facultyBusy && !subjectAlreadyOnDay) {
                return slot;
            }
        }

        return null;
    }

    private boolean isFacultyBusy(
            Subject subject,
            Slot slot,
            Timetable timetable) {

        if (subject.getFaculty() == null || timetable.getEntries() == null) {
            return false;
        }

        Faculty subjectFaculty = subject.getFaculty();

        for (TimetableEntry entry : timetable.getEntries()) {
            if (entry == null || entry.getFaculty() == null || entry.getDay() == null) {
                continue;
            }

            boolean matchId = entry.getFaculty().getId() != null
                    && subjectFaculty.getId() != null
                    && entry.getFaculty().getId().equals(subjectFaculty.getId());

            boolean matchName = entry.getFaculty().getName() != null
                    && subjectFaculty.getName() != null
                    && entry.getFaculty().getName().equalsIgnoreCase(subjectFaculty.getName());

            if (entry.getDay().equalsIgnoreCase(slot.getDay())
                    && entry.getPeriod() == slot.getPeriod()
                    && (matchId || matchName)) {
                return true;
            }
        }

        return false;
    }

    private boolean isSubjectAlreadyOnDay(
            Subject subject,
            Slot slot,
            Timetable timetable) {

        if (timetable.getEntries() == null || subject == null) {
            return false;
        }

        for (TimetableEntry entry : timetable.getEntries()) {
            if (entry == null || entry.getSubject() == null || entry.getDay() == null) {
                continue;
            }

            boolean matchId = entry.getSubject().getId() != null
                    && subject.getId() != null
                    && entry.getSubject().getId().equals(subject.getId());

            boolean matchCode = entry.getSubject().getCode() != null
                    && subject.getCode() != null
                    && entry.getSubject().getCode().equalsIgnoreCase(subject.getCode());

            if ((matchId || matchCode) && entry.getDay().equalsIgnoreCase(slot.getDay())) {
                return true;
            }
        }

        return false;
    }

    private int countSubjectOccurrences(
            Subject subject,
            Timetable timetable) {

        if (timetable.getEntries() == null || subject == null) {
            return 0;
        }

        int count = 0;

        for (TimetableEntry entry : timetable.getEntries()) {
            if (entry == null || entry.getSubject() == null) {
                continue;
            }

            boolean matchId = entry.getSubject().getId() != null
                    && subject.getId() != null
                    && entry.getSubject().getId().equals(subject.getId());

            boolean matchCode = entry.getSubject().getCode() != null
                    && subject.getCode() != null
                    && entry.getSubject().getCode().equalsIgnoreCase(subject.getCode());

            if (matchId || matchCode) {
                count++;
            }
        }

        return count;
    }

    private Faculty findFacultyForSubject(
            Subject subject,
            TimetableGenerationRequest request) {

        if (subject == null || subject.getFaculty() == null) {
            return null;
        }

        Faculty assignedFaculty = subject.getFaculty();

        if (request.getFaculties() != null) {
            for (Faculty faculty : request.getFaculties()) {
                if (faculty == null) continue;

                boolean matchId = faculty.getId() != null
                        && assignedFaculty.getId() != null
                        && faculty.getId().equals(assignedFaculty.getId());

                boolean matchName = faculty.getName() != null
                        && assignedFaculty.getName() != null
                        && faculty.getName().equalsIgnoreCase(assignedFaculty.getName());

                if (matchId || matchName) {
                    return faculty;
                }
            }
        }

        return assignedFaculty;
    }
}