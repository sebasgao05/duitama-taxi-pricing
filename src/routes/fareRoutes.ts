import { Router } from "express";
import {
  calculateFare,
  getZonesHandler,
  getSectorHandler,
  getRutasHandler,
  getBarriosHandler,
} from "../controllers/fareController";

const router = Router();

router.post("/calculate-fare", calculateFare);
router.get("/zones", getZonesHandler);
router.get("/sector", getSectorHandler);
router.get("/rutas-especiales", getRutasHandler);
router.get("/barrios", getBarriosHandler);

export default router;
