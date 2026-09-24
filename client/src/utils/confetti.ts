export function triggerConfetti() {
  const emojis = ['🍲', '🥗', '🥖', '📦', '✨', '💚', '🚚', '🍛', '🎉', '🧡'];
  const count = 30;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = `${Math.random() * 100}vw`;
    el.style.animationDuration = `${2 + Math.random() * 2.5}s`;
    el.style.animationDelay = `${Math.random() * 0.5}s`;
    el.style.fontSize = `${18 + Math.random() * 16}px`;

    document.body.appendChild(el);

    setTimeout(() => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 5000);
  }
}
