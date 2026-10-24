package io.flowdesk.api.calendar;

import io.flowdesk.api.calendar.dto.CalendarRequest;
import io.flowdesk.api.calendar.dto.CalendarResponse;
import io.flowdesk.api.common.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/** Business logic for calendars. */
@Service
public class CalendarService {

    private static final Set<String> TONES = Set.of("purple", "amber", "green", "red");

    private final CalendarRepository calendars;

    public CalendarService(CalendarRepository calendars) {
        this.calendars = calendars;
    }

    @Transactional(readOnly = true)
    public List<CalendarResponse> list() {
        return calendars.findAllByOrderByNameAsc().stream().map(CalendarResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CalendarResponse get(Long id) {
        return CalendarResponse.from(findOrThrow(id));
    }

    @Transactional
    public CalendarResponse create(CalendarRequest req) {
        Calendar calendar = new Calendar(
                req.name().trim(),
                normalizeDescription(req.description()),
                normalizeTone(req.tone())
        );
        return CalendarResponse.from(calendars.save(calendar));
    }

    @Transactional
    public CalendarResponse update(Long id, CalendarRequest req) {
        Calendar calendar = findOrThrow(id);
        calendar.setName(req.name().trim());
        calendar.setDescription(normalizeDescription(req.description()));
        calendar.setTone(normalizeTone(req.tone()));
        calendar.touch();
        return CalendarResponse.from(calendars.save(calendar));
    }

    @Transactional
    public void delete(Long id) {
        if (!calendars.existsById(id)) {
            throw new NotFoundException("Calendar " + id + " not found");
        }
        calendars.deleteById(id);
    }

    private Calendar findOrThrow(Long id) {
        return calendars.findById(id)
                .orElseThrow(() -> new NotFoundException("Calendar " + id + " not found"));
    }

    private String normalizeDescription(String description) {
        if (description == null) return null;
        String d = description.trim();
        return d.isEmpty() ? null : d;
    }

    private String normalizeTone(String tone) {
        if (tone == null || tone.isBlank()) return "purple";
        String t = tone.trim().toLowerCase();
        return TONES.contains(t) ? t : "purple";
    }
}
