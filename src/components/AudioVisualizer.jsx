import React, { useRef, useEffect, useState, memo } from "react";

/* ---------------- PULSING FACE (NO REACT STATE) ---------------- */

const PulsingFace = memo(({ funnyPic, scaleRef }) => {
  return (
    <div
      ref={scaleRef}
      className="w-full h-full rounded-full overflow-hidden border-4 border-white/20 shadow-2xl transition-transform duration-75"
      style={{ transform: "scale(1)" }}
    >
      {funnyPic ? (
        <img src={funnyPic} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 animate-pulse" />
        </div>
      )}
    </div>
  );
});

/* ---------------- MAIN VISUALIZER ---------------- */

const AudioVisualizer = ({ funnyPic, analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const scaleRef = useRef(null);

  const [isVisualizerEnabled, setIsVisualizerEnabled] = useState(true);

  useEffect(() => {
    if (!isVisualizerEnabled || !isPlaying || !analyser) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3.5;
    const maxBarHeight = height / 6;

    const draw = () => {
      if (!isPlaying || document.hidden) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      let bassSum = 0;
      const bars = bufferLength * 0.75;

      for (let i = 0; i < bars; i++) {
        const value = dataArray[i];
        const barHeight = (value / 255) * maxBarHeight;
        if (barHeight < 2) continue;

        bassSum += value;

        const hue = 250 + (value / 255) * 60;
        ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;

        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      /* 🔥 Pulse center image using SAME data */
      if (scaleRef.current) {
        const avgBass = bassSum / bars;
        const scale = 1 + (avgBass / 255) * 0.2;
        scaleRef.current.style.transform = `scale(${scale})`;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [analyser, isPlaying, isVisualizerEnabled]);

  return (
    <div className="relative w-80 h-80 md:w-[450px] md:h-[450px] mx-auto group">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisualizerEnabled((v) => !v)}
        className="absolute top-0 right-0 z-10 p-2 bg-black/40 hover:bg-indigo-600/40 border border-white/10 rounded-lg text-[10px] text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {isVisualizerEnabled ? "Disable Bars" : "Enable Bars"}
      </button>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
          isVisualizerEnabled ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Center Face */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-1/2 w-1/2">
          <PulsingFace funnyPic={funnyPic} scaleRef={scaleRef} />
        </div>
      </div>
    </div>
  );
};

export default AudioVisualizer;
