"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { getUserId } from "@/lib/canvasHelpers";

const FONT_SIZE = "30px";

const RAINBOW = [
  "#e63535",
  "#ff8c00",
  "#ffe100",
  "#00c853",
  "#00bcd4",
  "#1e88e5",
  "#e91e63",
  "#9c27b0",
];

function RainbowText({ text }) {
  return (
    <>
      {text.split("").map((char, i) => (
        <span key={i} style={{ color: RAINBOW[i % RAINBOW.length] }}>
          {char}
        </span>
      ))}
    </>
  );
}

const ROTATIONS = [-12, 7, -18, 4, 14, -9, 20, -15, 11, -6, 17, -11, 8, -16, 5];

const Page = styled.div`
  min-height: 100vh;
  background: #fff;
  font-family: "Neumarkt", serif;
  overflow-x: hidden;
  color: #000;
`;

const TopArea = styled.div`
  position: relative;
  height: 150px;
  overflow: hidden;
`;

const ArchOval = styled.div`
  position: absolute;
  width: 160vw;
  height: 500px;
  border: 1.5px solid #000;
  border-radius: 50%;
  top: 20px;
  left: -30vw;
  pointer-events: none;
`;

const WorkspaceLink = styled(Link)`
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: 52%;
  min-width: 160px;
  height: 60px;
  border: 1.5px solid #000;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #000;
  font-size: ${FONT_SIZE};
  z-index: 2;
  white-space: nowrap;
`;

const SideOval = styled.button`
  position: absolute;
  top: 35px;
  width: 56px;
  height: 86px;
  border: 1.5px solid #000;
  border-radius: 50%;
  background: #fff;
  color: #000;
  cursor: pointer;
  font-family: "Neumarkt", serif;
  font-size: ${FONT_SIZE};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
`;

const DeleteOval = styled(SideOval)`
  left: 5%;
  transform: rotate(-25deg);
`;

const EditOvalLink = styled(Link)`
  position: absolute;
  top: 35px;
  right: 5%;
  width: 56px;
  height: 86px;
  border: 1.5px solid #000;
  border-radius: 50%;
  background: #fff;
  color: #000;
  font-family: "Neumarkt", serif;
  font-size: ${FONT_SIZE};
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transform: rotate(25deg);
  z-index: 3;
`;

const DeletedMsg = styled.p`
  text-align: center;
  font-size: ${FONT_SIZE};
  padding: 12px 0 0;
  color: #000;
`;

const EmptyState = styled.p`
  color: rgba(0, 0, 0, 0.4);
  text-align: center;
  padding: 40px 20px;
  font-size: ${FONT_SIZE};
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  padding: 24px 20px 40px;

  @media (min-width: 600px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const CardWrapper = styled.div`
  transform: rotate(${({ $rotation }) => $rotation}deg);
`;

const Card = styled.div`
  border: 1.5px solid rgba(0, 0, 0, 0.35);
  border-radius: 3px;
  overflow: hidden;
  aspect-ratio: 105 / 148;
  background: #f5f5f5;
  cursor: pointer;
  transition: border-color 0.15s;

  ${({ $selected }) =>
    $selected &&
    `
    border: 3px solid #000;
    box-shadow: 0 0 0 2px #fff;
  `}

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`;

export default function GalleryPage() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [deletedMsg, setDeletedMsg] = useState(false);

  async function handleDelete() {
    if (!selectedId) return;
    const idToDelete = selectedId;
    setSelectedId(null);
    setDesigns((prev) => prev.filter((d) => d._id !== idToDelete));
    setDeletedMsg(true);
    setTimeout(() => setDeletedMsg(false), 2000);

    try {
      const userId = getUserId();
      const res = await fetch(`/api/design/${idToDelete}?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
    } catch {
      const userId = getUserId();
      const { default: DOMPurify } = await import("dompurify");
      const data = await fetch(`/api/designs?userId=${userId}`).then((r) =>
        r.json(),
      );
      const list = data.designs ?? [];
      setDesigns(
        list.map((d) => ({
          ...d,
          svg: DOMPurify.sanitize(d.svg, { USE_PROFILES: { svg: true } }),
        })),
      );
      setDeletedMsg(false);
    }
  }

  function toggleSelect(id) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  useEffect(() => {
    const userId = getUserId();
    import("dompurify")
      .then(({ default: DOMPurify }) =>
        fetch(`/api/designs?userId=${userId}`)
          .then((res) => res.json())
          .then((data) => {
            const list = data.designs ?? [];
            setDesigns(
              list.map((d) => ({
                ...d,
                svg: DOMPurify.sanitize(d.svg, { USE_PROFILES: { svg: true } }),
              })),
            );
          }),
      )
      .catch((err) => {
        console.error("Failed to load designs:", err);
        setError("Failed to load designs.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Page style={{ padding: 32, color: "#000" }}>Loading...</Page>;
  if (error) return <Page style={{ padding: 32, color: "#000" }}>{error}</Page>;

  return (
    <Page>
      <TopArea>
        <ArchOval />
        <WorkspaceLink href="/">workspace</WorkspaceLink>
        {selectedId && (
          <>
            <DeleteOval onClick={handleDelete}>delete</DeleteOval>
            <EditOvalLink href={`/?id=${selectedId}`}>edit</EditOvalLink>
          </>
        )}
      </TopArea>

      {deletedMsg && (
        <DeletedMsg>
          <RainbowText text="deleted!" />
        </DeletedMsg>
      )}

      {designs.length === 0 ? (
        <EmptyState>Nothing to see.. Start sketching!</EmptyState>
      ) : (
        <CardGrid>
          {designs.map((design, i) => (
            <CardWrapper
              key={design._id}
              $rotation={ROTATIONS[i % ROTATIONS.length]}
            >
              <Card
                $selected={selectedId === design._id}
                onClick={() => toggleSelect(design._id)}
                dangerouslySetInnerHTML={{ __html: design.svg }}
              />
            </CardWrapper>
          ))}
        </CardGrid>
      )}
    </Page>
  );
}
