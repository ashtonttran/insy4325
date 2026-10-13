package io.flowdesk.api.event.dto;

import io.flowdesk.api.event.Event;

import java.time.LocalDate;
import java.time.LocalTime;

/** Outbound JSON shape for a calendar event. */
public record EventResponse(
        Long id,
        String title,
        String location,
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime,
        String tone,
        Long notebookId,
        String notebookName
) {
    public static EventResponse from(Event e) {
        return new EventResponse(
                e.getId(),
                e.getTitle(),
                e.getLocation(),
                e.getDate(),
                e.getStartTime(),
                e.getEndTime(),
                e.getTone(),
                e.getNotebook() != null ? e.getNotebook().getId() : null,
                e.getNotebook() != null ? e.getNotebook().getName() : null
        );
    }
}
