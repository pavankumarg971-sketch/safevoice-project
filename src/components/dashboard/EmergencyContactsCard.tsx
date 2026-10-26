import { useEffect, useState } from "react";
import { Phone, UserPlus, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Contact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
};

// Demo contacts shown when user is not logged in
const DEMO_CONTACTS: Contact[] = [
  { id: "1", name: "Mom", phone: "+91 98765 43210", relationship: "Parent", is_primary: true },
  { id: "2", name: "Dad", phone: "+91 98765 43211", relationship: "Parent", is_primary: false },
  {
    id: "3",
    name: "Best Friend",
    phone: "+91 91234 56789",
    relationship: "Friend",
    is_primary: false,
  },
];

export function EmergencyContactsCard() {
  const { session, user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isDemo, setIsDemo] = useState(true);

  useEffect(() => {
    if (!session || !user) {
      setContacts(DEMO_CONTACTS);
      setIsDemo(true);
      return;
    }

    // Fetch real contacts from Supabase
    supabase
      .from("emergency_contacts")
      .select("id, name, phone, relationship, is_primary")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setContacts(data);
          setIsDemo(false);
        } else {
          setContacts(DEMO_CONTACTS);
          setIsDemo(true);
        }
      });
  }, [session, user]);

  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-5 w-5 text-blue-400" />
            Emergency Contacts
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs text-white/40 hover:text-white hover:bg-white/10"
            id="add-contact-btn"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isDemo && (
          <div className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/40">
            📋 Showing sample contacts. Sign in to manage your real emergency contacts.
          </div>
        )}

        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center justify-between rounded-lg border border-white/10 p-3 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 font-semibold text-sm">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{contact.name}</span>
                  {contact.is_primary && (
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                <span className="text-xs text-white/40">{contact.phone}</span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs border-white/10 text-white/50">
              {contact.relationship}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
