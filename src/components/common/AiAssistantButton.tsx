import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export function AiAssistantButton() {
  return (
    <motion.button
      type="button"
      aria-label="Open AI learning assistant"
      onClick={() =>
        toast("Binimoy AI is warming up", {
          description: "Personalised skill recommendations arrive in your next session.",
        })
      }
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 220, damping: 18 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.94 }}
      className="bg-card text-foreground shadow-card ring-border hover:ring-primary/40 fixed right-6 bottom-22 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition-shadow"
    >
      <Sparkles className="text-primary size-4" aria-hidden="true" />
      Ask AI
    </motion.button>
  );
}
