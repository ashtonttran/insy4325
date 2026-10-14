package io.flowdesk.api.event.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

/** Inbound JSON for creating or updating a calendar event. */
public record EventRequest(
        @NotBlank(message = "title is required")
        String title,
        String location,
        @NotNull(message = "date is required")
        LocalDate date,
        @JsonFormat(pattern = "HH:mm")
        LocalTime startTime,
        @JsonFormat(pattern = "HH:mm")
        LocalTime endTime,
        String tone,
        String recurrence,
        Integer recurrenceInterval,
        Long notebookId
) {
}
