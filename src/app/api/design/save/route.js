import { connectToDatabase } from "@/lib/mongodb";
import Design from "@/models/Design";

//Ausgeführt bei POST request an api/design/save
//request.json liest den inhalt aus
//destructering um einzelnen felder dirket rauszulesen
export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { userId, svg, strokes, symmetry } = body;

    if (!userId || !svg) {
      return Response.json(
        { error: "userId and svg are mandatory" },
        { status: 400 },
      );
    }

    const design = await Design.create({ userId, svg, strokes, symmetry });

    return Response.json({ success: true, designId: design._id });
  } catch (error) {
    console.error("Save error:", error);
    return Response.json({ error: "Saving failed" }, { status: 500 });
  }
}
