"use client";
import dynamic from "next/dynamic";

// Dynamic (Next-Funktion) | Komponente wird erst geladen, wenn gebraucht.
// ssr: false damit nur in Browser nie auf Server gerendert wird.
// p5 => setzt window/document vorraus (gibts beides auf Server nicht)
const Canvas = dynamic(() => import("../components/Canvas"), {
  ssr: false,
  loading: () => <p> Loading...</p>,
});

export default function Home() {
  return (
    <main>
      <Canvas />
    </main>
  );
}
