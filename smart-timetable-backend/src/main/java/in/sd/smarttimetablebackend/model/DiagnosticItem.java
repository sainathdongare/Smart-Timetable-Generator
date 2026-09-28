package in.sd.smarttimetablebackend.model;

public class DiagnosticItem {
    private String type;        // "OVERLOAD", "COLLISION", "CAPACITY", "LIMIT_EXCEEDED", "INFO"
    private String severity;    // "INFO", "WARNING", "ERROR"
    private String entity;      // Class, Faculty, Room, or Course identifier
    private String message;
    private String suggestion;

    public DiagnosticItem() {
    }

    public DiagnosticItem(String type, String severity, String entity, String message, String suggestion) {
        this.type = type;
        this.severity = severity;
        this.entity = entity;
        this.message = message;
        this.suggestion = suggestion;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getEntity() {
        return entity;
    }

    public void setEntity(String entity) {
        this.entity = entity;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getSuggestion() {
        return suggestion;
    }

    public void setSuggestion(String suggestion) {
        this.suggestion = suggestion;
    }
}
