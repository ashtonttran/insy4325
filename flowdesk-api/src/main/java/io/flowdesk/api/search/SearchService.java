package io.flowdesk.api.search;

import io.flowdesk.api.note.Note;
import io.flowdesk.api.note.NoteRepository;
import io.flowdesk.api.search.dto.SearchResult;
import io.flowdesk.api.task.Task;
import io.flowdesk.api.task.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/** Searches across notes and tasks for a case-insensitive substring match. */
@Service
public class SearchService {

    private static final int MAX_RESULTS = 20;
    private static final int SNIPPET_LEN = 120;

    private final NoteRepository notes;
    private final TaskRepository tasks;

    public SearchService(NoteRepository notes, TaskRepository tasks) {
        this.notes = notes;
        this.tasks = tasks;
    }

    @Transactional(readOnly = true)
    public List<SearchResult> search(String query) {
        List<SearchResult> results = new ArrayList<>();
        if (query == null) {
            return results;
        }
        String q = query.trim().toLowerCase();
        if (q.isEmpty()) {
            return results;
        }

        for (Note note : notes.findAllByOrderByUpdatedAtDesc()) {
            if (matches(q, note.getTitle(), note.getContent())) {
                results.add(new SearchResult(
                        "note",
                        note.getId(),
                        note.getTitle(),
                        snippet(note.getContent()),
                        note.getNotebook() != null ? note.getNotebook().getName() : null
                ));
            }
        }

        for (Task task : tasks.findAllByOrderByUpdatedAtDesc()) {
            if (matches(q, task.getTitle(), task.getDescription())) {
                results.add(new SearchResult(
                        "task",
                        task.getId(),
                        task.getTitle(),
                        snippet(task.getDescription()),
                        task.getNotebook() != null ? task.getNotebook().getName() : null
                ));
            }
        }

        return results.size() > MAX_RESULTS ? results.subList(0, MAX_RESULTS) : results;
    }

    private boolean matches(String q, String title, String body) {
        return (title != null && title.toLowerCase().contains(q))
                || (body != null && body.toLowerCase().contains(q));
    }

    private String snippet(String body) {
        if (body == null || body.isBlank()) {
            return "";
        }
        String trimmed = body.strip();
        return trimmed.length() <= SNIPPET_LEN
                ? trimmed
                : trimmed.substring(0, SNIPPET_LEN).strip() + "…";
    }
}
