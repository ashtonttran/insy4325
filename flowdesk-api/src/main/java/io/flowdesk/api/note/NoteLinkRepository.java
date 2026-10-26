package io.flowdesk.api.note;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoteLinkRepository extends JpaRepository<NoteLink, Long> {

    List<NoteLink> findByNote_IdOrderByIdAsc(Long noteId);

    boolean existsByNote_IdAndTargetTypeAndTargetId(Long noteId, String targetType, Long targetId);

    /** All note links pointing at a given target — used for task/event -> notes lookups. */
    List<NoteLink> findByTargetTypeAndTargetId(String targetType, Long targetId);

    /** Clean up links to a target that no longer exists. */
    void deleteByTargetTypeAndTargetId(String targetType, Long targetId);
}
