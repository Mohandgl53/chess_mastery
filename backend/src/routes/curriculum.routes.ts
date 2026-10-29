import { Router } from 'express';
import { curriculumController } from '../controllers/curriculum.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  lessonIdParamSchema,
  validateStepSchema
} from '../validators/curriculum.schemas.js';

export const curriculumRoutes = Router();

// All curriculum endpoints require session authentication
curriculumRoutes.use(requireAuth);

curriculumRoutes.get('/catalog', (req, res, next) => curriculumController.getCatalog(req, res, next));
curriculumRoutes.get('/lessons/:lessonId', validateParams(lessonIdParamSchema), (req, res, next) => curriculumController.getLesson(req, res, next));
curriculumRoutes.post('/lessons/:lessonId/validate-step', validateParams(lessonIdParamSchema), validateBody(validateStepSchema), (req, res, next) => curriculumController.validateStep(req, res, next));
curriculumRoutes.post('/lessons/:lessonId/reset', validateParams(lessonIdParamSchema), (req, res, next) => curriculumController.resetLesson(req, res, next));
