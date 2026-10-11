'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bike, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Package, 
  ShieldCheck, 
  Navigation,
  AlertCircle
} from 'lucide-react';

interface VolunteerDashboardProps {
  currentUser: any;
}

export default function VolunteerDashboard({ currentUser }: VolunteerDashboardProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/volunteers/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [currentUser?.id]);

  const handleUpdateTask = async (taskId: string, action: string) => {
    try {
      const res = await fetch('/api/volunteers/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const myTasks = tasks.filter((t) => t.volunteerId === currentUser.id);
  const availableTasks = tasks.filter((t) => t.status === 'UNASSIGNED');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#ebdcc7] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-forest-900">
              Food Rescue Courier Dispatch
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-forest-950 mt-1">
            Courier {currentUser?.name}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Vehicle: <span className="font-bold text-forest-900">{currentUser?.volunteer?.vehicleType || 'MOTORCYCLE'}</span> • Max Capacity: {currentUser?.volunteer?.maxCapacityKg || 35} kg • Reliability: {currentUser?.reliabilityScore || 97}%
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-900 px-3.5 py-1.5 rounded-xl border border-emerald-200 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Active On Duty</span>
        </div>
      </div>

      {/* My Active Dispatch Tasks */}
      <div className="bg-white rounded-3xl border border-[#ebdcc7] shadow-sm p-6">
        <h3 className="font-serif text-lg font-bold text-forest-950 pb-4 border-b border-stone-100 flex items-center gap-2">
          <Navigation className="w-5 h-5 text-wheat-600" />
          My Assigned Rescue Deliveries ({myTasks.length})
        </h3>

        <div className="space-y-4 mt-4">
          {myTasks.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">
              No active tasks claimed. View open tasks below to accept a rescue delivery!
            </p>
          ) : (
            myTasks.map((t) => {
              const res = t.reservation;
              const donation = res?.donation;
              return (
                <div
                  key={t.id}
                  className="bg-[#faf6ee] p-5 rounded-2xl border border-[#ebdcc7] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm">{donation?.title}</span>
                      <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-bold text-[10px]">
                        Status: {t.status}
                      </span>
                    </div>

                    <p className="text-stone-600 flex items-center gap-1.5">
                      <span className="font-semibold text-stone-800">From:</span>
                      <MapPin className="w-3.5 h-3.5 text-wheat-600" />
                      <span>{donation?.pickupAddress}</span>
                    </p>

                    <p className="text-stone-600 flex items-center gap-1.5">
                      <span className="font-semibold text-stone-800">To Shelter:</span>
                      <span>{res?.user?.name} ({res?.user?.address || 'Community Kitchen'})</span>
                    </p>

                    <p className="text-[11px] text-stone-500 italic mt-1">
                      Notes: {t.notes}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    {t.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleUpdateTask(t.id, 'MARK_PICKED_UP')}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-forest-900 hover:bg-forest-800 text-wheat-200 font-semibold transition-colors"
                      >
                        Confirm Picked Up from Kitchen
                      </button>
                    )}
                    {t.status === 'PICKED_UP' && (
                      <button
                        onClick={() => handleUpdateTask(t.id, 'MARK_DELIVERED')}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition-colors"
                      >
                        Confirm Delivered to Shelter
                      </button>
                    )}
                    {t.status === 'DELIVERED' && (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Delivered & Handed Over
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Available Unassigned Open Tasks */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <h3 className="font-serif text-base font-bold text-stone-900 pb-3 border-b border-stone-100 flex items-center gap-2">
          <Package className="w-4 h-4 text-stone-500" />
          Open Pickup Tasks in Your Area ({availableTasks.length})
        </h3>

        <div className="space-y-3 mt-3">
          {availableTasks.length === 0 ? (
            <p className="text-xs text-stone-400 py-4 text-center">
              No unassigned delivery runs available at this moment.
            </p>
          ) : (
            availableTasks.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-xl border border-stone-200 flex items-center justify-between text-xs hover:border-forest-300 transition-colors"
              >
                <div>
                  <span className="font-bold text-stone-900 block">
                    {t.reservation?.donation?.title} ({t.reservation?.reservedQuantity} portions)
                  </span>
                  <span className="text-[11px] text-stone-500 block mt-0.5">
                    Pickup: {t.reservation?.donation?.pickupAddress} • Destination: {t.reservation?.user?.name}
                  </span>
                </div>
                <button
                  onClick={() => handleUpdateTask(t.id, 'ACCEPT')}
                  className="px-3.5 py-1.5 rounded-lg bg-forest-900 hover:bg-forest-800 text-wheat-200 font-semibold shrink-0"
                >
                  Accept Route
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
