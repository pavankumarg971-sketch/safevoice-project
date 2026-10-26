import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

type FormData = z.infer<typeof ForgotPasswordSchema>;

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  meta: {
    title: "Forgot Password — SafeVoice",
    description: "Request a password reset link for your SafeVoice account.",
  },
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(ForgotPasswordSchema) });

  const onSubmit = async (data: FormData) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        // Redirect back to the app after user clicks the link in email
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent. Check your inbox.");
      navigate({ to: "/auth" });
    } catch (err) {
      const e = err as Error;
      toast.error(e.message ?? "Failed to send reset email");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <Card className="w-full max-w-md border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>Enter your email to receive a password reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                className="bg-slate-950/60 border-white/10 text-white"
              />
              {errors.email && <p className="text-rose-400 text-sm">{errors.email.message}</p>}
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmitting ? "Sending…" : "Send Reset Link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
