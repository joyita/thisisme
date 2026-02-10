package com.thisisme.repository;

import com.thisisme.model.entity.Passport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PassportRepository extends JpaRepository<Passport, UUID> {

    @Query("SELECT p FROM Passport p WHERE p.id = :id AND p.active = true AND p.deletedAt IS NULL")
    Optional<Passport> findActiveById(@Param("id") UUID id);

    @Query("SELECT p FROM Passport p JOIN p.permissions perm " +
           "WHERE perm.user.id = :userId AND perm.revokedAt IS NULL AND p.active = true")
    List<Passport> findAllAccessibleByUser(@Param("userId") UUID userId);

    @Query("SELECT p FROM Passport p WHERE p.createdBy.id = :userId AND p.active = true")
    List<Passport> findAllByCreator(@Param("userId") UUID userId);

    @Query("SELECT p FROM Passport p WHERE p.scheduledForDeletionAt IS NOT NULL " +
           "AND p.scheduledForDeletionAt <= :now")
    List<Passport> findScheduledForDeletion(@Param("now") Instant now);

    @Query("SELECT p FROM Passport p WHERE p.subjectUser.id = :userId AND p.active = true")
    Optional<Passport> findBySubjectUserId(@Param("userId") UUID userId);
}
