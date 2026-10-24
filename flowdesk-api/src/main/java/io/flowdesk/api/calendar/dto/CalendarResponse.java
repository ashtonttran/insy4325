package io.flowdesk.api.calendar.dto;

import io.flowdesk.api.calendar.Calendar;

import java.time.Instant;

/** Outbound JSON shape for a calendar. */
public record CalendarResponse(
        Long id,
        String name,
        String description,
        String tone,
        Instant createdAt,
        Instant updatedAt
) {
    public static CalendarResponse from(Calendar c) {
        return new CalendarResponse(
                c.getId(),
                c.getName(),
                c.getDescription(),
                c.getTone(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
