package com.thisisme.repository;

import com.thisisme.model.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @Query("SELECT n FROM Notification n WHERE n.recipient.id = :userId AND n.deletedAt IS NULL ORDER BY n.createdAt DESC")
    Page<Notification> findByRecipientId(UUID userId, Pageable pageable);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.recipient.id = :userId AND n.readAt IS NULL AND n.deletedAt IS NULL")
    long countUnreadByRecipientId(UUID userId);

    @Query("SELECT n FROM Notification n WHERE n.recipient.id = :userId AND n.readAt IS NULL AND n.deletedAt IS NULL ORDER BY n.createdAt DESC")
    List<Notification> findRecentUnreadByRecipientId(UUID userId, Pageable pageable);

    @Modifying
    @Query("UPDATE Notification n SET n.readAt = CURRENT_TIMESTAMP WHERE n.recipient.id = :userId AND n.readAt IS NULL AND n.deletedAt IS NULL")
    int markAllAsReadByRecipientId(UUID userId);
}
