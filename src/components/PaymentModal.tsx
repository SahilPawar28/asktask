import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Task } from "@/types";
import { CheckCircle, Loader2, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  task: Task;
  onClose: () => void;
  onPaid: () => void;
}

const METHODS = [
  { id: "upi", label: "UPI", icon: "📱", desc: "Pay via any UPI app" },
  { id: "wallet", label: "Wallet", icon: "👛", desc: "AskTask wallet balance" },
  { id: "card", label: "Card", icon: "💳", desc: "Debit / Credit card" },
];

export function PaymentModal({ task, onClose, onPaid }: Props) {
  const [method, setMethod] = useState("upi");
  const [step, setStep] = useState<"select" | "confirm" | "success">("select");
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setLoading(false);
    setStep("success");
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {step === "success" ? "Payment Successful!" : "Release Payment"}
          </DialogTitle>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            {/* Escrow notice */}
            <div className="flex items-start gap-3 p-4 bg-success/10 rounded-xl">
              <Shield className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Escrow Protection</p>
                <p className="text-xs text-muted-foreground">Payment was held securely. It will be released to the task doer after you confirm.</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
              <p className="text-sm text-muted-foreground">Amount to release</p>
              <p className="text-2xl font-bold font-display text-success">₹{task.payment}</p>
            </div>

            <p className="text-sm font-medium text-foreground">Select Payment Method</p>
            <div className="space-y-2">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    method === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <div>
                    <p className="font-medium text-foreground">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                  {method === m.id && <div className="ml-auto w-4 h-4 rounded-full gradient-primary" />}
                </button>
              ))}
            </div>

            {method === "upi" && (
              <Input placeholder="Enter UPI ID (e.g., name@upi)" className="h-12 rounded-xl" />
            )}
            {method === "card" && (
              <div className="space-y-2">
                <Input placeholder="Card number" className="h-12 rounded-xl" />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="MM / YY" className="h-12 rounded-xl" />
                  <Input placeholder="CVV" className="h-12 rounded-xl" />
                </div>
              </div>
            )}

            <Button variant="hero" className="w-full h-12" onClick={() => setStep("confirm")}>
              Continue →
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="p-4 bg-secondary rounded-xl space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Task</span><span className="font-medium">{task.title}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Doer</span><span className="font-medium">{task.doerName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-medium capitalize">{method}</span></div>
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-success text-lg">₹{task.payment}</span>
              </div>
            </div>

            <Button variant="hero" className="w-full h-12 gap-2" onClick={handlePay} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Confirm & Pay ₹{task.payment}</>}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep("select")}>Back</Button>
          </div>
        )}

        {step === "success" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold font-display text-foreground">₹{task.payment} Released!</p>
              <p className="text-sm text-muted-foreground mt-1">Payment has been sent to {task.doerName}.</p>
            </div>
            <Button variant="hero" className="w-full" onClick={onPaid}>Done</Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
