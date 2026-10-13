package io.flowdesk.api.note.dto;

import jakarta.validation.constraints.NotBlank;

/** Inbound JSON shape for creating or updating a note. */
public record NoteRequest(
        @NotBlank(message = "title is required")
        String title,
        String content,
        String tag,
        Boolean favorite,
        Long notebookId
) {
}
