package io.flowdesk.api.common;

import io.flowdesk.api.folder.Folder;
import io.flowdesk.api.folder.FolderRepository;
import io.flowdesk.api.note.Note;
import io.flowdesk.api.note.NoteRepository;
import io.flowdesk.api.notebook.Notebook;
import io.flowdesk.api.notebook.NotebookRepository;
import io.flowdesk.api.task.Task;
import io.flowdesk.api.task.TaskRepository;
import io.flowdesk.api.event.Event;
import io.flowdesk.api.event.EventRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Seeds folders, notebooks, notes, tasks, and events on first run.
 * All dates are anchored to {@code LocalDate.now()} so the demo data always
 * lands in the current week/month, whenever the app is first launched.
 */
@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seed(FolderRepository folders, NotebookRepository notebooks,
                           NoteRepository notes, TaskRepository tasks, EventRepository events) {
        return args -> {
            if (folders.count() > 0 || notebooks.count() > 0 || notes.count() > 0
                    || tasks.count() > 0 || events.count() > 0) {
                return; // already seeded
            }

            final LocalDate today = LocalDate.now();

            // Example folders grouping the notebooks.
            Folder school = folders.save(new Folder("School"));
            Folder personal = folders.save(new Folder("Personal"));

            Map<String, Folder> folderByNotebook = Map.of(
                    "History 201", school,
                    "Biology 101", school,
                    "Math 301", school,
                    "Psychology", school,
                    "Personal", personal
            );

            Map<String, Notebook> nb = new LinkedHashMap<>();
            for (String name : new String[] {"History 201", "Biology 101", "Math 301", "Psychology", "Personal"}) {
                nb.put(name, notebooks.save(new Notebook(name, folderByNotebook.get(name))));
            }

            // --- Notes ---
            notes.save(new Note(
                    "WWII Lecture Notes - Week 4",
                    "Week 4 focused on the political and economic forces leading into World War II.\n\n"
                            + "## Causes of World War II\n\n"
                            + "- Political tensions: remilitarization of the Rhineland\n"
                            + "- Treaty of Versailles: reparations and the war-guilt clause\n"
                            + "- Economic factors: the Great Depression\n\n"
                            + "| Term | Meaning |\n| --- | --- |\n"
                            + "| Appeasement | Conceding to avoid conflict |\n"
                            + "| Blitzkrieg | Fast, coordinated attack |",
                    "Lectures", nb.get("History 201")));
            Note cellDivision = new Note(
                    "Cell Division Summary",
                    "Compare mitosis and meiosis. Key checkpoints: prophase, metaphase, anaphase, telophase.",
                    "Study Guide", nb.get("Biology 101"));
            cellDivision.setFavorite(true);
            notes.save(cellDivision);
            notes.save(new Note(
                    "Statistical Methods Overview",
                    "Review hypothesis testing, p-values, and confidence intervals. Practice interpreting regression output.",
                    "Notes", nb.get("Math 301")));
            Note cogPsych = new Note(
                    "Cognitive Psychology Ch. 8",
                    "## Working Memory\n\n"
                            + "A core system for temporarily holding and processing information.\n\n"
                            + "### Key Components\n\n"
                            + "- Central executive – coordinates attention\n"
                            + "- Phonological loop – stores verbal information\n"
                            + "- Visuospatial sketchpad – holds visual and spatial information",
                    "Reading", nb.get("Psychology"));
            cogPsych.setFavorite(true);
            notes.save(cogPsych);
            notes.save(new Note(
                    "Chemistry Lab Report #3",
                    "Titration procedure, data table, and calculated molarity. Compare observed results to theoretical.",
                    "Lab", nb.get("Personal")));
            notes.save(new Note(
                    "Reading List - Fall",
                    "Books and papers to get through this semester. Prioritize the WWII primary sources.",
                    null, nb.get("Personal")));

            // --- Tasks (dated around today) ---
            Task essay = new Task(
                    "History essay draft - World War II causes",
                    "Write a 2000-word essay analyzing the primary causes of World War II. "
                            + "Include at least 5 academic sources. Follow MLA format guidelines.",
                    "IN_PROGRESS", "MEDIUM", today.plusDays(3), nb.get("History 201"));
            essay.addSubtask("Research primary sources").setDone(true);
            essay.addSubtask("Write outline");
            essay.addSubtask("Complete first draft");
            tasks.save(essay);

            Task reading = new Task(
                    "Read Chapter 5 - Biology",
                    "Cover cell division and the cell cycle ahead of Thursday's lecture.",
                    "TODO", "HIGH", today.plusDays(1), nb.get("Biology 101"));
            reading.addSubtask("Skim chapter headings");
            reading.addSubtask("Take notes on mitosis");
            tasks.save(reading);

            Task problemSet = new Task(
                    "Math problem set #7",
                    "Complete problems 1-20 on hypothesis testing.",
                    "TODO", "MEDIUM", today.plusDays(2), nb.get("Math 301"));
            tasks.save(problemSet);

            Task midterm = new Task(
                    "Study for Chemistry midterm",
                    "Review lab reports and lecture slides for the midterm.",
                    "TODO", "LOW", today.plusDays(7), nb.get("Personal"));
            tasks.save(midterm);

            // An overdue task so the dashboard "Overdue" badge is visible.
            Task overdue = new Task(
                    "Submit lab safety form",
                    "Hand in the signed safety agreement to the chemistry office.",
                    "TODO", "HIGH", today.minusDays(2), nb.get("Personal"));
            tasks.save(overdue);

            // A daily recurring task to show recurrence on the calendar.
            Task daily = new Task(
                    "Review flashcards",
                    "15 minutes of spaced-repetition review across all subjects.",
                    "TODO", "LOW", today, nb.get("Personal"));
            daily.setRecurrence("DAILY");
            daily.setRecurrenceInterval(1);
            tasks.save(daily);

            // A weekly recurring task.
            Task weekly = new Task(
                    "Weekly study group - Math",
                    "Meet the study group to work through the week's problem set.",
                    "TODO", "MEDIUM", today.plusDays(1), nb.get("Math 301"));
            weekly.setRecurrence("WEEKLY");
            weekly.setRecurrenceInterval(1);
            tasks.save(weekly);

            Task review = new Task(
                    "Review lecture notes - Psychology",
                    "Consolidate this week's notes into the study guide.",
                    "DONE", "LOW", today.minusDays(1), nb.get("Psychology"));
            review.addSubtask("Summarize key terms").setDone(true);
            tasks.save(review);

            // --- Calendar events (anchored to today) ---
            Event biologyLecture = new Event("Biology 101 Lecture", "Science Hall 204", today,
                    LocalTime.of(9, 30), LocalTime.of(10, 30), "purple", nb.get("Biology 101"));
            biologyLecture.setRecurrence("WEEKLY");
            biologyLecture.setRecurrenceInterval(1);
            events.save(biologyLecture);
            events.save(new Event("Study Group - Math", "Library Study Room B", today,
                    LocalTime.of(12, 0), LocalTime.of(13, 0), "amber", nb.get("Math 301")));
            events.save(new Event("History 201 Seminar", "Humanities Building 112", today,
                    LocalTime.of(15, 0), LocalTime.of(16, 15), "green", nb.get("History 201")));

            events.save(new Event("Chemistry Lab", "Chem Lab 3", today.plusDays(2),
                    LocalTime.of(14, 0), LocalTime.of(16, 0), "purple", nb.get("Personal")));
            events.save(new Event("Essay Deadline", null, today.plusDays(3),
                    LocalTime.of(23, 59), null, "red", nb.get("History 201")));
            events.save(new Event("Psychology Review Session", "Room 210", today.plusDays(4),
                    LocalTime.of(10, 0), LocalTime.of(11, 30), "green", nb.get("Psychology")));
            events.save(new Event("Midterm - Chemistry", "Exam Hall A", today.plusDays(10),
                    LocalTime.of(9, 0), LocalTime.of(11, 0), "red", nb.get("Personal")));
            // A couple earlier in the week so the week view isn't one-sided.
            events.save(new Event("Office Hours - History", "Humanities 300", today.minusDays(1),
                    LocalTime.of(13, 0), LocalTime.of(14, 0), "green", nb.get("History 201")));
        };
    }
}
