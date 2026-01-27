package com.thisisme.repository;

import com.thisisme.model.entity.NotificationPreference;
import com.thisisme.model.enums.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, UUID> {

    @Query("SELECT p FROM NotificationPreference p WHERE p.user.id = :userId")
    List<NotificationPreference> findByUserId(UUID userId);

    @Query("SELECT p FROM NotificationPreference p WHERE p.user.id = :userId AND p.notificationType = :type")
    Optional<NotificationPreference> findByUserIdAndType(UUID userId, NotificationType type);

    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN p.enabled ELSE true END FROM NotificationPreference p WHERE p.user.id = :userId AND p.notificationType = :type")
    boolean isNotificationEnabled(UUID userId, NotificationType type);
}
