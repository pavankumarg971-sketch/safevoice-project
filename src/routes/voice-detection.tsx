import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mic, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceSafetyMode } from "@/components/dashboard/VoiceSafetyMode";

export const Route = createFileRoute("/voice-detection")({
  component: VoiceDetectionPage,
  head: () => ({
    meta: [
      { title: "AI Voice Detection & Threat Analysis — SafeVoice" },
      {
        name: "description",
        content:
          "Real-time voice-activated emergency recognition powered by Machine Learning inference.",
      },
    ],
  }),
});

function VoiceDetectionPage() {
  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col antialiased selection:bg-blue-500/30">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-[#0b1324]/90 backdrop-blur-xl px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20"
          >
            <ShieldCheck className="size-5" />
          </Link>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              SafeVoice AI Threat Detection
            </h1>
            <p className="text-xs text-slate-400">Continuous speech recognition & ML inference</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs"
          >
            <Link to="/dashboard">
              <ArrowLeft className="size-3.5 mr-1" /> Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Mic className="size-6 text-blue-400" />
            Voice-Activated Crime Reporting
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            SafeVoice listens for distress words and uses a trained Machine Learning classifier to
            analyze threat levels. If an emergency is detected, an alert is automatically dispatched
            with your live GPS location.
          </p>
        </div>

        <VoiceSafetyMode />
      </main>
    </div>
  );
}
