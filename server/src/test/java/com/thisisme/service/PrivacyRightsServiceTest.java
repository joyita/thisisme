package com.thisisme.service;

import com.thisisme.model.entity.DataRequest;
import com.thisisme.model.entity.Passport;
import com.thisisme.model.entity.User;
import com.thisisme.model.enums.DataRequestType;
import com.thisisme.model.enums.RequestStatus;
import com.thisisme.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrivacyRightsServiceTest {

    @Mock private DataRequestRepository dataRequestRepository;
    @Mock private UserRepository userRepository;
    @Mock private PassportRepository passportRepository;
    @Mock private ConsentRepository consentRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private TimelineEntryRepository timelineEntryRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private AuditService auditService;
    @Mock private AuditService.AuditLogBuilder auditLogBuilder;

    private PrivacyRightsService privacyRightsService;
    private User testUser;

    @BeforeEach
    void setUp() {
        privacyRightsService = new PrivacyRightsService(
            dataRequestRepository,
            userRepository,
            passportRepository,
            consentRepository,
            auditLogRepository,
            timelineEntryRepository,
            documentRepository,
            auditService
        );

        testUser = new User("Test User", "test@example.com", "hashedPassword");
        ReflectionTestUtils.setField(testUser, "id", UUID.randomUUID());

        // Setup audit service mock chain with lenient stubbing
        lenient().when(auditService.log(any(), any(), any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withEntity(any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withDescription(any())).thenReturn(auditLogBuilder);
    }

    @Test
    void submitAccessRequest_ShouldCreateRequestWithCorrectDueDate() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(dataRequestRepository.save(any(DataRequest.class))).thenAnswer(i -> {
            DataRequest r = i.getArgument(0);
            ReflectionTestUtils.setField(r, "id", UUID.randomUUID());
            return r;
        });

        DataRequest result = privacyRightsService.submitAccessRequest(
            testUser.getId(),
            "I want all my data",
            "192.168.1.1"
        );

        assertNotNull(result);
        assertEquals(DataRequestType.ACCESS, result.getType());
        assertEquals(RequestStatus.PENDING, result.getStatus());
        assertNotNull(result.getDueBy());

        long daysDifference = java.time.Duration.between(
            java.time.Instant.now(),
            result.getDueBy()
        ).toDays();
        assertTrue(daysDifference >= 29 && daysDifference <= 31);
    }

    @Test
    void submitErasureRequest_ShouldCreateErasureRequest() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(dataRequestRepository.save(any(DataRequest.class))).thenAnswer(i -> {
            DataRequest r = i.getArgument(0);
            ReflectionTestUtils.setField(r, "id", UUID.randomUUID());
            return r;
        });

        DataRequest result = privacyRightsService.submitErasureRequest(
            testUser.getId(),
            "Please delete all my data",
            "192.168.1.1"
        );

        assertNotNull(result);
        assertEquals(DataRequestType.ERASURE, result.getType());
        assertEquals(RequestStatus.PENDING, result.getStatus());
    }

    @Test
    void generateDataExport_ShouldIncludeUserData() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(passportRepository.findAllByCreator(testUser.getId())).thenReturn(Collections.emptyList());
        when(consentRepository.findAllByUser(testUser.getId())).thenReturn(Collections.emptyList());

        Map<String, Object> export = privacyRightsService.generateDataExport(testUser.getId());

        assertNotNull(export);
        assertEquals("UK_GDPR_SAR", export.get("exportType"));
        assertEquals("ThisIsMe", export.get("dataController"));

        @SuppressWarnings("unchecked")
        Map<String, Object> userData = (Map<String, Object>) export.get("userData");
        assertNotNull(userData);
        assertEquals(testUser.getId(), userData.get("id"));
        assertEquals(testUser.getName(), userData.get("name"));
        assertEquals(testUser.getEmail(), userData.get("email"));
    }

    @Test
    void exportAsJson_ShouldReturnValidJson() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(passportRepository.findAllByCreator(testUser.getId())).thenReturn(Collections.emptyList());
        when(consentRepository.findAllByUser(testUser.getId())).thenReturn(Collections.emptyList());

        String json = privacyRightsService.exportAsJson(testUser.getId());

        assertNotNull(json);
        assertTrue(json.contains("\"exportType\""));
        assertTrue(json.contains("\"userData\""));
        assertTrue(json.contains(testUser.getEmail()));
    }

    @Test
    void exportAsCsv_ShouldReturnValidCsv() {
        Passport passport = new Passport("Test Child", testUser);
        ReflectionTestUtils.setField(passport, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(passport, "sections", Collections.emptyList());
        ReflectionTestUtils.setField(passport, "timelineEntries", Collections.emptyList());

        when(passportRepository.findAllByCreator(testUser.getId())).thenReturn(Collections.singletonList(passport));

        String csv = privacyRightsService.exportAsCsv(testUser.getId());

        assertNotNull(csv);
        assertTrue(csv.startsWith("Type,Date,Title,Content"));
    }

    @Test
    void submitAccessRequest_ShouldThrowExceptionForNonExistentUser() {
        UUID nonExistentId = UUID.randomUUID();
        when(userRepository.findById(nonExistentId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
            privacyRightsService.submitAccessRequest(nonExistentId, "details", "192.168.1.1")
        );
    }
}
