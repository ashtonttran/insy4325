package io.flowdesk.api.event;

import io.flowdesk.api.calendar.Calendar;
import io.flowdesk.api.notebook.Notebook;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/** A calendar event (lecture, study session, deadline, etc.). */
@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String location;

    @Column(nullable = false)
    private LocalDate date;

    private LocalTime startTime;

    private LocalTime endTime;

    /** Visual tone for the event block: purple, amber, green, red. */
    @Column(nullable = false)
    private String tone;

    /** Recurrence rule: NONE, DAILY, WEEKLY, BIWEEKLY, MONTHLY, YEARLY, EVERY_N_DAYS. */
    @Column(nullable = false)
    @ColumnDefault("'NONE'")
    private String recurrence = "NONE";

    /** Interval for EVERY_N_DAYS (number of days); ignored for other rules. */
    @Column(nullable = false)
    @ColumnDefault("1")
    private int recurrenceInterval = 1;

    /**
     * Optional date (inclusive) after which the event stops repeating. Null means
     * it repeats indefinitely. Ignored when recurrence is NONE.
     */
    private LocalDate recurrenceUntil;

    @ManyToOne
    @JoinColumn(name = "notebook_id")
    private Notebook notebook;

    /** Optional calendar this event belongs to; null means the default calendar. */
    @ManyToOne
    @JoinColumn(name = "calendar_id")
    private Calendar calendar;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected Event() {
    }

    public Event(String title, String location, LocalDate date, LocalTime startTime,
                 LocalTime endTime, String tone, Notebook notebook) {
        this(title, location, date, startTime, endTime, tone, notebook, null);
    }

    public Event(String title, String location, LocalDate date, LocalTime startTime,
                 LocalTime endTime, String tone, Notebook notebook, Calendar calendar) {
        this.title = title;
        this.location = location;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.tone = tone;
        this.notebook = notebook;
        this.calendar = calendar;
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public String getTone() {
        return tone;
    }

    public void setTone(String tone) {
        this.tone = tone;
    }

    public String getRecurrence() {
        return recurrence;
    }

    public void setRecurrence(String recurrence) {
        this.recurrence = recurrence;
    }

    public int getRecurrenceInterval() {
        return recurrenceInterval;
    }

    public void setRecurrenceInterval(int recurrenceInterval) {
        this.recurrenceInterval = recurrenceInterval;
    }

    public LocalDate getRecurrenceUntil() {
        return recurrenceUntil;
    }

    public void setRecurrenceUntil(LocalDate recurrenceUntil) {
        this.recurrenceUntil = recurrenceUntil;
    }

    public Notebook getNotebook() {
        return notebook;
    }

    public void setNotebook(Notebook notebook) {
        this.notebook = notebook;
    }

    public Calendar getCalendar() {
        return calendar;
    }

    public void setCalendar(Calendar calendar) {
        this.calendar = calendar;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
