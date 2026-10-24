package io.flowdesk.api.calendar.dto;

import jakarta.validation.constraints.NotBlank;

/** Inbound JSON for creating or updating a calendar. */
public record CalendarRequest(
        @NotBlank(message = "name is required")
        String name,
        String description,
        String tone
) {
}
