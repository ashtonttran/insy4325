package io.flowdesk.api.task.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.List;

/** Inbound JSON for creating or updating a task (subtasks replace the full set). */
public record TaskRequest(
        @NotBlank(message = "title is required")
        String title,
        String description,
        String status,
        String priority,
        LocalDate dueDate,
        String recurrence,
        Integer recurrenceInterval,
        LocalDate recurrenceUntil,
        Long notebookId,
        Long calendarId,
        List<SubtaskInput> subtasks
) {
    /** Inbound subtask; id is null for new items. */
    public record SubtaskInput(Long id, String title, boolean done) {
    }
}
