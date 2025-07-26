import { Router } from 'express';
import { caseController } from '../controllers/caseController';
import {
  validate,
  validateQuery,
  createCaseRecordSchema,
  updateCaseRecordSchema,
  getCasesQuerySchema
} from '../utils/validation';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CaseRecord:
 *       type: object
 *       required:
 *         - crisisType
 *         - priority
 *         - personalInfo
 *         - crisisDetails
 *         - assessment
 *       properties:
 *         caseNumber:
 *           type: string
 *           description: Auto-generated case number
 *         crisisType:
 *           type: string
 *           enum: [mental_health, domestic_violence, substance_abuse, child_welfare, elder_abuse, general_emergency]
 *         status:
 *           type: string
 *           enum: [open, in_progress, pending, resolved, closed]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         personalInfo:
 *           $ref: '#/components/schemas/PersonalInfo'
 *         crisisDetails:
 *           $ref: '#/components/schemas/CrisisDetails'
 *         assessment:
 *           $ref: '#/components/schemas/Assessment'
 *         actions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Action'
 *         fieldUpdates:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FieldUpdate'
 *     
 *     PersonalInfo:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         gender:
 *           type: string
 *           enum: [male, female, non_binary, prefer_not_to_say]
 *         phoneNumber:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *     
 *     CrisisDetails:
 *       type: object
 *       required:
 *         - description
 *         - location
 *         - dateTime
 *       properties:
 *         description:
 *           type: string
 *         location:
 *           type: string
 *         dateTime:
 *           type: string
 *           format: date-time
 *         witnesses:
 *           type: array
 *           items:
 *             type: string
 *         riskFactors:
 *           type: array
 *           items:
 *             type: string
 *     
 *     Assessment:
 *       type: object
 *       required:
 *         - riskLevel
 *       properties:
 *         riskLevel:
 *           type: string
 *           enum: [low, moderate, high, imminent]
 *         sentimentScore:
 *           type: number
 *           minimum: -1
 *           maximum: 1
 *         emotionalState:
 *           type: array
 *           items:
 *             type: string
 *             enum: [anxious, depressed, angry, fearful, hopeless, confused, calm, cooperative]
 *     
 *     Action:
 *       type: object
 *       required:
 *         - type
 *         - description
 *         - assignedTo
 *         - priority
 *       properties:
 *         type:
 *           type: string
 *           enum: [immediate_response, follow_up, referral, documentation, safety_planning, resource_coordination]
 *         description:
 *           type: string
 *         assignedTo:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, in_progress, completed, cancelled]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, critical]
 *     
 *     FieldUpdate:
 *       type: object
 *       properties:
 *         fieldPath:
 *           type: string
 *         updateType:
 *           type: string
 *           enum: [create, update, delete]
 *         updatedBy:
 *           type: string
 *           enum: [user, ai_sentiment_analysis, system]
 *         timestamp:
 *           type: string
 *           format: date-time
 *         confidence:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         userOverride:
 *           type: boolean
 */

/**
 * @swagger
 * /api/cases:
 *   get:
 *     summary: Get all cases with pagination and filtering
 *     tags: [Cases]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of cases per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, pending, resolved, closed]
 *         description: Filter by case status
 *       - in: query
 *         name: crisisType
 *         schema:
 *           type: string
 *           enum: [mental_health, domestic_violence, substance_abuse, child_welfare, elder_abuse, general_emergency]
 *         description: Filter by crisis type
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by priority
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in case number, names, or description
 *     responses:
 *       200:
 *         description: List of cases with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CaseRecord'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/', validateQuery(getCasesQuerySchema), caseController.getCases.bind(caseController));

/**
 * @swagger
 * /api/cases/stats:
 *   get:
 *     summary: Get case statistics
 *     tags: [Cases]
 *     responses:
 *       200:
 *         description: Case statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCases:
 *                       type: integer
 *                     statusDistribution:
 *                       type: object
 *                     crisisTypeDistribution:
 *                       type: object
 *                     priorityDistribution:
 *                       type: object
 *                     riskLevelDistribution:
 *                       type: object
 */
router.get('/stats', caseController.getCaseStats.bind(caseController));

/**
 * @swagger
 * /api/cases/{id}:
 *   get:
 *     summary: Get a specific case by ID
 *     tags: [Cases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     responses:
 *       200:
 *         description: Case details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CaseRecord'
 *       404:
 *         description: Case not found
 */
router.get('/:id', caseController.getCaseById.bind(caseController));

/**
 * @swagger
 * /api/cases:
 *   post:
 *     summary: Create a new case
 *     tags: [Cases]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CaseRecord'
 *     responses:
 *       201:
 *         description: Case created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CaseRecord'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 */
router.post('/', validate(createCaseRecordSchema), caseController.createCase.bind(caseController));

/**
 * @swagger
 * /api/cases/{id}:
 *   put:
 *     summary: Update an existing case
 *     tags: [Cases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CaseRecord'
 *     responses:
 *       200:
 *         description: Case updated successfully
 *       404:
 *         description: Case not found
 */
router.put('/:id', validate(updateCaseRecordSchema), caseController.updateCase.bind(caseController));

/**
 * @swagger
 * /api/cases/{id}:
 *   delete:
 *     summary: Delete a case
 *     tags: [Cases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     responses:
 *       200:
 *         description: Case deleted successfully
 *       404:
 *         description: Case not found
 */
router.delete('/:id', caseController.deleteCase.bind(caseController));

/**
 * @swagger
 * /api/cases/{id}/analyze:
 *   post:
 *     summary: Analyze case with sentiment analysis
 *     tags: [Cases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     responses:
 *       200:
 *         description: Case analyzed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CaseRecord'
 *                 message:
 *                   type: string
 *       404:
 *         description: Case not found
 */
router.post('/:id/analyze', caseController.analyzeCase.bind(caseController));

export default router;
