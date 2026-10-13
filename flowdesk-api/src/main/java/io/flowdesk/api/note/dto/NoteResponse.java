package io.flowdesk.api.note.dto;

import io.flowdesk.api.note.Note;

import java.time.Instant;

/** Outbound JSON shape for a note. */
public record NoteResponse(
        Long id,
        String title,
        String content,
        String tag,
        boolean favorite,
        Long notebookId,
        String notebookName,
        Instant createdAt,
        Instant updatedAt
) {
    public static NoteResponse from(Note note) {
        return new NoteResponse(
                note.getId(),
                note.getTitle(),
                note.getContent(),
                note.getTag(),
                note.isFavorite(),
                note.getNotebook() != null ? note.getNotebook().getId() : null,
                note.getNotebook() != null ? note.getNotebook().getName() : null,
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
