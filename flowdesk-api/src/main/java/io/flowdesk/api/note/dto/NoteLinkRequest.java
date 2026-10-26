package io.flowdesk.api.note.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Inbound JSON for linking a note to a task or event. */
public record NoteLinkRequest(
        @NotBlank(message = "targetType is required")
        String targetType,
        @NotNull(message = "targetId is required")
        Long targetId
) {
}
