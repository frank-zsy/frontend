import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import api, { getApiError } from "@/lib/api";

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

// ─── Types ───────────────────────────────────────────────

interface DraftData {
  id: number;
  title: string;
  content: string;
  title_zh: string;
  content_zh: string;
}

// ─── Component ───────────────────────────────────────────

export default function TalentReachComposePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draft_id");

  // English fields (always required)
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Chinese fields (optional)
  const [titleZh, setTitleZh] = useState("");
  const [contentZh, setContentZh] = useState("");

  // English-only toggle (when checked, skip Chinese editing)
  const [englishOnly, setEnglishOnly] = useState(true);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing draft if draft_id is present
  useEffect(() => {
    if (!draftId) return;
    const loadDraft = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<DraftData>(`/talent-reach/drafts/${draftId}`);
        setTitle(data.title);
        setContent(data.content);
        setTitleZh(data.title_zh || "");
        setContentZh(data.content_zh || "");
        // If there's Chinese content, uncheck english-only
        if (data.title_zh || data.content_zh) {
          setEnglishOnly(false);
        }
      } catch (err) {
        toast.error(getApiError(err).message);
      } finally {
        setLoading(false);
      }
    };
    loadDraft();
  }, [draftId]);

  // Save draft
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t("talentReach.titleRequired"));
      return;
    }
    if (!content.trim()) {
      toast.error(t("talentReach.contentRequired"));
      return;
    }

    const payload = {
      title: title.trim(),
      content: content.trim(),
      title_zh: englishOnly ? "" : titleZh.trim(),
      content_zh: englishOnly ? "" : contentZh.trim(),
    };

    setSaving(true);
    try {
      if (draftId) {
        await api.put(`/talent-reach/drafts/${draftId}`, payload);
      } else {
        await api.post("/talent-reach/drafts", payload);
      }
      toast.success(t("talentReach.saveDraftSuccess"));
      navigate("/talent-reach");
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/talent-reach")}>
          <ArrowLeft className="mr-1 size-4" />
          {t("common.back")}
        </Button>
        <h1 className="text-xl font-bold">{t("talentReach.composeTitle")}</h1>
      </div>

      {/* English-only checkbox */}
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={englishOnly}
          onChange={(e) => setEnglishOnly(e.target.checked)}
          className="size-4 rounded border-border"
        />
        {t("talentReach.englishOnly")}
      </label>

      {/* ─── English Section ─── */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          {t("talentReach.englishSection")}
        </h2>

        {/* English Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("talentReach.titlePlaceholderEn")}
          className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        {/* English Editor area: left edit, right preview */}
        <div className="grid min-h-[300px] grid-cols-1 gap-4 md:grid-cols-2">
          {/* Markdown editor */}
          <div className="flex flex-col rounded-lg border">
            <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
              {t("talentReach.editor")}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("talentReach.contentPlaceholderEn")}
              className="flex-1 resize-none bg-transparent p-4 font-mono text-sm outline-none"
            />
          </div>

          {/* Preview */}
          <div className="flex flex-col rounded-lg border">
            <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
              {t("talentReach.preview")}
            </div>
            <div className={`flex-1 overflow-y-auto p-4 ${MARKDOWN_PROSE_CLASS}`}>
              {content ? (
                <ReactMarkdown>{content}</ReactMarkdown>
              ) : (
                <p className="text-sm text-muted-foreground">{t("talentReach.previewEmpty")}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Chinese Section (conditional) ─── */}
      {!englishOnly && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            {t("talentReach.chineseSection")}
          </h2>

          {/* Chinese Title input */}
          <input
            type="text"
            value={titleZh}
            onChange={(e) => setTitleZh(e.target.value)}
            placeholder={t("talentReach.titlePlaceholderZh")}
            className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          {/* Chinese Editor area: left edit, right preview */}
          <div className="grid min-h-[300px] grid-cols-1 gap-4 md:grid-cols-2">
            {/* Markdown editor */}
            <div className="flex flex-col rounded-lg border">
              <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                {t("talentReach.editor")}
              </div>
              <textarea
                value={contentZh}
                onChange={(e) => setContentZh(e.target.value)}
                placeholder={t("talentReach.contentPlaceholderZh")}
                className="flex-1 resize-none bg-transparent p-4 font-mono text-sm outline-none"
              />
            </div>

            {/* Preview */}
            <div className="flex flex-col rounded-lg border">
              <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                {t("talentReach.preview")}
              </div>
              <div className={`flex-1 overflow-y-auto p-4 ${MARKDOWN_PROSE_CLASS}`}>
                {contentZh ? (
                  <ReactMarkdown>{contentZh}</ReactMarkdown>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("talentReach.previewEmpty")}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 size-4" />
          )}
          {t("talentReach.saveDraft")}
        </Button>
      </div>
    </div>
  );
}
