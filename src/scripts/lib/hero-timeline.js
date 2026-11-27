export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const smoothStep = (value) => {
  const p = clamp(value);
  return p * p * (3 - 2 * p);
};
export function getOpeningState(distance, duration, width, maximumShift) {
  const linear = clamp(distance / Math.max(1, duration));
  const progress = smoothStep(linear);
  const shift = Math.max(0, maximumShift) * progress;
  const half = Math.max(1, width / 2);
  const lead = Math.max(0, half - maximumShift) * progress ** 3;
  return { linear, progress, shift, lead, cover: clamp((shift + lead) / half) };
}
