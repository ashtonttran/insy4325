package io.flowdesk.api.note;

import io.flowdesk.api.common.NotFoundException;
import io.flowdesk.api.event.Event;
import io.flowdesk.api.event.EventRepository;
import io.flowdesk.api.note.dto.LinkedNoteResponse;
import io.flowdesk.api.note.dto.NoteLinkRequest;
import io.flowdesk.api.note.dto.NoteLinkResponse;
import io.flowdesk.api.task.Task;
import io.flowdesk.api.task.TaskRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

/**
 * Manages links between a note and tasks/events. Links are stored once as a
 * {@link NoteLink}; the target's display fields are resolved on read so the
 * client never has to join. Links whose target has been deleted are skipped
 * (and cleaned up) so the UI degrades gracefully.
 */
@Service
public class NoteLinkService {

    private final NoteRepository notes;
    private final NoteLinkRepository links;
    private final TaskRepository tasks;
    private final EventRepository events;

    public NoteLinkService(NoteRepository notes, NoteLinkRepository links,
                           TaskRepository tasks, EventRepository events) {
        this.notes = notes;
        this.links = links;
        this.tasks = tasks;
        this.events = events;
    }

    /** List a note's links, resolving each target's display fields. */
    @Transactional
    public List<NoteLinkResponse> list(Long noteId) {
        requireNote(noteId);
        List<NoteLinkResponse> out = new ArrayList<>();
        for (NoteLink link : links.findByNote_IdOrderByIdAsc(noteId)) {
            NoteLinkResponse resolved = resolve(link);
            if (resolved != null) {
                out.add(resolved);
            } else {
                // Target was deleted; drop the dangling link.
                links.delete(link);
            }
        }
        return out;
    }

    /** Link a note to a task or event, preventing duplicates and missing targets. */
    @Transactional
    public NoteLinkResponse create(Long noteId, NoteLinkRequest req) {
        Note note = requireNote(noteId);
        String type = normalizeType(req.targetType());
        Long targetId = req.targetId();

        requireTargetExists(type, targetId);

        if (links.existsByNote_IdAndTargetTypeAndTargetId(noteId, type, targetId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This item is already linked.");
        }

        NoteLink saved = links.save(new NoteLink(note, type, targetId));
        NoteLinkResponse resolved = resolve(saved);
        if (resolved == null) {
            throw new NotFoundException(type + " " + targetId + " not found");
        }
        return resolved;
    }

    /** Remove a link by its id (must belong to the given note). */
    @Transactional
    public void delete(Long noteId, Long linkId) {
        requireNote(noteId);
        NoteLink link = links.findById(linkId)
                .orElseThrow(() -> new NotFoundException("Link " + linkId + " not found"));
        if (!link.getNote().getId().equals(noteId)) {
            throw new NotFoundException("Link " + linkId + " not found on note " + noteId);
        }
        links.delete(link);
    }

    /** Notes linked to a given target — used by the task/event detail views. */
    @Transactional(readOnly = true)
    public List<LinkedNoteResponse> notesForTarget(String targetType, Long targetId) {
        String type = normalizeType(targetType);
        List<LinkedNoteResponse> out = new ArrayList<>();
        for (NoteLink link : links.findByTargetTypeAndTargetId(type, targetId)) {
            Note note = link.getNote();
            if (note != null) {
                out.add(LinkedNoteResponse.from(note));
            }
        }
        return out;
    }

    // --- helpers ---

    private Note requireNote(Long noteId) {
        return notes.findById(noteId)
                .orElseThrow(() -> new NotFoundException("Note " + noteId + " not found"));
    }

    private String normalizeType(String type) {
        String t = type == null ? "" : type.trim().toUpperCase();
        if (!NoteLink.TYPE_TASK.equals(t) && !NoteLink.TYPE_EVENT.equals(t)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "targetType must be TASK or EVENT");
        }
        return t;
    }

    private void requireTargetExists(String type, Long targetId) {
        boolean exists = NoteLink.TYPE_TASK.equals(type)
                ? tasks.existsById(targetId)
                : events.existsById(targetId);
        if (!exists) {
            throw new NotFoundException(type + " " + targetId + " not found");
        }
    }

    /** Resolve a link's target into a response, or null if the target is gone. */
    private NoteLinkResponse resolve(NoteLink link) {
        if (NoteLink.TYPE_TASK.equals(link.getTargetType())) {
            return tasks.findById(link.getTargetId())
                    .map((Task t) -> NoteLinkResponse.task(
                            link.getId(), t.getId(), t.getTitle(), t.getStatus(), t.getDueDate()))
                    .orElse(null);
        }
        return events.findById(link.getTargetId())
                .map((Event e) -> NoteLinkResponse.event(
                        link.getId(), e.getId(), e.getTitle(), e.getDate(), e.getStartTime(), e.getEndTime()))
                .orElse(null);
    }
}
