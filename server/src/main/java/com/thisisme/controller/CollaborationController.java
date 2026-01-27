package com.thisisme.controller;

import com.thisisme.model.dto.CollaborationDTO.*;
import com.thisisme.model.enums.ReactionType;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.CollaborationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/timeline/{entryId}")
public class CollaborationController {

    private final CollaborationService collaborationService;

    public CollaborationController(CollaborationService collaborationService) {
        this.collaborationService = collaborationService;
    }

    // === Comments ===

    @GetMapping("/comments")
    public ResponseEntity<List<CommentResponse>> getComments(
            @PathVariable UUID entryId,
            @AuthenticationPrincipal UserPrincipal principal) {
        List<CommentResponse> comments = collaborationService.getComments(entryId, principal.id());
        return ResponseEntity.ok(comments);
    }

    @PostMapping("/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable UUID entryId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        CommentResponse comment = collaborationService.addComment(entryId, principal.id(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(comment);
    }

    @PutMapping("/comments/{commentId}")
    public ResponseEntity<CommentResponse> updateComment(
            @PathVariable UUID entryId,
            @PathVariable UUID commentId,
            @Valid @RequestBody UpdateCommentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        CommentResponse comment = collaborationService.updateComment(commentId, principal.id(), request);
        return ResponseEntity.ok(comment);
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable UUID entryId,
            @PathVariable UUID commentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        collaborationService.deleteComment(commentId, principal.id());
        return ResponseEntity.noContent().build();
    }

    // === Reactions ===

    @GetMapping("/reactions")
    public ResponseEntity<ReactionSummary> getReactions(
            @PathVariable UUID entryId,
            @AuthenticationPrincipal UserPrincipal principal) {
        ReactionSummary summary = collaborationService.getReactionSummary(entryId, principal.id());
        return ResponseEntity.ok(summary);
    }

    @PostMapping("/reactions")
    public ResponseEntity<ReactionResponse> addReaction(
            @PathVariable UUID entryId,
            @Valid @RequestBody AddReactionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        ReactionResponse reaction = collaborationService.addReaction(entryId, principal.id(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(reaction);
    }

    @DeleteMapping("/reactions/{reactionType}")
    public ResponseEntity<Void> removeReaction(
            @PathVariable UUID entryId,
            @PathVariable ReactionType reactionType,
            @AuthenticationPrincipal UserPrincipal principal) {
        collaborationService.removeReaction(entryId, principal.id(), reactionType);
        return ResponseEntity.noContent().build();
    }
}
