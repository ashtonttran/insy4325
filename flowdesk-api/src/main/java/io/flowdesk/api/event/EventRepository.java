package io.flowdesk.api.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByDateOrderByStartTimeAsc(LocalDate date);

    List<Event> findByDateBetweenOrderByDateAscStartTimeAsc(LocalDate start, LocalDate end);

    List<Event> findAllByOrderByDateAscStartTimeAsc();
}
