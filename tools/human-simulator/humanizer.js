/**
 * Humanizer Utility for Playwright
 * Translates automated test steps into realistic, human-like user actions.
 */

class Humanizer {
  constructor(page, persona, onEventCallback) {
    this.page = page;
    this.persona = persona;
    this.onEvent = onEventCallback || (() => {});
    this.currentMousePos = { x: 100, y: 100 };
  }

  /**
   * Log an action to dashboard listeners
   */
  log(type, message, details = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      message,
      persona: this.persona.id,
      ...details
    };
    this.onEvent(event);
  }

  /**
   * Random integer helper
   */
  _randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Calculate cubic Bézier curve points for natural mouse trajectories
   */
  _generateBezierPoints(start, end, steps = 25) {
    // Randomize control points with natural curve jitter
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;

    const cp1 = {
      x: start.x + deltaX * (0.2 + Math.random() * 0.3) + (Math.random() - 0.5) * 50,
      y: start.y + deltaY * (0.1 + Math.random() * 0.3) + (Math.random() - 0.5) * 50
    };

    const cp2 = {
      x: start.x + deltaX * (0.6 + Math.random() * 0.3) + (Math.random() - 0.5) * 50,
      y: start.y + deltaY * (0.5 + Math.random() * 0.4) + (Math.random() - 0.5) * 50
    };

    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Cubic Bézier formula
      const x =
        Math.pow(1 - t, 3) * start.x +
        3 * Math.pow(1 - t, 2) * t * cp1.x +
        3 * (1 - t) * Math.pow(t, 2) * cp2.x +
        Math.pow(t, 3) * end.x;
      const y =
        Math.pow(1 - t, 3) * start.y +
        3 * Math.pow(1 - t, 2) * t * cp1.y +
        3 * (1 - t) * Math.pow(t, 2) * cp2.y +
        Math.pow(t, 3) * end.y;
      points.push({ x: Math.round(x), y: Math.round(y) });
    }
    return points;
  }

  /**
   * Move mouse naturally along a curve towards target coordinates or element
   */
  async naturalMouseMove(target) {
    let dest = { x: 0, y: 0 };
    if (typeof target.x === 'number' && typeof target.y === 'number') {
      dest = target;
    } else {
      // It's a locator or selector
      const box = typeof target.boundingBox === 'function' ? await target.boundingBox() : null;
      if (!box) return;
      // Aim near center with slight human offset
      dest = {
        x: box.x + box.width * (0.35 + Math.random() * 0.3),
        y: box.y + box.height * (0.35 + Math.random() * 0.3)
      };
    }

    const points = this._generateBezierPoints(this.currentMousePos, dest, 20);
    for (const pt of points) {
      await this.page.mouse.move(pt.x, pt.y);
      await this.page.waitForTimeout(this._randomBetween(5, 18));
    }
    this.currentMousePos = dest;
  }

  /**
   * Human-like click with hover, micro-hesitation, and optional double-click test
   */
  async humanClick(locator, label = 'element') {
    this.log('ACTION_START', `Moving to click ${label}...`);
    await locator.scrollIntoViewIfNeeded();
    await this.naturalMouseMove(locator);

    // Human hesitation before pressing down
    await this.page.waitForTimeout(this.persona.hesitationBeforeClickMs + this._randomBetween(50, 200));

    await locator.click();
    this.log('ACTION_COMPLETE', `Clicked ${label}`);

    // Check for accidental double click simulation
    if (Math.random() < this.persona.doubleClickProbability) {
      this.log('ANOMALY_TRIGGER', `Simulating accidental double-click / spam on ${label}`);
      await this.page.waitForTimeout(this._randomBetween(40, 100));
      await locator.click({ force: true }).catch(() => {});
    }

    await this.page.waitForTimeout(this._randomBetween(100, 300));
  }

  /**
   * Human typing with realistic delays, typos, and backspaces
   */
  async humanType(locator, text, label = 'input') {
    this.log('ACTION_START', `Typing into ${label}: "${text}"`);
    await this.humanClick(locator, label);

    const typoChars = 'abcdefghijklmnopqrstuvwxyz';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const shouldTypo = Math.random() < this.persona.typoRate && char !== ' ' && char !== '\n';

      if (shouldTypo) {
        // Inject a typo
        const wrongChar = typoChars[this._randomBetween(0, typoChars.length - 1)];
        await this.page.keyboard.type(wrongChar);
        await this.page.waitForTimeout(this._randomBetween(120, 350));
        // Realize typo and backspace
        await this.page.keyboard.press('Backspace');
        await this.page.waitForTimeout(this._randomBetween(80, 200));
      }

      // Type intended character
      await this.page.keyboard.type(char);
      const delay = this._randomBetween(this.persona.typingDelayMs.min, this.persona.typingDelayMs.max);
      await this.page.waitForTimeout(delay);
    }

    this.log('ACTION_COMPLETE', `Finished typing into ${label}`);
  }

  /**
   * Human reading pause calculated based on word count and persona reading speed (WPM)
   */
  async humanReadingPause(elementOrText) {
    let text = '';
    if (typeof elementOrText === 'string') {
      text = elementOrText;
    } else if (elementOrText && typeof elementOrText.innerText === 'function') {
      text = await elementOrText.innerText().catch(() => '');
    }

    const wordCount = text ? text.trim().split(/\s+/).length : 20;
    const minutesToRead = wordCount / this.persona.wpm;
    let pauseMs = Math.round(minutesToRead * 60 * 1000);

    // Bound between persona limits
    pauseMs = Math.max(this.persona.minPauseMs, Math.min(this.persona.maxPauseMs, pauseMs));

    this.log('THOUGHT', `Reading content (${wordCount} words) - pausing for ${(pauseMs / 1000).toFixed(1)}s`);
    
    // Simulate slight natural micro-scrolls or mouse twitches while reading
    const intervals = Math.floor(pauseMs / 1200);
    for (let i = 0; i < intervals; i++) {
      await this.page.waitForTimeout(1200);
      if (Math.random() < 0.3) {
        // Slight scroll reading adjustment
        await this.page.mouse.wheel(0, this._randomBetween(-30, 60));
      }
    }
  }

  /**
   * Smooth natural scrolling
   */
  async humanScroll(deltaY) {
    this.log('ACTION_START', `Scrolling page by ${deltaY}px`);
    const steps = 8;
    const stepDelta = Math.round(deltaY / steps);
    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, stepDelta);
      await this.page.waitForTimeout(this._randomBetween(25, 60));
    }
    await this.page.waitForTimeout(this._randomBetween(200, 500));
  }

  /**
   * Anti-Cheating stress tests: Simulates tab unfocus (blur) and refocused window
   */
  async simulateTabDefocus(durationMs = 3000) {
    this.log('PROCTORING_TRIGGER', `Simulating user switching tabs for ${durationMs / 1000}s`);
    await this.page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await this.page.waitForTimeout(durationMs);

    await this.page.evaluate(() => {
      window.dispatchEvent(new Event('focus'));
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    this.log('PROCTORING_TRIGGER', `User returned to exam tab`);
  }

  /**
   * Anti-Cheating stress tests: Simulates forbidden Copy/Paste keys
   */
  async simulateForbiddenShortcut() {
    this.log('PROCTORING_TRIGGER', `Simulating forbidden clipboard shortcut (Ctrl+C / Cmd+C)`);
    await this.page.keyboard.press('Control+KeyC');
    await this.page.waitForTimeout(400);
  }
}

module.exports = { Humanizer };
