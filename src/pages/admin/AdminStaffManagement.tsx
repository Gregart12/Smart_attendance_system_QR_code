import React, { useState, useEffect } from 'react';
import { subscribeToStaff, updateStaffProfile, promoteStaffToAdmin, revokeStaffAccount } from '../../firebase/services';
import { sendStaffPasswordReset } from '../../firebase/accountCreation';
import { StaffProfile } from '../../types';
import { StaffModal } from '../../components/admin/StaffModal';
import {
  Users,
  UserPlus,
  Search,
  Edit3,
  Trash2,
  ShieldAlert,
  User,
  Phone,
  Mail,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

export const AdminStaffManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const unsub = subscribeToStaff((data) => setStaffList(data));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!error && !notice) return;
    const timer = window.setTimeout(() => {
      setError('');
      setNotice('');
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [error, notice]);

  const runAction = async (message: string, action: () => Promise<unknown>) => {
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action could not be completed.');
    }
  };

  const handleStatusToggle = (staff: StaffProfile) => {
    const newStatus = staff.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`Change status of ${staff.name} to ${newStatus.toUpperCase()}?`)) return;
    void runAction(`${staff.name} is now ${newStatus}.`, () =>
      updateStaffProfile(staff.uid, { status: newStatus })
    );
  };

  const handleDelete = (staff: StaffProfile) => {
    if (
      !confirm(
        `Revoke the account for ${staff.name}?\n\nThey will be signed out and blocked from signing in again. The Firebase sign-in record must also be deleted from Firebase Console > Authentication > Users.`
      )
    ) {
      return;
    }
    void runAction(`${staff.name}'s account was revoked.`, () =>
      revokeStaffAccount(staff.uid, staff.email, staff.name)
    );
  };

  const handlePromote = (staff: StaffProfile) => {
    if (!confirm(`Grant ${staff.name} full administrator access?`)) return;
    void runAction(`${staff.name} was promoted to administrator.`, () =>
      promoteStaffToAdmin(staff.uid, staff.email, staff.name, staff.department)
    );
  };

  const handleSendReset = (staff: StaffProfile) => {
    void runAction(`Password reset link sent to ${staff.email}.`, () =>
      sendStaffPasswordReset(staff.email)
    );
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.staffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
            Department Staff Directory
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Manage staff profiles, permissions, designations, and account statuses
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedStaff(null);
            setIsModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <UserPlus size={18} /> Add New Staff Member
        </button>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--danger-color)',
            color: 'var(--danger-color)',
            fontSize: '0.85rem'
          }}
        >
          <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--success-color)',
            color: 'var(--success-color)',
            fontSize: '0.85rem'
          }}
        >
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{notice}</span>
        </div>
      )}

      <div className="glass-card">
        {/* Search and Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, staff ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ width: '150px' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Staff Table */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Staff ID</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Status</th>
                <th>Streak</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No staff records found. Click "Add New Staff Member" to register staff.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.uid}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'var(--accent-light)',
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            overflow: 'hidden'
                          }}
                        >
                          {staff.photoUrl ? (
                            <img src={staff.photoUrl} alt={staff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            staff.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{staff.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{staff.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{staff.staffId}</td>
                    <td style={{ fontSize: '0.85rem' }}>{staff.designation || 'IT Officer'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{staff.department}</td>
                    <td>
                      <span className={`badge ${staff.status === 'active' ? 'badge-present' : 'badge-absent'}`}>
                        {staff.status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      🔥 {staff.attendanceStreak || 0} Days
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => {
                            setSelectedStaff(staff);
                            setIsModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          title="Edit Profile"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleStatusToggle(staff)}
                          className={`btn btn-sm ${staff.status === 'active' ? 'btn-secondary' : 'btn-success'}`}
                          title={staff.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                        >
                          <ShieldAlert size={14} />
                        </button>
                        <button
                          onClick={() => handleSendReset(staff)}
                          className="btn btn-secondary btn-sm"
                          title="Email Password Reset Link"
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          onClick={() => handlePromote(staff)}
                          className="btn btn-secondary btn-sm"
                          title="Promote to Administrator"
                        >
                          <User size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(staff)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger-color)' }}
                          title="Revoke Account"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        staffToEdit={selectedStaff}
      />
    </div>
  );
};
