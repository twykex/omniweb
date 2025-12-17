import React, { useState, useEffect } from "react";
import axios from "axios";
import { AnimatePresence } from "framer-motion";

import BackgroundEngine from "./components/BackgroundEngine";
import LandingInterface from "./components/LandingInterface";
import LearningWorkspace from "./components/LearningWorkspace";
import ToastContainer from "./components/ToastContainer";
import GlobalCSS from "./components/GlobalCSS";

import { BASE_URL } from "./constants";

const App = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [loadingModels, setLoadingModels] = useState(true);
  const [backendError, setBackendError] = useState(false);
  const [startTopic, setStartTopic] = useState("");
  const [toasts, setToasts] = useState([]);

  const addToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const fetchModels = async () => {
    setLoadingModels(true);
    setBackendError(false);
    try {
      const res = await axios.get(`${BASE_URL}/models`);
      const models = res.data.models || [];
      setAvailableModels(models);

      // Smart selection: Prefer fitting models, then specific families
      const smartModel = models.find(m => 
          (m.name.includes("llama3") || m.name.includes("mistral") || m.name.includes("gpt")) && m.fits
      ) || models.find(m => m.fits) || models[0];

      setSelectedModel(smartModel ? smartModel.name : "");
    } catch (err) {
      console.error("Backend Offline");
      setBackendError(true);
    }
    finally { setLoadingModels(false); }
  };

  const handleSurprise = async () => {
    if (!selectedModel) return;
    setLoadingModels(true);
    try {
        const res = await axios.post(`${BASE_URL}/random`, { model: selectedModel });
        if (res.data.topic) {
            setStartTopic(res.data.topic);
            setHasStarted(true);
        }
    } catch (err) {
        console.error(err);
        addToast("Failed to generate random topic", "error");
    } finally {
        setLoadingModels(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <div className="app-root">
      <BackgroundEngine />

      <AnimatePresence mode="wait">
        {!hasStarted ? (
          <LandingInterface 
            key="landing"
            models={availableModels}
            selected={selectedModel}
            onSelect={setSelectedModel}
            startTopic={startTopic}
            setStartTopic={setStartTopic}
            onStart={() => { if(startTopic.trim()) setHasStarted(true); }}
            onSurprise={handleSurprise}
            isLoading={loadingModels}
            backendError={backendError}
            onRetry={fetchModels}
          />
        ) : (
          <LearningWorkspace 
            key="workspace" 
            model={selectedModel}
            initialTopic={startTopic}
            onExit={() => setHasStarted(false)}
            addToast={addToast}
          />
        )}
      </AnimatePresence>
      <ToastContainer toasts={toasts} />
      <GlobalCSS />
    </div>
  );
};

export default App;
