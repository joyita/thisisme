// src/components/permissions/PermissionsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { MdAdd, MdDelete, MdPerson, MdRefresh } from 'react-icons/md';
import { Button } from '@/components/ui/Button';
import { PassportPermissionDetail, permissionsApi } from '@/lib/api';
import { ROLE_CONFIG } from '@/lib/constants';
import { InviteUserModal } from './InviteUserModal';
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
  const [permissions, setPermissions] = useState<PassportPermissionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const loadPermissions = async () => {
    setIsLoading(true);
    try {
      const data = await permissionsApi.list(passportId);
      setPermissions(data);
    } catch (err) {
      toast.error('Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
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
      loadPermissions();
    } catch (err) {
      toast.error('Failed to revoke access');
    }
  };

  const getPermissionSummary = (p: PassportPermissionDetail): string => {
    const perms: string[] = [];
    if (p.canViewTimeline || p.canAddTimelineEntries) perms.push('Timeline');
    if (p.canViewDocuments || p.canUploadDocuments) perms.push('Documents');
    return perms.length > 0 ? perms.join(', ') : 'No access';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading permissions...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Permissions</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadPermissions} className="flex items-center gap-2">
            <MdRefresh className="w-5 h-5" />
            Refresh
          </Button>
          <Button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2">
            <MdAdd className="w-5 h-5" />
            Invite User
          </Button>
        </div>
      </div>

      {permissions.length === 0 ? (
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
            {permissions.map(permission => {
              const roleConfig = ROLE_CONFIG[permission.role as keyof typeof ROLE_CONFIG];
              return (
                <div key={permission.id} className="p-4 hover:bg-gray-50">
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
                        </div>
                        <p className="text-sm text-gray-500">{permission.userEmail}</p>
                        <p className="text-xs text-gray-400 mt-1">{getPermissionSummary(permission)}</p>
                        {permission.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">{permission.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
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
              );
            })}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <InviteUserModal
        passportId={passportId}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={loadPermissions}
      />
    </div>
  );
}
