import { useContext, useState, useRef, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import { AppContext } from "../context/AppContextValue";
import { useAuth } from "@clerk/clerk-react";

const formatReply = (text) => {
  if (!text) return null;
  const lines = text.split("\n").filter(Boolean);
  const parts = [];
  let listItems = [];
  const flushList = () => {
    if (listItems.length) {
      parts.push(
        <ul key={parts.length} className="list-disc ml-4 space-y-0.5 my-1">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (/^[-*•]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      listItems.push(
        <li key={i} className="text-gray-600 text-sm">
          {trimmed.replace(/^[-*•]\s|\d+\.\s/, "")}
        </li>
      );
      return;
    }
    flushList();
    parts.push(
      <p key={i} className="text-gray-600 text-sm leading-relaxed">
        {trimmed}
      </p>
    );
  });
  flushList();
  return parts;
};

export default function AIChat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const { backendUrl } = useContext(AppContext);
  const { getToken } = useAuth();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!message.trim()) return;

    const userMsg = message.trim();
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.post(
        `${backendUrl}/api/ai/chat`,
        { message: userMsg },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.data.reply || "" },
        ]);
      } else {
        toast.error(res.data.message || "AI chat failed");
        setMessages((prev) => prev.slice(0, -1));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-[80vh] bg-gray-50">
        <div className="bg-gradient-to-r from-purple-800 to-purple-950 text-white py-10 px-4">
          <div className="container mx-auto max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-semibold mb-2">
              Career AI Chat
            </h1>
            <p className="text-purple-100 text-sm">
              Get personalized career advice and tips from AI.
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-2xl px-4 -mt-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col" style={{ minHeight: "400px" }}>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <p>Ask anything about careers, interviews, or resumes.</p>
                  <p className="mt-2">e.g. &quot;How do I prepare for a tech interview?&quot;</p>
                </div>
              )}
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div
                    key={i}
                    className="flex justify-end"
                  >
                    <div className="max-w-[85%] bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="flex justify-start"
                  >
                    <div className="max-w-[85%] bg-gray-100 text-slate-700 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm space-y-1">
                      {formatReply(m.content)}
                    </div>
                  </div>
                )
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md">
                    <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-pulse mr-1" />
                    <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-pulse mr-1" style={{ animationDelay: "0.2s" }} />
                    <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  className="flex-1 p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Ask career advice..."
                />
                <button
                  disabled={loading}
                  onClick={send}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
