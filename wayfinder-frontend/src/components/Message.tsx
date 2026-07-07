import type { ChatMessage, Citation } from "../types/api";
import PromptChips from "./PromptChips";

interface Props {
  message: ChatMessage;
  onCitationClick: (c: Citation) => void;
  showPrompts?: boolean;
  onPromptPick?: (text: string) => void;
  promptsDisabled?: boolean;
}

/**
 * Render a tiny, safe subset of markdown: **bold**, *italic*, paragraphs.
 * We intentionally don't use a full markdown library — the LLM-generated
 * markdown in this app is constrained and we want zero deps for the hackathon.
 */
function renderInline(text: string) {
  const parts: (string | JSX.Element)[] = [];
  let i = 0;
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > i) parts.push(text.slice(i, m.index));
    if (m[1] !== undefined) parts.push(<strong key={idx++}>{m[1]}</strong>);
    else if (m[2] !== undefined) parts.push(<em key={idx++}>{m[2]}</em>);
    i = m.index + m[0].length;
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}

function MarkdownBody({ content }: { content: string }) {
  const paragraphs = content.split(/\n\s*\n/);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInline(p)}</p>
      ))}
    </>
  );
}

export default function Message({
  message,
  onCitationClick,
  showPrompts,
  onPromptPick,
  promptsDisabled,
}: Props) {
  const isUser = message.role === "user";
  return (
    <div className={`msg ${isUser ? "msg-user" : "msg-bot"}`}>
      <div className="msg-from">{isUser ? "You" : "Wayfinder"}</div>
      <div className="msg-body">
        {isUser ? message.content : <MarkdownBody content={message.content} />}
      </div>
      {!isUser && message.citations && message.citations.length > 0 && (
        <div className="citations">
          {message.citations.map((c) => (
            <button key={c.id} className="cite-chip" onClick={() => onCitationClick(c)}>
              {c.city} <span className="src">· {c.source}</span>
            </button>
          ))}
        </div>
      )}
      {showPrompts && onPromptPick && (
        <PromptChips onPick={onPromptPick} disabled={promptsDisabled} />
      )}
    </div>
  );
}
