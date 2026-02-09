// src/components/permissions/PermissionsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { MdAdd, MdDelete, MdPerson, MdRefresh, MdEmail, MdKeyboardArrowDown, MdKeyboardArrowUp, MdEdit, MdContentCopy } from 'react-icons/md';
import { Button } from '@/components/ui/Button';
import { CustomRole, PassportPermissionDetail, PendingInvitation, PermissionKey, customRolesApi, permissionsApi, invitationsApi } from '@/lib/api';
import { ROLE_CONFIG, PERMISSION_CATEGORIES } from '@/lib/constants';
import { InviteUserModal } from './InviteUserModal';
import { CustomRoleModal } from './CustomRoleModal';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface PermissionsTabProps {
  passportId: string;
}

const roleColors: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  CO_PARENT: 'bg-blue-100 text-blue-700',
  PROFESSIONAL: 'bg-green-100 text-green-700',
  VIEWER: 'bg-gray-100 text-gray-700',
};

export function PermissionsTab({ passportId }: PermissionsTabProps) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PassportPermissionDetail[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [customRoleModal, setCustomRoleModal] = useState<{ open: boolean; editing: CustomRole | null }>({ open: false, editing: null });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [perms, invites, roles] = await Promise.all([
        permissionsApi.list(passportId),
        invitationsApi.list(passportId),
        customRolesApi.list(passportId),
      ]);
      setPermissions(perms);
      setInvitations(invites);
      setCustomRoles(roles);
    } catch {
      toast.error('Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [passportId]);

  const handleRevoke = async (permission: PassportPermissionDetail) => {
    if (permission.role === 'OWNER') {
      toast.error('Cannot revoke owner access');
      return;
    }

    if (!confirm(`Are you sure you want to revoke access for ${permission.userName}?`)) {
      return;
    }

    try {
      await permissionsApi.revoke(passportId, permission.id);
      toast.success('Access revoked');
      loadData();
    } catch {
      toast.error('Failed to revoke access');
    }
  };

  const handleResendInvite = async (invitation: PendingInvitation) => {
    try {
      await invitationsApi.resend(passportId, invitation.id);
      toast.success(`Invitation resent to ${invitation.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend invitation');
    }
  };

  const handleRevokeInvite = async (invitation: PendingInvitation) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${invitation.email}?`)) {
      return;
    }

    try {
      await invitationsApi.revoke(passportId, invitation.id);
      toast.success('Invitation revoked');
      loadData();
    } catch {
      toast.error('Failed to revoke invitation');
    }
  };

  const handleDeleteCustomRole = async (role: CustomRole) => {
    if (!confirm(`Delete custom role "${role.name}"? Existing grants using this role are not affected.`)) return;
    try {
      await customRolesApi.remove(passportId, role.id);
      toast.success('Custom role deleted');
      loadData();
    } catch {
      toast.error('Failed to delete custom role');
    }
  };

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isOwnerViewing = permissions.some(p => p.role === 'OWNER' && p.userId === user?.id);

  const handleToggle = async (permission: PassportPermissionDetail, key: PermissionKey) => {
    const newValue = !permission[key];
    try {
      await permissionsApi.update(passportId, permission.id, { [key]: newValue });
      toast.success('Permission updated');
      loadData();
    } catch {
      toast.error('Failed to update permission');
    }
  };

  const getPermissionSummary = (p: PassportPermissionDetail): string => {
    const perms: string[] = [];
    if (p.canViewTimeline || p.canAddTimelineEntries) perms.push('Timeline');
    if (p.canViewDocuments || p.canUploadDocuments) perms.push('Documents');
    if (p.canEditSections) perms.push('Sections');
    return perms.length > 0 ? perms.join(', ') : 'View only';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading permissions...</p>
      </div>
    );
  }

  const hasAnyEntries = permissions.length > 0 || invitations.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Permissions</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} className="flex items-center gap-2">
            <MdRefresh className="w-5 h-5" />
            Refresh
          </Button>
          <Button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2">
            <MdAdd className="w-5 h-5" />
            Invite User
          </Button>
        </div>
      </div>

      {!hasAnyEntries ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <MdPerson className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
          <p className="text-gray-600 mb-4">Invite teachers, therapists, or caregivers to collaborate.</p>
          <Button onClick={() => setShowInviteModal(true)}>
            <MdAdd className="w-5 h-5 mr-2" />
            Invite User
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {/* Granted permissions */}
            {permissions.map(permission => {
              const roleConfig = ROLE_CONFIG[permission.role as keyof typeof ROLE_CONFIG];
              const isExpanded = expandedId === permission.id;
              const canExpand = permission.role !== 'OWNER';
              return (
                <div key={permission.id} className="hover:bg-gray-50">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {permission.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{permission.userName}</h4>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${roleColors[permission.role] || 'bg-gray-100 text-gray-700'}`}>
                              {roleConfig?.label || permission.role}
                            </span>
                            {permission.customRoleName && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-100 text-indigo-700">
                                {permission.customRoleName}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{permission.userEmail}</p>
                          <p className="text-xs text-gray-400 mt-1">{getPermissionSummary(permission)}</p>
                          {permission.notes && (
                            <p className="text-xs text-gray-500 mt-1 italic">{permission.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {canExpand && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : permission.id)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                            title={isExpanded ? 'Collapse permissions' : 'Edit permissions'}
                          >
                            {isExpanded ? <MdKeyboardArrowUp className="w-5 h-5" /> : <MdKeyboardArrowDown className="w-5 h-5" />}
                          </button>
                        )}
                        {permission.role !== 'OWNER' && (
                          <button
                            onClick={() => handleRevoke(permission)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                            title="Revoke access"
                          >
                            <MdDelete className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                      {PERMISSION_CATEGORIES.map(category => (
                        <div key={category.label} className="mb-3 last:mb-0">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{category.label}</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {category.permissions.map(({ key, label }) => {
                              const enabled = permission[key];
                              const editable = isOwnerViewing;
                              return (
                                <label
                                  key={key}
                                  className={`flex items-center gap-2 text-sm ${editable ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    disabled={!editable}
                                    onChange={() => editable && handleToggle(permission, key)}
                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                                  />
                                  <span className={enabled ? 'text-gray-800' : 'text-gray-400'}>{label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pending invitations */}
            {invitations.map(invitation => {
              const roleConfig = ROLE_CONFIG[invitation.role as keyof typeof ROLE_CONFIG];
              return (
                <div key={invitation.id} className="p-4 hover:bg-gray-50 bg-amber-50/40">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white flex-shrink-0">
                        <MdEmail className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{invitation.email}</h4>
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">
                            Pending
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${roleColors[invitation.role] || 'bg-gray-100 text-gray-700'}`}>
                            {roleConfig?.label || invitation.role}
                          </span>
                          {invitation.customRoleName && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-100 text-indigo-700">
                              {invitation.customRoleName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Invited by {invitation.invitedByName} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                        {invitation.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">{invitation.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {invitation.inviteLink && (
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(invitation.inviteLink!);
                              toast.success('Invite link copied');
                            } catch {
                              toast.error('Failed to copy link');
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md"
                          title="Copy invite link"
                        >
                          <MdContentCopy className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleResendInvite(invitation)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Resend invitation"
                      >
                        <MdEmail className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleRevokeInvite(invitation)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                        title="Revoke invitation"
                      >
                        <MdDelete className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Roles Management */}
      {isOwnerViewing && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">Custom Roles</h3>
            <Button
              variant="outline"
              onClick={() => setCustomRoleModal({ open: true, editing: null })}
              className="flex items-center gap-1 text-sm"
            >
              <MdAdd className="w-4 h-4" /> New Role
            </Button>
          </div>

          {customRoles.length === 0 ? (
            <p className="text-sm text-gray-500">
              No custom roles yet. Create one to define a reusable permission template.
            </p>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {customRoles.map(cr => (
                  <div key={cr.id} className="p-3 flex items-start justify-between hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{cr.name}</p>
                      {cr.description && <p className="text-xs text-gray-500 mt-0.5">{cr.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCustomRoleModal({ open: true, editing: cr })}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Edit role"
                      >
                        <MdEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomRole(cr)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                        title="Delete role"
                      >
                        <MdDelete className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <InviteUserModal
        passportId={passportId}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={loadData}
      />

      <CustomRoleModal
        passportId={passportId}
        isOpen={customRoleModal.open}
        editing={customRoleModal.editing}
        onClose={() => setCustomRoleModal({ open: false, editing: null })}
        onSuccess={loadData}
      />
    </div>
  );
}
