'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Lock,
  Building2,
  Users,
  Search,
  Activity,
  UserCheck,
  History,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AdminConsoleProps {
  currentUser: any;
  onRefreshData?: () => void;
}

export default function AdminConsole({ currentUser, onRefreshData }: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<'NGOS' | 'SAFETY' | 'USERS' | 'AUDIT'>('NGOS');
  const [ngos, setNgos] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [safetyQueue, setSafetyQueue] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Search & filter
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userSearch, setUserSearch] = useState<string>('');
  const [auditSearch, setAuditSearch] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resNgos, resDonations, resUsers, resAudit, resSafety] = await Promise.all([
        fetch('/api/ngo/verification'),
        fetch('/api/donations?activeOnly=false'),
        fetch('/api/admin/users'),
        fetch('/api/admin/audit-logs'),
        fetch('/api/admin/safety-review'),
      ]);
      const dataNgos = await resNgos.json();
      const dataDonations = await resDonations.json();
      const dataUsers = await resUsers.json();
      const dataAudit = await resAudit.json();
      const dataSafety = await resSafety.json();

      setNgos(dataNgos.ngos || []);
      setDonations(dataDonations.donations || []);
      setUsers(dataUsers.users || []);
      setAuditLogs(dataAudit.logs || []);
      setSafetyQueue(dataSafety.listings || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerifyNgo = async (ngoId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/ngo/verification', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ngoId, status, notes: `Reviewed by Admin ${currentUser.name}` }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`NGO status successfully updated to ${status}.`);
        fetchData();
        if (onRefreshData) onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSafetyBlock = async (donationId: string, action: 'BLOCK' | 'UNBLOCK') => {
    try {
      const res = await fetch('/api/admin/safety-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationId,
          action,
          reason: 'Administrative Food Safety protocol intervention.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        fetchData();
        if (onRefreshData) onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSafetyReview = async (
    donationId: string,
    action: 'APPROVE' | 'NEEDS_UPDATE' | 'BLOCK' | 'RESTORE',
  ) => {
    try {
      const res = await fetch('/api/admin/safety-review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Safety review action failed.');
      setActionMessage(data.message);
      await fetchData();
      if (onRefreshData) onRefreshData();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Safety review action failed.');
    }
  };

  const pendingNgos = ngos.filter((n) => n.verificationStatus === 'PENDING');
  const verifiedNgos = ngos.filter((n) => n.verificationStatus === 'VERIFIED');
  const blockedDonations = donations.filter((d) => d.safetyStatus === 'BLOCKED');

  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    const matchesSearch =
      !userSearch ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.address && u.address.toLowerCase().includes(userSearch.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!auditSearch) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q) ||
      (log.detailsJson && log.detailsJson.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white p-6 rounded-3xl border border-[#ebdcc7] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-950">
              Central Administration & Safety Oversight
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-forest-950 mt-1">
            Administrator Console ({currentUser?.name})
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time compliance monitoring, NGO accreditation review, user permission auditing, and emergency killswitch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-xs font-semibold text-stone-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
          <span className="text-xs bg-rose-50 text-rose-900 border border-rose-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-rose-600" />
            <span>Root Admin</span>
          </span>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center justify-between animate-in fade-in">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-stone-400 hover:text-stone-700">
            &times;
          </button>
        </div>
      )}

      {/* Admin KPI Quick Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('NGOS')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'NGOS' ? 'border-amber-400 bg-amber-50/50 shadow-sm' : 'border-stone-200 bg-white hover:bg-stone-50'
          }`}
        >
          <span className="text-xs text-stone-500 font-medium block">NGO Verification Queue</span>
          <span className="text-2xl font-serif font-bold text-amber-900 mt-1 block">
            {pendingNgos.length} <span className="text-xs font-sans text-stone-500">pending</span>
          </span>
          <span className="text-[10px] text-amber-700 font-medium mt-1 block">
            {verifiedNgos.length} verified shelters
          </span>
        </div>

        <div
          onClick={() => setActiveTab('SAFETY')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'SAFETY' ? 'border-rose-400 bg-rose-50/50 shadow-sm' : 'border-stone-200 bg-white hover:bg-stone-50'
          }`}
        >
          <span className="text-xs text-stone-500 font-medium block">Safety Blocked Listings</span>
          <span className="text-2xl font-serif font-bold text-rose-900 mt-1 block">
            {blockedDonations.length} <span className="text-xs font-sans text-stone-500">active blocks</span>
          </span>
          <span className="text-[10px] text-stone-500 mt-1 block">
            Out of {donations.length} total listings
          </span>
        </div>

        <div
          onClick={() => setActiveTab('USERS')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'USERS' ? 'border-forest-400 bg-forest-50/50 shadow-sm' : 'border-stone-200 bg-white hover:bg-stone-50'
          }`}
        >
          <span className="text-xs text-stone-500 font-medium block">Registered Users</span>
          <span className="text-2xl font-serif font-bold text-forest-950 mt-1 block">
            {users.length} <span className="text-xs font-sans text-stone-500">accounts</span>
          </span>
          <span className="text-[10px] text-emerald-700 font-medium mt-1 block">
            Restaurants, NGOs, Couriers
          </span>
        </div>

        <div
          onClick={() => setActiveTab('AUDIT')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'AUDIT' ? 'border-blue-400 bg-blue-50/50 shadow-sm' : 'border-stone-200 bg-white hover:bg-stone-50'
          }`}
        >
          <span className="text-xs text-stone-500 font-medium block">Database Audit Records</span>
          <span className="text-2xl font-serif font-bold text-stone-900 mt-1 block">
            {auditLogs.length} <span className="text-xs font-sans text-stone-500">logged</span>
          </span>
          <span className="text-[10px] text-stone-500 mt-1 block">
            Cryptographic audit trail
          </span>
        </div>
      </div>

      {/* Admin Tab Selector */}
      <div className="flex items-center gap-1.5 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('NGOS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'NGOS' ? 'bg-forest-900 text-wheat-200 shadow-sm' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>NGO Verification Queue ({pendingNgos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SAFETY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'SAFETY' ? 'bg-forest-900 text-wheat-200 shadow-sm' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Food Safety & Killswitch</span>
        </button>

        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'USERS' ? 'bg-forest-900 text-wheat-200 shadow-sm' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'AUDIT' ? 'bg-forest-900 text-wheat-200 shadow-sm' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>System Audit Log</span>
        </button>
      </div>

      {/* TAB 1: NGO VERIFICATION QUEUE */}
      {activeTab === 'NGOS' && (
        <div className="bg-white rounded-3xl border border-[#ebdcc7] shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-serif text-lg font-bold text-forest-950 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-wheat-600" />
                Humanitarian NGO Verification Queue
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Review submitted NGO registrations, Darpan IDs, and FSSAI surplus recovery agreements before granting bulk food claim authority.
              </p>
            </div>
          </div>

          <div className="space-y-4 mt-2">
            {pendingNgos.length === 0 ? (
              <div className="p-6 rounded-2xl bg-stone-50 text-center text-xs text-stone-500">
                ✅ No pending NGO verification requests. All registered shelters have been processed.
              </div>
            ) : (
              pendingNgos.map((ngo) => (
                <div
                  key={ngo.id}
                  className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm">{ngo.orgName}</span>
                      <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded font-bold">
                        PENDING AUDIT
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600">
                      Registration Number: <span className="font-mono font-semibold">{ngo.registrationNumber}</span> • Daily Meal Capacity: <span className="font-bold text-forest-900">{ngo.capacityMeals} meals</span> • Service Radius: {ngo.serviceRadiusKm} km
                    </p>
                    <p className="text-[11px] text-stone-500 italic">
                      Submitted Documentation: {ngo.verificationDocs || 'Pending trust deed'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleVerifyNgo(ngo.id, 'REJECTED')}
                      className="px-3.5 py-2 rounded-xl bg-white border border-rose-300 hover:bg-rose-50 text-rose-800 font-semibold transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleVerifyNgo(ngo.id, 'VERIFIED')}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Authorize Bulk</span>
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* List of Verified Shelters */}
            {verifiedNgos.length > 0 && (
              <div className="pt-4 border-t border-stone-100">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-3">
                  Authorized Verified Shelters ({verifiedNgos.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {verifiedNgos.map((n) => (
                    <div key={n.id} className="p-3.5 rounded-xl border border-stone-200 bg-[#fdfbf7] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-stone-900">{n.orgName}</span>
                        <span className="text-[11px] text-stone-500 block">
                          Reg: {n.registrationNumber} • Capacity: {n.capacityMeals} meals/day
                        </span>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FOOD SAFETY & EMERGENCY KILLSWITCH */}
      {activeTab === 'SAFETY' && (
        <div className="bg-white rounded-3xl border border-[#ebdcc7] shadow-sm p-6 space-y-4">
          <section className="space-y-3 border-b border-stone-100 pb-5">
            <div>
              <h3 className="font-serif text-lg font-bold text-forest-950">Safety information review queue</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Automated consistency checks use donor-reported details and do not independently inspect food. Review cautions, inconsistent timelines, and missing information here.
              </p>
            </div>
            {safetyQueue.length === 0 ? (
              <p className="rounded-xl bg-emerald-50 p-4 text-xs text-emerald-900">No listings currently need safety review.</p>
            ) : safetyQueue.map((d) => (
              <article key={d.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-stone-900">{d.title}</h4>
                    <p className="text-xs text-stone-600">
                      {d.restaurantUser?.restaurant?.businessName || d.restaurantUser?.name || 'Restaurant'} ·
                      {' '}{d.safetyRiskLevel || 'CAUTION'} risk · {d.safetyReviewStatus}
                    </p>
                    <ul className="list-disc pl-5 text-xs text-amber-950 space-y-0.5">
                      {(d.safetyRiskReasons || []).map((reason: string, index: number) => <li key={index}>{reason}</li>)}
                    </ul>
                    <p className="text-[11px] text-stone-600">
                      Donor declaration: {d.reportedSafetyDeclaration ? 'confirmed' : 'not confirmed'} ·
                      {' '}Allergens reviewed: {d.allergensReviewed ? 'yes' : 'no'} ·
                      {' '}Reported storage: {d.storageType}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      onClick={() => handleSafetyReview(d.id, 'NEEDS_UPDATE')}
                      className="rounded-lg border border-amber-400 bg-white px-3 py-2 text-[11px] font-semibold text-amber-900"
                    >
                      Request update
                    </button>
                    {d.safetyStatus === 'BLOCKED' ? (
                      <button
                        onClick={() => handleSafetyReview(d.id, 'RESTORE')}
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-semibold text-white"
                      >
                        Restore after checks
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSafetyReview(d.id, 'APPROVE')}
                          className="rounded-lg bg-forest-800 px-3 py-2 text-[11px] font-semibold text-white"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleSafetyReview(d.id, 'BLOCK')}
                          className="rounded-lg bg-rose-700 px-3 py-2 text-[11px] font-semibold text-white"
                        >
                          Block
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>

          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-serif text-lg font-bold text-forest-950 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Food Safety Emergency Killswitch Console
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Immediately block any donation from the network if compromised storage, hygiene violations, or consumer reports occur.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf6ee] text-stone-700 border-b border-stone-200 font-medium">
                <tr>
                  <th className="p-3">Surplus Donation</th>
                  <th className="p-3">Donor Kitchen</th>
                  <th className="p-3">Storage / Thermal Mode</th>
                  <th className="p-3">Safety Status</th>
                  <th className="p-3 text-right">Emergency Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {donations.map((d) => {
                  const isBlocked = d.safetyStatus === 'BLOCKED';
                  return (
                    <tr key={d.id} className="hover:bg-stone-50">
                      <td className="p-3">
                        <span className="font-bold text-stone-900 block">{d.title}</span>
                        <span className="text-[10px] text-stone-400">
                          {d.remainingQuantity} / {d.totalQuantity} {d.unit}
                        </span>
                      </td>
                      <td className="p-3 text-stone-600">
                        {d.restaurantUser?.name || 'Kitchen'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-stone-700">
                        {d.storageType}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isBlocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {d.safetyStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {isBlocked ? (
                          <button
                            onClick={() => handleSafetyBlock(d.id, 'UNBLOCK')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px]"
                          >
                            Clear & Unblock
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSafetyBlock(d.id, 'BLOCK')}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] flex items-center gap-1 ml-auto"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Safety Killswitch</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT & PERMISSIONS */}
      {activeTab === 'USERS' && (
        <div className="bg-white rounded-3xl border border-[#ebdcc7] shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-serif text-lg font-bold text-forest-950 flex items-center gap-2">
                <Users className="w-5 h-5 text-wheat-600" />
                User Directory & Reliability Scores
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Audit registered users, active roles, historical pickup reliability ratings, and associated records.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search user by name, email, or address..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="text-xs p-2 rounded-xl border border-stone-300 w-full sm:w-60 focus:outline-none focus:border-forest-700"
              />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="text-xs p-2 rounded-xl border border-stone-300 bg-white"
              >
                <option value="ALL">All Roles</option>
                <option value="RESTAURANT">Restaurants</option>
                <option value="NGO">NGOs</option>
                <option value="INDIVIDUAL">Recipients</option>
                <option value="VOLUNTEER">Volunteers</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf6ee] text-stone-700 border-b border-stone-200 font-medium">
                <tr>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Contact Email & Phone</th>
                  <th className="p-3">Reliability Rating</th>
                  <th className="p-3">Activity Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50">
                    <td className="p-3">
                      <span className="font-bold text-stone-900 block">{u.name}</span>
                      <span className="text-[10px] text-stone-500">{u.address || 'Location registered'}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-stone-50 text-stone-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-stone-600 font-mono text-[11px]">
                      <div>{u.email}</div>
                      <div className="text-[10px] text-stone-400">{u.phone || 'No phone'}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-bold font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {u.reliabilityScore}%
                      </span>
                    </td>
                    <td className="p-3 text-stone-600">
                      {u._count?.donations > 0 ? (
                        <span>{u._count.donations} donations listed</span>
                      ) : u._count?.reservations > 0 ? (
                        <span>{u._count.reservations} reservations</span>
                      ) : (
                        <span className="text-stone-400">Standard</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM AUDIT LOG */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-3xl border border-[#ebdcc7] shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-serif text-lg font-bold text-forest-950 flex items-center gap-2">
                <Activity className="w-5 h-5 text-wheat-600" />
                Immutable System Audit Trail
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Chronological record of every donation created, reservation code generated, handover confirmed, recovery event triggered, and safety killswitch executed.
              </p>
            </div>

            <input
              type="text"
              placeholder="Filter audit events..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="text-xs p-2 rounded-xl border border-stone-300 w-full sm:w-60 focus:outline-none focus:border-forest-700"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf6ee] text-stone-700 border-b border-stone-200 font-medium">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target Entity</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Technical Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-stone-400">
                      No audit events matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50 font-sans">
                      <td className="p-3 text-stone-500 text-[10px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-forest-50 text-forest-900 border border-forest-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-stone-800">
                        {log.entity}
                      </td>
                      <td className="p-3 text-stone-600">
                        {log.user ? `${log.user.name} (${log.user.role})` : 'System / Auto'}
                      </td>
                      <td className="p-3 text-[10px] text-stone-500 font-mono max-w-xs truncate">
                        {log.detailsJson || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
