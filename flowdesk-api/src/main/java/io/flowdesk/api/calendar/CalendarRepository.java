package io.flowdesk.api.calendar;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CalendarRepository extends JpaRepository<Calendar, Long> {
    Optional<Calendar> findByNameIgnoreCase(String name);

    List<Calendar> findAllByOrderByNameAsc();
}
