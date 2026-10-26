package io.flowdesk.api.event;

import io.flowdesk.api.event.dto.EventRequest;
import io.flowdesk.api.event.dto.EventResponse;
import io.flowdesk.api.note.NoteLink;
import io.flowdesk.api.note.NoteLinkService;
import io.flowdesk.api.note.dto.LinkedNoteResponse;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/** REST endpoints for calendar events. */
@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService service;
    private final NoteLinkService noteLinks;

    public EventController(EventService service, NoteLinkService noteLinks) {
        this.service = service;
        this.noteLinks = noteLinks;
    }

    /** List all events, or those within [from, to] when both are provided. */
    @GetMapping
    public List<EventResponse> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.list(from, to);
    }

    @GetMapping("/{id}")
    public EventResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventResponse create(@Valid @RequestBody EventRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public EventResponse update(@PathVariable Long id, @Valid @RequestBody EventRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** Notes linked to this event (for the event detail view). */
    @GetMapping("/{id}/notes")
    public List<LinkedNoteResponse> linkedNotes(@PathVariable Long id) {
        return noteLinks.notesForTarget(NoteLink.TYPE_EVENT, id);
    }
}
