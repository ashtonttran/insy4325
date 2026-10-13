package io.flowdesk.api.task.dto;

import jakarta.validation.constraints.NotBlank;

/** Lightweight inbound JSON for moving a task between board columns. */
public record StatusRequest(
        @NotBlank(message = "status is required")
        String status
) {
}
