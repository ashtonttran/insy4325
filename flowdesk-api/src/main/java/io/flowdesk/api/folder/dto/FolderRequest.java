package io.flowdesk.api.folder.dto;

import jakarta.validation.constraints.NotBlank;

/** Inbound JSON shape for creating or renaming a folder. */
public record FolderRequest(
        @NotBlank(message = "name is required")
        String name
) {
}
