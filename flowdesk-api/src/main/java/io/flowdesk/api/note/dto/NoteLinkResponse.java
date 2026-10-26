package io.flowdesk.api.note.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Outbound JSON for a note's linked item (task or event). The service resolves
 * the target's display fields so the Notes UI can render the "Linked items"
 * section directly. Fields that don't apply to a given type are null.
 */
public record NoteLinkResponse(
        Long id,
        String targetType,
        Long targetId,
        String title,
        // Task-only
        String status,
        LocalDate dueDate,
        // Event-only
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime
) {
    public static NoteLinkResponse task(Long id, Long targetId, String title, String status, LocalDate dueDate) {
        return new NoteLinkResponse(id, "TASK", targetId, title, status, dueDate, null, null, null);
    }

    public static NoteLinkResponse event(
            Long id, Long targetId, String title, LocalDate date, LocalTime startTime, LocalTime endTime) {
        return new NoteLinkResponse(id, "EVENT", targetId, title, null, null, date, startTime, endTime);
    }
}
