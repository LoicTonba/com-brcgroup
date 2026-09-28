import Dashboard from "@/components/Dashboard";
import type { MediaItem, VideoItem } from "@/components/Showcase";
import type { Benchmark, StrategyData } from "@/components/Strategy";
import audit from "@/data/audit.json";
import benchmark from "@/data/benchmark.json";
import media from "@/data/media.json";
import strategy from "@/data/strategy.json";
import videos from "@/data/videos.json";
import type { AuditData } from "@/lib/types";

export default function Home() {
  return (
    <Dashboard
      data={audit as AuditData}
      media={media as MediaItem[]}
      videos={videos as VideoItem[]}
      benchmark={benchmark as unknown as Benchmark}
      strategy={strategy as unknown as StrategyData}
    />
  );
}
