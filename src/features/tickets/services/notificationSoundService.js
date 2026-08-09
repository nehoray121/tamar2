export const closeSoundOptions = [
    { value: 'off', label: 'כבוי' },
    { value: 'soft', label: 'עדין' },
    { value: 'bell', label: 'פעמון' },
    { value: 'alert', label: 'התראה' }
];

const patterns = {
    soft: [{ frequency: 660, duration: 0.08, gain: 0.045 }, { frequency: 880, duration: 0.11, gain: 0.035 }],
    bell: [{ frequency: 740, duration: 0.12, gain: 0.055 }, { frequency: 988, duration: 0.16, gain: 0.04 }],
    alert: [{ frequency: 520, duration: 0.09, gain: 0.05 }, { frequency: 780, duration: 0.09, gain: 0.05 }, { frequency: 1040, duration: 0.12, gain: 0.04 }]
};

export const notificationSoundService = {
    play(soundKey) {
        if (!soundKey || soundKey === 'off' || typeof window === 'undefined') return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const context = new AudioContext();
        let startAt = context.currentTime;

        (patterns[soundKey] || patterns.soft).forEach((note) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(note.frequency, startAt);
            gain.gain.setValueAtTime(0.0001, startAt);
            gain.gain.exponentialRampToValueAtTime(note.gain, startAt + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, startAt + note.duration);

            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(startAt);
            oscillator.stop(startAt + note.duration + 0.02);
            startAt += note.duration + 0.035;
        });

        window.setTimeout(() => context.close?.(), 900);
    }
};
