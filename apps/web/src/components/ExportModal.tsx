import React, { useState } from "react";
import { X, Copy, Check, Download, Printer, FileText } from "lucide-react";
import type { RetrospectiveState } from "@ci-retro/types";

interface ExportModalProps {
  state: RetrospectiveState;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ state, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Výpočet hlasů
  const getCardVotesCount = (cardId: string) => {
    return state.votes.filter((v) => v.cardId === cardId).length;
  };

  // Generování Markdownu
  const generateMarkdown = () => {
    let md = `# Retrospektiva: ${state.title}\n`;
    md += `*Vytvořeno:* ${new Date().toLocaleDateString("cs-CZ")} | *Šablona:* ${state.templateType}\n\n`;

    state.columns.forEach((col) => {
      const colCards = state.cards.filter((c) => c.columnId === col.id);
      const rootCards = colCards.filter(
        (c) => !c.parentCardId || !state.cards.some((p) => p.id === c.parentCardId)
      );

      // Seřadíme podle hlasů sestupně
      rootCards.sort((a, b) => getCardVotesCount(b.id) - getCardVotesCount(a.id));

      md += `## ${col.title} (${colCards.length})\n`;
      if (rootCards.length === 0) {
        md += `*(žádné záznamy)*\n\n`;
      } else {
        rootCards.forEach((c) => {
          const votes = getCardVotesCount(c.id);
          const votesBadge = votes > 0 ? ` (+${votes} hlasů)` : "";
          const author = c.authorName ? ` [${c.authorName}]` : "";
          const children = colCards.filter((child) => child.parentCardId === c.id);

          if (children.length > 0) {
            md += `- **[Skupina]** ${c.content}${votesBadge}${author}\n`;
            children.forEach((child) => {
              const childVotes = getCardVotesCount(child.id);
              const childVotesBadge = childVotes > 0 ? ` (+${childVotes} hlasů)` : "";
              const childAuthor = child.authorName ? ` [${child.authorName}]` : "";
              md += `  - ↳ ${child.content}${childVotesBadge}${childAuthor}\n`;
            });
          } else {
            md += `- ${c.content}${votesBadge}${author}\n`;
          }
        });
        md += `\n`;
      }
    });

    if (state.actionItems && state.actionItems.length > 0) {
      md += `## 🎯 Akční kroky (Action Items)\n`;
      state.actionItems.forEach((a) => {
        const check = a.status === "DONE" ? "[x]" : "[ ]";
        const assignee = a.assignee ? ` (@${a.assignee})` : "";
        md += `- ${check} ${a.text}${assignee}\n`;
      });
      md += `\n`;
    }

    return md;
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdown();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    let csv = "Sloupec,Karta / Myšlenka,Hlasy,Autor,Datum\n";
    state.columns.forEach((col) => {
      const colCards = state.cards.filter((c) => c.columnId === col.id);
      colCards.forEach((c) => {
        const isChild = !!c.parentCardId;
        const prefix = isChild ? "[Podkarta] " : "";
        const cleanContent = `"${(prefix + c.content).replace(/"/g, '""')}"`;
        const votes = getCardVotesCount(c.id);
        csv += `"${col.title}",${cleanContent},${votes},"${c.authorName}","${c.createdAt}"\n`;
      });
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `retrospective-${state.title.replace(/\s+/g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const markdownPreview = generateMarkdown();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 200,
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={22} color="var(--accent-indigo)" />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>
              Export retrospektivy
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content / Preview */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
            Vyberte formát pro uložení nebo zkopírování výsledků retrospektivy do Slacku, Jira nebo Confluence:
          </p>

          {/* Action buttons row */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={handleCopyMarkdown}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                background: copied ? "var(--accent-emerald)" : "var(--accent-indigo)",
                color: "#ffffff",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "0.88rem",
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Zkopírováno!" : "Kopírovat Markdown"}
            </button>

            <button
              onClick={handleDownloadCsv}
              style={{
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.88rem",
              }}
            >
              <Download size={16} /> Stáhnout CSV
            </button>

            <button
              onClick={handlePrint}
              style={{
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.88rem",
              }}
            >
              <Printer size={16} /> Tisk / PDF
            </button>
          </div>

          {/* Markdown Preview Box */}
          <div style={{ marginTop: "8px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Náhled výstupu (Markdown)
            </span>
            <pre
              style={{
                marginTop: "6px",
                padding: "14px",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-main)",
                fontSize: "0.82rem",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: "260px",
                overflowY: "auto",
              }}
            >
              {markdownPreview}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
