import { connectToDatabase } from "@/lib/mongodb";
import Design from "@/models/Design";

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { userId, svg, strokes, symmetry } = body;

    if (!userId || !svg) {
      return Response.json(
        { error: "userId und svg sind erforderlich" },
        { status: 400 },
      );
    }

    // Immer neues Dokument, nicht üerschreiben
    const design = await Design.create({ userId, svg, strokes, symmetry });

    return Response.json({ success: true, designId: design._id });
  } catch (error) {
    console.error("Save-copy error:", error);
    return Response.json(
      { error: "Speichern fehlgeschlagen" },
      { status: 500 },
    );
  }
}
