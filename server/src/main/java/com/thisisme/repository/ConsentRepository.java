package com.thisisme.repository;

import com.thisisme.model.entity.Consent;
import com.thisisme.model.enums.ConsentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConsentRepository extends JpaRepository<Consent, UUID> {

    @Query("SELECT c FROM Consent c WHERE c.user.id = :userId AND c.type = :type " +
           "AND c.withdrawnAt IS NULL ORDER BY c.grantedAt DESC")
    Optional<Consent> findActiveConsent(@Param("userId") UUID userId, @Param("type") ConsentType type);

    @Query("SELECT c FROM Consent c WHERE c.user.id = :userId AND c.passport.id = :passportId " +
           "AND c.type = :type AND c.withdrawnAt IS NULL")
    Optional<Consent> findActiveConsentForPassport(
        @Param("userId") UUID userId,
        @Param("passportId") UUID passportId,
        @Param("type") ConsentType type);

    @Query("SELECT c FROM Consent c WHERE c.user.id = :userId ORDER BY c.grantedAt DESC")
    List<Consent> findAllByUser(@Param("userId") UUID userId);

    @Query("SELECT c FROM Consent c WHERE c.user.id = :userId AND c.withdrawnAt IS NULL")
    List<Consent> findAllActiveByUser(@Param("userId") UUID userId);

    @Query("SELECT c FROM Consent c WHERE c.passport.id = :passportId ORDER BY c.grantedAt DESC")
    List<Consent> findAllByPassport(@Param("passportId") UUID passportId);

    boolean existsByUserIdAndTypeAndWithdrawnAtIsNull(UUID userId, ConsentType type);
}
