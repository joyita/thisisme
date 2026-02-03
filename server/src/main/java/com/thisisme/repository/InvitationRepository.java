package com.thisisme.repository;

import com.thisisme.model.entity.Invitation;
import com.thisisme.model.enums.InvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, UUID> {

    Optional<Invitation> findByToken(String token);

    @Query("SELECT i FROM Invitation i WHERE i.passport.id = :passportId AND i.status = :status")
    List<Invitation> findByPassportIdAndStatus(
        @Param("passportId") UUID passportId,
        @Param("status") InvitationStatus status);

    @Query("SELECT i FROM Invitation i WHERE i.passport.id = :passportId " +
           "AND i.status IN (:statuses) ORDER BY i.createdAt DESC")
    List<Invitation> findByPassportIdAndStatusIn(
        @Param("passportId") UUID passportId,
        @Param("statuses") List<InvitationStatus> statuses);

    @Query("SELECT i FROM Invitation i WHERE i.email = :email AND i.status = 'PENDING' " +
           "AND i.expiresAt > :now")
    List<Invitation> findActivePendingByEmail(
        @Param("email") String email,
        @Param("now") Instant now);

    @Query("SELECT i FROM Invitation i WHERE i.passport.id = :passportId " +
           "AND i.email = :email AND i.status = 'PENDING' AND i.expiresAt > :now")
    Optional<Invitation> findActivePendingByPassportAndEmail(
        @Param("passportId") UUID passportId,
        @Param("email") String email,
        @Param("now") Instant now);
}
