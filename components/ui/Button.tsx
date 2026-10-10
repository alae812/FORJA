'use client';
import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-violet-500 to-cyan-400 text-[#06060c] font-bold hover:brightness-110 shadow-[0_0_20px_rgba(167,139,250,0.35)]',
  secondary: 'glass text-bone hover:border-neon-violet/60',
  ghost: 'text-mist hover:text-bone hover:bg-white/5',
  danger: 'bg-red-500/15 text-blood border border-red-500/40 hover:bg-red-500/25',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-base rounded-xl',
  lg: 'px-6 py-3.5 text-lg rounded-2xl',
};

interface Props
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'
  > {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...rest }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 font-display tracking-wide transition-all disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
