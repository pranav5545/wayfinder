import { useState, useCallback } from "react";
import type { ChatMessage, Citation } from "./types/api";
import { sendChat } from "./lib/api";
import Header from "./components/Header";
import ChatPane from "./components/ChatPane";
import SourceModal from "./components/SourceModal";

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Hi — I'm a travel guide grounded in sensory descriptions of **59 cities**. Sounds, smells, textures, the feel of an afternoon. I won't make things up; every answer points back to the source it came from.\n\nWhere would you like to begin?",
  },
];

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCitation, setOpenCitation] = useState<Citation | null>(null);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      setError(null);

      // Optimistically render the user turn, then call the API with the
      // history that excludes this new turn (the server adds the latest message).
      const history = messages.map(({ role, content }) => ({ role, content }));
      setMessages((m) => [...m, { role: "user", content: trimmed }]);
      setSending(true);

      try {
        const res = await sendChat({ message: trimmed, history });
        setMessages((m) => [
          ...m,
          { role: "assistant", content: res.reply, citations: res.citations },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setSending(false);
      }
    },
    [messages, sending],
  );

  return (
    <div className="app">
      <Header />
      <ChatPane
        messages={messages}
        sending={sending}
        error={error}
        onSend={handleSend}
        onCitationClick={setOpenCitation}
      />
      <p className="demo-notice">
        <b>Demo mode</b> · mock backend until <code>VITE_USE_MOCK=false</code> · swap with one env flag
      </p>
      <SourceModal citation={openCitation} onClose={() => setOpenCitation(null)} />
    </div>
  );
}
