import React, { useRef, useEffect, useState, memo } from 'react';

const PulsingFace = ({ funnyPic, analyser, isPlaying }) => {
    const [scale, setScale] = useState(1);
    const requestRef = useRef();

    useEffect(() => {
        if (!isPlaying || !analyser) {
            setScale(1);
            return;
        }

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const update = () => {
            analyser.getByteFrequencyData(dataArray);
            // Focus on bass frequencies for the pulse
            const avgBass = (dataArray[0] + dataArray[1] + dataArray[2]) / 3;
            const newScale = 1 + (avgBass / 255) * 0.20;
            setScale(newScale);
            requestRef.current = requestAnimationFrame(update);
        };

        requestRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, analyser]);

    return (
        <div 
            className="w-full h-full rounded-full overflow-hidden border-4 border-white/20 shadow-2xl transition-transform duration-75"
            style={{ transform: `scale(${scale})` }}
        >
            {funnyPic ? (
                <img src={funnyPic} alt="Classmate" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 animate-pulse" />
                </div>
            )}
        </div>
    );
};

const AudioVisualizer = ({ funnyPic, analyser, isPlaying }) => {
    const canvasRef = useRef(null);
    const animationFrameId = useRef(null);
    // State to toggle the circular bars
    const [isVisualizerEnabled, setIsVisualizerEnabled] = useState(true);

    useEffect(() => {
        // Stop logic if disabled, not playing, or no analyser
        if (!isVisualizerEnabled || !isPlaying || !analyser) {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const { width, height } = canvas;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3.5; // Adjusted to fit pulsing face better
        const maxBarHeight = height / 6;

        const draw = () => {
            if (document.hidden) {
                animationFrameId.current = requestAnimationFrame(draw);
                return;
            }

            analyser.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, width, height);
            
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';

            const bars = bufferLength * 0.75; // Use 75% of frequencies for better look
            for (let i = 0; i < bars; i++) {
                const barHeight = (dataArray[i] / 255) * maxBarHeight;
                if (barHeight < 2) continue;

                // Purple to Indigo/Cyan hue shift
                const hue = 250 + (dataArray[i] / 255) * 60;
                ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;

                const angle = ((i / bars) * Math.PI * 2) - Math.PI / 2;
                const x1 = centerX + Math.cos(angle) * radius;
                const y1 = centerY + Math.sin(angle) * radius;
                const x2 = centerX + Math.cos(angle) * (radius + barHeight);
                const y2 = centerY + Math.sin(angle) * (radius + barHeight);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            animationFrameId.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };
    }, [analyser, isPlaying, isVisualizerEnabled]);

    return (
        <div className="relative w-80 h-80 md:w-[450px] md:h-[450px] mx-auto group">
            {/* Control Button - Only visible on hover */}
            <button
                onClick={() => setIsVisualizerEnabled(!isVisualizerEnabled)}
                className="absolute top-0 right-0 z-10 p-2 bg-black/40 hover:bg-indigo-600/40 border border-white/10 rounded-lg text-[10px] text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {isVisualizerEnabled ? "Disable Bars" : "Enable Bars"}
            </button>

            {/* Canvas for the Bars */}
            <canvas 
                ref={canvasRef} 
                width="600" 
                height="600" 
                className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${isVisualizerEnabled ? 'opacity-100' : 'opacity-0'}`} 
            />
            
            {/* The Pulsing Center */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="h-1/2 w-1/2 flex items-center justify-center">
                    <PulsingFace
                        funnyPic={funnyPic}
                        analyser={analyser}
                        isPlaying={isPlaying}
                    />
                </div>
            </div>
        </div>
    );
};

export default AudioVisualizer;