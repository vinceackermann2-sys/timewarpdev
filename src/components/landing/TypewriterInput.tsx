import { useState, useEffect } from 'react';

const EXAMPLES = [
  "apple.com",
  "google.com",
  "stripe.com",
  "airbnb.com",
  "tesla.com",
  "netflix.com"
];

export const TypewriterInput = ({ className }: { className?: string }) => {
  const [placeholder, setPlaceholder] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (isFocused) return;

    const currentExample = EXAMPLES[exampleIndex];
    const typingSpeed = isDeleting ? 40 : 80;
    const delay = placeholder === currentExample && !isDeleting 
      ? 2000 
      : placeholder === "" && isDeleting 
        ? 500 
        : typingSpeed;

    const timeout = setTimeout(() => {
      if (!isDeleting && placeholder === currentExample) {
        setIsDeleting(true);
      } else if (isDeleting && placeholder === "") {
        setIsDeleting(false);
        setExampleIndex((prev) => (prev + 1) % EXAMPLES.length);
      } else {
        setPlaceholder(
          currentExample.substring(0, placeholder.length + (isDeleting ? -1 : 1))
        );
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [placeholder, exampleIndex, isDeleting, isFocused]);

  return (
    <input 
      type="text" 
      placeholder={isFocused ? "" : placeholder + (placeholder === EXAMPLES[exampleIndex] && !isDeleting ? "" : "|")} 
      className={className}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  );
};
