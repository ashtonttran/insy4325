package io.flowdesk.api.task.dto;

import io.flowdesk.api.task.Task;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Outbound JSON shape for a task, including its subtasks. */
public record TaskResponse(
        Long id,
        String title,
        String description,
        String status,
        String priority,
        LocalDate dueDate,
        String recurrence,
        int recurrenceInterval,
        LocalDate recurrenceUntil,
        Long notebookId,
        String notebookName,
        Long calendarId,
        String calendarName,
        List<SubtaskResponse> subtasks,
        Instant createdAt,
        Instant updatedAt
) {
    public static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus(),
                task.getPriority(),
                task.getDueDate(),
                task.getRecurrence(),
                task.getRecurrenceInterval(),
                task.getRecurrenceUntil(),
                task.getNotebook() != null ? task.getNotebook().getId() : null,
                task.getNotebook() != null ? task.getNotebook().getName() : null,
                task.getCalendar() != null ? task.getCalendar().getId() : null,
                task.getCalendar() != null ? task.getCalendar().getName() : null,
                task.getSubtasks().stream().map(SubtaskResponse::from).toList(),
                task.getCreatedAt(),
                task.getUpdatedAt()
        );
    }
}
