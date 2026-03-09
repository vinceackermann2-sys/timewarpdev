import React, { useEffect, useState, useMemo } from 'react';

interface ParticleData {
  id: number;
  duration: number;
  delay: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  color: string;
  transparentStop: number;
  top: number;
  left: number;
}

interface ParticleAnimationProps {
  containerSize?: string;
  particleCount?: number;
  colors?: string[];
  animationDuration?: [number, number];
  perspective?: string;
  particleWidth?: string;
  particleHeight?: string;
  className?: string;
}

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const ParticleAnimation = ({
  containerSize = '40vmin',
  particleCount = 500,
  colors = ['#00b8a9', '#f8f3d4', '#f6416c', '#ffde7d'],
  animationDuration = [1, 2],
  perspective = '10vmin',
  particleWidth = '40%',
  particleHeight = '1px',
  className = '',
}: ParticleAnimationProps) => {
  const particles = useMemo<ParticleData[]>(() => {
    const randomColor = () => colors[Math.floor(Math.random() * colors.length)];
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      duration: random(animationDuration[0], animationDuration[1]),
      delay: -random(0.1, 2),
      rotateX: random(-180, 180),
      rotateY: random(-180, 180),
      rotateZ: random(-180, 180),
      color: randomColor(),
      transparentStop: random(50, 100),
      top: random(0, 100),
      left: random(0, 100),
    }));
  }, [particleCount]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: containerSize,
          height: containerSize,
          perspective,
        }}
      >
        {particles.map((particle) => (
          <div
            key={particle.id}
            style={{
              position: 'absolute',
              top: `${particle.top}%`,
              left: `${particle.left}%`,
              width: particleWidth,
              height: particleHeight,
              background: `linear-gradient(90deg, ${particle.color} 0%, transparent ${particle.transparentStop}%)`,
              animation: `move-${particle.id} ${particle.duration}s ease-in 1 forwards`,
              animationDelay: `${particle.delay}s`,
              transformOrigin: 'center',
              animationFillMode: 'forwards',
            }}
          />
        ))}
      </div>
      <style>{`
        ${particles.map((p) => `
          @keyframes move-${p.id} {
            0% {
              transform: translateX(50%) rotateX(${p.rotateX}deg) rotateY(${p.rotateY}deg) rotateZ(${p.rotateZ}deg) scale(2);
              opacity: 0;
            }
            20% {
              opacity: 1;
            }
            100% {
              transform: translateX(50%) rotateX(${p.rotateX}deg) rotateY(${p.rotateY}deg) rotateZ(${p.rotateZ}deg) scale(0);
              opacity: 1;
            }
          }
        `).join('\n')}
      `}</style>
    </div>
  );
};

export { ParticleAnimation };
