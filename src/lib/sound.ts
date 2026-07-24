// Audio Engine using Web Speech API (Text To Speech) & Web Audio API (Chimes/Countdown)

class SoundEngine {
  private isMuted: boolean = false;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("auctionfc_muted");
      this.isMuted = saved === "true";
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("auctionfc_muted", String(this.isMuted));
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private initAudioCtx() {
    if (typeof window !== "undefined" && !this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
  }

  public speak(text: string, priority = false) {
    if (this.isMuted || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (priority) {
      window.speechSynthesis.cancel(); // Stop current speech if priority (e.g. Sold!)
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    // Select best English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha")));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  public announcePlayerEntrance(name: string, club: string, position: string, basePrice: number) {
    // Play intro chime first
    this.playTone(523.25, "sine", 0.15); // C5
    setTimeout(() => this.playTone(659.25, "sine", 0.2), 150); // E5
    
    const text = `Now up for auction: ${name}, ${position} from ${club}. Base price ${basePrice} Crore.`;
    this.speak(text, true);
  }

  public announceBid() {
    this.playTone(880, "triangle", 0.1); // High chime A5
    // Optionally speak bid if needed
  }

  public announceCountdown(number: number) {
    if (this.isMuted) return;
    this.playTone(440, "sine", 0.08); // Tick sound
    if (number <= 3 && number > 0) {
      this.speak(String(number), false);
    }
  }

  public announceSold(playerName: string, teamName: string, amount: number) {
    // Gavel sound effect
    this.playGavelSound();
    const text = `Going once... going twice... SOLD! ${playerName} sold to ${teamName} for ${amount} Crore!`;
    setTimeout(() => {
      this.speak(text, true);
    }, 400);
  }

  public announceUnsold(playerName: string) {
    this.playTone(220, "sawtooth", 0.3); // Low tone
    this.speak(`Player ${playerName} goes unsold.`, true);
  }

  private playTone(freq: number, type: OscillatorType, duration: number) {
    if (this.isMuted) return;
    try {
      this.initAudioCtx();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Ignore audio context block
    }
  }

  private playGavelSound() {
    if (this.isMuted) return;
    try {
      this.initAudioCtx();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      // Wooden bang sound simulation
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.audioCtx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.15);
    } catch {
      // Ignore
    }
  }
}

export const sound = new SoundEngine();
