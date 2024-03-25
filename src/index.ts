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
  onNote?: (note: Note) => void
}

export const TunerDefaults: TunerConfig = {
  a4: 440,
  clarityThreshold: 0.95,
  minVolumeDecibels: -100,
  bufferSize: 2048,
  smoothingTimeConstant: 0.9,
  minFrequency: 73.42, // D2
  maxFrequency: 1084.0, // C6, highest note on the guitar in front of me
  updateInterval: 100,
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

  const context = new AudioContext()
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
