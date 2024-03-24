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

  const detector = PitchDetector.forFloat32Array(config.bufferSize!)
  detector.minVolumeDecibels = config.minVolumeDecibels!;

  const context = new AudioContext()

  const processor = context.createScriptProcessor(config.bufferSize, 1, 1)
  processor.addEventListener('audioprocess', process)

  const analyser = new AnalyserNode(context, {
    fftSize: config.bufferSize,
    smoothingTimeConstant: config.smoothingTimeConstant
  })

  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = config.maxFrequency!;

  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = config.minFrequency!;

  const pipeline: AudioNode[] = [
    lowpass,
    highpass,
    analyser,
    processor,
    context.destination
  ]

  for (var i = 0; i < pipeline.length - 1; i++) {
    pipeline[i].connect(pipeline[i + 1])
  }

  let stream: MediaStream
  let source: MediaStreamAudioSourceNode

  async function start () {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    source = context.createMediaStreamSource(stream)
    source.connect(pipeline[0])
  }

  function process(event: AudioProcessingEvent) {
    const data = event.inputBuffer.getChannelData(0)
    const [frequency, clarity] = detector.findPitch(data, context.sampleRate)

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
    stream.getTracks().forEach(track => track.stop())
    stream.removeTrack(stream.getAudioTracks()[0])
  }

  return { start, stop, context, analyser, processor, detector, config }
}
