import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ResetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormData = z.infer<typeof ResetPasswordSchema>;

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  meta: {
    title: "Reset Password — SafeVoice",
    description: "Set a new password for your SafeVoice account.",
  },
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { search } = useSearch({
    from: "/reset-password",
    parse: (search) => ({ access_token: String(search.access_token) }),
  });
  const accessToken = search.access_token;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(ResetPasswordSchema) });

  const onSubmit = async (data: FormData) => {
    if (!accessToken) {
      toast.error("Missing access token for password reset.");
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser(accessToken, {
        password: data.password,
      });
      if (error) throw error;
      toast.success("Password updated successfully. You can now sign in.");
      navigate({ to: "/auth" });
    } catch (err) {
      const e = err as Error;
      toast.error(e.message ?? "Failed to reset password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <Card className="w-full max-w-md border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>Enter a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                className="bg-slate-950/60 border-white/10 text-white"
              />
              {errors.password && (
                <p className="text-rose-400 text-sm">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                className="bg-slate-950/60 border-white/10 text-white"
              />
              {errors.confirmPassword && (
                <p className="text-rose-400 text-sm">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmitting ? "Updating…" : "Reset Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
