"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const ExpandedGalleryOval = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  height: 100vh;
  border: 1.5px solid #000;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
`;

const WorkspaceButton = styled.button`
  position: fixed;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);
  width: 52%;
  min-width: 160px;
  height: 60px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #000;
  font-family: "Neumarkt", serif;
  font-size: ${FONT_SIZE};
  letter-spacing: 0.09em;
  z-index: 2;
  white-space: nowrap;
`;

const WorkspaceExpandingOval = styled.div`
  position: fixed;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);
  width: 52%;
  min-width: 160px;
  height: 60px;
  border: 1.5px solid #000;
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;

  ${({ $expanding }) =>
    $expanding &&
    `
    transition: height 0.7s ease-in-out, width 0.7s ease-in-out;
    height: 92vh;
    width: 138vw;
  `}
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
  transform: rotate(60deg);
  z-index: 3;
`;

const DeletedMsg = styled.p`
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  font-size: ${FONT_SIZE};
  color: #000;
  z-index: 10;
  white-space: nowrap;
`;

const DeleteLabel = styled.span`
  display: inline-block;
  transform: rotate(90deg);
`;

const EditSuffix = styled.span`
  margin-left: -2px;
`;

const StatusPage = styled(Page)`
  padding: 32px;
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
  transform: rotate(${({ $rotation }) => $rotation}deg)
    scale(${({ $selected }) => ($selected ? 1.12 : 1)});
  transition: transform 0.2s;
  position: relative;
  z-index: ${({ $selected }) => ($selected ? 10 : 0)};
`;

const Card = styled.div`
  border: 1.5px solid rgba(0, 0, 0, 0.35);
  border-radius: 3px;
  overflow: hidden;
  aspect-ratio: 105 / 148;
  background: #f5f5f5;
  cursor: pointer;
  transition: filter 0.2s;

  ${({ $selected }) => $selected && `filter: invert(1);`}

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
  const [expandingWorkspace, setExpandingWorkspace] = useState(false);
  const router = useRouter();

  const handleWorkspaceNav = () => {
    setExpandingWorkspace(true);
    setTimeout(() => router.push("/"), 700);
  };

  async function handleDelete() {
    if (!selectedId) return;
    if (!window.confirm("Are you sure you want to delete this?")) return;
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

  if (loading) return <StatusPage>Loading...</StatusPage>;
  if (error) return <StatusPage>{error}</StatusPage>;

  return (
    <Page>
      <TopArea>
        <ExpandedGalleryOval />
        <WorkspaceButton onClick={handleWorkspaceNav}>
          workspace
        </WorkspaceButton>
        <WorkspaceExpandingOval $expanding={expandingWorkspace} />
        {selectedId && (
          <>
            <DeleteOval onClick={handleDelete}>
              <DeleteLabel>delete</DeleteLabel>
            </DeleteOval>
            <EditOvalLink href={`/?id=${selectedId}`}>
              e<EditSuffix>dit</EditSuffix>
            </EditOvalLink>
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
              $selected={selectedId === design._id}
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
