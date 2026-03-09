import React, { useEffect, useState } from 'react';

interface ParticleData {
  id: number;
  duration: number;
  delay: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  color: string;
  transparentStop: number;
}

interface ParticleAnimationProps {
  gridSize?: number;
  containerSize?: string;
  particleCount?: number;
  colors?: string[];
  animationDuration?: [number, number];
  perspective?: string;
  particleWidth?: string;
  particleHeight?: string;
  freeze?: boolean;
  className?: string;
}

const ParticleAnimation = ({
  gridSize = 500,
  containerSize = '40vmin',
  particleCount = 500,
  colors = ['#00b8a9', '#f8f3d4', '#f6416c', '#ffde7d'],
  animationDuration = [1, 2],
  perspective = '10vmin',
  particleWidth = '40%',
  particleHeight = '1px',
  freeze = false,
  className = '',
}: ParticleAnimationProps) => {
  const [particles, setParticles] = useState<ParticleData[]>([]);

  const random = (min: number, max: number) => Math.random() * (max - min) + min;
  const randomColor = () => colors[Math.floor(Math.random() * colors.length)];
  const randomRotation = () => random(-180, 180);

  useEffect(() => {
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      duration: random(animationDuration[0], animationDuration[1]),
      delay: -random(0.1, 2),
      rotateX: randomRotation(),
      rotateY: randomRotation(),
      rotateZ: randomRotation(),
      color: randomColor(),
      transparentStop: random(50, 100),
    }));
    setParticles(newParticles);
  }, [particleCount]);

  const maxDuration = animationDuration[1] + 2;

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
              top: `${random(0, 100)}%`,
              left: `${random(0, 100)}%`,
              width: particleWidth,
              height: particleHeight,
              background: `linear-gradient(90deg, ${particle.color} 0%, transparent ${particle.transparentStop}%)`,
              animation: `move-${particle.id} ${particle.duration}s ease-in ${freeze ? '1 forwards' : 'infinite'}`,
              animationDelay: `${particle.delay}s`,
              transformOrigin: 'center',
            }}
          />
        ))}
      </div>
      <style>{`
        ${particles.map((particle) => `
          @keyframes move-${particle.id} {
            0% {
              transform: translateX(50%) rotateX(${particle.rotateX}deg) rotateY(${particle.rotateY}deg) rotateZ(${particle.rotateZ}deg) scale(2);
              opacity: 0;
            }
            20% {
              opacity: 1;
            }
            100% {
              transform: translateX(50%) rotateX(${particle.rotateX}deg) rotateY(${particle.rotateY}deg) rotateZ(${particle.rotateZ}deg) scale(0);
              opacity: 1;
            }
          }
        `).join('\n')}
      `}</style>
    </div>
  );
};

export { ParticleAnimation };
