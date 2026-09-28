import Dashboard from "@/components/Dashboard";
import audit from "@/data/audit.json";
import type { AuditData } from "@/lib/types";

export default function Home() {
  return <Dashboard data={audit as AuditData} />;
}
