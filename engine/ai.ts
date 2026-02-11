
import { Ball, Pocket, Vector } from '../types';
import { getDistance } from './physics';

/**
 * 专业级 AI：锁定目标并重力击打
 */
export const calculateAIShot = (
  cueBall: Ball, 
  targetBalls: Ball[], 
  pockets: Pocket[], 
  difficulty: number = 0.5
): { angle: number, power: number } | null => {
  const activeBalls = targetBalls.filter(b => !b.inPocket && b.id !== 0);
  
  if (activeBalls.length === 0) return null;

  // 寻找最近的球
  let nearestBall = activeBalls[0];
  let minDistance = getDistance(cueBall.position, nearestBall.position);

  for (let i = 1; i < activeBalls.length; i++) {
    const dist = getDistance(cueBall.position, activeBalls[i].position);
    if (dist < minDistance) {
      minDistance = dist;
      nearestBall = activeBalls[i];
    }
  }

  // 瞄准角度
  const dx = nearestBall.position.x - cueBall.position.x;
  const dy = nearestBall.position.y - cueBall.position.y;
  const angle = Math.atan2(dy, dx);

  // 大幅增强力度逻辑：
  // 基础力度从 15 提升到 19，确保“滑行”感
  const basePower = 19; 
  // 距离越远，力度越大，模拟真人发力习惯
  const distanceFactor = Math.min(minDistance / 50, 6);
  
  // 加入少量随机性，使其看起来不那么机械
  const randomFactor = (Math.random() - 0.5) * 1.5;

  const power = basePower + distanceFactor + randomFactor;

  return {
    angle,
    power: Math.min(power, 26) // 最高限度 26
  };
};
