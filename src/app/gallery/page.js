"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { getUserId } from "@/lib/canvasHelpers";

const Page = styled.main`
  min-height: 100vh;
  padding: 32px;
  background: #0a0a0a;
  color: #15ff00;
`;

const Nav = styled.nav`
  margin-bottom: 32px;
`;

const NavLink = styled(Link)`
  color: #15ff00;
  font-size: 13px;
  text-decoration: none;
  border: 3px solid #15ff00;
  border-radius: 20px;
  padding: 8px 20px;
  &:hover {
    border-color: rgb(234, 255, 0);
    color: rgb(234, 255, 0);
  }
`;

const Heading = styled.h1`
  font-size: 24px;
  margin-bottom: 32px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
`;

const CardWrapper = styled.div`
  position: relative;

  &:hover button,
  &:hover a {
    opacity: 1;
  }
`;

const Card = styled.div`
  border: 2px solid #15ff00;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 1;
  background: #111;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const DeleteButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: #0a0a0a;
  color: #ff3b3b;
  border: 2px solid #ff3b3b;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 14px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;

  &:hover {
    background: #ff3b3b;
    color: #0a0a0a;
  }
`;

const EditLink = styled(Link)`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: #0a0a0a;
  color: #15ff00;
  border: 2px solid #15ff00;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  opacity: 0;
  transition: opacity 0.2s;

  &:hover {
    background: #15ff00;
    color: #0a0a0a;
  }
`;

const EmptyState = styled.p`
  color: #555;
`;

export default function GalleryPage() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  //DELETE
  async function handleDelete(id) {
    if (!window.confirm("delete?")) return;

    // sofort entfernen (optimistic UI) /1. behalte alle ids die nicht die zu löschende id sind
    // prev, von react, State zum zeitpunkt des aufrufs
    setDesigns((prev) => prev.filter((d) => d._id !== id));

    //erst nachdem anzeige geändert wurde geht request ab
    try {
      const userId = getUserId();
      const res = await fetch(`/api/design/${id}?userId=${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");
    } catch {
      // error wenn Request fehlschlägt (Netzwerk oder !res.ok)
      // neu vom Server laden statt previous-rollback — verhindert stale state bei schnellen Deletes
      const userId = getUserId();
      //Datenbank neu abfragen
      const { default: DOMPurify } = await import("dompurify");
      const data = await fetch(`/api/designs?userId=${userId}`).then((r) =>
        r.json(),
      );
      //State neu setzten, durch aktuelle daten mappen
      const list = data.designs ?? [];
      setDesigns(
        list.map((d) => ({
          ...d,
          svg: DOMPurify.sanitize(d.svg, { USE_PROFILES: { svg: true } }),
        })),
      );
      alert("Deletion failed. Please try again.");
    }
  }

  useEffect(() => {
    const userId = getUserId();

    // DOMPurify dynamisch importiert / läuft nur im Browser
    import("dompurify")
      .then(({ default: DOMPurify }) => {
        return fetch(`/api/designs?userId=${userId}`)
          .then((res) => res.json())
          .then((data) => {
            const list = data.designs ?? [];
            // SVG-String säubern vor dem Speichern damit kein gefährliches JavaScript rein kann
            const sanitized = list.map((design) => ({
              ...design,
              svg: DOMPurify.sanitize(design.svg, {
                USE_PROFILES: { svg: true },
              }),
            }));
            setDesigns(sanitized);
          });
      })
      .catch((err) => {
        console.error("Failed to load designs:", err);
        setError("Failed to load designs.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <Page>Loading...</Page>;
  if (error) return <Page>{error}</Page>;

  return (
    <Page>
      <Nav>
        <NavLink href="/">workspace</NavLink>
      </Nav>
      <Heading>gallery</Heading>
      {designs.length === 0 ? (
        <EmptyState>Nothing to see.. Start sketching!</EmptyState>
      ) : (
        <Grid>
          {designs.map((design) => (
            <CardWrapper key={design._id}>
              <Card dangerouslySetInnerHTML={{ __html: design.svg }} />
              <EditLink href={`/?id=${design._id}`}>✎</EditLink>
              <DeleteButton onClick={() => handleDelete(design._id)}>
                ✕
              </DeleteButton>
            </CardWrapper>
          ))}
        </Grid>
      )}
    </Page>
  );
}
