"use client";

import { useCallback, useEffect, useState } from "react";

import type { IntelItem, IntelKind, IntelPoolEntry } from "@/types/intel";
import type { Policy } from "@/types/policy";

interface PoolFile {
  updatedAt?: string;
  entries: IntelPoolEntry[];
}

type VerifyMode = "policy" | "intel";

const PROVINCES = [
  "全国", "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江",
  "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北",
  "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州", "云南", "西藏",
  "陕西", "甘肃", "青海", "宁夏", "新疆",
];

const KINDS: Array<{ value: IntelKind; label: string }> = [
  { value: "application", label: "申报受理" },
  { value: "interpretation", label: "解读问答" },
  { value: "news", label: "落地动态" },
  { value: "resource", label: "资源活动" },
];

function parseList(input: string): string[] {
  return input
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 从池内线索构造政策草稿。 */
function policyDraftFrom(entry: IntelPoolEntry): Policy {
  return {
    id: "",
    title: entry.title,
    province: entry.province ?? "",
    city: "",
    category: "OPC创业",
    tags: [],
    publishDate: "",
    expiryDate: "",
    issuedBy: "",
    policyLevel: "市级",
    relevance: "direct",
    status: "现行有效",
    summary: entry.snippet ?? "",
    benefits: [],
    eligibility: [],
    applicationNotes: "",
    sourceName: "",
    sourceType: "官方发布",
    sourceUrl: entry.url,
    verifiedAt: today(),
  };
}

/** 从池内线索构造情报草稿。 */
function intelDraftFrom(entry: IntelPoolEntry): IntelItem {
  return {
    id: "",
    kind: entry.kindGuess ?? "news",
    title: entry.title,
    province: entry.province ?? "",
    city: "",
    scopeLabel: "",
    publishDate: "",
    sourceName: "",
    sourceUrl: entry.url,
    sourceType: "官方发布",
    summary: entry.snippet ?? "",
    keyFacts: [],
    eligibility: [],
    tags: [],
    discoveredAt: entry.foundAt.slice(0, 10),
    verified: true,
    verifiedAt: today(),
    confidence: "high",
    origin: "registry-scan",
  };
}

export default function AdminPoolPage() {
  const [pool, setPool] = useState<PoolFile>({ entries: [] });
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 核验表单状态
  const [verifyMode, setVerifyMode] = useState<VerifyMode>("policy");
  const [activeEntry, setActiveEntry] = useState<IntelPoolEntry | null>(null);
  const [policyDraft, setPolicyDraft] = useState<Policy | null>(null);
  const [intelDraft, setIntelDraft] = useState<IntelItem | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/data?kind=pool");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { data: PoolFile };
      setPool(data.data ?? { entries: [] });
    } catch (error) {
      setFlash({ type: "err", text: `加载失败：${error instanceof Error ? error.message : "未知错误"}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startVerify(entry: IntelPoolEntry, mode: VerifyMode) {
    setVerifyMode(mode);
    setActiveEntry(entry);
    if (mode === "policy") setPolicyDraft(policyDraftFrom(entry));
    else setIntelDraft(intelDraftFrom(entry));
    setFlash(null);
  }

  function cancelVerify() {
    setActiveEntry(null);
    setPolicyDraft(null);
    setIntelDraft(null);
  }

  async function reject(entry: IntelPoolEntry) {
    if (!window.confirm(`确认驳回这条线索？\n${entry.title}`)) return;
    setFlash(null);
    try {
      const response = await fetch(`/api/admin/pool?url=${encodeURIComponent(entry.url)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`);
      setFlash({ type: "ok", text: "已驳回，稍后自动同步。" });
      await load();
    } catch (error) {
      setFlash({ type: "err", text: `驳回失败：${error instanceof Error ? error.message : "未知错误"}` });
    }
  }

  async function submitVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!activeEntry) return;
    setSaving(true);
    setFlash(null);
    try {
      const target = verifyMode === "policy" ? policyDraft : intelDraft;
      if (!target) throw new Error("缺少表单数据");

      const entryTitle = target.title;
      const changelog = {
        date: today(),
        summary: `新收录：${entryTitle.slice(0, 60)}`,
        detail: `后台核验待核验池线索入库（${verifyMode === "policy" ? "政策" : "情报"}），来源：${activeEntry.url}`,
      };

      const response = await fetch("/api/admin/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolUrl: activeEntry.url,
          target: verifyMode,
          policy: verifyMode === "policy" ? target : undefined,
          intel: verifyMode === "intel" ? target : undefined,
          changelog,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; commitSha?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`);
      setFlash({ type: "ok", text: `已核验入库（commit ${data?.commitSha?.slice(0, 7)}），稍后自动同步。` });
      cancelVerify();
      await load();
    } catch (error) {
      setFlash({ type: "err", text: `核验失败：${error instanceof Error ? error.message : "未知错误"}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">待核验池 · 核验工作台</h1>
      <p className="admin-note">
        巡检命中的线索先进入这里，人工核对原文（URL 可达、标题一致）后才转库。
        转政策 / 转情报会同时移除池内线索并追加一条收录日志，三者一次提交。
      </p>

      {flash ? <p className={`admin-flash ${flash.type}`}>{flash.text}</p> : null}

      {activeEntry ? (
        <form className="admin-editor" onSubmit={submitVerify}>
          <h2>核验入库：{activeEntry.title}</h2>
          <div className="admin-field full">
            <span>原文 URL（点击核对）</span>
            <a href={activeEntry.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontSize: 13 }}>
              {activeEntry.url}
            </a>
          </div>
          <div className="admin-field">
            <span>转入目标</span>
            <select
              value={verifyMode}
              onChange={(e) => {
                const mode = e.target.value as VerifyMode;
                setVerifyMode(mode);
                if (mode === "policy" && activeEntry) setPolicyDraft(policyDraftFrom(activeEntry));
                if (mode === "intel" && activeEntry) setIntelDraft(intelDraftFrom(activeEntry));
              }}
            >
              <option value="policy">转政策文件</option>
              <option value="intel">转四类情报</option>
            </select>
          </div>

          {verifyMode === "policy" && policyDraft ? (
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>政策 ID（唯一，必填）</span>
                <input
                  value={policyDraft.id}
                  onChange={(e) => setPolicyDraft({ ...policyDraft, id: e.target.value })}
                  required
                />
              </label>
              <label className="admin-field">
                <span>省份</span>
                <select
                  value={policyDraft.province}
                  onChange={(e) => setPolicyDraft({ ...policyDraft, province: e.target.value })}
                  required
                >
                  <option value="">请选择</option>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="admin-field full">
                <span>标题</span>
                <input
                  value={policyDraft.title}
                  onChange={(e) => setPolicyDraft({ ...policyDraft, title: e.target.value })}
                  required
                />
              </label>
              <label className="admin-field">
                <span>类别</span>
                <select
                  value={policyDraft.category}
                  onChange={(e) => setPolicyDraft({ ...policyDraft, category: e.target.value as Policy["category"] })}
                >
                  <option>OPC创业</option>
                  <option>算力与模型</option>
                  <option>创业服务</option>
                  <option>资金与融资</option>
                  <option>空间载体</option>
                  <option>合规与登记</option>
                </select>
              </label>
              <label className="admin-field">
                <span>政策层级</span>
                <select
                  value={policyDraft.policyLevel}
                  onChange={(e) => setPolicyDraft({ ...policyDraft, policyLevel: e.target.value as Policy["policyLevel"] })}
                >
                  <option>国家级</option>
                  <option>省级</option>
                  <option>市级</option>
                  <option>区县级</option>
                </select>
              </label>
              <label className="admin-field full">
                <span>发文单位</span>
                <input
                  value={policyDraft.issuedBy}
                  onChange={(e) => setPolicyDraft({ ...policyDraft, issuedBy: e.target.value })}
                />
              </label>
              <label className="admin-field full">
                <span>摘要</span>
                <textarea
                  value={policyDraft.summary}
                  onChange={(e) => setPolicyDraft({ ...policyDraft, summary: e.target.value })}
                />
              </label>
              <label className="admin-field full">
                <span>扶持内容（每行一条）</span>
                <textarea
                  value={policyDraft.benefits.join("\n")}
                  onChange={(e) => setPolicyDraft({ ...policyDraft, benefits: parseList(e.target.value) })}
                />
              </label>
              <label className="admin-field full">
                <span>适用对象（每行一条）</span>
                <textarea
                  value={policyDraft.eligibility.join("\n")}
                  onChange={(e) => setPolicyDraft({ ...policyDraft, eligibility: parseList(e.target.value) })}
                />
              </label>
            </div>
          ) : null}

          {verifyMode === "intel" && intelDraft ? (
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>情报 ID（唯一，必填）</span>
                <input
                  value={intelDraft.id}
                  onChange={(e) => setIntelDraft({ ...intelDraft, id: e.target.value })}
                  required
                />
              </label>
              <label className="admin-field">
                <span>类别</span>
                <select
                  value={intelDraft.kind}
                  onChange={(e) => setIntelDraft({ ...intelDraft, kind: e.target.value as IntelKind })}
                >
                  {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </label>
              <label className="admin-field">
                <span>省份</span>
                <select
                  value={intelDraft.province}
                  onChange={(e) => setIntelDraft({ ...intelDraft, province: e.target.value })}
                  required
                >
                  <option value="">请选择</option>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="admin-field">
                <span>城市</span>
                <input
                  value={intelDraft.city ?? ""}
                  onChange={(e) => setIntelDraft({ ...intelDraft, city: e.target.value })}
                />
              </label>
              <label className="admin-field full">
                <span>标题</span>
                <input
                  value={intelDraft.title}
                  onChange={(e) => setIntelDraft({ ...intelDraft, title: e.target.value })}
                  required
                />
              </label>
              <label className="admin-field full">
                <span>摘要</span>
                <textarea
                  value={intelDraft.summary}
                  onChange={(e) => setIntelDraft({ ...intelDraft, summary: e.target.value })}
                />
              </label>
              <label className="admin-field full">
                <span>要点（每行一条）</span>
                <textarea
                  value={intelDraft.keyFacts.join("\n")}
                  onChange={(e) => setIntelDraft({ ...intelDraft, keyFacts: parseList(e.target.value) })}
                />
              </label>
              <label className="admin-field full">
                <span>标签（每行一个）</span>
                <textarea
                  value={intelDraft.tags.join("\n")}
                  onChange={(e) => setIntelDraft({ ...intelDraft, tags: parseList(e.target.value) })}
                />
              </label>
            </div>
          ) : null}

          <div className="admin-form-actions">
            <button type="submit" className="admin-btn-primary" style={{ width: "auto" }} disabled={saving}>
              {saving ? "提交中…" : "核验通过并入库"}
            </button>
            <button type="button" className="admin-btn" onClick={cancelVerify}>取消</button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="admin-empty">加载中…</p>
      ) : pool.entries.length === 0 ? (
        <p className="admin-empty">待核验池为空</p>
      ) : (
        <ul className="admin-list">
          {pool.entries.map((entry) => (
            <li key={entry.url} className="admin-list-item">
              <div className="admin-list-item-main">
                <span className="admin-list-item-title">{entry.title}</span>
                <span className="admin-list-item-meta">
                  命中词：{entry.keyword} · {entry.province ?? "地区未知"} · 发现于{" "}
                  {entry.foundAt.replace("T", " ").slice(0, 16)}
                </span>
              </div>
              <div className="admin-actions">
                <button className="admin-btn" onClick={() => startVerify(entry, "policy")}>转政策</button>
                <button className="admin-btn" onClick={() => startVerify(entry, "intel")}>转情报</button>
                <button className="admin-btn admin-btn-danger" onClick={() => reject(entry)}>驳回</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
