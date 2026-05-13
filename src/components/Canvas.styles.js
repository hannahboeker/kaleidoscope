import styled, { keyframes } from "styled-components";
import {
  HEADER_HEIGHT,
  FOOTER_HEIGHT,
  FOOTER_HEIGHT_MOBILE,
} from "@/lib/canvasHelpers";

const PAGE_BG = "#999999";
const ScrollContainer = styled.div`
  height: 100dvh;
  width: 100vw;
  display: flex;
  overflow-x: scroll;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  background: ${PAGE_BG};

  &::-webkit-scrollbar {
    display: none;
  }
  scrollbar-width: none;
`;

const WorkspaceSection = styled.section`
  height: 100dvh;
  width: 100vw;
  flex-shrink: 0;
  scroll-snap-align: start;
  background: ${PAGE_BG};
  display: flex;
  flex-direction: column;
  padding-top: ${HEADER_HEIGHT}px;
`;

const DesignSlide = styled.section`
  height: 100dvh;
  width: 100vw;
  flex-shrink: 0;
  scroll-snap-align: start;
  background: ${PAGE_BG};
  display: flex;
  flex-direction: column;
  padding-top: ${HEADER_HEIGHT}px;
`;

const DesignContent = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: ${FOOTER_HEIGHT}px;

  @media (max-width: 430px) {
    padding-bottom: ${FOOTER_HEIGHT_MOBILE}px;
  }
`;

const WorkspaceHeader = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: ${HEADER_HEIGHT}px;
  z-index: 200;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 4px 3% 0;
`;

const IconButton = styled.button`
  position: relative;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  line-height: 0;

  img + img {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 0.2s;
  }

  @media (hover: hover) {
    &:hover img:first-child {
      opacity: 0;
    }

    &:hover img + img {
      opacity: 1;
    }
  }
`;

const CanvasArea = styled.main`
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: ${FOOTER_HEIGHT}px;

  @media (max-width: 430px) {
    padding-bottom: ${FOOTER_HEIGHT_MOBILE}px;
  }
`;

// TOOLBAR ──────────────────────────────────────────────────────────

const Toolbar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${FOOTER_HEIGHT}px;
  background: transparent;
  z-index: 100;
  display: flex;
  flex-direction: column;
  justify-content: center;

  @media (max-width: 430px) {
    height: ${FOOTER_HEIGHT_MOBILE}px;
    overflow: hidden;
  }
`;

const ColorToolLabel = styled.label`
  position: relative;
  cursor: pointer;
  display: block;
  flex-shrink: 0;
  line-height: 0;
  z-index: 1;
  isolation: isolate;

  &::after {
    content: attr(data-label);
    position: absolute;
    bottom: calc(100% - 26px);
    left: 50%;
    transform: translateX(-50%);
    color: #ffffff;
    font-family: "Neumarkt", serif;
    font-size: 23px;
    letter-spacing: 0.09em;
    white-space: nowrap;
    line-height: 1;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s;
  }

  @media (hover: hover) {
    &:hover::after {
      opacity: 1;
    }
  }

  &[data-label="background"]::after {
    bottom: calc(100% - 18px);
  }
`;

const HiddenColorInput = styled.input.attrs({ type: "color" })`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  padding: 0;
`;

const BlurButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  line-height: 0;
  flex-shrink: 0;
  z-index: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  & > div {
    background: ${({ $active }) => ($active ? "#e879f9" : "#ffffff")};
    transition: background 0.2s;
  }

  span {
    color: ${({ $active }) => ($active ? "#e879f9" : "#ffffff")};
    transition: color 0.2s;
  }

  @media (hover: hover) {
    &:hover > div {
      background: #e879f9;
    }

    &:hover span {
      color: #e879f9;
    }
  }
`;

const ToolbarSpacer = styled.div`
  flex: 1;
`;

const ToolbarInner = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 4px 0 16px;

  @media (max-width: 430px) {
    transform: scale(0.7);
    transform-origin: left center;
  }
`;

const ExportArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  padding-right: 14px;
  flex-shrink: 0;
  z-index: 1;
`;

const ShapeButton = styled.button`
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    display: block;
  }

  svg path {
    fill: #ffffff;
    stroke: none;
    transition: fill 0.2s;
  }

  span {
    color: #e879f9;
    transition: color 0.2s;
  }

  @media (hover: hover) {
    &:hover svg path {
      fill: #e879f9;
    }

    &:hover span {
      color: #ffffff;
    }
  }
`;

const ButtonLabel = styled.span`
  position: absolute;
  font-family: "Neumarkt", serif;
  font-size: 23px;
  color: #ffffff;
  letter-spacing: 0.09em;
  white-space: nowrap;
  pointer-events: none;
`;

const BrushSizeSlider = styled.input.attrs({ type: "range" })`
  -webkit-appearance: none;
  appearance: none;
  width: 160px;
  height: 3px;
  background: #ffffff;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  margin-top: 18px;
  touch-action: manipulation;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff00d4;
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #e879f9;
    cursor: pointer;
    border: none;
  }
`;

const CreditsSlide = styled.section`
  height: 100dvh;
  width: 100vw;
  flex-shrink: 0;
  scroll-snap-align: start;
  background: ${PAGE_BG};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CreditsText = styled.p`
  color: #ffffff;
  font-family: "Neumarkt", serif;
  font-size: 23px;
  letter-spacing: 0.09em;
  text-align: center;
  margin: 0;
`;

const CreditsLink = styled.a`
  color: #ffffff;
  text-decoration: none;
  transition: color 0.2s;

  @media (hover: hover) {
    &:hover {
      color: #e879f9;
    }
  }
`;

const SaveDeleteGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
`;

const NavArrow = styled.button`
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 500;
  background: none;
  border: none;
  cursor: pointer;
  padding: 20px 18px;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};
  touch-action: manipulation;
  transition: opacity 0.3s;

  img {
    display: block;
    width: 44px;
    height: 44px;
  }

  img + img {
    position: absolute;
    inset: 0;
    width: 44px;
    height: 44px;
    margin: auto;
    opacity: 0;
    transition: opacity 0.2s;
  }

  @media (hover: hover) {
    img,
    img + img {
      width: 36px;
      height: 36px;
    }

    &:hover img:first-child {
      opacity: 0;
    }

    &:hover img + img {
      opacity: 1;
    }
  }
`;

const galleryHintFade = keyframes`
  0%   { opacity: 0; }
  10%  { opacity: 1; }
  75%  { opacity: 1; }
  100% { opacity: 0; }
`;

const GalleryLabel = styled.span`
  position: fixed;
  right: 14px;
  top: calc(50% - 70px);
  z-index: 600;
  color: #e879f9;
  font-family: "Neumarkt", serif;
  font-size: 23px;
  letter-spacing: 0.09em;
  white-space: nowrap;
  pointer-events: none;
  animation: ${galleryHintFade} 4s ease forwards;
`;

const RightEdgeGlow = styled.div`
  position: fixed;
  right: 0;
  top: 0;
  height: 100dvh;
  width: 50px;
  background: linear-gradient(to left, rgba(255, 0, 220, 1) 0%, rgba(255, 0, 220, 0.4) 50%, transparent 100%);
  pointer-events: none;
  z-index: 400;
  animation: ${galleryHintFade} 4s ease forwards;
`;

export {
  PAGE_BG,
  ScrollContainer,
  WorkspaceSection,
  DesignSlide,
  DesignContent,
  WorkspaceHeader,
  IconButton,
  CanvasArea,
  Toolbar,
  ColorToolLabel,
  HiddenColorInput,
  BlurButton,
  ToolbarSpacer,
  ToolbarInner,
  ExportArea,
  ShapeButton,
  ButtonLabel,
  BrushSizeSlider,
  SaveDeleteGroup,
  NavArrow,
  GalleryLabel,
  RightEdgeGlow,
  CreditsSlide,
  CreditsText,
  CreditsLink,
};
