package io.flowdesk.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Entry point for the FlowDesk Spring Boot API. */
@SpringBootApplication
public class FlowdeskApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(FlowdeskApiApplication.class, args);
    }
}
