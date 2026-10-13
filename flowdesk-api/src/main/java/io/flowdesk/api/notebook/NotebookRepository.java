package io.flowdesk.api.notebook;

import io.flowdesk.api.folder.Folder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotebookRepository extends JpaRepository<Notebook, Long> {
    Optional<Notebook> findByNameIgnoreCase(String name);

    List<Notebook> findByFolder(Folder folder);
}
