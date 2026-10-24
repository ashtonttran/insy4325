package io.flowdesk.api.calendar;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;

/**
 * A named calendar that groups events and tasks (e.g. "School", "Personal").
 * Events and tasks reference a calendar through a nullable {@code calendar_id}
 * foreign key, mirroring how they reference a notebook.
 */
@Entity
@Table(name = "calendars")
public class Calendar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** Optional free-text description of what the calendar is for. */
    private String description;

    /** Default visual tone for items on this calendar: purple, amber, green, red. */
    @Column(nullable = false)
    @ColumnDefault("'purple'")
    private String tone = "purple";

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected Calendar() {
    }

    public Calendar(String name, String description, String tone) {
        this.name = name;
        this.description = description;
        this.tone = tone;
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void touch() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getTone() {
        return tone;
    }

    public void setTone(String tone) {
        this.tone = tone;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
