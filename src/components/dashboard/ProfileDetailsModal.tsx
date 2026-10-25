import { useState, useEffect } from "react";
import {
  User as UserIcon,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  X,
  Edit3,
  Save,
  Copy,
  Check,
  LogOut,
  Sparkles,
  Radio,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDetailsModal({ isOpen, onClose }: Props) {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationSharing, setLocationSharing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Sync state when profile loads or modal opens
  useEffect(() => {
    if (isOpen) {
      setFullName(profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "SafeVoice User");
      setPhone(profile?.phone || user?.user_metadata?.phone || "");
      setLocationSharing(profile?.location_sharing ?? true);
      setIsEditing(false);
    }
  }, [isOpen, profile, user]);

  if (!isOpen) return null;

  const isLoggedIn = !!user;
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "SafeVoice User";
  const displayEmail = user?.email || profile?.email || "guest@safevoice.app";
  const displayPhone = profile?.phone || user?.user_metadata?.phone || "+91 (Not configured)";
  const initials =
    displayName
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SV";

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      toast.success("User ID copied to clipboard!");
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const ok = await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        location_sharing: locationSharing,
      });

      if (ok) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
        await refreshProfile();
      } else {
        toast.error("Failed to update profile. Please try again.");
      }
    } catch {
      toast.error("An error occurred while saving your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/95 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] text-slate-100 space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Guardian Profile Details</h3>
              <p className="text-xs text-slate-400">Personal safety identity and credentials</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="size-8 rounded-lg bg-white/5 hover:bg-white/10 grid place-items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close profile details"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* User Badge Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Avatar className="size-14 border-2 border-blue-400/40 shadow-lg shadow-blue-500/20">
              <AvatarFallback className="bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-extrabold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white tracking-tight">{displayName}</h4>
                {isLoggedIn ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    <CheckCircle2 className="size-3" />
                    VERIFIED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    GUEST PREVIEW
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300/80 mt-0.5">{displayEmail}</p>
            </div>
          </div>

          {isLoggedIn && !isEditing && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs gap-1.5"
            >
              <Edit3 className="size-3.5" />
              <span>Edit</span>
            </Button>
          )}
        </div>

        {/* Edit Profile Form OR View Profile Info */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Full Legal Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe, Priya Sharma"
                className="bg-slate-950/60 border-white/10 text-white text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Emergency Mobile Number (with Country Code)</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="bg-slate-950/60 border-white/10 text-white text-sm font-mono"
              />
              <p className="text-[10px] text-slate-400">Used for two-way verification and emergency broadcasts.</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
              <div>
                <p className="text-xs font-semibold text-white">Live Geolocation Sharing</p>
                <p className="text-[11px] text-slate-400">Share continuous radar coordinates during active SOS</p>
              </div>
              <Switch checked={locationSharing} onCheckedChange={setLocationSharing} />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-md shadow-blue-600/30"
              >
                <Save className="size-3.5" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {/* Info Item 1: Full Name */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-white/5">
              <div className="flex items-center gap-2.5">
                <UserIcon className="size-4 text-blue-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</p>
                  <p className="text-xs font-semibold text-white mt-0.5">{displayName}</p>
                </div>
              </div>
            </div>

            {/* Info Item 2: Email */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-white/5">
              <div className="flex items-center gap-2.5">
                <Mail className="size-4 text-purple-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registered Email</p>
                  <p className="text-xs font-semibold text-white mt-0.5">{displayEmail}</p>
                </div>
              </div>
            </div>

            {/* Info Item 3: Mobile Number */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-white/5">
              <div className="flex items-center gap-2.5">
                <Phone className="size-4 text-emerald-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile Phone</p>
                  <p className="text-xs font-semibold text-white mt-0.5 font-mono">{displayPhone}</p>
                </div>
              </div>
              {!profile?.phone && isLoggedIn && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                >
                  + Add Number
                </button>
              )}
            </div>

            {/* Info Item 4: Account UUID */}
            {isLoggedIn && user?.id && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-white/5">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="size-4 text-amber-400" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account ID</p>
                    <p className="text-xs font-mono text-slate-300 mt-0.5">{user.id.slice(0, 18)}...</p>
                  </div>
                </div>
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Copy User ID"
                >
                  {copiedId ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  <span>{copiedId ? "Copied" : "Copy"}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          {!isLoggedIn ? (
            <Button asChild size="sm" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5">
              <Link to="/auth" search={{ mode: "login", redirect: "/dashboard" }} onClick={onClose}>
                Sign In to Save Permanent Profile
                <ExternalLink className="size-3.5" />
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
