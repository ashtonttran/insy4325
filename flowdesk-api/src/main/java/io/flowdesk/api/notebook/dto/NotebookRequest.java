package io.flowdesk.api.notebook.dto;

import jakarta.validation.constraints.NotBlank;

/** Inbound JSON shape for creating or updating a notebook. */
public record NotebookRequest(
        @NotBlank(message = "name is required")
        String name,
        Long folderId
) {
}
