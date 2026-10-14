package io.flowdesk.api.event;

import io.flowdesk.api.common.NotFoundException;
import io.flowdesk.api.event.dto.EventRequest;
import io.flowdesk.api.event.dto.EventResponse;
import io.flowdesk.api.notebook.Notebook;
import io.flowdesk.api.notebook.NotebookRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/** Business logic for calendar events. */
@Service
public class EventService {

    private static final Set<String> TONES = Set.of("purple", "amber", "green", "red");
    private static final Set<String> RECURRENCES =
            Set.of("NONE", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY", "EVERY_N_DAYS");

    private final EventRepository events;
    private final NotebookRepository notebooks;

    public EventService(EventRepository events, NotebookRepository notebooks) {
        this.events = events;
        this.notebooks = notebooks;
    }

    /** List events, optionally filtered to an inclusive [from, to] date range. */
    @Transactional(readOnly = true)
    public List<EventResponse> list(LocalDate from, LocalDate to) {
        List<Event> found;
        if (from != null && to != null) {
            found = events.findByDateBetweenOrderByDateAscStartTimeAsc(from, to);
        } else {
            found = events.findAllByOrderByDateAscStartTimeAsc();
        }
        return found.stream().map(EventResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public EventResponse get(Long id) {
        return EventResponse.from(findOrThrow(id));
    }

    @Transactional
    public EventResponse create(EventRequest req) {
        Event event = new Event(
                req.title(),
                req.location(),
                req.date(),
                req.startTime(),
                req.endTime(),
                normalizeTone(req.tone()),
                resolveNotebook(req.notebookId())
        );
        event.setRecurrence(normalizeRecurrence(req.recurrence()));
        event.setRecurrenceInterval(normalizeInterval(req.recurrenceInterval()));
        return EventResponse.from(events.save(event));
    }

    @Transactional
    public EventResponse update(Long id, EventRequest req) {
        Event event = findOrThrow(id);
        event.setTitle(req.title());
        event.setLocation(req.location());
        event.setDate(req.date());
        event.setStartTime(req.startTime());
        event.setEndTime(req.endTime());
        event.setTone(normalizeTone(req.tone()));
        event.setRecurrence(normalizeRecurrence(req.recurrence()));
        event.setRecurrenceInterval(normalizeInterval(req.recurrenceInterval()));
        event.setNotebook(resolveNotebook(req.notebookId()));
        event.touch();
        return EventResponse.from(events.save(event));
    }

    @Transactional
    public void delete(Long id) {
        if (!events.existsById(id)) {
            throw new NotFoundException("Event " + id + " not found");
        }
        events.deleteById(id);
    }

    private Event findOrThrow(Long id) {
        return events.findById(id)
                .orElseThrow(() -> new NotFoundException("Event " + id + " not found"));
    }

    private Notebook resolveNotebook(Long notebookId) {
        if (notebookId == null) return null;
        return notebooks.findById(notebookId)
                .orElseThrow(() -> new NotFoundException("Notebook " + notebookId + " not found"));
    }

    private String normalizeTone(String tone) {
        if (tone == null || tone.isBlank()) return "purple";
        String t = tone.trim().toLowerCase();
        return TONES.contains(t) ? t : "purple";
    }

    private String normalizeRecurrence(String recurrence) {
        if (recurrence == null || recurrence.isBlank()) return "NONE";
        String r = recurrence.trim().toUpperCase();
        return RECURRENCES.contains(r) ? r : "NONE";
    }

    private int normalizeInterval(Integer interval) {
        if (interval == null || interval < 1) return 1;
        return interval;
    }
}
