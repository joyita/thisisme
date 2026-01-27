'use client';

import { useState, useEffect } from 'react';
import { collaborationApi, Comment, ReactionType, ReactionSummary } from '@/lib/api';
import { MdSend, MdEdit, MdDelete, MdExpandMore, MdExpandLess } from 'react-icons/md';
import toast from 'react-hot-toast';

interface EntryCollaborationProps {
  entryId: string;
  initialCommentCount?: number;
}

const REACTION_CONFIG: Record<ReactionType, { emoji: string; label: string }> = {
  HEART: { emoji: '❤️', label: 'Love' },
  CELEBRATE: { emoji: '🎉', label: 'Celebrate' },
  SUPPORT: { emoji: '💪', label: 'Support' },
  THANK: { emoji: '🙏', label: 'Thank' },
  INSIGHT: { emoji: '💡', label: 'Insightful' },
  CONCERN: { emoji: '⚠️', label: 'Concern' },
};

export function EntryCollaboration({ entryId, initialCommentCount = 0 }: EntryCollaborationProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<ReactionSummary | null>(null);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  useEffect(() => {
    loadReactions();
  }, [entryId]);

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments, entryId]);

  const loadReactions = async () => {
    try {
      const data = await collaborationApi.getReactions(entryId);
      setReactions(data);
    } catch (err) {
      console.error('Failed to load reactions:', err);
    }
  };

  const loadComments = async () => {
    try {
      const data = await collaborationApi.getComments(entryId);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const handleReaction = async (type: ReactionType) => {
    try {
      const hasReaction = reactions?.userReactions.includes(type);
      if (hasReaction) {
        await collaborationApi.removeReaction(entryId, type);
      } else {
        await collaborationApi.addReaction(entryId, type);
      }
      loadReactions();
    } catch (err) {
      toast.error('Failed to update reaction');
    }
    setShowReactionPicker(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      await collaborationApi.addComment(entryId, newComment.trim());
      setNewComment('');
      loadComments();
      toast.success('Comment added');
    } catch (err) {
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) return;
    setLoading(true);
    try {
      await collaborationApi.updateComment(entryId, commentId, editContent.trim());
      setEditingCommentId(null);
      setEditContent('');
      loadComments();
      toast.success('Comment updated');
    } catch (err) {
      toast.error('Failed to update comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await collaborationApi.deleteComment(entryId, commentId);
      loadComments();
      toast.success('Comment deleted');
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  const totalReactions = reactions ? Object.values(reactions.counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      {/* Reactions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Existing reactions */}
          <div className="flex items-center gap-1">
            {reactions && Object.entries(reactions.counts)
              .filter(([_, count]) => count > 0)
              .map(([type, count]) => {
                const config = REACTION_CONFIG[type as ReactionType];
                const hasUserReacted = reactions.userReactions.includes(type as ReactionType);
                return (
                  <button
                    key={type}
                    onClick={() => handleReaction(type as ReactionType)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      hasUserReacted
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={config.label}
                  >
                    <span>{config.emoji}</span>
                    <span>{count}</span>
                  </button>
                );
              })}
          </div>

          {/* Add reaction button */}
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Add reaction"
            >
              <span className="text-sm">😀</span>
            </button>

            {/* Reaction picker */}
            {showReactionPicker && (
              <div className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-1 z-10">
                {Object.entries(REACTION_CONFIG).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => handleReaction(type as ReactionType)}
                    className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${
                      reactions?.userReactions.includes(type as ReactionType) ? 'bg-purple-50' : ''
                    }`}
                    title={config.label}
                  >
                    <span className="text-lg">{config.emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comments toggle */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <span>💬</span>
          <span>{comments.length || initialCommentCount} comments</span>
          {showComments ? <MdExpandLess className="w-4 h-4" /> : <MdExpandMore className="w-4 h-4" />}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 space-y-3">
          {/* Comment list */}
          {comments.length > 0 ? (
            <div className="space-y-2">
              {comments.map(comment => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">{comment.author.name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleDateString()}
                        {comment.isEdited && ' (edited)'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditContent(comment.content);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <MdEdit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <MdDelete className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateComment(comment.id)}
                        className="px-2 py-1 text-xs bg-purple-600 text-white rounded"
                        disabled={loading}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCommentId(null)}
                        className="px-2 py-1 text-xs text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">No comments yet</p>
          )}

          {/* Add comment form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <button
              onClick={handleAddComment}
              disabled={loading || !newComment.trim()}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MdSend className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
