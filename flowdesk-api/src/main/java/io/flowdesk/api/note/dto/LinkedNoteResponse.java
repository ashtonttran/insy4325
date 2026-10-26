package io.flowdesk.api.note.dto;

import io.flowdesk.api.note.Note;

/**
 * A lightweight note summary returned when a task or event asks which notes
 * link to it. Deliberately omits the (potentially large) note content.
 */
public record LinkedNoteResponse(
        Long id,
        String title,
        Long notebookId,
        String notebookName
) {
    public static LinkedNoteResponse from(Note note) {
        return new LinkedNoteResponse(
                note.getId(),
                note.getTitle(),
                note.getNotebook() != null ? note.getNotebook().getId() : null,
                note.getNotebook() != null ? note.getNotebook().getName() : null
        );
    }
}
