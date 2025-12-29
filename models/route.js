// models/route.js
import mongoose from "mongoose";

const routeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  fromCity: { type: String, required: true },
  toCity: { type: String, required: true },
  code: { type: String, unique: true },
  firstDepartureMinutes: { type: Number, required: true },
  lastDepartureMinutes: { type: Number, required: true },
  intervalMinutes: { type: Number, required: true },
});

const Route = mongoose.model("Route", routeSchema);

export default Route;