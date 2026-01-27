package com.thisisme.repository;

import com.thisisme.model.entity.PassportPermission;
import com.thisisme.model.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PassportPermissionRepository extends JpaRepository<PassportPermission, UUID> {

    @Query("SELECT p FROM PassportPermission p WHERE p.passport.id = :passportId " +
           "AND p.user.id = :userId AND p.revokedAt IS NULL")
    Optional<PassportPermission> findActivePermission(
        @Param("passportId") UUID passportId,
        @Param("userId") UUID userId);

    @Query("SELECT p FROM PassportPermission p WHERE p.passport.id = :passportId " +
           "AND p.revokedAt IS NULL")
    List<PassportPermission> findActiveByPassportId(@Param("passportId") UUID passportId);

    @Query("SELECT p FROM PassportPermission p WHERE p.user.id = :userId " +
           "AND p.revokedAt IS NULL")
    List<PassportPermission> findActiveByUserId(@Param("userId") UUID userId);

    @Query("SELECT p FROM PassportPermission p WHERE p.passport.id = :passportId " +
           "AND p.role IN :roles AND p.revokedAt IS NULL")
    List<PassportPermission> findActiveByPassportIdAndRoles(
        @Param("passportId") UUID passportId,
        @Param("roles") List<Role> roles);

    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END " +
           "FROM PassportPermission p WHERE p.passport.id = :passportId " +
           "AND p.user.id = :userId AND p.role IN :roles AND p.revokedAt IS NULL")
    boolean hasAnyRole(
        @Param("passportId") UUID passportId,
        @Param("userId") UUID userId,
        @Param("roles") List<Role> roles);
}
