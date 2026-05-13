"use client";
import { useState, useEffect } from "react";
import styled, { keyframes, css, createGlobalStyle } from "styled-components";

const SplashGlobal = createGlobalStyle`
  @property --splash-r {
    syntax: '<percentage>';
    inherits: false;
    initial-value: 100%;
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const maskShrink = keyframes`
  from { --splash-r: 100%; opacity: 1; }
  75%  { --splash-r: 0%;   opacity: 1; }
  to   { --splash-r: 0%;   opacity: 0; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: #999999;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10%;
  text-align: center;

  ${({ $exiting }) =>
    $exiting &&
    css`
      mask-image: radial-gradient(
        circle at center,
        black 0%,
        black var(--splash-r),
        transparent calc(var(--splash-r) + 22%)
      );
      -webkit-mask-image: radial-gradient(
        circle at center,
        black 0%,
        black var(--splash-r),
        transparent calc(var(--splash-r) + 22%)
      );
      animation: ${maskShrink} 1.6s ease-in forwards;
    `}
`;

const IntroText = styled.p`
  color: #ffffff;
  font-family: "Neumarkt", serif;
  font-size: 23px;
  letter-spacing: 0.09em;
  line-height: 1.2;
  margin: 0;
  animation: ${fadeIn} 0.5s ease forwards;
`;

const TIMINGS = {
  textHold: 1200,
  exitDuration: 1600,
};

export default function SplashScreen({ onDone }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), TIMINGS.textHold);
    const t2 = setTimeout(onDone, TIMINGS.textHold + TIMINGS.exitDuration);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <>
      <SplashGlobal />
      <Overlay $exiting={exiting}>
        <IntroText>
          Design kaleidoscopic postcards.<br />Write to your friends!
        </IntroText>
      </Overlay>
    </>
  );
}
