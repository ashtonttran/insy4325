package io.flowdesk.api.notebook.dto;

import io.flowdesk.api.notebook.Notebook;

/** Outbound JSON shape for a notebook, including its note count and folder. */
public record NotebookResponse(
        Long id,
        String name,
        long noteCount,
        Long folderId,
        String folderName
) {
    public static NotebookResponse of(Notebook notebook, long noteCount) {
        return new NotebookResponse(
                notebook.getId(),
                notebook.getName(),
                noteCount,
                notebook.getFolder() != null ? notebook.getFolder().getId() : null,
                notebook.getFolder() != null ? notebook.getFolder().getName() : null
        );
    }
}
