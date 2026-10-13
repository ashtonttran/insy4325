package io.flowdesk.api.search.dto;

/**
 * A single unified search hit. {@code type} is "note" or "task";
 * {@code context} carries the notebook/course name when available.
 */
public record SearchResult(
        String type,
        Long id,
        String title,
        String snippet,
        String context
) {
}
