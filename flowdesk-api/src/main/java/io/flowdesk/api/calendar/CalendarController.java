package io.flowdesk.api.calendar;

import io.flowdesk.api.calendar.dto.CalendarRequest;
import io.flowdesk.api.calendar.dto.CalendarResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** REST endpoints for calendars that group events and tasks. */
@RestController
@RequestMapping("/api/calendars")
public class CalendarController {

    private final CalendarService service;

    public CalendarController(CalendarService service) {
        this.service = service;
    }

    @GetMapping
    public List<CalendarResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public CalendarResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CalendarResponse create(@Valid @RequestBody CalendarRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public CalendarResponse update(@PathVariable Long id, @Valid @RequestBody CalendarRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
