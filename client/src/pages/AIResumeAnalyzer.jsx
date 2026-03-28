import { useContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import { AppContext } from "../context/AppContextValue";
import { useAuth } from "@clerk/clerk-react";

const formatAnalysis = (text) => {
  if (!text) return null;
  const lines = text.split("\n").filter(Boolean);
  const items = [];
  let listItems = [];
  const flushList = () => {
    if (listItems.length) {
      items.push(
        <ul key={items.length} className="list-disc ml-5 space-y-1 my-2">
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
    if (/^#{1,3}\s/.test(trimmed) || /^\*\*.+?\*\*$/.test(trimmed)) {
      items.push(
        <h4 key={i} className="font-semibold text-slate-800 mt-3 mb-1 text-sm first:mt-0">
          {trimmed.replace(/^#{1,3}\s|\*\*/g, "").trim()}
        </h4>
      );
      return;
    }
    items.push(
      <p key={i} className="text-gray-600 text-sm leading-relaxed">
        {trimmed}
      </p>
    );
  });
  flushList();
  return items;
};

export default function AIResumeAnalyzer() {
  const [text, setText] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const { backendUrl } = useContext(AppContext);
  const { getToken } = useAuth();

  const analyze = async () => {
    if (!text.trim() && !resumeFile) {
      toast.error("Paste resume text or upload a PDF file.");
      return;
    }

    try {
      setLoading(true);
      setResult("");
      const token = await getToken();
      const formData = new FormData();

      if (resumeFile) {
        formData.append("resume", resumeFile);
      }
      if (text.trim()) {
        formData.append("resumeText", text);
      }

      const res = await axios.post(
        `${backendUrl}/api/ai/analyze-resume`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setResult(res.data.result || "");
      } else {
        toast.error(res.data.message || "AI analysis failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setText("");
    setResumeFile(null);
    setResult("");
  };

  return (
    <>
      <Navbar />
      <div className="min-h-[80vh] bg-gray-50">
        <div className="bg-gradient-to-r from-purple-800 to-purple-950 text-white py-10 px-4">
          <div className="container mx-auto max-w-3xl">
            <h1 className="text-2xl md:text-3xl font-semibold mb-2">
              AI Resume Analyzer
            </h1>
            <p className="text-purple-100 text-sm">
              Get instant feedback on skills, experience level, and suitability
              score.
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-3xl px-4 -mt-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Upload Resume (PDF)
              </label>
              <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <span className="text-gray-500 text-sm">
                  {resumeFile
                    ? resumeFile.name
                    : "Choose file or drag and drop"}
                </span>
              </label>
              <p className="text-xs text-gray-400 mt-1">
                Optional if you paste text below
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Or Paste Resume Text
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your resume content here..."
              />
            </div>

            <div className="flex gap-3">
              <button
                disabled={loading}
                onClick={analyze}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>
              <button
                onClick={clearAll}
                className="text-gray-600 hover:text-gray-800 border border-gray-300 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {result && (
            <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-slate-700">
                  Analysis Result
                </span>
              </div>
              <div className="p-5 space-y-1">
                {formatAnalysis(result)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
