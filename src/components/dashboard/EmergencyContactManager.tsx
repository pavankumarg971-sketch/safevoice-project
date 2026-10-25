import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Phone,
  Mail,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type Contact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
  is_primary: boolean;
};

// Helper to validate phone with country code (E.164 standard)
export function validatePhoneNumber(raw: string): { valid: boolean; formatted: string; error?: string } {
  const cleaned = raw.trim().replace(/[\s\-()]/g, '');
  if (!cleaned.startsWith('+')) {
    return {
      valid: false,
      formatted: cleaned,
      error: "Phone number must start with a country code (e.g. +91 for India, +1 for USA).",
    };
  }
  // Check format: + followed by 7 to 15 digits
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (!e164Regex.test(cleaned)) {
    return {
      valid: false,
      formatted: cleaned,
      error: "Please enter a valid phone number with 7-15 digits following the country code.",
    };
  }
  return { valid: true, formatted: cleaned };
}

export function EmergencyContactManager() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [isPrimary, setIsPrimary] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load contacts
  const loadContacts = async () => {
    setLoading(true);

    if (!user) {
      // Load from localStorage if present
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('safevoice_emergency_contacts');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setContacts(parsed);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn(e);
          }
        }
      }
      setContacts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setContacts(data ? (data as Contact[]) : []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [user]);

  // Open Add modal
  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setPhone('+91 ');
    setEmail('');
    setRelationship('Parent');
    setIsPrimary(contacts.length === 0);
    setIsModalOpen(true);
  };

  // Open Edit modal
  const openEditModal = (c: Contact) => {
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || '');
    setRelationship(c.relationship || 'Parent');
    setIsPrimary(c.is_primary);
    setIsModalOpen(true);
  };

  // Save Contact (Insert or Update)
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter contact full name.');
      return;
    }

    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      toast.error(phoneValidation.error);
      return;
    }

    setSubmitting(true);
    try {
      if (!user) {
        // Save to localStorage for Guest / Preview Mode
        let updated: Contact[];
        if (editingId) {
          updated = contacts.map((c) =>
            c.id === editingId
              ? { ...c, name: name.trim(), phone: phoneValidation.formatted, email: email.trim(), relationship, is_primary: isPrimary }
              : c,
          );
          toast.success(`Contact ${name} updated.`);
        } else {
          const newC: Contact = {
            id: 'demo-' + Date.now(),
            name: name.trim(),
            phone: phoneValidation.formatted,
            email: email.trim(),
            relationship,
            is_primary: isPrimary,
          };
          updated = [newC, ...contacts];
          toast.success(`Contact ${name} added successfully!`);
        }

        setContacts(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem('safevoice_emergency_contacts', JSON.stringify(updated));
          window.dispatchEvent(new Event('safevoice_contacts_updated'));
        }
        setIsModalOpen(false);
        setSubmitting(false);
        return;
      }

      // Logged in user: persist in Supabase
      if (editingId) {
        const { error } = await supabase
          .from('emergency_contacts')
          .update({
            name: name.trim(),
            phone: phoneValidation.formatted,
            email: email.trim() || null,
            relationship,
            is_primary: isPrimary,
          })
          .eq('id', editingId)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success(`Contact ${name} updated successfully!`);
      } else {
        const { error } = await supabase.from('emergency_contacts').insert({
          user_id: user.id,
          name: name.trim(),
          phone: phoneValidation.formatted,
          email: email.trim() || null,
          relationship,
          is_primary: isPrimary,
        });

        if (error) throw error;
        toast.success(`Emergency contact ${name} added!`);
      }

      setIsModalOpen(false);
      await loadContacts();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('safevoice_contacts_updated'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save contact.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Contact
  const handleDeleteContact = async (id: string, contactName: string) => {
    if (!confirm(`Are you sure you want to remove ${contactName} from your emergency contacts?`)) {
      return;
    }

    try {
      if (user && !id.startsWith('demo-')) {
        const { error } = await supabase
          .from('emergency_contacts')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      const updated = contacts.filter((c) => c.id !== id);
      setContacts(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('safevoice_emergency_contacts', JSON.stringify(updated));
        window.dispatchEvent(new Event('safevoice_contacts_updated'));
      }
      toast.success(`Removed ${contactName} from emergency contacts.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete contact.';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Users className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Emergency Contacts Directory</h3>
            <p className="text-xs text-slate-400">
              These contacts automatically receive SMS alerts, live tracking links, and voice calls during an SOS.
            </p>
          </div>
        </div>

        <Button
          onClick={openAddModal}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2 shadow-lg shadow-purple-600/20 text-xs font-semibold cursor-pointer"
        >
          <Plus className="size-4" />
          Add New Contact
        </Button>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin text-purple-400" />
          Loading saved contacts...
        </div>
      ) : contacts.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3">
          <AlertCircle className="size-8 text-amber-400 mx-auto" />
          <p className="text-sm font-semibold text-white">No emergency contacts saved yet</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Add at least one family member or guardian so they can receive automated SMS alerts and phone calls.
          </p>
          <Button onClick={openAddModal} size="sm" className="bg-purple-600 text-white mt-2">
            Add First Contact
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl border border-white/5 bg-slate-900/70 hover:border-purple-500/35 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(168,85,247,0.2)] transition-all duration-300 ease-out flex items-center justify-between shadow-xl"
            >
              {/* Left Details */}
              <div className="flex items-center gap-3.5">
                <Avatar className="size-11 border border-white/10">
                  <AvatarFallback className="bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-sm">
                    {c.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    {c.is_primary && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-[11px] text-slate-300 font-medium">
                      {c.relationship}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-slate-300">
                      <Phone className="size-3 text-emerald-400" />
                      {c.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openEditModal(c)}
                  className="size-8 text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Edit contact"
                >
                  <Edit2 className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteContact(c.id, c.name)}
                  className="size-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  title="Remove contact"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="size-5 text-purple-400" />
                {editingId ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/70">Full Name *</Label>
                <Input
                  placeholder="e.g. John Doe, Sister Priya"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-950/60 border-white/10 text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/70">
                  Phone Number with Country Code (E.164 format) *
                </Label>
                <Input
                  placeholder="+91 98765 43210 or +1 2025550123"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-slate-950/60 border-white/10 text-white font-mono text-sm"
                  required
                />
                <p className="text-[10px] text-slate-400">
                  Must include '+' and country code (e.g. +91 for India, +1 for US/Canada).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/70">Email Address (Optional)</Label>
                <Input
                  type="email"
                  placeholder="contact@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-950/60 border-white/10 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/70">Relationship</Label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="Parent">Parent</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Partner">Partner / Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Friend">Friend</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Doctor">Doctor / Medical</option>
                  <option value="Police">Local Authority / Police</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
                <div>
                  <p className="text-xs font-semibold text-white">Set as Primary Contact</p>
                  <p className="text-[10px] text-slate-400">Notified first during emergency dispatch</p>
                </div>
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="size-4 rounded accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs text-slate-400 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 rounded-xl cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Contact' : 'Save Contact'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
