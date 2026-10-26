package io.flowdesk.api.note;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * A link from a note to another FlowDesk entity (a task or an event). Modeled
 * as a child of Note — the note owns the foreign key — mirroring the existing
 * Task -> Subtask relationship. The target is stored polymorphically as a
 * {@code targetType} discriminator plus the target's id, so a single table
 * covers both task and event links. A unique constraint prevents duplicate
 * links to the same target.
 */
@Entity
@Table(
        name = "note_links",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_note_link_target",
                columnNames = {"note_id", "target_type", "target_id"}
        )
)
public class NoteLink {

    /** Discriminator values for {@link #targetType}. */
    public static final String TYPE_TASK = "TASK";
    public static final String TYPE_EVENT = "EVENT";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "note_id", nullable = false)
    private Note note;

    /** "TASK" or "EVENT". */
    @Column(name = "target_type", nullable = false)
    private String targetType;

    /** The id of the linked task or event. */
    @Column(name = "target_id", nullable = false)
    private Long targetId;

    protected NoteLink() {
    }

    public NoteLink(Note note, String targetType, Long targetId) {
        this.note = note;
        this.targetType = targetType;
        this.targetId = targetId;
    }

    public Long getId() {
        return id;
    }

    public Note getNote() {
        return note;
    }

    public void setNote(Note note) {
        this.note = note;
    }

    public String getTargetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public void setTargetId(Long targetId) {
        this.targetId = targetId;
    }
}
