import { toMin } from "./time";

type Span = { start: string; end: string };

/** Lane per shift for a horizontal timeline: overlapping shifts go under each other, a lane is reused once it is free. */
export function assignLanes(items: Span[]): { lanes: number[]; count: number } {
  const order = items.map((_, i) => i).sort((a, b) => toMin(items[a].start) - toMin(items[b].start) || toMin(items[a].end) - toMin(items[b].end));
  const laneEnds: number[] = [];
  const lanes = new Array<number>(items.length);
  for (const i of order) {
    const start = toMin(items[i].start);
    let lane = laneEnds.findIndex((end) => end <= start);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = toMin(items[i].end);
    lanes[i] = lane;
  }
  return { lanes, count: laneEnds.length };
}

/** Whole hours the timeline shows: around the shifts, at least six hours wide, 08-18 when there is nothing. */
export function hourRange(items: Span[]): { from: number; to: number } {
  if (items.length === 0) return { from: 8, to: 18 };
  let from = Math.floor(Math.min(...items.map((s) => toMin(s.start))) / 60);
  let to = Math.ceil(Math.max(...items.map((s) => toMin(s.end))) / 60);
  while (to - from < 6) {
    if (from > 0) from--;
    if (to - from < 6 && to < 24) to++;
  }
  return { from, to };
}
