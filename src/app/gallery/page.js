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

const EmptyState = styled.p`
  color: #555;
`;

export default function GalleryPage() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getUserId();

    // DOMPurify dynamisch importiert / läuft nnur in Browser
    import("dompurify").then(({ default: DOMPurify }) => {
      fetch(`/api/designs?userId=${userId}`)
        .then((res) => res.json())
        .then((data) => {
          // SVG-String säubern vor speichern damit kein gefährliches javascript rein kann
          const sanitized = data.designs.map((design) => ({
            ...design,
            svg: DOMPurify.sanitize(design.svg),
          }));
          setDesigns(sanitized);
          setLoading(false);
        });
    });
  }, []);

  if (loading) return <Page>Loading...</Page>;

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
            <Card
              key={design._id}
              dangerouslySetInnerHTML={{ __html: design.svg }}
            />
          ))}
        </Grid>
      )}
    </Page>
  );
}
