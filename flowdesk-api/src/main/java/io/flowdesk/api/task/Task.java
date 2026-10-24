package io.flowdesk.api.task;

import io.flowdesk.api.calendar.Calendar;
import io.flowdesk.api.notebook.Notebook;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** A task on the board, with optional subtasks, priority, due date, and course. */
@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    /** Board column: TODO, IN_PROGRESS, or DONE. */
    @Column(nullable = false)
    private String status;

    /** LOW, MEDIUM, or HIGH. */
    @Column(nullable = false)
    private String priority;

    private LocalDate dueDate;

    /** Recurrence rule: NONE, DAILY, WEEKLY, MONTHLY, YEARLY, or EVERY_N_DAYS. */
    @Column(nullable = false)
    @ColumnDefault("'NONE'")
    private String recurrence = "NONE";

    /** Interval for EVERY_N_DAYS (number of days); ignored for other rules. */
    @Column(nullable = false)
    @ColumnDefault("1")
    private int recurrenceInterval = 1;

    /**
     * Optional date (inclusive) after which the task stops repeating. Null means
     * it repeats indefinitely. Ignored when recurrence is NONE.
     */
    private LocalDate recurrenceUntil;

    /** Optional course/notebook this task relates to. */
    @ManyToOne
    @JoinColumn(name = "notebook_id")
    private Notebook notebook;

    /** Optional calendar this task appears on; null means the default calendar. */
    @ManyToOne
    @JoinColumn(name = "calendar_id")
    private Calendar calendar;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("id ASC")
    private List<Subtask> subtasks = new ArrayList<>();

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected Task() {
    }

    public Task(String title, String description, String status, String priority,
                LocalDate dueDate, Notebook notebook) {
        this(title, description, status, priority, dueDate, notebook, null);
    }

    public Task(String title, String description, String status, String priority,
                LocalDate dueDate, Notebook notebook, Calendar calendar) {
        this.title = title;
        this.description = description;
        this.status = status;
        this.priority = priority;
        this.dueDate = dueDate;
        this.notebook = notebook;
        this.calendar = calendar;
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void touch() {
        this.updatedAt = Instant.now();
    }

    /** Add a subtask and set its back-reference. */
    public Subtask addSubtask(String title) {
        Subtask st = new Subtask(this, title, false);
        subtasks.add(st);
        return st;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
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

    public List<Subtask> getSubtasks() {
        return subtasks;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
