export class AppLifecycle {
  #shuttingDown = false;

  isShuttingDown(): boolean {
    return this.#shuttingDown;
  }

  markShuttingDown(): void {
    this.#shuttingDown = true;
  }
}

export function createAppLifecycle(): AppLifecycle {
  return new AppLifecycle();
}
