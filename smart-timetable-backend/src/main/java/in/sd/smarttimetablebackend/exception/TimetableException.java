package in.sd.smarttimetablebackend.exception;

public class TimetableException extends RuntimeException {
    private final int required;
    private final int available;

    public TimetableException(
            String message,
            int required,
            int available) {

        super(message);

        this.required = required;
        this.available = available;
    }

    public int getRequired() {
        return required;
    }

    public int getAvailable() {
        return available;
    }
}
