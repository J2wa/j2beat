/// <reference types="vite/client" />
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

interface AcesLogoAttributes extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  size?: string | number;
  href?: string;
  target?: string;
  rel?: string;
  theme?: 'light' | 'dark' | 'mono' | 'auto';
  wordmark?: 'auto' | 'show' | 'hide';
  intro?: 'on' | 'off';
  track?: 'on' | 'off';
  loading?: boolean;
  label?: string;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'aces-logo': AcesLogoAttributes;
    }
  }
}
