package com.thisisme.repository;

import com.thisisme.model.entity.CustomRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomRoleRepository extends JpaRepository<CustomRole, UUID> {

    List<CustomRole> findByPassportId(UUID passportId);

    Optional<CustomRole> findByPassportIdAndName(UUID passportId, String name);
}
