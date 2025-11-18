export const checkCall = (
  ctx: HTMLElement,
  fn?: (...args: any[]) => any,
  ...args: any[]
) => { if (fn) fn.apply(ctx, args) }

let enabledLogs = true;

export const projectLog = (...values: any[]) => {
  if (!enabledLogs) return;
  console.debug(
    ['[rwc]', ...values].join(' | '),
    ...Array.from(values.join('').matchAll(/%c/gm))
      .map((_, ind) => ind % 2 === 0 ? 'color:red' : 'color:inherit')
  )
}

export const camelToKebab = (v: string) => v.replace(/([A-Z])/gm, v => `-${v.toLowerCase()}`)
export const kebabToCamel = (v: string) => v.replace(/-(\w)/gm, (_, v) => v.toUpperCase())

export const colorLog = (message: string, ...args: any[]) => {
  if (!enabledLogs) return;

  // Define color map with single letters
  const colors: Record<string, string> = {
    r: 'color: #ff0000',    // red
    g: 'color: #00ff00',    // green
    b: 'color: #0000ff',    // blue
    y: 'color: #ffff00',    // yellow
    p: 'color: #800080',    // purple
    c: 'color: #00ffff',    // cyan
    o: 'color: #ffa500',    // orange
    w: 'color: #808080',    // gray (w for white/gray)
  };

  // Find all color identifiers in the message (e.g., @r, @b, etc.)
  const colorMatches = message.match(/@[rgbpycow]/g) || [];
  const colorStyles = colorMatches.map(match => {
    const color = match.slice(1); // Remove @
    return colors[color] || 'color: inherit';
  });

  // Replace color identifiers and apply colors until next space or comma
  let formattedMessage = message;
  colorMatches.forEach(match => {
    const regex = new RegExp(`\\${match}([^\\s,]+)`, 'g');
    formattedMessage = formattedMessage.replace(regex, `%c$1`);
  });

  console.log(formattedMessage, ...colorStyles, ...args);
}

// Example usage:
// colorLog('Hello @rred and @bblue text', 'Additional info');
// colorLog('@gSuccess @yWarning @rError', { data: 'test' });
// colorLog('@pPurple text with @ccyan highlight');

export const enableLogs = () => {
  enabledLogs = true;
}

export const disableLogs = () => {
  enabledLogs = false;
}

if (process.env.NODE_ENV === 'production') {
  disableLogs()
}