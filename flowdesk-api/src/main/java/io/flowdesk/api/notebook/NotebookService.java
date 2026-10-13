package io.flowdesk.api.notebook;

import io.flowdesk.api.common.NotFoundException;
import io.flowdesk.api.folder.Folder;
import io.flowdesk.api.folder.FolderRepository;
import io.flowdesk.api.note.NoteRepository;
import io.flowdesk.api.notebook.dto.NotebookRequest;
import io.flowdesk.api.notebook.dto.NotebookResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Business logic for notebooks, including folder assignment. */
@Service
public class NotebookService {

    private final NotebookRepository notebooks;
    private final NoteRepository notes;
    private final FolderRepository folders;

    public NotebookService(NotebookRepository notebooks, NoteRepository notes, FolderRepository folders) {
        this.notebooks = notebooks;
        this.notes = notes;
        this.folders = folders;
    }

    @Transactional(readOnly = true)
    public List<NotebookResponse> list() {
        Map<Long, Long> countsByNotebookId = notes.findAll().stream()
                .filter(n -> n.getNotebook() != null)
                .collect(Collectors.groupingBy(n -> n.getNotebook().getId(), Collectors.counting()));

        return notebooks.findAll().stream()
                .map(nb -> NotebookResponse.of(nb, countsByNotebookId.getOrDefault(nb.getId(), 0L)))
                .toList();
    }

    @Transactional
    public NotebookResponse create(NotebookRequest req) {
        Notebook notebook = new Notebook(req.name(), resolveFolder(req.folderId()));
        return NotebookResponse.of(notebooks.save(notebook), 0L);
    }

    @Transactional
    public NotebookResponse update(Long id, NotebookRequest req) {
        Notebook notebook = findOrThrow(id);
        notebook.setName(req.name());
        notebook.setFolder(resolveFolder(req.folderId()));
        Notebook saved = notebooks.save(notebook);
        long count = notes.findAll().stream()
                .filter(n -> n.getNotebook() != null && n.getNotebook().getId().equals(id))
                .count();
        return NotebookResponse.of(saved, count);
    }

    @Transactional
    public void delete(Long id) {
        Notebook notebook = findOrThrow(id);
        // Detach notes so they are not deleted along with the notebook.
        notes.findAll().stream()
                .filter(n -> n.getNotebook() != null && n.getNotebook().getId().equals(id))
                .forEach(n -> {
                    n.setNotebook(null);
                    notes.save(n);
                });
        notebooks.delete(notebook);
    }

    private Notebook findOrThrow(Long id) {
        return notebooks.findById(id)
                .orElseThrow(() -> new NotFoundException("Notebook " + id + " not found"));
    }

    private Folder resolveFolder(Long folderId) {
        if (folderId == null) {
            return null;
        }
        return folders.findById(folderId)
                .orElseThrow(() -> new NotFoundException("Folder " + folderId + " not found"));
    }
}
