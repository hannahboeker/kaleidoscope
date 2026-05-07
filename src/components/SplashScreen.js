"use client";
import { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: #999999;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  ${({ $exiting }) =>
    $exiting &&
    css`
      animation: ${fadeOut} 0.6s ease forwards;
    `}
`;

const TextBlock = styled.div`
  text-align: center;
  color: #e879f9;
  font-family: "Neumarkt", serif;
  letter-spacing: 0.09em;
  animation: ${fadeIn} 0.5s ease forwards;
`;

const Title = styled.p`
  font-size: clamp(36px, 8vw, 72px);
`;

const Subtitle = styled.p`
  font-size: clamp(20px, 4vw, 38px);
  line-height: 1.35;
`;

// Phasen: "title" → "subtitle" → "exit" → "done"
const TIMINGS = {
  titleHold: 1400,
  subtitleDelay: 300,
  subtitleHold: 1600,
  exitDuration: 600,
};

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState("title");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("subtitle"), TIMINGS.titleHold);
    const t2 = setTimeout(
      () => setPhase("exit"),
      TIMINGS.titleHold + TIMINGS.subtitleDelay + TIMINGS.subtitleHold,
    );
    const t3 = setTimeout(
      () => onDone(),
      TIMINGS.titleHold +
        TIMINGS.subtitleDelay +
        TIMINGS.subtitleHold +
        TIMINGS.exitDuration,
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <Overlay $exiting={phase === "exit"}>
      {phase === "title" && (
        <TextBlock key="title">
          <Title>kaleidoscope</Title>
        </TextBlock>
      )}
      {phase === "subtitle" && (
        <TextBlock key="subtitle">
          <Subtitle>
            Design kaleidoscopic postcards!
            <br />
            write your friends :)
          </Subtitle>
        </TextBlock>
      )}
    </Overlay>
  );
}
