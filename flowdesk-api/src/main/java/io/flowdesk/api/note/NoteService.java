package io.flowdesk.api.note;

import io.flowdesk.api.common.NotFoundException;
import io.flowdesk.api.note.dto.NoteRequest;
import io.flowdesk.api.note.dto.NoteResponse;
import io.flowdesk.api.notebook.Notebook;
import io.flowdesk.api.notebook.NotebookRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Business logic for notes. */
@Service
public class NoteService {

    private final NoteRepository notes;
    private final NotebookRepository notebooks;

    public NoteService(NoteRepository notes, NotebookRepository notebooks) {
        this.notes = notes;
        this.notebooks = notebooks;
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> list() {
        return notes.findAllByOrderByUpdatedAtDesc().stream()
                .map(NoteResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public NoteResponse get(Long id) {
        return NoteResponse.from(findOrThrow(id));
    }

    @Transactional
    public NoteResponse create(NoteRequest req) {
        Notebook notebook = resolveNotebook(req.notebookId());
        Note note = new Note(req.title(), req.content(), req.tag(), notebook);
        if (req.favorite() != null) {
            note.setFavorite(req.favorite());
        }
        return NoteResponse.from(notes.save(note));
    }

    @Transactional
    public NoteResponse update(Long id, NoteRequest req) {
        Note note = findOrThrow(id);
        note.setTitle(req.title());
        note.setContent(req.content());
        note.setTag(req.tag());
        if (req.favorite() != null) {
            note.setFavorite(req.favorite());
        }
        note.setNotebook(resolveNotebook(req.notebookId()));
        note.touch();
        return NoteResponse.from(notes.save(note));
    }

    /** Toggle or set the favorite flag without touching other fields or the timestamp. */
    @Transactional
    public NoteResponse setFavorite(Long id, boolean favorite) {
        Note note = findOrThrow(id);
        note.setFavorite(favorite);
        return NoteResponse.from(notes.save(note));
    }

    @Transactional
    public void delete(Long id) {
        if (!notes.existsById(id)) {
            throw new NotFoundException("Note " + id + " not found");
        }
        notes.deleteById(id);
    }

    private Note findOrThrow(Long id) {
        return notes.findById(id)
                .orElseThrow(() -> new NotFoundException("Note " + id + " not found"));
    }

    private Notebook resolveNotebook(Long notebookId) {
        if (notebookId == null) {
            return null;
        }
        return notebooks.findById(notebookId)
                .orElseThrow(() -> new NotFoundException("Notebook " + notebookId + " not found"));
    }
}
