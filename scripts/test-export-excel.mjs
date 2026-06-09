import { DEFAULT_INPUT } from "../lib/parse-schedule-input.ts";
import { generateSchedule } from "../lib/schedule.ts";

const input = {
  ...DEFAULT_INPUT,
  maleCount: 4,
  femaleCount: 4,
  courtCount: 4,
  startTime: "09:00",
  endTime: "12:00",
  matchMinutes: 30,
  types: ["MXD"],
};
const generated = generateSchedule(input, 12345);
const slotMap = new Map();
for (const item of generated.schedule) {
  if (!slotMap.has(item.time)) slotMap.set(item.time, []);
  slotMap.get(item.time).push(item);
}

const res = await fetch("http://localhost:3000/api/export-excel", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ input, generated, slotMap: [...slotMap.entries()] }),
});

console.log("status", res.status);
const buf = await res.arrayBuffer();
console.log("bytes", buf.byteLength);
