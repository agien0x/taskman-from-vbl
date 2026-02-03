import { useMemo } from "react";
import { parseMentions, type MentionSegment } from "@/utils/mentionParser";
import TaskBadge from "./TaskBadge";
import AgentBadge from "./AgentBadge";

interface RichContentProps {
  content: string;
  className?: string;
}

// Extract segments from TipTap HTML (mentions rendered as spans with data attributes)
function extractSegments(content: string): MentionSegment[] {
  if (!content) return [{ type: "text", content: "" }];

  // Heuristic: if it looks like HTML, parse DOM and extract mentions + text
  if (content.includes("<")) {
    try {
      const container = document.createElement("div");
      container.innerHTML = content;

      const segments: MentionSegment[] = [];

      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          let text = node.nodeValue || "";
          // Replace -> with arrow
          text = text.replace(/->/g, 'â');
          if (text) segments.push({ type: "text", content: text });
          return;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;

          // TipTap mention node
          if (el.dataset && el.dataset.type === "mention") {
            const idAttr = el.dataset.id || ""; // e.g. "task:uuid"
            const label = el.dataset.label || el.textContent || "";
            const [type, actualId] = idAttr.split(":");
            if ((type === "task" || type === "agent") && actualId) {
              segments.push({
                type: type as "task" | "agent",
                id: actualId,
                title: label,
                content: label,
              });
            }
            return; // do not descend into mention children
          }

          if (el.tagName === "BR") {
            segments.push({ type: "text", content: "\n" });
            return;
          }

          // Recurse children
          el.childNodes.forEach(walk);

          // Add spacing after block elements to avoid text sticking together
          if (["P", "DIV", "LI"].includes(el.tagName)) {
            segments.push({ type: "text", content: " " });
          }
        }
      };

      Array.from(container.childNodes).forEach(walk);

      if (segments.length === 0) {
        return [{ type: "text", content: container.textContent || "" }];
      }
      return segments;
    } catch (e) {
      // Fallback to plain mention parsing
      return parseMentions(content);
    }
  }

  // Plain text with our custom mention syntax
  return parseMentions(content);
}

export const RichContent = ({ content, className = "" }: RichContentProps) => {
  const segments = useMemo(() => extractSegments(content), [content]);

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return (
            <span key={index} className="whitespace-pre-wrap">{segment.content}</span>
          );
        }

        if (segment.type === "task" && segment.id && segment.title) {
          return (
            <TaskBadge
              key={index}
              taskId={segment.id}
              title={segment.title}
            />
          );
        }

        if (segment.type === "agent" && segment.id && segment.title) {
          return (
            <AgentBadge
              key={index}
              agentId={segment.id}
              name={segment.title}
            />
          );
        }

        return null;
      })}
    </div>
  );
};
