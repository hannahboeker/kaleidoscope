import { connectToDatabase } from "@/lib/mongodb";
import Design from "@/models/Design";

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
