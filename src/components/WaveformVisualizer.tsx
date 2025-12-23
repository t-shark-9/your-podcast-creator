import { useEffect, useRef, useState } from "react";

interface WaveformVisualizerProps {
  isPlaying?: boolean;
  isGenerating?: boolean;
  audioUrl?: string;
}

export const WaveformVisualizer = ({ 
  isPlaying = false, 
  isGenerating = false,
  audioUrl 
}: WaveformVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioUrl && audioElement) {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        const source = audioContextRef.current.createMediaElementSource(audioElement);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }
    }
  }, [audioUrl, audioElement]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);

      const barCount = 64;
      const barWidth = width / barCount - 2;
      const centerY = height / 2;

      for (let i = 0; i < barCount; i++) {
        let barHeight: number;

        if (isGenerating) {
          // Animated wave during generation
          const time = Date.now() / 1000;
          const wave = Math.sin(time * 3 + i * 0.3) * 0.5 + 0.5;
          barHeight = wave * (height * 0.4) + 5;
        } else if (isPlaying && analyserRef.current) {
          // Real audio visualization
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          barHeight = (dataArray[i] / 255) * (height * 0.4) + 5;
        } else {
          // Static wave pattern
          const staticWave = Math.sin(i * 0.2) * 0.3 + 0.5;
          barHeight = staticWave * 15 + 5;
        }

        const x = i * (barWidth + 2);
        
        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
        gradient.addColorStop(0, "hsl(175 84% 50%)");
        gradient.addColorStop(0.5, "hsl(200 80% 55%)");
        gradient.addColorStop(1, "hsl(280 85% 65%)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 3);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isGenerating]);

  return (
    <div className="relative w-full">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={120}
        className="w-full h-24 rounded-lg"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none rounded-lg" />
    </div>
  );
};
