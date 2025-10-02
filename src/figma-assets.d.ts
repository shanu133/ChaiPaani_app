// Figma asset declarations
declare module 'figma:asset/*.png' {
  const src: string;
  export default src;
}

declare module 'sonner@*' {
  export * from 'sonner';
}