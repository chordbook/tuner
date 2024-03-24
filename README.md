# @chordbook/tuner

A web-based library for pitch detection of stringed instruments. It uses the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) to capture audio from the microphone, and uses the [pitchy](https://github.com/ianprime0509/pitchy) to detect the predominant pitch.

<h3 align="center">🎸 <a href="https://chordbook.github.io/tuner">View Demo</a> 🪕</h3>

### Features

* ✅ Uses your devices microphone to detect the pitch of stringed instruments
* ✅ Filters noise from low and high frequencies outside the range of stringed instruments
* ✅ Does not try to detect when the volume is too low

## Installation

```console
npm install @chordbook/tuner
```

## Usage

```js
import { createTuner } from '@chordbook/tuner'

const tuner = createTuner({
  // The callback to call when a note is detected.
  onNote: note => {
    console.log('Note:', note)
  },

  //// Here are some other settings you can fiddle with
  //// (let us know if you find values that work better).

  //// The frequency of middle A. Defaults to 440Hz.
  // a4: 440,

  //// The minimum clarity threshold. Anything below this will be ignored
  // clarityThreshold: 0.95,

  // The minimum volume threshold. -100 means 1/100th the volume of the loudest sound.
  // minVolumeDecibels: -100,

  //// The minimum and maximum frequencies to detect. To reduce noise, everything else is filtered
  //// out using a lowpass and highpass filter.
  // minFrequency: 73.42, // D2, drop D
  // maxFrequency: 1084.0, // C6, highest note on the guitar in front of me

  // bufferSize: 2048,
  // smoothingTimeConstant: 0.9,
})

// Request access to the microphone and begin pitch detection
tuner.start()

// Stop listening
tuner.stop()
```

## Contributing

Contributions are welcome!

1. Clone this repository: `git clone https://github.com/chordbook/tuner.git`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open [http://localhost:5173/](http://localhost:5173/) in your browser

## License

This project is licensed under the [GPLv3.0](./LICENSE) license.
