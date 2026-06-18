import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-4 rounded-lg border border-border bg-card p-8 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
          <h1 className="text-2xl font-bold text-card-foreground">404 — ບໍ່ພົບໜ້ານີ້</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          ໜ້ານີ້ບໍ່ມີຢູ່ ຫຼື ທ່ານອາດຈະໃສ່ທີ່ຢູ່ຜິດ.
        </p>
      </div>
    </div>
  );
}
