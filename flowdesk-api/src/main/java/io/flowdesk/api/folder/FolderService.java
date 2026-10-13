package io.flowdesk.api.folder;

import io.flowdesk.api.common.NotFoundException;
import io.flowdesk.api.folder.dto.FolderRequest;
import io.flowdesk.api.folder.dto.FolderResponse;
import io.flowdesk.api.notebook.Notebook;
import io.flowdesk.api.notebook.NotebookRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Business logic for folders. */
@Service
public class FolderService {

    private final FolderRepository folders;
    private final NotebookRepository notebooks;

    public FolderService(FolderRepository folders, NotebookRepository notebooks) {
        this.folders = folders;
        this.notebooks = notebooks;
    }

    @Transactional(readOnly = true)
    public List<FolderResponse> list() {
        return folders.findAll().stream().map(FolderResponse::from).toList();
    }

    @Transactional
    public FolderResponse create(FolderRequest req) {
        return FolderResponse.from(folders.save(new Folder(req.name())));
    }

    @Transactional
    public FolderResponse rename(Long id, FolderRequest req) {
        Folder folder = findOrThrow(id);
        folder.setName(req.name());
        return FolderResponse.from(folders.save(folder));
    }

    /** Deletes a folder and un-groups its notebooks (notebooks are kept). */
    @Transactional
    public void delete(Long id) {
        Folder folder = findOrThrow(id);
        for (Notebook nb : notebooks.findByFolder(folder)) {
            nb.setFolder(null);
            notebooks.save(nb);
        }
        folders.delete(folder);
    }

    private Folder findOrThrow(Long id) {
        return folders.findById(id)
                .orElseThrow(() -> new NotFoundException("Folder " + id + " not found"));
    }
}
