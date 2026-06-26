import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import {
  Plus,
  FileText,
  Pencil,
  Send,
  Trash2,
  Loader2,
  Inbox,
  CheckCircle2,
  Users,
  Eye,
  Coins,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import api, { getApiError } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────

interface DraftItem {
  id: number;
  title: string;
  content: string;
  updated_at: string;
}

interface CampaignItem {
  id: number;
  title: string;
  sent_at: string;
  reach_count: number;
  read_count: number;
  points_cost: number;
}

// ─── Helpers ─────────────────────────────────────────────

/** Strip markdown syntax for plain-text preview */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

type TabType = "drafts" | "history";

// ─── Component ───────────────────────────────────────────

export default function TalentReachPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dateLocale = i18n.language === "en" ? enUS : zhCN;

  const [activeTab, setActiveTab] = useState<TabType>("drafts");
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // ─── Data Fetching ────────────────────────────────────

  const fetchDrafts = useCallback(async () => {
    setLoadingDrafts(true);
    try {
      const { data } = await api.get<DraftItem[]>("/talent-reach/drafts");
      setDrafts(data);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoadingDrafts(false);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const { data } = await api.get<CampaignItem[]>("/talent-reach/campaigns");
      setCampaigns(data);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchCampaigns();
    }
  }, [activeTab, fetchCampaigns]);

  // ─── Actions ──────────────────────────────────────────

  const handleDeleteDraft = async (id: number) => {
    try {
      await api.delete(`/talent-reach/drafts/${id}`);
      toast.success(t("talentReach.deleteSuccess"));
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  // ─── Render Helpers ───────────────────────────────────

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: dateLocale,
      });
    } catch {
      return dateStr;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "yyyy-MM-dd", { locale: dateLocale });
    } catch {
      return dateStr;
    }
  };

  // ─── JSX ──────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("nav.talentReach")}</h1>
        <Button onClick={() => navigate("/talent-reach/compose")}>
          <Plus className="mr-1.5 size-4" />
          {t("talentReach.newMessage")}
        </Button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        <button
          onClick={() => setActiveTab("drafts")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "drafts"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("talentReach.drafts")}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("talentReach.history")}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "drafts" && (
        <div className="space-y-3">
          {loadingDrafts ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Inbox className="mb-3 size-12 opacity-40" />
              <p className="text-sm">{t("talentReach.noDrafts")}</p>
            </div>
          ) : (
            drafts.map((draft) => (
              <div
                key={draft.id}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">
                        {draft.title}
                      </span>
                    </div>
                    <p className="mt-1 truncate pl-6 text-xs text-muted-foreground">
                      {stripMarkdown(draft.content).slice(0, 100)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTime(draft.updated_at)}
                  </span>
                </div>
                <div className="mt-3 flex gap-2 pl-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/talent-reach/compose?draft_id=${draft.id}`)}
                  >
                    <Pencil className="mr-1 size-3.5" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/talent-reach/send/${draft.id}`)}
                  >
                    <Send className="mr-1 size-3.5" />
                    {t("talentReach.send")}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="mr-1 size-3.5" />
                        {t("common.delete")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("talentReach.confirmDeleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("talentReach.confirmDeleteDesc")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteDraft(draft.id)}>
                          {t("common.confirm")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-3">
          {loadingCampaigns ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Inbox className="mb-3 size-12 opacity-40" />
              <p className="text-sm">{t("talentReach.noCampaigns")}</p>
              <p className="mt-1 text-xs">{t("talentReach.noCampaignsHint")}</p>
            </div>
          ) : (
            campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/30"
                onClick={() => navigate(`/talent-reach/history/${campaign.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                      <span className="truncate text-sm font-medium">
                        {campaign.title}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 pl-6 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" />
                        {t("talentReach.reachCountSummary", { count: campaign.reach_count })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="size-3.5" />
                        {t("talentReach.readCountSummary", { count: campaign.read_count })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins className="size-3.5" />
                        {t("talentReach.pointsCostSummary", { count: campaign.points_cost })}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(campaign.sent_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
