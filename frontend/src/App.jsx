import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function App() {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState([]);
  const chunksRef = useRef([]);

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    const res = await axios.get("http://localhost:4000/api/transcriptions");
    setHistory(res.data);
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = e => chunksRef.current.push(e.data);
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      await uploadAudio(blob, "recording.webm");
    };
    mr.start();
    setMediaRecorder(mr);
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorder.stop();
    setRecording(false);
  }

  async function uploadAudio(file, name) {
    const formData = new FormData();
    formData.append("audio", file, name);
    const res = await axios.post("http://localhost:4000/api/transcribe", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setTranscript(res.data.text);
    fetchHistory();
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) uploadAudio(file, file.name);
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">🎤 Speech to Text</h1>

      <input type="file" accept="audio/*" onChange={handleFileUpload} />

      {!recording ? (
        <button onClick={startRecording} className="px-4 py-2 bg-blue-600 text-white rounded">
          Start Recording
        </button>
      ) : (
        <button onClick={stopRecording} className="px-4 py-2 bg-red-600 text-white rounded">
          Stop Recording
        </button>
      )}

      <div>
        <h2 className="font-semibold">Latest Transcript</h2>
        <p className="p-2 bg-gray-100 rounded">{transcript}</p>
      </div>

      <div>
        <h2 className="font-semibold">History</h2>
        <ul>
          {history.map((h) => (
            <li key={h._id} className="border-b py-2">{h.text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
