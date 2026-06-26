import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import api, { getApiError } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ChevronLeft,
  Loader2,
  Users,
  Send,
  Eye,
  Award,
  Coins,
  Tag,
  Code,
  Globe,
  Hash,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Separator } from "@/app/components/ui/separator";
import { Badge } from "@/app/components/ui/badge";

// ─── Types ───────────────────────────────────────────────

interface CampaignDetail {
  id: number;
  title: string;
  content: string;
  title_zh?: string;
  content_zh?: string;
  status: string;
  tag_ids: string[];
  tag_names: string[];
  languages: string[];
  countries: string[];
  regions: string[];
  top_n: number;
  point_type: string;
  cost_per_user: number;
  total_cost: number;
  reward_ratio: number;
  reward_pool: number;
  reward_expiry_days: number;
  total_recipients: number;
  delivered_count: number;
  read_count: number;
  rewarded_count: number;
  created_at: string;
}

// ─── Markdown helpers ────────────────────────────────────

const MARKDOWN_PROSE_CLASS =
  "max-w-none text-sm leading-relaxed " +
  "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 " +
  "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 " +
  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 " +
  "[&_p]:my-2 [&_p]:leading-relaxed " +
  "[&_strong]:font-semibold [&_em]:italic " +
  "[&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80 " +
  "[&_img]:max-w-full [&_img]:rounded-md [&_img]:my-2 " +
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 " +
  "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 " +
  "[&_li]:my-1 [&_li]:leading-relaxed " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:my-2 " +
  "[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm " +
  "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:my-2 " +
  "[&_hr]:my-4 [&_hr]:border-border " +
  "[&_table]:my-2 [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold";

// ─── Component ──────────────────────────────────────────

export default function TalentReachDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchCampaign = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<CampaignDetail>(
          `/talent-reach/campaigns/${id}`
        );
        setCampaign(data);
      } catch (err) {
        toast.error(getApiError(err).message);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [id]);

  const formatPointType = (type: string) => {
    switch (type) {
      case "cash":
        return t("talentReach.pointTypeCash");
      case "gift":
        return t("talentReach.pointTypeGift");
      default:
        return type;
    }
  };

  const calcPercentage = (count: number, total: number) => {
    if (total === 0) return "0%";
    return `${Math.round((count / total) * 100)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="mr-1 size-4" />
          {t("common.back")}
        </Button>
        <div className="mt-10 text-center text-muted-foreground">
          {t("talentReach.notFound")}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="mr-1 size-4" />
          {t("common.back")}
        </Button>
        <h1 className="text-xl font-bold">{t("talentReach.campaignDetail")}</h1>
      </div>

      {/* Title & Time */}
      <div className="rounded-lg border p-4 space-y-2">
        <h2 className="text-lg font-semibold">{campaign.title}</h2>
        <p className="text-sm text-muted-foreground">
          {t("talentReach.sentAt")}:{" "}
          {format(new Date(campaign.created_at), "yyyy-MM-dd HH:mm")}
        </p>
      </div>

      {/* Statistics */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Users className="size-4 text-blue-500" />
          {t("talentReach.sendStats")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<Users className="size-4 text-slate-500" />}
            label={t("talentReach.totalRecipients")}
            value={`${campaign.total_recipients} ${t("talentReach.people")}`}
          />
          <StatCard
            icon={<Send className="size-4 text-blue-500" />}
            label={t("talentReach.delivered")}
            value={`${campaign.delivered_count} ${t("talentReach.people")}`}
          />
          <StatCard
            icon={<Eye className="size-4 text-amber-500" />}
            label={t("talentReach.readCount")}
            value={`${campaign.read_count} ${t("talentReach.people")}`}
            sub={calcPercentage(campaign.read_count, campaign.total_recipients)}
          />
          <StatCard
            icon={<Award className="size-4 text-emerald-500" />}
            label={t("talentReach.rewarded")}
            value={`${campaign.rewarded_count} ${t("talentReach.people")}`}
            sub={calcPercentage(
              campaign.rewarded_count,
              campaign.total_recipients
            )}
          />
        </div>
      </div>

      {/* Points Cost */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Coins className="size-4 text-yellow-500" />
          {t("talentReach.pointsCost")}
        </h3>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t("talentReach.totalCost")}
            </span>
            <span className="font-medium">
              {campaign.total_cost} {t("talentReach.points")} (
              {formatPointType(campaign.point_type)})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t("talentReach.rewardPool")}
            </span>
            <span className="font-medium">
              {campaign.reward_pool} {t("talentReach.points")} (
              {Math.round(campaign.reward_ratio * 100)}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t("talentReach.costPerUser")}
            </span>
            <span className="font-medium">
              {campaign.cost_per_user} {t("talentReach.pointsPerPerson")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t("talentReach.rewardExpiry")}
            </span>
            <span className="font-medium">
              {campaign.reward_expiry_days} {t("talentReach.days")}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Criteria */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Tag className="size-4 text-purple-500" />
          {t("talentReach.filterCriteria")}
        </h3>
        <div className="grid gap-2 text-sm">
          {campaign.tag_names.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground shrink-0">
                {t("talentReach.tags")}:
              </span>
              {campaign.tag_names.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {campaign.languages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Code className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground shrink-0">
                {t("talentReach.languages")}:
              </span>
              {campaign.languages.map((lang) => (
                <Badge key={lang} variant="outline">
                  {lang}
                </Badge>
              ))}
            </div>
          )}
          {campaign.countries.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Globe className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground shrink-0">
                {t("talentReach.countries")}:
              </span>
              {campaign.countries.map((c) => (
                <Badge key={c} variant="outline">
                  {c}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Hash className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Top N:</span>
            <span className="font-medium">{campaign.top_n}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Message Content */}
      <div className="space-y-3">
        <h3 className="font-semibold">{t("talentReach.messageContent")}</h3>

        {/* English content */}
        <div className="rounded-lg border p-4 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase">English</div>
          <div className={MARKDOWN_PROSE_CLASS}>
            <ReactMarkdown>{campaign.content}</ReactMarkdown>
          </div>
        </div>

        {/* Chinese content (if available) */}
        {campaign.content_zh && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">中文</div>
            <div className={MARKDOWN_PROSE_CLASS}>
              <ReactMarkdown>{campaign.content_zh}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">({sub})</div>}
    </div>
  );
}
