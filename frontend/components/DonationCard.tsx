'use client';

import React from 'react';
import { 
  Clock, 
  MapPin, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Snowflake, 
  Wheat, 
  Utensils, 
  Package, 
  Lock,
  ArrowRight
} from 'lucide-react';

interface DonationItem {
  id: string;
  title: string;
  description: string;
  category: string;
  totalQuantity: number;
  remainingQuantity: number;
  unit: string;
  prepTime: string;
  pickupDeadline: string;
  expiryTime: string;
  storageType: string;
  allergensList: string[];
  dietaryTags: string;
  safetyStatus: string;
  safetyNotes?: string;
  safetyRiskLevel?: string;
  safetyReviewStatus?: string;
  safetyRiskReasons?: string[];
  reportedSafetyDeclaration?: boolean;
  allergensReviewed?: boolean;
  pickupAddress: string;
  restaurantUser?: {
    name: string;
    restaurant?: {
      businessName: string;
      fssaiLicense: string;
    };
  };
  fssaiAssessment?: {
    isSafe: boolean;
    status: string;
    remainingSafeMinutes: number;
    reasons: string[];
  };
}

interface DonationCardProps {
  donation: DonationItem;
  currentRole?: string;
  onReserve: (donation: DonationItem) => void;
  onHandover?: (donation: DonationItem) => void;
  onAdminBlock?: (donation: DonationItem) => void;
}

export default function DonationCard({
  donation,
  currentRole,
  onReserve,
  onHandover,
  onAdminBlock,
}: DonationCardProps) {
  const isAvailable = donation.safetyStatus === 'SAFE' && donation.remainingQuantity > 0;
  const isBlocked = donation.safetyStatus === 'BLOCKED';
  const isExpired = donation.safetyStatus === 'EXPIRED';
  const hasCaution = donation.safetyRiskLevel === 'CAUTION';
  const reviewPending = donation.safetyReviewStatus === 'PENDING' || donation.safetyReviewStatus === 'NEEDS_UPDATE';

  const deadline = new Date(donation.pickupDeadline);
  const now = new Date();
  const minutesLeft = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60)));
  const hoursLeft = (minutesLeft / 60).toFixed(1);

  const getStorageBadge = (type: string) => {
    switch (type) {
      case 'HOT_HOLDING_60C':
        return {
          icon: <Flame className="w-3.5 h-3.5 text-amber-500" />,
          label: 'Hot Holding (≥60°C)',
          bg: 'bg-amber-50 text-amber-900 border-amber-200',
        };
      case 'CHILLED_4C':
        return {
          icon: <Snowflake className="w-3.5 h-3.5 text-blue-500" />,
          label: 'Chilled (≤5°C)',
          bg: 'bg-blue-50 text-blue-900 border-blue-200',
        };
      default:
        return {
          icon: <Clock className="w-3.5 h-3.5 text-stone-500" />,
          label: 'Ambient Temp',
          bg: 'bg-stone-50 text-stone-700 border-stone-200',
        };
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'BAKERY':
        return <Wheat className="w-4 h-4 text-wheat-600" />;
      case 'COOKED_MEALS':
        return <Utensils className="w-4 h-4 text-forest-700" />;
      default:
        return <Package className="w-4 h-4 text-stone-600" />;
    }
  };

  const storageInfo = getStorageBadge(donation.storageType);
  const percentLeft = Math.round((donation.remainingQuantity / Math.max(1, donation.totalQuantity)) * 100);

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 bg-white flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
        isBlocked
          ? 'border-rose-300 bg-rose-50/20'
          : isExpired
          ? 'border-stone-300 opacity-75'
          : 'border-[#ebdcc7] hover:border-wheat-500'
      }`}
    >
      {/* Top Banner / Status */}
      <div className="p-4 sm:p-5 space-y-3 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="p-1.5 rounded-lg bg-[#faf6ee] border border-[#ebdcc7]">
              {getCategoryIcon(donation.category)}
            </span>
            <span className="text-xs font-bold text-stone-700 tracking-wide uppercase">
              {donation.category.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${storageInfo.bg}`}>
              {storageInfo.icon}
              <span>{storageInfo.label}</span>
            </span>

            {isBlocked ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-600" /> BLOCKED
              </span>
            ) : isAvailable ? (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                hasCaution || reviewPending
                  ? 'bg-amber-100 text-amber-900 border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}>
                {hasCaution || reviewPending
                  ? <><AlertTriangle className="w-3 h-3 text-amber-700" /> {reviewPending ? 'Safety info needs review' : 'Safety caution'}</>
                  : <><ShieldCheck className="w-3 h-3 text-emerald-600" /> Automated checks passed</>}
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-semibold">
                DEPLETED
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 line-clamp-1">
            {donation.title}
          </h3>
          <p className="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed">
            {donation.description}
          </p>
        </div>

        {/* Donor Organization & License */}
        <div className="bg-[#fdfbf7] p-2.5 rounded-xl border border-stone-100 text-[11px] space-y-1">
          <div className="flex items-center justify-between text-stone-800">
            <span className="font-semibold text-forest-950">
              {donation.restaurantUser?.restaurant?.businessName || donation.restaurantUser?.name || 'Food Donor'}
            </span>
            {donation.restaurantUser?.restaurant?.fssaiLicense && (
              <span className="text-[10px] text-stone-500 font-mono">
                Reported license: {donation.restaurantUser.restaurant.fssaiLicense}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-stone-500">
            <MapPin className="w-3 h-3 text-wheat-600 shrink-0" />
            <span className="truncate">{donation.pickupAddress}</span>
          </div>
        </div>

        <p className="text-[10px] text-stone-500">
          Safety details are reported by the donor. Automated checks compare reported times and handling conditions; BreadCycle does not independently inspect the food.
        </p>

        {/* Timing & Safe Window Indicator */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="bg-stone-50 p-2 rounded-lg border border-stone-100">
            <span className="text-[10px] text-stone-500 block">Pickup Deadline</span>
            <span className={`font-semibold text-xs flex items-center gap-1 mt-0.5 ${minutesLeft <= 45 ? 'text-rose-600 font-bold' : 'text-stone-800'}`}>
              <Clock className="w-3 h-3" />
              {minutesLeft > 0 ? `${hoursLeft} hrs left` : 'Elapsed'}
            </span>
          </div>

          <div className="bg-stone-50 p-2 rounded-lg border border-stone-100">
            <span className="text-[10px] text-stone-500 block">Inventory Left</span>
            <span className="font-semibold text-xs text-forest-900 block mt-0.5">
              {donation.remainingQuantity} / {donation.totalQuantity} {donation.unit}
            </span>
          </div>
        </div>

        {/* Inventory Progress Bar */}
        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              percentLeft > 50 ? 'bg-forest-600' : percentLeft > 20 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${percentLeft}%` }}
          />
        </div>

        {/* Allergens tags */}
        {donation.allergensList && donation.allergensList.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            <span className="text-[10px] text-stone-400 font-medium">Allergens:</span>
            {donation.allergensList.map((a: string, i: number) => (
              <span
                key={i}
                className="text-[10px] bg-amber-50 border border-amber-200 text-amber-900 px-1.5 py-0.2 rounded"
              >
                {a}
              </span>
            ))}
          </div>
        )}
        {donation.allergensList?.length === 0 && (
          <p className={`text-[10px] ${donation.allergensReviewed ? 'text-stone-500' : 'text-amber-800'}`}>
            {donation.allergensReviewed ? 'No listed allergens reported by the donor.' : 'Allergen information has not been confirmed.'}
          </p>
        )}

        {/* Safety Warning notes if any */}
        {donation.safetyRiskReasons && donation.safetyRiskReasons.length > 0 && (
          <ul className="text-[10px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-200 space-y-1">
            {donation.safetyRiskReasons.map((reason, index) => <li key={index}>{reason}</li>)}
          </ul>
        )}
        {donation.safetyNotes && !donation.safetyRiskReasons?.length && hasCaution && (
          <p className="text-[10px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200">
            {donation.safetyNotes}
          </p>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="p-3 bg-[#faf6ee] border-t border-[#ebdcc7] flex items-center justify-between gap-2">
        {currentRole === 'ADMIN' && (
          <button
            onClick={() => onAdminBlock && onAdminBlock(donation)}
            className={`text-xs px-3 py-2 rounded-xl font-semibold transition-colors flex items-center gap-1 ${
              isBlocked
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{isBlocked ? 'Unblock Safe' : 'Safety Killswitch'}</span>
          </button>
        )}

        {currentRole === 'RESTAURANT' ? (
          <button
            onClick={() => onHandover && onHandover(donation)}
            className="w-full text-xs py-2 px-3 rounded-xl bg-forest-900 hover:bg-forest-800 text-wheat-200 font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-wheat-400" />
            <span>Verify Handover Code</span>
          </button>
        ) : (
          <button
            onClick={() => onReserve(donation)}
            disabled={!isAvailable}
            className={`w-full text-xs py-2.5 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              isAvailable
                ? currentRole === 'NGO'
                  ? 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm'
                  : 'bg-forest-900 hover:bg-forest-800 text-wheat-200 shadow-sm'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <span>
              {isBlocked
                ? 'Safety Blocked'
                : !isAvailable
                ? 'Fully Reserved'
                : currentRole === 'NGO'
                ? 'Claim Bulk Allocation'
                : 'Reserve Portions'}
            </span>
            {isAvailable && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
