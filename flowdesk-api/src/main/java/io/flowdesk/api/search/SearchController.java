package io.flowdesk.api.search;

import io.flowdesk.api.search.dto.SearchResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** REST endpoint for global search across notes and tasks. */
@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService service;

    public SearchController(SearchService service) {
        this.service = service;
    }

    @GetMapping
    public List<SearchResult> search(@RequestParam(name = "q", required = false) String q) {
        return service.search(q);
    }
}
