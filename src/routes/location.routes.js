import { Router } from "express";
import {
  getCurrentLocation,
  searchLocations,
  searchLocationsClassic,
  getLocationDetails,
  autocompleteLocations,
  getNearbyLocations,
} from "../controllers/location.controller.js";

const router = Router();

router.get("/current", getCurrentLocation);
router.get("/search", searchLocations);
router.get("/search-classic", searchLocationsClassic);
router.get("/autocomplete", autocompleteLocations);
router.get("/details/:placeId", getLocationDetails);
router.get("/nearby", getNearbyLocations);

export default router;
