import mongoose from "mongoose";

const DesignSchema = new mongoose.Schema(
  {
    //User-ID, localStorage
    userId: {
      type: String,
      required: true,
      index: true,
    },
    // SVG als String
    svg: {
      type: String,
      required: true,
    },
    // Stroke-Daten
    strokes: {
      type: Array,
      default: [],
    },
    // Metadaten
    symmetry: {
      type: Number,
      default: 3,
    },
  },
  {
    // createdAt (wann ertsellt), updatedAt(wann zuletzt geändert) von mongoose
    // durch timestamp:tue automatisch hinzugefügt
    timestamps: true,
  },
);

// Verhindert dass mongoose das Model mehrfach registriert:
// Next.js führt Dateien beim Hot Reload (automatisches Neuladen beim Entwickeln) mehrfach aus.
// Ohne diese Zeile würde mongoose versuchen das Model "Design" zweimal zu registrieren und einen Fehler werfen.
export default mongoose.models.Design || mongoose.model("Design", DesignSchema);
