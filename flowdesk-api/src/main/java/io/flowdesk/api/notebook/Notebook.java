package io.flowdesk.api.notebook;

import io.flowdesk.api.folder.Folder;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** A notebook groups related notes (e.g. "History 201"). */
@Entity
@Table(name = "notebooks")
public class Notebook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** Optional folder this notebook belongs to; null means ungrouped. */
    @ManyToOne
    @JoinColumn(name = "folder_id")
    private Folder folder;

    protected Notebook() {
    }

    public Notebook(String name) {
        this.name = name;
    }

    public Notebook(String name, Folder folder) {
        this.name = name;
        this.folder = folder;
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

    public Folder getFolder() {
        return folder;
    }

    public void setFolder(Folder folder) {
        this.folder = folder;
    }
}
