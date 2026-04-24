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
        { error: "userId und svg sind erforderlich" },
        { status: 400 },
      );
    }

    // Upsert: existierendes Design überschreiben oder neu anlegen
    // findeOneAndUpdate sucht dokuemnt mit gegebener userID und aktualiseirt es
    //upsert: true = wenn keins gefunden erstell ein neues
    //new:true gibt aktualiesiertes dok zurück
    const design = await Design.findOneAndUpdate(
      { userId },
      { svg, strokes, symmetry, userId },
      { upsert: true, new: true },
    );

    return Response.json({ success: true, designId: design._id });
  } catch (error) {
    console.error("Save error:", error);
    return Response.json(
      { error: "Speichern fehlgeschlagen" },
      { status: 500 },
    );
  }
}
