package io.flowdesk.api.task.dto;

import io.flowdesk.api.task.Subtask;

/** Outbound JSON shape for a subtask. */
public record SubtaskResponse(Long id, String title, boolean done) {
    public static SubtaskResponse from(Subtask st) {
        return new SubtaskResponse(st.getId(), st.getTitle(), st.isDone());
    }
}
