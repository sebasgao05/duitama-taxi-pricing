import { Router, Request, Response, NextFunction } from "express";
import {
  calculateFare,
  getZonesHandler,
  getSectorHandler,
  getRutasHandler,
  getBarriosHandler,
} from "../controllers/fareController";

const router = Router();

function requireJson(req: Request, res: Response, next: NextFunction): void {
  if (!req.is("application/json")) {
    res.status(415).json({
      success: false,
      error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type debe ser application/json" },
    });
    return;
  }
  next();
}

router.post("/calculate-fare", requireJson, calculateFare);
router.get("/zones", getZonesHandler);
router.get("/sector", getSectorHandler);
router.get("/rutas-especiales", getRutasHandler);
router.get("/barrios", getBarriosHandler);

export default router;
