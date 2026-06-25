"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, MapPin, Mail, Phone, Globe, Loader2, Check, Edit3 } from "lucide-react";
import type { UserData } from "@/app/dashboard/customComps/types";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
  onUserUpdated: (user: UserData) => void;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
  exit: { opacity: 0, x: 40, transition: { duration: 0.2 } },
};

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  user,
  onUserUpdated,
}: ProfileSettingsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [name, setName] = useState(user?.name || "");
  const [locality, setLocality] = useState(user?.location?.locality || "");
  const [street, setStreet] = useState(user?.location?.street || "");
  const [city, setCity] = useState(user?.location?.city || "");
  const [district, setDistrict] = useState(user?.location?.district || "");
  const [pin, setPin] = useState(user?.location?.pin || "");
  const [state, setState] = useState(user?.location?.state || "");

  // Sync when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setLocality(user.location?.locality || "");
      setStreet(user.location?.street || "");
      setCity(user.location?.city || "");
      setDistrict(user.location?.district || "");
      setPin(user.location?.pin || "");
      setState(user.location?.state || "");
    }
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      const body: Record<string, unknown> = {};

      if (name !== user.name) body.name = name;

      const locUpdates: Record<string, string> = {};
      if (locality !== (user.location?.locality || "")) locUpdates.locality = locality;
      if (street !== (user.location?.street || "")) locUpdates.street = street;
      if (city !== (user.location?.city || "")) locUpdates.city = city;
      if (district !== (user.location?.district || "")) locUpdates.district = district;
      if (pin !== (user.location?.pin || "")) locUpdates.pin = pin;
      if (state !== (user.location?.state || "")) locUpdates.state = state;

      if (Object.keys(locUpdates).length > 0) body.location = locUpdates;

      if (Object.keys(body).length === 0) {
        setIsEditing(false);
        return;
      }

      const resp = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.message || "Update failed");
      }

      // Update local storage and parent state
      const updated: UserData = { ...user, ...data.data };
      localStorage.setItem("userData", JSON.stringify(updated));
      onUserUpdated(updated);

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }, [user, name, locality, street, city, district, pin, state, onUserUpdated]);

  const handleCancel = useCallback(() => {
    if (user) {
      setName(user.name || "");
      setLocality(user.location?.locality || "");
      setStreet(user.location?.street || "");
      setCity(user.location?.city || "");
      setDistrict(user.location?.district || "");
      setPin(user.location?.pin || "");
      setState(user.location?.state || "");
    }
    setIsEditing(false);
    setError(null);
  }, [user]);

  const initials = user?.name?.[0]?.toUpperCase() || "U";
  const memberSince = user?.dateOfCreation
    ? new Date(user.dateOfCreation).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex justify-end"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-[var(--dash-on-surface)]/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-[var(--font-headline)] text-xl font-bold text-[var(--dash-on-surface)]">
                Profile Settings
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Avatar + Header card */}
            <div className="px-6 py-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--dash-primary)] to-[var(--dash-primary-container)] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {initials}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--dash-on-surface)]">
                    {user?.name || "User"}
                  </h3>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                  {memberSince && (
                    <p className="text-xs text-slate-400 mt-0.5">Member since {memberSince}</p>
                  )}
                </div>
              </div>

              {/* Success banner */}
              <AnimatePresence>
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl mb-6 text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Profile updated successfully!
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl mb-6 text-sm"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Personal Info Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Personal Information
                  </h4>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[var(--dash-primary)] hover:underline"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-slate-400 mt-2.5" />
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Full Name
                      </label>
                      {isEditing ? (
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-[var(--dash-surface)] rounded-lg px-3 py-2 text-sm text-[var(--dash-on-surface)] border border-slate-200 focus:border-[var(--dash-primary)] focus:ring-2 focus:ring-[var(--dash-primary)]/20 outline-none transition-all"
                        />
                      ) : (
                        <p className="text-sm font-medium text-[var(--dash-on-surface)]">
                          {user?.name || "—"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email (read-only) */}
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-slate-400 mt-2.5" />
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Email
                      </label>
                      <p className="text-sm font-medium text-[var(--dash-on-surface)]">
                        {user?.email || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Phone (read-only) */}
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-slate-400 mt-2.5" />
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Phone
                      </label>
                      <p className="text-sm font-medium text-[var(--dash-on-surface)]">
                        {user?.phoneNumber || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Language (read-only) */}
                  <div className="flex items-start gap-3">
                    <Globe className="w-4 h-4 text-slate-400 mt-2.5" />
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Preferred Language
                      </label>
                      <p className="text-sm font-medium text-[var(--dash-on-surface)]">
                        {user?.preferredLanguage || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="mb-8">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  Address
                </h4>

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Locality
                        </label>
                        <input
                          value={locality}
                          onChange={(e) => setLocality(e.target.value)}
                          className="w-full bg-[var(--dash-surface)] rounded-lg px-3 py-2 text-sm border border-slate-200 focus:border-[var(--dash-primary)] focus:ring-2 focus:ring-[var(--dash-primary)]/20 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Street
                        </label>
                        <input
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          className="w-full bg-[var(--dash-surface)] rounded-lg px-3 py-2 text-sm border border-slate-200 focus:border-[var(--dash-primary)] focus:ring-2 focus:ring-[var(--dash-primary)]/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          City
                        </label>
                        <input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full bg-[var(--dash-surface)] rounded-lg px-3 py-2 text-sm border border-slate-200 focus:border-[var(--dash-primary)] focus:ring-2 focus:ring-[var(--dash-primary)]/20 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          District
                        </label>
                        <input
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full bg-[var(--dash-surface)] rounded-lg px-3 py-2 text-sm border border-slate-200 focus:border-[var(--dash-primary)] focus:ring-2 focus:ring-[var(--dash-primary)]/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          PIN Code
                        </label>
                        <input
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          className="w-full bg-[var(--dash-surface)] rounded-lg px-3 py-2 text-sm border border-slate-200 focus:border-[var(--dash-primary)] focus:ring-2 focus:ring-[var(--dash-primary)]/20 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          State
                        </label>
                        <input
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full bg-[var(--dash-surface)] rounded-lg px-3 py-2 text-sm border border-slate-200 focus:border-[var(--dash-primary)] focus:ring-2 focus:ring-[var(--dash-primary)]/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[var(--dash-surface)] rounded-xl p-4 text-sm text-[var(--dash-on-surface)] space-y-1">
                    {user?.location?.street && <p>{user.location.street}</p>}
                    <p>
                      {[user?.location?.locality, user?.location?.city].filter(Boolean).join(", ")}
                    </p>
                    <p>
                      {[user?.location?.district, user?.location?.state].filter(Boolean).join(", ")}
                    </p>
                    {user?.location?.pin && (
                      <p className="text-slate-500">PIN: {user.location.pin}</p>
                    )}
                    {!user?.location && (
                      <p className="text-slate-400 italic">No address on file</p>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[var(--dash-primary)] to-[var(--dash-primary-container)] rounded-xl shadow-lg shadow-[var(--dash-primary)]/20 hover:shadow-[var(--dash-primary)]/30 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
