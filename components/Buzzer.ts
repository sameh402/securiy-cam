
class BuzzerManager {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  private init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  start() {
    this.init();
    if (!this.audioContext) return;
    if (this.oscillator) return;

    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    this.oscillator.type = 'sawtooth';
    this.oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5 note
    
    // Create a pulsing effect
    this.oscillator.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.1);
    
    this.gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    
    this.oscillator.start();
  }

  stop() {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }
}

export const buzzer = new BuzzerManager();
