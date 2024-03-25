import { PitchDetector } from 'pitchy'

const semitone = 69
const noteStrings = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

export interface TunerConfig {
  a4?: number
  clarityThreshold?: number
  minVolumeDecibels?: number
  bufferSize?: number
  smoothingTimeConstant?: number
  minFrequency?: number
  maxFrequency?: number
  updateInterval?: number
  sampleRate?: number
  onNote?: (note: Note) => void
}

export const TunerDefaults: TunerConfig = {
  a4: 440,
  clarityThreshold: 0.9,
  minVolumeDecibels: -1000,
  bufferSize: 8192,
  smoothingTimeConstant: 0.8,
  minFrequency: 27.5, // A0, Lowest note on a piano
  maxFrequency: 4186.01, // C8, Highest note on a piano
  updateInterval: 50,
  sampleRate: 44100, // Seems to work better than 48000 for some reason
}

export interface Note {
  name: string
  value: number
  cents: number
  octave: number
  frequency: number
  clarity: number
}

export function createTuner(config: TunerConfig = {}) {
  config = { ...TunerDefaults, ...config }

  const context = new AudioContext({ sampleRate: config.sampleRate })
  const highpass = new BiquadFilterNode(context, { type: "highpass", frequency: config.minFrequency })
  const lowpass = new BiquadFilterNode(context, { type: "lowpass", frequency: config.maxFrequency })
  const analyser = new AnalyserNode(context, { fftSize: config.bufferSize, smoothingTimeConstant: config.smoothingTimeConstant })
  lowpass.connect(highpass).connect(analyser)

  const detector = PitchDetector.forFloat32Array(analyser.fftSize)
  detector.minVolumeDecibels = config.minVolumeDecibels!;
  const inputBuffer = new Float32Array(detector.inputLength)

  let stream: MediaStream
  let source: MediaStreamAudioSourceNode
  let interval = 0;

  async function start () {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    source = context.createMediaStreamSource(stream)
    source.connect(lowpass)

    interval = setInterval(process, config.updateInterval!)
  }

  function process() {
    analyser.getFloatTimeDomainData(inputBuffer);
    const [frequency, clarity] = detector.findPitch(inputBuffer, context.sampleRate)

    if (clarity > config.clarityThreshold!) {
      config.onNote?.(getNote(frequency, clarity))
    }
  }

  function getNote (frequency: number, clarity?: number) {
    const value = Math.round(12 * (Math.log(frequency / config.a4!) / Math.log(2))) + semitone
    const standardFrequency = config.a4! * Math.pow(2, (value - semitone) / 12)
    const cents = Math.floor((1200 * Math.log(frequency / standardFrequency)) / Math.log(2))
    const name = noteStrings[value % 12]
    const octave: number = Math.floor(value / 12) - 1
    return { frequency, name, value, cents, octave, clarity } as Note
  }

  async function stop() {
    clearInterval(interval)
    stream.getTracks().forEach(track => track.stop())
    stream.removeTrack(stream.getAudioTracks()[0])
  }

  return { start, stop, context, analyser, detector, config, getNote }
}
