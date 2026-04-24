import { connectToDatabase } from "@/lib/mongodb";
import Design from "@/models/Design";

//Daten aus Mongo DB holen
export async function GET(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "userId fehlt" }, { status: 400 });
    }

    const designs = await Design.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({ designs });
  } catch (error) {
    console.error("Fetch error:", error);
    return Response.json({ error: "Laden fehlgeschlagen" }, { status: 500 });
  }
}
