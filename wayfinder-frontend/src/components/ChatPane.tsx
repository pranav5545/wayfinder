import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Citation } from "../types/api";
import Message from "./Message";

interface Props {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onCitationClick: (c: Citation) => void;
}

export default function ChatPane({
  messages,
  sending,
  error,
  onSend,
  onCitationClick,
}: Props) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or while a reply is being prepared.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  function submit() {
    if (!draft.trim() || sending) return;
    onSend(draft);
    setDraft("");
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const citationCount = lastAssistant?.citations?.length ?? 0;
  const title = messages.length > 1 ? "Conversation" : "New conversation";
  // Show prompts only on the welcome state (no user message yet).
  const showPrompts = !messages.some((m) => m.role === "user");

  return (
    <main className="chat-wrap">
      <div className="chat-header">
        <h2>{title}</h2>
        <div className="meta">
          <span className="live">Live</span>
          &nbsp;·&nbsp;
          <span>{citationCount} {citationCount === 1 ? "source" : "sources"}</span>
        </div>
      </div>

      <div className="messages" ref={scrollRef}>
        {messages.map((m, i) => {
          const isFirstAssistant = i === 0 && m.role === "assistant";
          return (
            <Message
              key={i}
              message={m}
              onCitationClick={onCitationClick}
              showPrompts={isFirstAssistant && showPrompts}
              onPromptPick={onSend}
              promptsDisabled={sending}
            />
          );
        })}
        {sending && (
          <div className="msg msg-bot">
            <div className="msg-from">Wayfinder</div>
            <div className="msg-body">
              <span className="typing">
                Thinking
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="msg msg-bot">
            <div className="msg-from">Error</div>
            <div className="msg-body" style={{ color: "var(--accent-deep)" }}>
              {error}
            </div>
          </div>
        )}
      </div>

      <div className="composer">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask about a city, or describe a mood…"
          rows={1}
          disabled={sending}
        />
        <button className="send-btn" onClick={submit} disabled={sending || !draft.trim()}>
          Send
        </button>
      </div>
    </main>
  );
}
