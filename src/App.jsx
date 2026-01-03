import React, { useState, useEffect, useCallback, useRef } from 'react';
import chroma from 'chroma-js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  RotateCcw,
  Save,
  Download,
  Settings,
  Share2,
  Lock,
  Unlock,
  Copy,
  X,
  MessageSquare,
  Sparkles,
  Github,
  Trash2,
  List,
  Grid,
  Zap,
  Check,
  ChevronRight,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateAIColors } from './services/ai';
import './index.css';

const INITIAL_PALETTE_SIZE = 5;

const App = () => {
  const [colors, setColors] = useState([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [savedPalettes, setSavedPalettes] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your AI color assistant. Describe a mood, a brand, or an image, and I'll generate a palette for you." }
  ]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);

  // Initialize
  useEffect(() => {
    const saved = localStorage.getItem('spectrum_palettes');
    if (saved) setSavedPalettes(JSON.parse(saved));

    const initialColors = Array.from({ length: INITIAL_PALETTE_SIZE }).map(() => ({
      hex: chroma.random().hex(),
      locked: false,
      id: Math.random().toString(36).substr(2, 9)
    }));
    setColors(initialColors);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('spectrum_palettes', JSON.stringify(savedPalettes));
  }, [savedPalettes]);

  // Harmony Generator
  const generateHarmony = (baseColor, count) => {
    const schemes = ['analogous', 'triadic', 'complementary', 'split', 'tetradic', 'monochromatic'];
    const scheme = schemes[Math.floor(Math.random() * schemes.length)];
    const base = chroma(baseColor);
    let colors = [base.hex()];

    for (let i = 1; i < count; i++) {
      let color;
      switch (scheme) {
        case 'analogous':
          color = base.set('hsl.h', base.get('hsl.h') + (i * 30)).hex();
          break;
        case 'triadic':
          color = base.set('hsl.h', base.get('hsl.h') + (i * 120)).hex();
          break;
        case 'complementary':
          color = base.set('hsl.h', base.get('hsl.h') + (i * 180)).hex();
          break;
        case 'split':
          color = base.set('hsl.h', base.get('hsl.h') + (150 * (i % 2 === 0 ? 1 : -1))).hex();
          break;
        case 'tetradic':
          color = base.set('hsl.h', base.get('hsl.h') + (i * 90)).hex();
          break;
        case 'monochromatic':
          color = base.darken(i * 0.5).hex();
          break;
        default:
          color = chroma.random().hex();
      }
      // Add some random variation to saturation/lightness for realism
      colors.push(chroma(color).saturate(Math.random() - 0.5).brighten(Math.random() - 0.5).hex());
    }
    return colors;
  };

  const generateNewPalette = useCallback(() => {
    setColors(prev => {
      // Find anchored color (first locked color)
      const lockedColors = prev.filter(c => c.locked);
      const anchorColor = lockedColors.length > 0 ? lockedColors[0].hex : chroma.random().hex();

      // Generate harmony based on anchor or random base
      const harmonyColors = generateHarmony(anchorColor, prev.length + 5); // Generate extra to be safe
      let harmonyIndex = 0;

      return prev.map(color => {
        if (color.locked) return color;

        // Pick next unused color from harmony
        let newHex = harmonyColors[harmonyIndex++];
        // Make sure we don't pick the anchor itself if it's already there
        while (lockedColors.some(c => c.hex === newHex) && harmonyIndex < harmonyColors.length) {
          newHex = harmonyColors[harmonyIndex++];
        }

        return { ...color, hex: newHex || chroma.random().hex() };
      });
    });

    // Add to history (briefly)
    setHistory(prev => [prev[0], ...prev].slice(0, 10));
  }, []);

  // Spacebar Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        generateNewPalette();
      }
      // Undo with Ctrl+Z
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ') {
        // Simple undo logic could be added here
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generateNewPalette]);

  const toggleLock = (id) => {
    setColors(prev => prev.map(c => c.id === id ? { ...c, locked: !c.locked } : c));
  };

  const copyToClipboard = (hex) => {
    navigator.clipboard.writeText(hex.toUpperCase());
    setCopyFeedback(hex);
    setTimeout(() => setCopyFeedback(null), 1500);
  };

  const removeColor = (id) => {
    if (colors.length <= 2) return;
    setColors(prev => prev.filter(c => c.id !== id));
  };

  const addColor = (index) => {
    if (colors.length >= 10) return;
    const newColor = {
      hex: chroma.random().hex(),
      locked: false,
      id: Math.random().toString(36).substr(2, 9)
    };
    const newColors = [...colors];
    newColors.splice(index + 1, 0, newColor);
    setColors(newColors);
  };

  const saveCurrentPalette = () => {
    const palette = {
      id: Date.now(),
      colors: colors.map(c => c.hex),
      timestamp: new Date().toISOString()
    };
    setSavedPalettes([palette, ...savedPalettes]);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors.map(c => c.hex)
    });
  };

  const handleAISubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setChatMessages(prev => [...prev, { role: 'user', content: prompt }]);

    const userPrompt = prompt;
    setPrompt('');

    try {
      const aiColors = await generateAIColors(userPrompt);
      if (aiColors && Array.isArray(aiColors)) {
        const newPalette = aiColors.map(hex => ({
          hex: hex.startsWith('#') ? hex : `#${hex}`,
          locked: false,
          id: Math.random().toString(36).substr(2, 9)
        }));
        setColors(newPalette);
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `I've generated a palette based on "${userPrompt}". How does it look?`
        }]);
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: aiColors
        });
      } else {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: "I'm sorry, I couldn't generate a palette for that. Could you try a different description?"
        }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong. Please check your API key." }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportPalette = () => {
    const text = colors.map(c => `${chroma(c.hex).name()}: ${c.hex.toUpperCase()}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spectrum-palette-${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden select-none">
      {/* Sidebar - AI & Saved Palettes */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[400px] glass z-50 flex flex-col border-l border-white/10"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex gap-4">
                  <button className="text-sm font-bold border-b-2 border-indigo-500 pb-1">AI ASSISTANT</button>
                  <button className="text-sm font-bold text-white/40 hover:text-white pb-1">LIBRARY</button>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-white/40 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 premium-scroll">
                {/* Configuration Section */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-white/60 tracking-wider">PALETTE SIZE</label>
                    <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white/80">{colors.length}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={colors.length}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value);
                      const currentSize = colors.length;
                      if (newSize > currentSize) {
                        const newColors = Array.from({ length: newSize - currentSize }).map(() => ({
                          hex: chroma.random().hex(),
                          locked: false,
                          id: Math.random().toString(36).substr(2, 9)
                        }));
                        setColors([...colors, ...newColors]);
                      } else {
                        setColors(colors.slice(0, newSize));
                      }
                    }}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                  />
                </div>

                {chatMessages.map((msg, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white/10 text-white/90 rounded-tl-none border border-white/10'
                      }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 p-4 rounded-2xl rounded-tl-none border border-white/10 flex gap-1">
                      <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleAISubmit} className="p-6 bg-white/5 border-t border-white/10">
                <div className="relative">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe a palette..."
                    className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-5 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                  />
                  <button
                    disabled={isGenerating}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>
                <p className="mt-4 text-[10px] text-white/30 uppercase tracking-widest text-center font-bold">
                  Powered by GPT-4 Visionary
                </p>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main UI */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 glass border-0 border-b border-white/5 relative z-30">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tighter leading-none">SPECTRUM</h1>
              <span className="text-[10px] font-bold text-indigo-400 tracking-[0.2em] mt-1 uppercase">AI PRO</span>
            </div>

            <div className="hidden md:flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 border border-white/10">
              <Zap size={12} className="text-yellow-400" />
              <span className="text-[10px] font-bold text-white/60 tracking-wider">SPACEBAR TO GENERATE</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={exportPalette} className="p-2.5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white tooltip" data-tooltip="Export">
              <Download size={20} />
            </button>
            <button onClick={saveCurrentPalette} className="p-2.5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white tooltip" data-tooltip="Save Library">
              <Save size={20} />
            </button>
            <div className="w-[1px] h-6 bg-white/10 mx-2" />
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-5 py-2.5 rounded-xl font-bold text-xs ring-1 ring-white/20 transition-all shadow-lg shadow-indigo-500/20"
            >
              <Sparkles size={14} />
              AI ASSISTANT
            </button>
            <a
              href="https://github.com/Andreupeak/Spectrum"
              target="_blank"
              className="ml-2 p-2.5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white"
            >
              <Github size={20} />
            </a>
          </div>
        </header>

        {/* Palette Grid */}
        <section className="flex-1 flex overflow-hidden">
          {colors.map((color, index) => {
            const isDark = chroma(color.hex).luminance() < 0.5;
            const textColor = isDark ? 'white' : 'black';

            return (
              <div
                key={color.id}
                className="color-bar group relative"
                style={{ backgroundColor: color.hex }}
              >
                {/* Addition line between bars */}
                {index < colors.length - 1 && (
                  <button
                    onClick={() => addColor(index)}
                    className="absolute right-0 top-0 bottom-0 w-8 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-black shadow-xl hover:scale-110 active:scale-95 transition-transform translate-x-1/2">
                      <Plus size={20} />
                    </div>
                  </button>
                )}

                {/* Toolbar */}
                <div className="color-controls">
                  <button onClick={() => removeColor(color.id)} className="control-btn" style={{ color: textColor }}>
                    <X size={18} />
                  </button>
                  <button onClick={() => toggleLock(color.id)} className={`control-btn ${color.locked ? 'active' : ''}`} style={color.locked ? {} : { color: textColor }}>
                    {color.locked ? <Lock size={18} /> : <Unlock size={18} />}
                  </button>
                  <button onClick={() => copyToClipboard(color.hex)} className="control-btn" style={{ color: textColor }}>
                    {copyFeedback === color.hex ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                </div>

                {/* Info Area */}
                <div className="flex flex-col items-center mb-8 relative">
                  <div
                    onClick={() => copyToClipboard(color.hex)}
                    className="hex-value select-text active:scale-95"
                    style={{ color: textColor }}
                  >
                    {color.hex.replace('#', '').toUpperCase()}
                  </div>
                  <div
                    className="text-[10px] font-black tracking-[.25em] uppercase opacity-40 mt-1 truncate max-w-[120px]"
                    style={{ color: textColor }}
                  >
                    {chroma(color.hex).name() === color.hex ? 'Custom' : chroma(color.hex).name()}
                  </div>

                  {/* Feedback Toast */}
                  <AnimatePresence>
                    {copyFeedback === color.hex && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute -top-12 bg-black text-white px-3 py-1 rounded text-[10px] font-bold"
                      >
                        COPIED
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </section>

        {/* Floating Hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 glass rounded-2xl pointer-events-none opacity-40 hover:opacity-100 transition-opacity flex items-center gap-3">
          <div className="flex gap-1">
            <span className="px-2 py-0.5 bg-white/10 rounded text-[9px] font-black border border-white/10">SPACE</span>
          </div>
          <span className="text-[10px] font-black tracking-widest uppercase">Generate Palette</span>
        </div>
      </main>
    </div>
  );
};

export default App;
