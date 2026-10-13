package io.flowdesk.api.folder.dto;

import io.flowdesk.api.folder.Folder;

/** Outbound JSON shape for a folder. */
public record FolderResponse(Long id, String name) {
    public static FolderResponse from(Folder folder) {
        return new FolderResponse(folder.getId(), folder.getName());
    }
}
