export type Entity = "CGA" | "CFP" | "GATHE" | "GROUPE";
export type Platform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "youtube"
  | "x"
  | "maligah";

export type SourceStatus =
  | "ok"
  | "partial"
  | "login_required"
  | "blocked"
  | "not_found";

export interface Source {
  id: string;
  platform: Platform;
  entity: Entity;
  name: string;
  url: string;
  followers: number | null;
  /** Posts the platform says the account has published (null if not shown) */
  totalPosts: number | null;
  /** Posts collected from this account in the audit */
  collected: number;
  createdAt: string | null;
  /** Share of reviewers who recommend the page (Facebook "recommande"), in % */
  recommendation: { rate: number | null; count: number } | null;
  status: SourceStatus;
  notes: string;
}

export interface Sentiment {
  positive: number;
  neutral: number;
  negative: number;
}

export interface Post {
  id: string;
  sourceId: string;
  platform: Platform;
  entity: Entity;
  /** YYYY-MM-DD, YYYY-MM or YYYY — precision varies by source */
  date: string | null;
  format: string;
  theme: string;
  title: string;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  sentiment: Sentiment | null;
  hasCallToAction: boolean | null;
  quality: number | null;
  url: string | null;
  /** Followers of the page it was published on, for engagement rate. */
  audience: number | null;
}

export interface Finding {
  entity: Entity;
  level: "good" | "warning" | "critical";
  title: string;
  detail: string;
  action: string;
}

export interface AuditData {
  generatedAt: string;
  sources: Source[];
  posts: Post[];
  /** Qualitative observations noted by hand during the audit */
  findings: Finding[];
}
