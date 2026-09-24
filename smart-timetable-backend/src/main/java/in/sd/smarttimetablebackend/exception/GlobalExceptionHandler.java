package in.sd.smarttimetablebackend.exception;

import in.sd.smarttimetablebackend.model.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(TimetableException.class)
    public ResponseEntity<ErrorResponse> handleTimetableException(
            TimetableException exception) {

        ErrorResponse response = new ErrorResponse(
                exception.getMessage(),
                exception.getRequired(),
                exception.getAvailable()
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneralException(Exception exception) {
        ErrorResponse response = new ErrorResponse(
                exception.getMessage() != null ? exception.getMessage() : "An unexpected internal server error occurred"
        );
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(response);
    }
}