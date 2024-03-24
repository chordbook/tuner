import { createTuner, Note } from "./src/"

const canvasEl = document.getElementById("visualizer")! as HTMLCanvasElement;
const noteEl = document.getElementById("note")! as HTMLDivElement;

const tuner = createTuner({
  onNote(note: Note) {
    noteEl.innerText = JSON.stringify(note, null, 2);
  }
})

document.getElementById("start")?.addEventListener("click", () => tuner.start())
document.getElementById("stop")?.addEventListener("click", () => tuner.stop())

const bufferLength = tuner.analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);
// Just get the low end of the spectrum
const displayLength = Math.sqrt(bufferLength) * 2;

const ctx = canvasEl.getContext("2d")!;
canvasEl.width = canvasEl.offsetWidth
canvasEl.height = canvasEl.offsetHeight

function visualize() {
  tuner.analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  const barWidth = (canvasEl.width / displayLength);
  let x = 0;

  for (let i = 0; i < displayLength; i++) {
    const barHeight = canvasEl.height * (dataArray[i] / 255);

    ctx.fillStyle = `rgb(60 20 ${barHeight + 50})`;
    ctx.fillRect(x, canvasEl.height - barHeight, barWidth, barHeight);

    x += barWidth;
  }
  requestAnimationFrame(visualize);
}

visualize();
