package com.thisisme.repository;

import com.thisisme.model.entity.SectionRevision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SectionRevisionRepository extends JpaRepository<SectionRevision, UUID> {

    @Query("SELECT sr FROM SectionRevision sr WHERE sr.section.id = :sectionId ORDER BY sr.createdAt DESC")
    List<SectionRevision> findBySectionIdOrderByCreatedAtDesc(@Param("sectionId") UUID sectionId);

    @Query("SELECT COUNT(sr) FROM SectionRevision sr WHERE sr.section.id = :sectionId")
    long countBySectionId(@Param("sectionId") UUID sectionId);
}
