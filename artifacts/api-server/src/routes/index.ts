import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import gateRouter from "./gate";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(gateRouter);

export default router;
