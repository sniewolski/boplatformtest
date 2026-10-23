import { useEffect, useState } from "react";

/** Keep typing synchronous; cache/prop updates may only replace an unfocused buffer. */
export function useBufferedValue(value: string, onChange: (value: string) => void) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused && value !== text) setText(value);
  }, [value, text, focused]);

  return {
    value: text,
    setValue: (next: string) => {
      setText(next);
      onChange(next);
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
}