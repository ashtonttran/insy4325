package io.flowdesk.api.note;

import io.flowdesk.api.note.dto.NoteLinkRequest;
import io.flowdesk.api.note.dto.NoteLinkResponse;
import io.flowdesk.api.note.dto.NoteRequest;
import io.flowdesk.api.note.dto.NoteResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** REST endpoints for notes. */
@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteService service;
    private final NoteLinkService linkService;

    public NoteController(NoteService service, NoteLinkService linkService) {
        this.service = service;
        this.linkService = linkService;
    }

    @GetMapping
    public List<NoteResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public NoteResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteResponse create(@Valid @RequestBody NoteRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public NoteResponse update(@PathVariable Long id, @Valid @RequestBody NoteRequest request) {
        return service.update(id, request);
    }

    /** Lightweight favorite toggle that does not modify other fields. */
    @PatchMapping("/{id}/favorite")
    public NoteResponse setFavorite(@PathVariable Long id, @RequestBody FavoriteRequest request) {
        return service.setFavorite(id, request.favorite());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /* ----------------------------------------------------- linked items */

    /** List the tasks/events linked to this note. */
    @GetMapping("/{id}/links")
    public List<NoteLinkResponse> listLinks(@PathVariable Long id) {
        return linkService.list(id);
    }

    /** Link this note to a task or event. */
    @PostMapping("/{id}/links")
    @ResponseStatus(HttpStatus.CREATED)
    public NoteLinkResponse addLink(@PathVariable Long id, @Valid @RequestBody NoteLinkRequest request) {
        return linkService.create(id, request);
    }

    /** Remove a link from this note. */
    @DeleteMapping("/{id}/links/{linkId}")
    public ResponseEntity<Void> removeLink(@PathVariable Long id, @PathVariable Long linkId) {
        linkService.delete(id, linkId);
        return ResponseEntity.noContent().build();
    }

    /** Body for the favorite toggle endpoint. */
    public record FavoriteRequest(boolean favorite) {
    }
}
