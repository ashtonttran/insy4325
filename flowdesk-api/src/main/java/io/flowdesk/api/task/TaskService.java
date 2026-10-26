package io.flowdesk.api.task;

import io.flowdesk.api.calendar.Calendar;
import io.flowdesk.api.calendar.CalendarRepository;
import io.flowdesk.api.common.NotFoundException;
import io.flowdesk.api.note.NoteLink;
import io.flowdesk.api.note.NoteLinkRepository;
import io.flowdesk.api.notebook.Notebook;
import io.flowdesk.api.notebook.NotebookRepository;
import io.flowdesk.api.task.dto.StatusRequest;
import io.flowdesk.api.task.dto.TaskRequest;
import io.flowdesk.api.task.dto.TaskResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/** Business logic for tasks and their subtasks. */
@Service
public class TaskService {

    private static final Set<String> STATUSES = Set.of("TODO", "IN_PROGRESS", "DONE");
    private static final Set<String> PRIORITIES = Set.of("LOW", "MEDIUM", "HIGH");
    private static final Set<String> RECURRENCES =
            Set.of("NONE", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY", "EVERY_N_DAYS");

    private final TaskRepository tasks;
    private final NotebookRepository notebooks;
    private final CalendarRepository calendars;
    private final NoteLinkRepository noteLinks;

    public TaskService(TaskRepository tasks, NotebookRepository notebooks,
                       CalendarRepository calendars, NoteLinkRepository noteLinks) {
        this.tasks = tasks;
        this.notebooks = notebooks;
        this.noteLinks = noteLinks;
        this.calendars = calendars;
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> list() {
        return tasks.findAllByOrderByUpdatedAtDesc().stream().map(TaskResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public TaskResponse get(Long id) {
        return TaskResponse.from(findOrThrow(id));
    }

    @Transactional
    public TaskResponse create(TaskRequest req) {
        Task task = new Task(
                req.title(),
                req.description(),
                normalizeStatus(req.status()),
                normalizePriority(req.priority()),
                req.dueDate(),
                resolveNotebook(req.notebookId())
        );
        task.setCalendar(resolveCalendar(req.calendarId()));
        String recurrence = normalizeRecurrence(req.recurrence());
        task.setRecurrence(recurrence);
        task.setRecurrenceInterval(normalizeInterval(req.recurrenceInterval()));
        task.setRecurrenceUntil(normalizeUntil(recurrence, req.recurrenceUntil()));
        applySubtasks(task, req);
        return TaskResponse.from(tasks.save(task));
    }

    @Transactional
    public TaskResponse update(Long id, TaskRequest req) {
        Task task = findOrThrow(id);
        task.setTitle(req.title());
        task.setDescription(req.description());
        task.setStatus(normalizeStatus(req.status()));
        task.setPriority(normalizePriority(req.priority()));
        task.setDueDate(req.dueDate());
        String recurrence = normalizeRecurrence(req.recurrence());
        task.setRecurrence(recurrence);
        task.setRecurrenceInterval(normalizeInterval(req.recurrenceInterval()));
        task.setRecurrenceUntil(normalizeUntil(recurrence, req.recurrenceUntil()));
        task.setNotebook(resolveNotebook(req.notebookId()));
        task.setCalendar(resolveCalendar(req.calendarId()));
        reconcileSubtasks(task, req);
        task.touch();
        return TaskResponse.from(tasks.save(task));
    }

    @Transactional
    public TaskResponse changeStatus(Long id, StatusRequest req) {
        Task task = findOrThrow(id);
        String next = normalizeStatus(req.status());

        // Completing a repeating task advances it to the next occurrence and
        // returns it to TODO, rather than marking it done permanently.
        boolean completingRecurring =
                "DONE".equals(next)
                        && !"NONE".equals(task.getRecurrence())
                        && task.getDueDate() != null;

        if (completingRecurring) {
            LocalDate upcoming = nextOccurrence(
                    task.getDueDate(), task.getRecurrence(), task.getRecurrenceInterval());
            LocalDate until = task.getRecurrenceUntil();
            if (until != null && upcoming.isAfter(until)) {
                // The series has reached its end date; close the task for good.
                task.setStatus("DONE");
            } else {
                task.setDueDate(upcoming);
                task.setStatus("TODO");
                // Reset subtasks for the fresh occurrence.
                task.getSubtasks().forEach(st -> st.setDone(false));
            }
        } else {
            task.setStatus(next);
        }
        task.touch();
        return TaskResponse.from(tasks.save(task));
    }

    /** Advance a due date by one recurrence step. */
    private LocalDate nextOccurrence(LocalDate from, String recurrence, int interval) {
        return switch (recurrence) {
            case "DAILY" -> from.plusDays(1);
            case "WEEKLY" -> from.plusWeeks(1);
            case "BIWEEKLY" -> from.plusWeeks(2);
            case "MONTHLY" -> from.plusMonths(1);
            case "YEARLY" -> from.plusYears(1);
            case "EVERY_N_DAYS" -> from.plusDays(Math.max(1, interval));
            default -> from;
        };
    }

    @Transactional
    public void delete(Long id) {
        if (!tasks.existsById(id)) {
            throw new NotFoundException("Task " + id + " not found");
        }
        // Remove any note links pointing at this task so none dangle.
        noteLinks.deleteByTargetTypeAndTargetId(NoteLink.TYPE_TASK, id);
        tasks.deleteById(id);
    }

    // --- helpers ---

    private void applySubtasks(Task task, TaskRequest req) {
        if (req.subtasks() == null) return;
        for (TaskRequest.SubtaskInput in : req.subtasks()) {
            if (in.title() == null || in.title().isBlank()) continue;
            var st = task.addSubtask(in.title().trim());
            st.setDone(in.done());
        }
    }

    /** Reconcile an existing task's subtasks with the incoming set (add/update/remove). */
    private void reconcileSubtasks(Task task, TaskRequest req) {
        List<TaskRequest.SubtaskInput> incoming =
                req.subtasks() == null ? List.of() : req.subtasks();

        // Remove subtasks no longer present.
        var keepIds = incoming.stream()
                .map(TaskRequest.SubtaskInput::id)
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        task.getSubtasks().removeIf(st -> !keepIds.contains(st.getId()));

        // Update existing, add new.
        for (TaskRequest.SubtaskInput in : incoming) {
            if (in.title() == null || in.title().isBlank()) continue;
            if (in.id() != null) {
                task.getSubtasks().stream()
                        .filter(st -> in.id().equals(st.getId()))
                        .findFirst()
                        .ifPresent(st -> {
                            st.setTitle(in.title().trim());
                            st.setDone(in.done());
                        });
            } else {
                var st = task.addSubtask(in.title().trim());
                st.setDone(in.done());
            }
        }
    }

    private Task findOrThrow(Long id) {
        return tasks.findById(id)
                .orElseThrow(() -> new NotFoundException("Task " + id + " not found"));
    }

    private Notebook resolveNotebook(Long notebookId) {
        if (notebookId == null) return null;
        return notebooks.findById(notebookId)
                .orElseThrow(() -> new NotFoundException("Notebook " + notebookId + " not found"));
    }

    private Calendar resolveCalendar(Long calendarId) {
        if (calendarId == null) return null;
        return calendars.findById(calendarId)
                .orElseThrow(() -> new NotFoundException("Calendar " + calendarId + " not found"));
    }

    private String normalizeStatus(String status) {
        String s = status == null ? "TODO" : status.trim().toUpperCase();
        if (!STATUSES.contains(s)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "status must be one of " + STATUSES);
        }
        return s;
    }

    private String normalizePriority(String priority) {
        String p = priority == null ? "MEDIUM" : priority.trim().toUpperCase();
        if (!PRIORITIES.contains(p)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "priority must be one of " + PRIORITIES);
        }
        return p;
    }

    private String normalizeRecurrence(String recurrence) {
        String r = recurrence == null ? "NONE" : recurrence.trim().toUpperCase();
        if (!RECURRENCES.contains(r)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "recurrence must be one of " + RECURRENCES);
        }
        return r;
    }

    private int normalizeInterval(Integer interval) {
        if (interval == null || interval < 1) return 1;
        return interval;
    }

    /** A "repeat until" date only applies to recurring tasks. */
    private LocalDate normalizeUntil(String recurrence, LocalDate until) {
        if ("NONE".equals(recurrence)) return null;
        return until;
    }
}
