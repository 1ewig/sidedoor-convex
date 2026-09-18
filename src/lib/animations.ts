import { Variants, Transition } from 'framer-motion';

export const DRAWER_SPRING_TRANSITION: Transition = {
  type: 'spring',
  damping: 30,
  stiffness: 320,
  mass: 0.8,
};

export const POPOVER_SPRING_TRANSITION: Transition = {
  type: 'spring',
  damping: 24,
  stiffness: 350,
  mass: 0.6,
};

export const BACKDROP_TRANSITION: Transition = {
  duration: 0.22,
  ease: 'easeOut',
};

export const drawerBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: BACKDROP_TRANSITION },
  exit: { opacity: 0, transition: BACKDROP_TRANSITION },
};

export const drawerRightVariants: Variants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: DRAWER_SPRING_TRANSITION,
  },
  exit: {
    x: '100%',
    transition: DRAWER_SPRING_TRANSITION,
  },
};

export const popoverVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.94,
    y: -6,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: POPOVER_SPRING_TRANSITION,
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: -6,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
};

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
};
