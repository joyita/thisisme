package com.thisisme.repository;

import com.thisisme.model.entity.DataRequest;
import com.thisisme.model.enums.DataRequestType;
import com.thisisme.model.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface DataRequestRepository extends JpaRepository<DataRequest, UUID> {

    List<DataRequest> findByRequesterId(UUID requesterId);

    List<DataRequest> findByRequesterIdAndStatus(UUID requesterId, RequestStatus status);

    @Query("SELECT d FROM DataRequest d WHERE d.status IN :statuses ORDER BY d.dueBy ASC")
    List<DataRequest> findByStatusIn(@Param("statuses") List<RequestStatus> statuses);

    @Query("SELECT d FROM DataRequest d WHERE d.status NOT IN ('COMPLETED', 'REFUSED') " +
           "AND ((d.extendedDueBy IS NOT NULL AND d.extendedDueBy <= :now) " +
           "OR (d.extendedDueBy IS NULL AND d.dueBy <= :now))")
    List<DataRequest> findOverdue(@Param("now") Instant now);

    @Query("SELECT d FROM DataRequest d WHERE d.type = :type " +
           "AND d.status NOT IN ('COMPLETED', 'REFUSED') ORDER BY d.dueBy ASC")
    List<DataRequest> findPendingByType(@Param("type") DataRequestType type);

    @Query("SELECT COUNT(d) FROM DataRequest d WHERE d.status NOT IN ('COMPLETED', 'REFUSED')")
    long countPending();
}
