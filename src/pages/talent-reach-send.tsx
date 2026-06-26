import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Search,
  Loader2,
  X,
  CheckCircle,
  Send,
  AlertTriangle,
  Users,
} from "lucide-react";
import api, { getApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Separator } from "@/app/components/ui/separator";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/app/components/ui/alert-dialog";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────

interface DraftDetail {
  id: number;
  title: string;
  content: string;
  title_zh: string;
  content_zh: string;
  status: string;
  created_at: string;
}

interface TagItem {
  id: string;
  name: string;
  type: string;
  platforms: string[];
  openrank: number;
}

interface PoolItem {
  owner_type: "user" | "organization";
  owner_name: string;
  owner_slug: string;
  point_type: "cash" | "gift";
  tag: { slug: string; name: string } | null;
  available_balance: number;
  source_selector: {
    owner_type: string;
    owner_slug: string | null;
    point_type: string;
    tag_slug: string | null;
  };
}

interface PreviewResult {
  reachable_users: number;
  estimated_cost: number;
}

// ─── Constants ───────────────────────────────────────────

/** Tailwind v4 arbitrary-variant styles for ReactMarkdown rendered content */
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

// ─── Component ───────────────────────────────────────────

export default function TalentReachSendPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Draft
  const [draft, setDraft] = useState<DraftDetail | null>(null);
  const [draftLoading, setDraftLoading] = useState(true);

  // Tag search
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [tagSearchResults, setTagSearchResults] = useState<TagItem[]>([]);
  const [tagSearching, setTagSearching] = useState(false);
  const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);

  // Languages
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [languageSearchQuery, setLanguageSearchQuery] = useState("");

  // Location
  const [countryInput, setCountryInput] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [regionInput, setRegionInput] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  // Preview
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);

  // Top N
  const [topNEnabled, setTopNEnabled] = useState(false);
  const [topN, setTopN] = useState<string>("");

  // Pool selection
  const [pools, setPools] = useState<PoolItem[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [selectedPoolIndex, setSelectedPoolIndex] = useState<number | null>(null);

  // Send
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ─── Derived ───────────────────────────────────────────

  const filteredPools = pools.filter(
    (p) => p.point_type === "cash" || (p.point_type === "gift" && p.tag === null)
  );
  const selectedPool = selectedPoolIndex !== null ? filteredPools[selectedPoolIndex] : null;
  const canQuery = selectedTags.length > 0 || selectedLanguages.length > 0;
  const insufficientBalance =
    previewResult && selectedPool
      ? previewResult.estimated_cost > selectedPool.available_balance
      : false;
  const canSend =
    previewResult !== null &&
    selectedPool !== null &&
    !insufficientBalance &&
    previewResult.reachable_users > 0;

  // ─── Load draft ────────────────────────────────────────

  useEffect(() => {
    if (!draftId) return;
    async function fetchDraft() {
      try {
        const { data } = await api.get<DraftDetail>(`/talent-reach/drafts/${draftId}`);
        setDraft(data);
      } catch (err) {
        const apiErr = getApiError(err);
        toast.error(t("talentReach.loadDraftFailed", { defaultValue: "加载草稿失败" }), {
          description: apiErr.message,
        });
      } finally {
        setDraftLoading(false);
      }
    }
    fetchDraft();
  }, [draftId, t]);

  // ─── Load languages ────────────────────────────────────

  useEffect(() => {
    async function fetchLanguages() {
      try {
        const { data } = await api.get<{ items: string[] }>("/talent-reach/languages");
        setAvailableLanguages(data.items);
      } catch {
        // silent
      }
    }
    fetchLanguages();
  }, []);

  // ─── Load pools ────────────────────────────────────────

  useEffect(() => {
    async function fetchPools() {
      try {
        const { data } = await api.get<{ items: PoolItem[] }>("/points/pools");
        setPools(data.items);
      } catch (err) {
        const apiErr = getApiError(err);
        toast.error(t("talentReach.loadPoolFailed", { defaultValue: "加载积分池失败" }), {
          description: apiErr.message,
        });
      } finally {
        setPoolsLoading(false);
      }
    }
    fetchPools();
  }, [t]);

  // ─── Tag search with debounce ──────────────────────────

  useEffect(() => {
    if (!tagSearchQuery.trim()) {
      setTagSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setTagSearching(true);
      try {
        const { data } = await api.get<{ items: TagItem[] }>(
          `/points/tags/search?q=${encodeURIComponent(tagSearchQuery.trim())}`
        );
        setTagSearchResults(data.items);
      } catch {
        setTagSearchResults([]);
      } finally {
        setTagSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [tagSearchQuery]);

  // ─── Handlers ──────────────────────────────────────────

  const handleAddCountry = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && countryInput.trim()) {
        e.preventDefault();
        const val = countryInput.trim();
        if (!selectedCountries.includes(val)) {
          setSelectedCountries((prev) => [...prev, val]);
        }
        setCountryInput("");
      }
    },
    [countryInput, selectedCountries]
  );

  const handleAddRegion = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && regionInput.trim()) {
        e.preventDefault();
        const val = regionInput.trim();
        if (!selectedRegions.includes(val)) {
          setSelectedRegions((prev) => [...prev, val]);
        }
        setRegionInput("");
      }
    },
    [regionInput, selectedRegions]
  );

  const handlePreview = async () => {
    if (!canQuery) return;
    setPreviewLoading(true);
    setPreviewResult(null);
    try {
      const body: Record<string, unknown> = {
        tag_ids: selectedTags.map((t) => t.id),
        languages: selectedLanguages,
        countries: selectedCountries,
        regions: selectedRegions,
      };
      if (topNEnabled && topN.trim()) {
        body.top_n = Number(topN);
      }
      const { data } = await api.post<PreviewResult>("/talent-reach/preview", body);
      setPreviewResult(data);
    } catch (err) {
      const apiErr = getApiError(err);
      toast.error(t("talentReach.previewFailed", { defaultValue: "查询失败" }), {
        description: apiErr.message,
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    if (!canSend || !selectedPool || !draft) return;
    setSending(true);
    try {
      const body: Record<string, unknown> = {
        draft_id: Number(draftId),
        tag_ids: selectedTags.map((t) => t.id),
        tag_names: selectedTags.map((t) => t.name),
        languages: selectedLanguages,
        countries: selectedCountries,
        regions: selectedRegions,
        point_type: selectedPool.point_type,
      };
      if (topNEnabled && topN.trim()) {
        body.top_n = Number(topN);
      }
      await api.post("/talent-reach/send", body);
      toast.success(t("talentReach.sendSuccess", { defaultValue: "发送成功" }));
      navigate("/talent-reach");
    } catch (err) {
      const apiErr = getApiError(err);
      toast.error(t("talentReach.sendFailed", { defaultValue: "发送失败" }), {
        description: apiErr.message,
      });
    } finally {
      setSending(false);
    }
  };

  // Filtered language list for dropdown
  const filteredLanguages = availableLanguages.filter(
    (lang) =>
      !selectedLanguages.includes(lang) &&
      lang.toLowerCase().includes(languageSearchQuery.toLowerCase())
  );

  // ─── Render ────────────────────────────────────────────

  if (draftLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {t("talentReach.sendTitle", { defaultValue: "发送消息" })}
        </h1>
      </div>

      {/* Message Preview */}
      {draft && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("talentReach.messagePreview", { defaultValue: "消息预览" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* English */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase">English</div>
              <h3 className="text-base font-semibold">{draft.title}</h3>
              <Separator />
              <div className={MARKDOWN_PROSE_CLASS}>
                <ReactMarkdown>{draft.content}</ReactMarkdown>
              </div>
            </div>

            {/* Chinese (if available) */}
            {draft.content_zh && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="text-xs font-medium text-muted-foreground">中文</div>
                <h3 className="text-base font-semibold">{draft.title_zh}</h3>
                <Separator />
                <div className={MARKDOWN_PROSE_CLASS}>
                  <ReactMarkdown>{draft.content_zh}</ReactMarkdown>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter Criteria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("talentReach.filterCriteria", { defaultValue: "筛选条件" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tag search */}
          <div className="space-y-3">
            <Label>
              {t("talentReach.tagLabel", {
                defaultValue: "项目标签 (至少选择一个标签或编程语言)",
              })}
            </Label>

            {/* Selected tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="flex items-center gap-1 px-2.5 py-1"
                  >
                    <span className="text-sm">{tag.name}</span>
                    <button
                      type="button"
                      className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-muted-foreground/20"
                      onClick={() =>
                        setSelectedTags((prev) => prev.filter((t) => t.id !== tag.id))
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Tag search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("talentReach.searchTagPlaceholder", {
                  defaultValue: "搜索标签...",
                })}
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
              />
              {tagSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Tag search results */}
            {tagSearchResults.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {tagSearchResults.map((tag) => {
                  const alreadyAdded = selectedTags.some((t) => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-sm disabled:opacity-50"
                      disabled={alreadyAdded}
                      onClick={() => {
                        setSelectedTags((prev) => [...prev, tag]);
                        setTagSearchQuery("");
                        setTagSearchResults([]);
                        setPreviewResult(null);
                      }}
                    >
                      <span className="flex items-center gap-1.5">
                        {tag.platforms && tag.platforms.length > 0 && (
                          <span className="flex items-center gap-0.5 shrink-0">
                            {tag.platforms.map((p) => (
                              <img
                                key={p}
                                src={`https://oss.open-digger.cn/logos/${p.toLowerCase()}.png`}
                                alt={p}
                                title={p}
                                className="size-4 rounded-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            ))}
                          </span>
                        )}
                        <span>
                          {tag.name}{" "}
                          <span className="text-muted-foreground">({tag.type})</span>
                        </span>
                      </span>
                      {alreadyAdded && <CheckCircle className="size-4 text-green-500" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Programming languages */}
          <div className="space-y-3">
            <Label>
              {t("talentReach.languageLabel", { defaultValue: "编程语言" })}
            </Label>

            {/* Selected languages */}
            {selectedLanguages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedLanguages.map((lang) => (
                  <Badge
                    key={lang}
                    variant="secondary"
                    className="flex items-center gap-1 px-2.5 py-1"
                  >
                    <span className="text-sm">{lang}</span>
                    <button
                      type="button"
                      className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-muted-foreground/20"
                      onClick={() =>
                        setSelectedLanguages((prev) => prev.filter((l) => l !== lang))
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Language dropdown with search */}
            <div className="space-y-2">
              <Input
                placeholder={t("talentReach.searchLanguagePlaceholder", {
                  defaultValue: "搜索编程语言...",
                })}
                value={languageSearchQuery}
                onChange={(e) => setLanguageSearchQuery(e.target.value)}
              />
              {languageSearchQuery && filteredLanguages.length > 0 && (
                <div className="border rounded-md max-h-36 overflow-y-auto">
                  {filteredLanguages.slice(0, 20).map((lang) => (
                    <button
                      key={lang}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm"
                      onClick={() => {
                        setSelectedLanguages((prev) => [...prev, lang]);
                        setLanguageSearchQuery("");
                        setPreviewResult(null);
                      }}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Location filters */}
          <div className="space-y-4">
            <Label>
              {t("talentReach.locationLabel", { defaultValue: "地域筛选 (可选)" })}
            </Label>

            {/* Countries */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                {t("talentReach.countryLabel", { defaultValue: "国家" })}
              </Label>
              <Input
                placeholder={t("talentReach.countryPlaceholder", {
                  defaultValue: "输入国家名称，按 Enter 添加",
                })}
                value={countryInput}
                onChange={(e) => setCountryInput(e.target.value)}
                onKeyDown={handleAddCountry}
              />
              {selectedCountries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedCountries.map((c) => (
                    <Badge
                      key={c}
                      variant="secondary"
                      className="flex items-center gap-1 px-2.5 py-1"
                    >
                      <span className="text-sm">{c}</span>
                      <button
                        type="button"
                        className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-muted-foreground/20"
                        onClick={() =>
                          setSelectedCountries((prev) => prev.filter((x) => x !== c))
                        }
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Regions */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                {t("talentReach.regionLabel", { defaultValue: "省/州" })}
              </Label>
              <Input
                placeholder={t("talentReach.regionPlaceholder", {
                  defaultValue: "输入省/州名称，按 Enter 添加",
                })}
                value={regionInput}
                onChange={(e) => setRegionInput(e.target.value)}
                onKeyDown={handleAddRegion}
              />
              {selectedRegions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedRegions.map((r) => (
                    <Badge
                      key={r}
                      variant="secondary"
                      className="flex items-center gap-1 px-2.5 py-1"
                    >
                      <span className="text-sm">{r}</span>
                      <button
                        type="button"
                        className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-muted-foreground/20"
                        onClick={() =>
                          setSelectedRegions((prev) => prev.filter((x) => x !== r))
                        }
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query preview button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          className="w-full sm:w-auto"
          disabled={!canQuery || previewLoading}
          onClick={handlePreview}
        >
          {previewLoading ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : (
            <Users className="size-4 mr-2" />
          )}
          {t("talentReach.queryReachable", { defaultValue: "查询可触达用户" })}
        </Button>
      </div>

      {/* Preview results */}
      {previewResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("talentReach.queryResult", { defaultValue: "查询结果" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <p>
                {t("talentReach.reachableUsers", { defaultValue: "可触达注册用户" })}:{" "}
                <span className="font-semibold">
                  {previewResult.reachable_users.toLocaleString()}
                </span>{" "}
                {t("talentReach.people", { defaultValue: "人" })}
              </p>
              <p>
                {t("talentReach.estimatedCost", { defaultValue: "预估费用" })}:{" "}
                <span className="font-semibold">
                  {previewResult.estimated_cost.toLocaleString()}
                </span>{" "}
                {t("talentReach.pointsUnit", { defaultValue: "积分" })}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("talentReach.rewardNote", {
                  defaultValue:
                    "其中 50% 将作为阅读奖励分发给开发者",
                })}
              </p>
            </div>

            <Separator />

            {/* Top N option */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={topNEnabled}
                  onChange={(e) => {
                    setTopNEnabled(e.target.checked);
                    if (!e.target.checked) setTopN("");
                  }}
                  className="size-4 rounded border-border"
                />
                {t("talentReach.topNLabel", {
                  defaultValue: "仅发送给 Top",
                })}
              </label>
              {topNEnabled && (
                <Input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="N"
                  value={topN}
                  onChange={(e) => setTopN(e.target.value)}
                  className="w-24"
                />
              )}
              <span className="text-sm text-muted-foreground">
                {t("talentReach.topNSuffix", { defaultValue: "名开发者" })}
              </span>
              <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewLoading}>
                {t("talentReach.requery", { defaultValue: "重新查询" })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pool selection */}
      {previewResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("talentReach.selectPool", { defaultValue: "选择积分池" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {poolsLoading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Select
                  value={selectedPoolIndex !== null ? String(selectedPoolIndex) : ""}
                  onValueChange={(val) => setSelectedPoolIndex(Number(val))}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("talentReach.poolPlaceholder", {
                        defaultValue: "选择积分池",
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPools.map((p, idx) => (
                      <SelectItem key={idx} value={String(idx)}>
                        {p.owner_name} -{" "}
                        {p.point_type === "cash"
                          ? t("talentReach.cashPoints", { defaultValue: "现金积分" })
                          : t("talentReach.giftPoints", { defaultValue: "礼物积分" })}{" "}
                        - {t("talentReach.balance", { defaultValue: "余额" })}:{" "}
                        {p.available_balance.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedPool && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t("talentReach.availableBalance", { defaultValue: "可用余额" })}:{" "}
                      <span className="font-semibold text-foreground">
                        {selectedPool.available_balance.toLocaleString()}
                      </span>{" "}
                      {t("talentReach.pointsUnit", { defaultValue: "积分" })}
                    </p>
                    {insufficientBalance && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertTriangle className="size-4" />
                        {t("talentReach.insufficientBalance", {
                          defaultValue: "余额不足，无法发送",
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Send button */}
      {previewResult && (
        <div className="flex justify-center pb-8">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={!canSend || sending}
            onClick={() => setConfirmOpen(true)}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Send className="size-4 mr-2" />
            )}
            {t("talentReach.confirmSend", { defaultValue: "确认发送" })}
          </Button>
        </div>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("talentReach.confirmDialogTitle", { defaultValue: "确认发送" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("talentReach.confirmDialogDesc", {
                defaultValue: "将扣除 {{cost}} 积分触达 {{users}} 位开发者",
                cost: previewResult?.estimated_cost.toLocaleString() ?? 0,
                users: previewResult?.reachable_users.toLocaleString() ?? 0,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
