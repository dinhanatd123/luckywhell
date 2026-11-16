class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Crisp mechanical peg tick sound as each slice boundary crosses the pointer.
   */
  public playTick(speedRatio = 0.5) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq = 720 + Math.min(1, Math.max(0, speedRatio)) * 340;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.032);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * Joyful celebratory synthesizer fanfare chord arpeggio on winner reveal.
   */
  public playFanfare() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Bright C-major 9th celebratory arpeggio + sustain chord
    const notes = [
      { freq: 523.25, start: 0, duration: 0.25 }, // C5
      { freq: 659.25, start: 0.09, duration: 0.25 }, // E5
      { freq: 783.99, start: 0.18, duration: 0.25 }, // G5
      { freq: 1046.5, start: 0.27, duration: 0.75 }, // C6
      { freq: 659.25, start: 0.27, duration: 0.7 }, // E5 harmony
      { freq: 783.99, start: 0.27, duration: 0.7 }, // G5 harmony
      { freq: 1174.66, start: 0.42, duration: 0.65 }, // D6 sparkle
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = note.freq >= 1000 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      gain.gain.setValueAtTime(0.001, now + note.start);
      gain.gain.linearRampToValueAtTime(0.12, now + note.start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.02);
    }
  }
}

export const soundEngine = new SoundEngine();
