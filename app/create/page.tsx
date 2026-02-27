import { CreateCommunityForm } from "@/components/create-community-form";
import { Zap } from "lucide-react";

export default function CreatePage() {
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-btc-orange/30 bg-btc-orange/5 text-btc-orange text-sm mb-6">
            <Zap className="w-4 h-4" />
            Prompt-Driven Creation
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-sovereign-white mb-4">
            Forge your{" "}
            <span className="text-btc-orange">sovereign community</span>
          </h1>
          <p className="text-sovereign-muted max-w-2xl mx-auto">
            Describe your community in plain English. ArxMint generates a
            complete Fedimint/Cashu deployment with Lightning agent rails,
            privacy defaults, and Docker configuration — ready to launch.
          </p>
        </div>

        {/* Form */}
        <CreateCommunityForm />
      </div>
    </div>
  );
}
