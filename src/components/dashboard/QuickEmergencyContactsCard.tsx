import { useState, useEffect, useCallback } from 'react';
import { Phone, MessageSquare, Plus, Star, Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  is_primary?: boolean;
}

interface Props {
  onManageClick: () => void;
}

export function QuickEmergencyContactsCard({ onManageClick }: Props) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    // 1. If signed in, query Supabase
    if (user) {
      try {
        const { data, error } = await supabase
          .from('emergency_contacts')
          .select('id, name, relationship, phone, is_primary')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })
          .limit(3);

        if (!error && data && data.length > 0) {
          setContacts(data as Contact[]);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Error loading contacts from Supabase:', err);
      }
    }

    // 2. Check localStorage (for guest mode or local fallback)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('safevoice_emergency_contacts');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setContacts(parsed.slice(0, 3));
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Error reading stored contacts', e);
        }
      }
    }

    // 3. If user hasn't added any contacts yet, show empty list (no default fake numbers)
    setContacts([]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchContacts();

    // Listen to custom event dispatched when contacts are added/edited/deleted
    const handleSync = () => {
      fetchContacts();
    };

    window.addEventListener('safevoice_contacts_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('safevoice_contacts_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchContacts]);

  const handleCall = (contact: Contact) => {
    window.location.href = `tel:${contact.phone}`;
    toast.success(`Dialing ${contact.name}...`);
  };

  const handleText = (contact: Contact) => {
    window.location.href = `sms:${contact.phone}?body=SafeVoice Emergency Alert: I need immediate assistance. Please check my live location.`;
    toast.info(`Opening SMS for ${contact.name}`);
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/70 backdrop-blur-xl p-5 flex flex-col justify-between shadow-xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-purple-500/35 hover:shadow-[0_20px_50px_rgba(168,85,247,0.18)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-purple-500/10 text-purple-400">
            <Users className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Emergency Contacts</h3>
            <p className="text-xs text-slate-400">
              {contacts.length > 0
                ? `${contacts.length} trusted contact${contacts.length > 1 ? 's' : ''} configured`
                : 'Notified via SMS & Voice call on SOS'}
            </p>
          </div>
        </div>

        <button
          onClick={onManageClick}
          className="size-7 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Add or manage contacts"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* Contacts List Grid OR Empty State */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
          Loading contacts...
        </div>
      ) : contacts.length === 0 ? (
        <div className="py-7 px-4 rounded-xl border border-dashed border-white/10 bg-slate-950/40 text-center flex flex-col items-center justify-center space-y-2.5">
          <div className="size-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 grid place-items-center">
            <UserPlus className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">No emergency contacts added yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
              Add your mobile number or trusted family members so they receive your SOS location alert.
            </p>
          </div>
          <Button
            size="sm"
            onClick={onManageClick}
            className="mt-1 bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 font-semibold rounded-xl shadow-md shadow-purple-600/30 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add Contact Number</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-white/5 hover:border-purple-500/30 hover:bg-slate-900/80 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
            >
              {/* User Details */}
              <div className="flex items-center gap-3">
                <Avatar className="size-9 border border-white/10">
                  <AvatarFallback className="bg-gradient-to-tr from-indigo-600 to-purple-600 text-white text-xs font-bold">
                    {c.name
                      .split(' ')
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-white">{c.name}</p>
                    {c.is_primary && <Star className="size-3 fill-amber-400 text-amber-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {c.relationship} • {c.phone}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCall(c)}
                  className="h-7 px-2.5 text-[11px] gap-1 border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
                >
                  <Phone className="size-3 text-emerald-400" />
                  Call
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleText(c)}
                  className="h-7 px-2.5 text-[11px] gap-1 border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
                >
                  <MessageSquare className="size-3 text-blue-400" />
                  Text
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Link */}
      <div className="mt-3 pt-2 border-t border-white/5 text-center">
        <button
          onClick={onManageClick}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer font-medium"
        >
          {contacts.length > 0 ? `Manage All Contacts (${contacts.length}) →` : '+ Open Contact Manager →'}
        </button>
      </div>
    </div>
  );
}
