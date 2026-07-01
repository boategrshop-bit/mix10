"use client";

import { useState } from "react";
import ApiKeyInput from "@/components/ApiKeyInput";
import BriefForm from "@/components/BriefForm";
import ErrorBanner from "@/components/ErrorBanner";
import ScenePlanEditor from "@/components/ScenePlanEditor";
import StoryboardSheetPreview from "@/components/StoryboardSheetPreview";
import VideoPromptEditor from "@/components/VideoPromptEditor";
import VoiceGenderSelector from "@/components/VoiceGenderSelector";
import GenerateVideoPanel from "@/components/GenerateVideoPanel";
import FullPromptCopyBox from "@/components/FullPromptCopyBox";
import type { ScenePlanItem, VideoJobResult } from "@/lib/types";
import { composeBrief, type BriefTemplateFields, type VoiceGender } from "@/lib/prompt-template";
import { buildOmniFlashPromptText } from "@/lib/gemini";

interface StoryboardError {
  title: string;
  message: string;
  details?: string;
}

const DEFAULT_FIELDS: BriefTemplateFields = {
  productName: "",
  durationSeconds: 10,
  orientation: "vertical",
  style: "",
};

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [fields, setFields] = useState<BriefTemplateFields>(DEFAULT_FIELDS);
  const [customBrief, setCustomBrief] = useState<string | null>(null);
  const brief = customBrief ?? composeBrief(fields);
  const briefTouched = customBrief !== null;

  function handleBriefChange(value: string) {
    setCustomBrief(value);
  }

  function handleResetBrief() {
    setCustomBrief(null);
  }

  const [scenePlan, setScenePlan] = useState<ScenePlanItem[]>([]);
  const [storyboardImage, setStoryboardImage] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>("female");
  const [storyboardError, setStoryboardError] = useState<StoryboardError | null>(null);
  const [scenePlanDirty, setScenePlanDirty] = useState(false);

  const narrationScript = scenePlan.map((s) => `[${s.startSeconds}s-${s.endSeconds}s] ${s.voiceoverLine}`).join(" ");
  const captionScript = scenePlan.map((s) => `[${s.startSeconds}s-${s.endSeconds}s] "${s.onScreenText}"`).join(" ");
  const fullVideoPromptText = buildOmniFlashPromptText({ videoPrompt, narrationScript, captionScript, voiceGender });

  function baseForm(mode: string) {
    const form = new FormData();
    form.append("apiKey", apiKey);
    form.append("brief", brief);
    form.append("mode", mode);
    form.append("durationSeconds", String(fields.durationSeconds));
    return form;
  }

  async function postStoryboard(form: FormData) {
    const response = await fetch("/api/storyboard", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) {
      throw {
        title: "Storyboard generation failed",
        message: data?.error?.message ?? "Unknown error",
        details: data?.error?.details,
      } as StoryboardError;
    }
    return data;
  }

  async function handleGeneratePlan() {
    setPlanLoading(true);
    setStoryboardError(null);
    setStoryboardImage(null);
    try {
      const form = baseForm("plan_only");
      const result = await postStoryboard(form);
      setScenePlan(result.scenePlan ?? []);
      setScenePlanDirty(false);
    } catch (err) {
      setStoryboardError(err as StoryboardError);
    } finally {
      setPlanLoading(false);
    }
  }

  function handleCaptionChange(index: number, value: string) {
    setScenePlan((prev) => prev.map((s) => (s.index === index ? { ...s, onScreenText: value } : s)));
    if (storyboardImage) setScenePlanDirty(true);
  }

  function handleVoiceoverChange(index: number, value: string) {
    setScenePlan((prev) => prev.map((s) => (s.index === index ? { ...s, voiceoverLine: value } : s)));
    if (storyboardImage) setScenePlanDirty(true);
  }

  async function requestVideoPrompt(imageBase64: string) {
    const form = baseForm("prompt_only");
    form.append("storyboardImageBase64", imageBase64);
    const result = await postStoryboard(form);
    if (result.videoPrompt) setVideoPrompt(result.videoPrompt);
  }

  async function generateImage() {
    setImageLoading(true);
    setStoryboardError(null);
    try {
      const form = baseForm("image_only");
      if (modelImage) form.append("modelImage", modelImage);
      if (productImage) form.append("productImage", productImage);
      form.append("scenePlan", JSON.stringify(scenePlan));
      const result = await postStoryboard(form);
      setStoryboardImage(result.storyboardImageBase64);
      setScenePlanDirty(false);
      try {
        await requestVideoPrompt(result.storyboardImageBase64);
      } catch {
        // non-fatal; user can still fill/regenerate the video prompt manually
      }
    } catch (err) {
      setStoryboardError(err as StoryboardError);
    } finally {
      setImageLoading(false);
    }
  }

  async function handleRegeneratePrompt() {
    if (!storyboardImage) return;
    setPromptLoading(true);
    try {
      await requestVideoPrompt(storyboardImage);
    } catch {
      // keep existing prompt on failure; the storyboard error banner covers other failures
    } finally {
      setPromptLoading(false);
    }
  }

  async function handleGenerateVideo(): Promise<VideoJobResult> {
    const form = new FormData();
    form.append("storyboardImageBase64", storyboardImage ?? "");
    form.append("videoPrompt", videoPrompt);
    if (narrationScript) form.append("narrationScript", narrationScript);
    if (captionScript) form.append("captionScript", captionScript);
    form.append("voiceGender", voiceGender);
    form.append("orientation", fields.orientation);
    if (geminiApiKey) {
      form.append("apiKey", geminiApiKey);
      if (modelImage) form.append("modelImage", modelImage);
      if (productImage) form.append("productImage", productImage);
    }

    const response = await fetch("/api/video", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message ?? "Could not generate video. Please try again.");
    }
    return data as VideoJobResult;
  }

  function handleStartOver() {
    setModelImage(null);
    setProductImage(null);
    setFields(DEFAULT_FIELDS);
    setCustomBrief(null);
    setScenePlan([]);
    setStoryboardImage(null);
    setVideoPrompt("");
    setStoryboardError(null);
    setScenePlanDirty(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-10 sm:px-6">
      <div className="mb-2 space-y-2">
        <span className="inline-flex items-center rounded-full border border-[#4382BB]/30 bg-[#4382BB]/10 px-3 py-1 text-xs font-semibold text-[#7bafdb]">
          MIX10
        </span>
        <h1 className="bg-gradient-to-r from-[#7bafdb] to-[#4382BB] bg-clip-text text-3xl font-bold text-transparent">
          สร้างสตอรี่บอร์ดและวิดีโอโฆษณาอัตโนมัติ
        </h1>
        <p className="text-sm leading-relaxed text-gray-400">
          อัปโหลดรูปนางแบบและสินค้า กรอกรายละเอียดสั้น ๆ ระบบจะร่างแผนฉากให้แก้ไขก่อน
          แล้วค่อยรวมเป็นภาพสตอรี่บอร์ดเดียว
        </p>
      </div>

      <ApiKeyInput
        value={apiKey}
        onChange={setApiKey}
        label="OpenAI API key"
        storageKey="openai_api_key"
        placeholder="sk-..."
        required
        helpText="Your key stays in this browser tab and is sent only to OpenAI via our server for each request. It is never stored in a database."
      />

      <ApiKeyInput
        value={geminiApiKey}
        onChange={setGeminiApiKey}
        label="Gemini API key (ไม่บังคับ — ใส่เพื่อสร้างวิดีโอจริงผ่าน Omni Flash)"
        storageKey="gemini_api_key"
        placeholder="AIza..."
        required={false}
        helpText="ไม่บังคับ — ถ้าไม่ใส่ ขั้นตอน Generate Video จะแสดงพรีวิวจำลองแทน ใส่แล้วเก็บเฉพาะในบราวเซอร์แท็บนี้เหมือนกับ OpenAI key ไม่มีการบันทึกลงฐานข้อมูล"
      />

      <BriefForm
        apiKey={apiKey}
        modelImage={modelImage}
        productImage={productImage}
        fields={fields}
        brief={brief}
        briefTouched={briefTouched}
        loading={planLoading}
        onModelImageChange={setModelImage}
        onProductImageChange={setProductImage}
        onFieldsChange={setFields}
        onBriefChange={handleBriefChange}
        onResetBrief={handleResetBrief}
        onSubmit={handleGeneratePlan}
      />

      {(planLoading || (storyboardError && scenePlan.length === 0)) && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
          <p className="text-sm font-semibold text-gray-100">แผนฉาก</p>
          {planLoading && (
            <div className="flex h-24 animate-pulse items-center justify-center rounded-xl bg-[#4382BB]/10 text-xs text-[#7bafdb]">
              กำลังร่างแผนฉาก...
            </div>
          )}
          {!planLoading && storyboardError && (
            <ErrorBanner title={storyboardError.title} message={storyboardError.message} details={storyboardError.details} />
          )}
        </div>
      )}

      {scenePlan.length > 0 && (
        <ScenePlanEditor
          scenePlan={scenePlan}
          loading={imageLoading}
          dirty={scenePlanDirty}
          onCaptionChange={handleCaptionChange}
          onVoiceoverChange={handleVoiceoverChange}
          onGenerateImage={generateImage}
        />
      )}

      {(imageLoading || storyboardImage || (storyboardError && scenePlan.length > 0)) && (
        <StoryboardSheetPreview
          imageBase64={storyboardImage}
          loading={imageLoading}
          error={scenePlan.length > 0 ? storyboardError : null}
          onRegenerate={generateImage}
        />
      )}

      {storyboardImage && (
        <VideoPromptEditor
          prompt={videoPrompt}
          loading={promptLoading}
          onChange={setVideoPrompt}
          onRegenerate={handleRegeneratePrompt}
        />
      )}

      {storyboardImage && <VoiceGenderSelector value={voiceGender} onChange={setVoiceGender} />}

      {storyboardImage && videoPrompt && <FullPromptCopyBox promptText={fullVideoPromptText} />}

      {storyboardImage && (
        <GenerateVideoPanel
          canGenerate={Boolean(storyboardImage && videoPrompt)}
          orientation={fields.orientation}
          onGenerate={handleGenerateVideo}
          onStartOver={handleStartOver}
        />
      )}
    </main>
  );
}
