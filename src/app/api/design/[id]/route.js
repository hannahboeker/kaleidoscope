import { connectToDatabase } from "@/lib/mongodb";
import Design from "@/models/Design";

//GET + PUT für edit Button // GET hol EIN Bild aus mongodb, PUT überschreibt bestehendes Design

export async function GET(request, { params }) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "userId fehlt" }, { status: 400 });
    }

    const design = await Design.findOne({ _id: id, userId }).lean();

    if (!design) {
      return Response.json({ error: "Design nicht gefunden" }, { status: 404 });
    }

    return Response.json({ design });
  } catch (error) {
    console.error("Get error:", error);
    return Response.json({ error: "Laden fehlgeschlagen" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const { svg, strokes } = await request.json();

    if (!userId || !svg) {
      return Response.json(
        { error: "userId und svg sind Pflichtfelder" },
        { status: 400 },
      );
    }

    const updated = await Design.findOneAndUpdate(
      { _id: id, userId },
      { svg, strokes },
      { new: true },
    );

    if (!updated) {
      return Response.json({ error: "Design nicht gefunden" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    return Response.json(
      { error: "Speichern fehlgeschlagen" },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "userId fehlt" }, { status: 400 });
    }

    // userId-Check verhindert dass fremde Designs gelöscht werden können
    const deleted = await Design.findOneAndDelete({ _id: id, userId });

    if (!deleted) {
      return Response.json({ error: "Design nicht gefunden" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return Response.json({ error: "Löschen fehlgeschlagen" }, { status: 500 });
  }
}
