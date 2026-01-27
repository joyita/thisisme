package com.thisisme.repository;

import com.thisisme.model.entity.ShareLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShareLinkRepository extends JpaRepository<ShareLink, UUID> {

    Optional<ShareLink> findByToken(String token);

    @Query("SELECT s FROM ShareLink s WHERE s.token = :token " +
           "AND s.active = true AND (s.expiresAt IS NULL OR s.expiresAt > :now)")
    Optional<ShareLink> findValidByToken(@Param("token") String token, @Param("now") Instant now);

    @Query("SELECT s FROM ShareLink s WHERE s.passport.id = :passportId " +
           "AND s.active = true ORDER BY s.createdAt DESC")
    List<ShareLink> findActiveByPassportId(@Param("passportId") UUID passportId);

    @Query("SELECT s FROM ShareLink s WHERE s.passport.id = :passportId " +
           "ORDER BY s.createdAt DESC")
    List<ShareLink> findAllByPassportId(@Param("passportId") UUID passportId);

    @Query("SELECT s FROM ShareLink s WHERE s.expiresAt IS NOT NULL " +
           "AND s.expiresAt <= :now AND s.active = true")
    List<ShareLink> findExpired(@Param("now") Instant now);
}
