package com.thisisme.controller;

import com.thisisme.model.dto.ChildAccountDTO.*;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.ChildAccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/passports/{passportId}/child-account")
public class ChildAccountController {

    private final ChildAccountService childAccountService;

    public ChildAccountController(ChildAccountService childAccountService) {
        this.childAccountService = childAccountService;
    }

    @PostMapping
    public ResponseEntity<ChildAccountResponse> createChildAccount(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId,
            @Valid @RequestBody CreateChildAccountRequest request) {
        ChildAccountResponse response = childAccountService.createChildAccount(
            principal.id(), passportId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<ChildAccountResponse> getChildAccount(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId) {
        return ResponseEntity.ok(childAccountService.getChildAccount(principal.id(), passportId));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetChildPassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId,
            @Valid @RequestBody ResetChildPasswordRequest request) {
        childAccountService.resetChildPassword(principal.id(), passportId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/deactivate")
    public ResponseEntity<Void> deactivateChildAccount(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId) {
        childAccountService.deactivateChildAccount(principal.id(), passportId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteChildAccount(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId) {
        childAccountService.deleteChildAccount(principal.id(), passportId);
        return ResponseEntity.noContent().build();
    }
}
