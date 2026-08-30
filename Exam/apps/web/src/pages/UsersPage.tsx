import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { EntityDiffViewer } from '../components/EntityDiffViewer';
import { ImpersonationModal } from '../components/ImpersonationModal';
import { API_BASE } from '../config/api';

interface UserRecord {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  roles: string[];
  createdAt: string;
  updatedAt?: string;
}

interface UserVersion {
  id: string;
  entityType: string;
  entityId: string;
  version: number;
  data: any;
  changeSummary: string;
  createdBy: string;
  createdAt: string;
}

export interface PreviewAuditLogItem {
  id: string;
  actorUserId: string;
  actorEmail?: string;
  effectiveUserId: string;
  effectiveEmail?: string;
  mode: 'PREVIEW_STUDENT' | 'IMPERSONATE_REAL_STUDENT';
  action: string;
  resource?: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeSubtab, setActiveSubtab] = useState<'ROSTER' | 'AUDIT_TRAIL'>('ROSTER');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Audit Trail State (Phase 10)
  const [auditLogs, setAuditLogs] = useState<PreviewAuditLogItem[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');

  const canReadAuditLogs =
    currentUser?.permissions?.includes('preview.audit_read') ||
    currentUser?.permissions?.includes('*') ||
    currentUser?.roles?.includes('MAIN_ADMIN') ||
    currentUser?.roles?.includes('SUB_ADMIN');

  // Modals & Drawers
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [historyUser, setHistoryUser] = useState<UserRecord | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [userVersions, setUserVersions] = useState<UserVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Diff State
  const [diffBaseVersion, setDiffBaseVersion] = useState<UserVersion | null>(null);
  const [diffTargetVersion, setDiffTargetVersion] = useState<UserVersion | null>(null);
  const [showDiffView, setShowDiffView] = useState<boolean>(false);

  // Edit Form State
  const [editFirstName, setEditFirstName] = useState<string>('');
  const [editLastName, setEditLastName] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('ACTIVE');
  const [editRole, setEditRole] = useState<string>('STUDENT');

  // Create Form State
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newFirstName, setNewFirstName] = useState<string>('');
  const [newLastName, setNewLastName] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('TEACHER');

  const token = localStorage.getItem('token');

  const fetchAuditLogs = async () => {
    try {
      setLoadingAuditLogs(true);
      setAuditError(null);
      const res = await fetch(`${API_BASE}/preview/audit-logs?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.data.items || []);
      } else {
        setAuditError(data.message || 'Failed to load security audit trail');
      }
    } catch (err: any) {
      setAuditError(err.message || 'Network error loading audit trail');
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch users');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (u: UserRecord) => {
    setEditingUser(u);
    setEditFirstName(u.firstName || '');
    setEditLastName(u.lastName || '');
    setEditStatus(u.status || 'ACTIVE');
    setEditRole(u.roles && u.roles.length > 0 ? u.roles[0] : 'STUDENT');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const roleId = editRole === 'MAIN_ADMIN' ? 'r1' : editRole === 'SUB_ADMIN' ? 'r2' : editRole === 'TEACHER' ? 'r3' : 'r4';
      const res = await fetch(`${API_BASE}/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          status: editStatus,
          roleIds: [roleId],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingUser(null);
        await fetchUsers();
        if (historyUser && historyUser.id === editingUser.id) {
          await openHistoryDrawer(editingUser);
        }
      } else {
        alert(data.message || 'Failed to update user profile');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating user profile');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const roleId = newRole === 'MAIN_ADMIN' ? 'r1' : newRole === 'SUB_ADMIN' ? 'r2' : newRole === 'TEACHER' ? 'r3' : 'r4';
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          firstName: newFirstName,
          lastName: newLastName,
          roleIds: [roleId],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewEmail('');
        setNewPassword('');
        setNewFirstName('');
        setNewLastName('');
        await fetchUsers();
      } else {
        alert(data.message || 'Failed to create user');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating user');
    }
  };

  const openHistoryDrawer = async (u: UserRecord) => {
    setHistoryUser(u);
    setLoadingVersions(true);
    setShowDiffView(false);
    setDiffBaseVersion(null);
    setDiffTargetVersion(null);
    try {
      const res = await fetch(`${API_BASE}/users/${u.id}/versions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        const rawVersions: UserVersion[] = data.data || [];
        const parsed = rawVersions.map((v) => ({
          ...v,
          data: typeof v.data === 'string' ? JSON.parse(v.data) : v.data,
        }));
        setUserVersions(parsed);
      }
    } catch (err) {
      console.error('Failed to fetch user version history:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleRollback = async (userId: string, version: number) => {
    if (!window.confirm(`Are you sure you want to rollback this user profile to version ${version}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/${userId}/versions/${version}/rollback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        await fetchUsers();
        if (historyUser) {
          await openHistoryDrawer(historyUser);
        }
        setShowDiffView(false);
      } else {
        alert(data.message || 'Rollback failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing rollback');
    }
  };

  const filteredAuditLogs = auditLogs.filter((log) => {
    const q = auditSearchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      log.actorUserId.toLowerCase().includes(q) ||
      (log.actorEmail && log.actorEmail.toLowerCase().includes(q)) ||
      log.effectiveUserId.toLowerCase().includes(q) ||
      (log.effectiveEmail && log.effectiveEmail.toLowerCase().includes(q)) ||
      log.action.toLowerCase().includes(q) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(q));

    const matchesAction =
      auditActionFilter === 'ALL' ||
      log.action === auditActionFilter ||
      (auditActionFilter === 'PREVIEW_ALL' && log.mode === 'PREVIEW_STUDENT') ||
      (auditActionFilter === 'IMPERSONATION_ALL' && log.mode === 'IMPERSONATE_REAL_STUDENT');

    return matchesSearch && matchesAction;
  });

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.email.toLowerCase().includes(q) ||
      (u.firstName && u.firstName.toLowerCase().includes(q)) ||
      (u.lastName && u.lastName.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q);

    const matchesRole =
      roleFilter === 'ALL' ||
      (u.roles && u.roles.includes(roleFilter));

    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
      {/* Header & Subtab Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
            User Management & Security Audit Center
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Full git-style user revision audit chain (ADR-010) and preview/impersonation access logs (ADR-008 & Spec 06).
          </p>
        </div>
        {activeSubtab === 'ROSTER' && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: '#06b6d4',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            + Create User
          </button>
        )}
      </div>

      {/* Subtab Navigation (Roster vs Security Audit Trail) */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          id="users-subtab-roster"
          data-testid="users-subtab-roster"
          onClick={() => setActiveSubtab('ROSTER')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: activeSubtab === 'ROSTER' ? '1px solid #06b6d4' : '1px solid transparent',
            background: activeSubtab === 'ROSTER' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
            color: activeSubtab === 'ROSTER' ? '#06b6d4' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>👥</span> User Roster & Access Control
        </button>

        {canReadAuditLogs && (
          <button
            id="users-subtab-audit-trail"
            data-testid="users-subtab-audit-trail"
            onClick={() => {
              setActiveSubtab('AUDIT_TRAIL');
              fetchAuditLogs();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeSubtab === 'AUDIT_TRAIL' ? '1px solid #dc2626' : '1px solid transparent',
              background: activeSubtab === 'AUDIT_TRAIL' ? 'rgba(220, 38, 38, 0.12)' : 'transparent',
              color: activeSubtab === 'AUDIT_TRAIL' ? '#dc2626' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🛡️</span> Security & Impersonation Audit Trail
          </button>
        )}
      </div>

      {/* SUBTAB 1: USER ROSTER & PROFILES */}
      {activeSubtab === 'ROSTER' && (
        <>
          {/* Global Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Users</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '4px' }}>{users.length}</div>
            </div>
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Accounts</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                {users.filter((u) => u.status === 'ACTIVE').length}
              </div>
            </div>
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Teachers & Admins</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#8b5cf6', marginTop: '4px' }}>
                {users.filter((u) => u.roles?.some((r) => r === 'MAIN_ADMIN' || r === 'SUB_ADMIN' || r === 'TEACHER')).length}
              </div>
            </div>
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Version Audit Engine</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#06b6d4', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔒</span> ADR-010 ACTIVE
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--panel-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <input
              type="text"
              placeholder="Search by name, email, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'var(--bg-color)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
              }}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'var(--bg-color)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
              }}
            >
              <option value="ALL">All Roles</option>
              <option value="MAIN_ADMIN">MAIN_ADMIN</option>
              <option value="SUB_ADMIN">SUB_ADMIN</option>
              <option value="TEACHER">TEACHER</option>
              <option value="STUDENT">STUDENT</option>
            </select>
            <button
              onClick={fetchUsers}
              style={{
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#06b6d4',
                border: '1px solid #06b6d4',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              🔄 Refresh
            </button>
          </div>

      {/* Users Table */}
      <div style={{ background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            Loading user profiles...
          </div>
        ) : error ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>{error}</div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No users match the search criteria.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>USER</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>ROLES</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>STATUS</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>CREATED</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '11px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                      {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '(No Name)'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{u.email}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', opacity: 0.7 }}>ID: {u.id}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {u.roles && u.roles.length > 0 ? (
                        u.roles.map((r) => (
                          <span
                            key={r}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontFamily: 'JetBrains Mono',
                              background:
                                r === 'MAIN_ADMIN'
                                  ? 'rgba(6, 182, 212, 0.15)'
                                  : r === 'TEACHER'
                                  ? 'rgba(139, 92, 246, 0.15)'
                                  : 'rgba(16, 185, 129, 0.15)',
                              color:
                                r === 'MAIN_ADMIN'
                                  ? '#06b6d4'
                                  : r === 'TEACHER'
                                  ? '#8b5cf6'
                                  : '#10b981',
                              border: `1px solid ${r === 'MAIN_ADMIN' ? '#06b6d4' : r === 'TEACHER' ? '#8b5cf6' : '#10b981'}`,
                            }}
                          >
                            {r}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>(None)</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        background: u.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: u.status === 'ACTIVE' ? '#10b981' : '#ef4444',
                      }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {u.roles && u.roles.includes('STUDENT') && !u.roles.includes('MAIN_ADMIN') && !u.roles.includes('SUB_ADMIN') && !u.roles.includes('TEACHER') && (currentUser?.roles?.includes('MAIN_ADMIN') || currentUser?.roles?.includes('SUB_ADMIN')) && (
                        <button
                          id={`impersonate-user-${u.id}`}
                          data-testid={`impersonate-user-${u.id}`}
                          onClick={() => setImpersonateTarget({ id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email, email: u.email })}
                          style={{
                            background: 'rgba(220, 38, 38, 0.12)',
                            border: '1px solid #dc2626',
                            color: '#dc2626',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          ⚠️ Impersonate
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(u)}
                        style={{
                          background: 'rgba(6, 182, 212, 0.15)',
                          border: '1px solid #06b6d4',
                          color: '#06b6d4',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Edit Profile
                      </button>
                      <button
                        onClick={() => openHistoryDrawer(u)}
                        style={{
                          background: 'rgba(139, 92, 246, 0.15)',
                          border: '1px solid #8b5cf6',
                          color: '#8b5cf6',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        📜 History & Diff
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
        </>
      )}

      {/* SUBTAB 2: SECURITY & IMPERSONATION AUDIT TRAIL */}
      {activeSubtab === 'AUDIT_TRAIL' && (
        <div id="preview-audit-trail-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Audit Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Audit Entries</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '4px' }}>{auditLogs.length}</div>
            </div>
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Real Student Impersonations</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>
                {auditLogs.filter((l) => l.mode === 'IMPERSONATE_REAL_STUDENT').length}
              </div>
            </div>
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Preview Simulations</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#d97706', marginTop: '4px' }}>
                {auditLogs.filter((l) => l.mode === 'PREVIEW_STUDENT').length}
              </div>
            </div>
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Compliance Status</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🛡️</span> IMMUTABLE AUDIT LOG
              </div>
            </div>
          </div>

          {/* Audit Filter Toolbar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--panel-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <input
              id="audit-search-input"
              data-testid="audit-search-input"
              type="text"
              placeholder="Search audit trail by actor, target user, justification reason, or action..."
              value={auditSearchQuery}
              onChange={(e) => setAuditSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'var(--bg-color)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
              }}
            />
            <select
              id="audit-action-select"
              data-testid="audit-action-select"
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'var(--bg-color)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
              }}
            >
              <option value="ALL">All Audit Actions</option>
              <option value="IMPERSONATION_ALL">All Real Impersonations</option>
              <option value="IMPERSONATION_SESSION_START">Impersonation Start</option>
              <option value="IMPERSONATION_SESSION_STOP">Impersonation Stop</option>
              <option value="PREVIEW_ALL">All Preview Simulations</option>
              <option value="PREVIEW_SESSION_START">Preview Session Start</option>
              <option value="PREVIEW_SESSION_STOP">Preview Session Stop</option>
            </select>
            <button
              id="refresh-audit-logs-btn"
              data-testid="refresh-audit-logs-btn"
              onClick={fetchAuditLogs}
              style={{
                background: 'rgba(220, 38, 38, 0.12)',
                color: '#dc2626',
                border: '1px solid #dc2626',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🔄 Refresh Audit Logs
            </button>
          </div>

          {/* Audit Logs Table */}
          <div style={{ background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            {loadingAuditLogs ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                Loading security audit logs...
              </div>
            ) : auditError ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>{auditError}</div>
            ) : filteredAuditLogs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No security audit logs match the filter criteria.
              </div>
            ) : (
              <table id="preview-audit-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>TIMESTAMP</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>MODE</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>ACTION</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>ACTOR (WHO)</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>EFFECTIVE TARGET</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>JUSTIFICATION & DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="audit-log-row"
                      data-testid={`audit-log-row-${log.id}`}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}
                    >
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontFamily: 'JetBrains Mono',
                            fontWeight: 'bold',
                            background:
                              log.mode === 'IMPERSONATE_REAL_STUDENT'
                                ? 'rgba(220, 38, 38, 0.15)'
                                : 'rgba(217, 119, 6, 0.15)',
                            color: log.mode === 'IMPERSONATE_REAL_STUDENT' ? '#dc2626' : '#d97706',
                            border: `1px solid ${log.mode === 'IMPERSONATE_REAL_STUDENT' ? '#dc2626' : '#d97706'}`,
                          }}
                        >
                          {log.mode === 'IMPERSONATE_REAL_STUDENT' ? '⚠️ REAL STUDENT' : '⚡ PREVIEW'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 600 }}>
                        {log.action}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{log.actorEmail || log.actorUserId}</div>
                        {log.actorEmail && <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{log.actorUserId}</div>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{log.effectiveEmail || log.effectiveUserId}</div>
                        {log.effectiveEmail && <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{log.effectiveUserId}</div>}
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '350px' }}>
                        {log.details?.reason ? (
                          <div style={{ background: 'rgba(220, 38, 38, 0.06)', padding: '6px 10px', borderRadius: '4px', border: '1px solid rgba(220, 38, 38, 0.2)', fontSize: '12px' }}>
                            <strong style={{ color: '#dc2626' }}>Reason:</strong> {log.details.reason}
                          </div>
                        ) : log.details?.terminatedBy ? (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Session terminated by <code style={{ fontFamily: 'JetBrains Mono' }}>{log.details.terminatedBy}</code>
                          </div>
                        ) : log.details ? (
                          <div style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                            {JSON.stringify(log.details)}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <form
            onSubmit={handleSaveUser}
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
                Edit User: {editingUser.email}
              </h2>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>First Name</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Last Name</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Account Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
              >
                <option value="STUDENT">STUDENT</option>
                <option value="TEACHER">TEACHER</option>
                <option value="SUB_ADMIN">SUB_ADMIN</option>
                <option value="MAIN_ADMIN">MAIN_ADMIN</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ background: '#06b6d4', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Save Changes (Records Git Version)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <form
            onSubmit={handleCreateUser}
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
                Create New User
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email Address</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>First Name</label>
                <input
                  type="text"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Last Name</label>
                <input
                  type="text"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Primary Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
              >
                <option value="TEACHER">TEACHER</option>
                <option value="SUB_ADMIN">SUB_ADMIN</option>
                <option value="MAIN_ADMIN">MAIN_ADMIN</option>
                <option value="STUDENT">STUDENT</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ background: '#06b6d4', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Version History & Diff Drawer */}
      {historyUser && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '750px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
                  User Profile History: {historyUser.email}
                </h2>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
                  ID: {historyUser.id}
                </div>
              </div>
              <button
                onClick={() => setHistoryUser(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Immutable audit revisions in <code style={{ color: '#06b6d4' }}>entity_versions</code>. Inspect field diffs and rollback safely.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowDiffView(false)}
                  style={{
                    background: !showDiffView ? 'var(--primary-color)' : 'transparent',
                    color: !showDiffView ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  📜 Revisions ({userVersions.length})
                </button>
                <button
                  onClick={() => {
                    if (userVersions.length > 0) {
                      setDiffBaseVersion(userVersions[0]);
                      setDiffTargetVersion(null);
                      setShowDiffView(true);
                    }
                  }}
                  style={{
                    background: showDiffView ? 'var(--primary-color)' : 'transparent',
                    color: showDiffView ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  🔍 Compare / Diff
                </button>
              </div>
            </div>

            {loadingVersions ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading entity version history...
              </div>
            ) : showDiffView ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-color)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>Base Revision (Old):</label>
                    <select
                      value={diffBaseVersion?.version || ''}
                      onChange={(e) => {
                        const vNum = parseInt(e.target.value, 10);
                        const match = userVersions.find((v) => v.version === vNum);
                        if (match) setDiffBaseVersion(match);
                      }}
                      style={{ padding: '6px 8px', borderRadius: '4px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '12px' }}
                    >
                      {userVersions.map((v) => (
                        <option key={v.id} value={v.version}>
                          v{v.version} — {v.changeSummary} ({new Date(v.createdAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>Compare Against (New):</label>
                    <select
                      value={diffTargetVersion ? String(diffTargetVersion.version) : 'LIVE'}
                      onChange={(e) => {
                        if (e.target.value === 'LIVE') {
                          setDiffTargetVersion(null);
                        } else {
                          const vNum = parseInt(e.target.value, 10);
                          const match = userVersions.find((v) => v.version === vNum);
                          if (match) setDiffTargetVersion(match);
                        }
                      }}
                      style={{ padding: '6px 8px', borderRadius: '4px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '12px' }}
                    >
                      <option value="LIVE">⭐ Current Live User Profile</option>
                      {userVersions.map((v) => (
                        <option key={v.id} value={v.version}>
                          v{v.version} — {v.changeSummary} ({new Date(v.createdAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <EntityDiffViewer
                  title={`Profile Diff: Version ${diffBaseVersion?.version || 1} vs ${diffTargetVersion ? `Version ${diffTargetVersion.version}` : 'Current Live Profile'}`}
                  oldLabel={`v${diffBaseVersion?.version || 1}`}
                  newLabel={diffTargetVersion ? `v${diffTargetVersion.version}` : 'Live Profile'}
                  oldEntity={diffBaseVersion ? diffBaseVersion.data : null}
                  newEntity={diffTargetVersion ? diffTargetVersion.data : historyUser}
                  entityType="User"
                />
              </div>
            ) : userVersions.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No prior version commits found for this user profile.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {userVersions.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      background: 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span
                          style={{
                            fontFamily: 'JetBrains Mono',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#8b5cf6',
                            background: 'rgba(139, 92, 246, 0.15)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          Version {v.version}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(v.createdAt).toLocaleString()} • by {v.createdBy || 'system'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setDiffBaseVersion(v);
                            setDiffTargetVersion(null);
                            setShowDiffView(true);
                          }}
                          style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid #38bdf8',
                            color: '#38bdf8',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: '500',
                          }}
                        >
                          🔍 Compare
                        </button>
                        <button
                          onClick={() => handleRollback(historyUser.id, v.version)}
                          style={{
                            background: 'rgba(139, 92, 246, 0.15)',
                            border: '1px solid #8b5cf6',
                            color: '#8b5cf6',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                          }}
                        >
                          Rollback to v{v.version}
                        </button>
                      </div>
                    </div>

                    {/* Commit Message / Change Summary */}
                    <div
                      style={{
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono',
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>📝</span>
                      <span style={{ fontWeight: 'bold' }}>{v.changeSummary || 'User profile updated'}</span>
                    </div>

                    {/* Snapshot details summary */}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      <span>Name: <strong style={{ color: 'var(--text-main)' }}>{v.data?.firstName || ''} {v.data?.lastName || ''}</strong></span>
                      <span>Roles: <strong style={{ color: '#8b5cf6' }}>{Array.isArray(v.data?.roles) ? v.data.roles.join(', ') : '(none)'}</strong></span>
                      <span>Status: <strong style={{ color: v.data?.status === 'ACTIVE' ? '#10b981' : '#ef4444' }}>{v.data?.status || 'ACTIVE'}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real Student Impersonation Confirmation Modal */}
      <ImpersonationModal
        isOpen={!!impersonateTarget}
        onClose={() => setImpersonateTarget(null)}
        targetUser={impersonateTarget}
      />
    </div>
  );
};
