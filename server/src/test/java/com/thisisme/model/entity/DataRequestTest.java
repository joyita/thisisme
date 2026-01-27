package com.thisisme.model.entity;

import com.thisisme.model.enums.DataRequestType;
import com.thisisme.model.enums.RequestStatus;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class DataRequestTest {

    @Test
    void newDataRequest_ShouldHaveCorrectDefaults() {
        User user = new User("Test User", "test@example.com", "hash");
        DataRequest request = new DataRequest(user, DataRequestType.ACCESS, "Give me my data");

        assertEquals(user, request.getRequester());
        assertEquals(DataRequestType.ACCESS, request.getType());
        assertEquals(RequestStatus.PENDING, request.getStatus());
        assertEquals("Give me my data", request.getRequestDetails());
        assertNotNull(request.getDueBy());
    }

    @Test
    void dueBy_ShouldBe30DaysFromCreation() {
        User user = new User("Test User", "test@example.com", "hash");
        DataRequest request = new DataRequest(user, DataRequestType.ACCESS, "details");

        long daysDiff = ChronoUnit.DAYS.between(Instant.now(), request.getDueBy());
        assertTrue(daysDiff >= 29 && daysDiff <= 30);
    }

    @Test
    void extendDeadline_ShouldSetExtendedDueByTo90Days() {
        User user = new User("Test User", "test@example.com", "hash");
        DataRequest request = new DataRequest(user, DataRequestType.ACCESS, "details");
        ReflectionTestUtils.setField(request, "requestedAt", Instant.now());

        request.extendDeadline("Complex request requiring more time");

        assertEquals(RequestStatus.EXTENDED, request.getStatus());
        assertNotNull(request.getExtendedDueBy());
        assertEquals("Complex request requiring more time", request.getExtensionReason());

        // Extended due by should be 90 days from request
        long daysDiff = ChronoUnit.DAYS.between(
            Instant.now(),
            request.getExtendedDueBy()
        );
        assertTrue(daysDiff >= 89 && daysDiff <= 90);
    }

    @Test
    void complete_ShouldSetCompletedAtAndStatus() {
        User user = new User("Test User", "test@example.com", "hash");
        User handler = new User("Admin", "admin@example.com", "hash");
        ReflectionTestUtils.setField(handler, "id", UUID.randomUUID());

        DataRequest request = new DataRequest(user, DataRequestType.ACCESS, "details");

        request.complete("Data exported successfully", handler);

        assertEquals(RequestStatus.COMPLETED, request.getStatus());
        assertNotNull(request.getCompletedAt());
        assertEquals("Data exported successfully", request.getCompletionNotes());
        assertEquals(handler, request.getHandledBy());
    }

    @Test
    void refuse_ShouldSetRefusalReasonAndStatus() {
        User user = new User("Test User", "test@example.com", "hash");
        User handler = new User("Admin", "admin@example.com", "hash");
        ReflectionTestUtils.setField(handler, "id", UUID.randomUUID());

        DataRequest request = new DataRequest(user, DataRequestType.ERASURE, "details");

        request.refuse("Cannot comply - legal hold in place", handler);

        assertEquals(RequestStatus.REFUSED, request.getStatus());
        assertNotNull(request.getCompletedAt());
        assertEquals("Cannot comply - legal hold in place", request.getRefusalReason());
    }

    @Test
    void isOverdue_ShouldReturnTrueWhenPastDueDate() {
        User user = new User("Test User", "test@example.com", "hash");
        DataRequest request = new DataRequest(user, DataRequestType.ACCESS, "details");

        // Set due date to past
        ReflectionTestUtils.setField(request, "dueBy", Instant.now().minus(1, ChronoUnit.DAYS));

        assertTrue(request.isOverdue());
    }

    @Test
    void isOverdue_ShouldReturnFalseWhenCompleted() {
        User user = new User("Test User", "test@example.com", "hash");
        DataRequest request = new DataRequest(user, DataRequestType.ACCESS, "details");

        // Set due date to past but mark as completed
        ReflectionTestUtils.setField(request, "dueBy", Instant.now().minus(1, ChronoUnit.DAYS));
        ReflectionTestUtils.setField(request, "status", RequestStatus.COMPLETED);

        assertFalse(request.isOverdue());
    }

    @Test
    void getEffectiveDeadline_ShouldReturnExtendedDueByIfSet() {
        User user = new User("Test User", "test@example.com", "hash");
        DataRequest request = new DataRequest(user, DataRequestType.ACCESS, "details");
        ReflectionTestUtils.setField(request, "requestedAt", Instant.now());

        Instant originalDueBy = request.getDueBy();
        request.extendDeadline("reason");

        assertNotEquals(originalDueBy, request.getEffectiveDeadline());
        assertEquals(request.getExtendedDueBy(), request.getEffectiveDeadline());
    }
}
